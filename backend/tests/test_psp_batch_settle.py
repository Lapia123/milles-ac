"""
Tests for PSP Batch/Compound Settlement feature
- Tests the new POST /api/psp/{psp_id}/settle-batch endpoint
- Tests checkbox selection functionality via frontend integration
- Tests batch settlement calculation and treasury crediting
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@fxbroker.com"
ADMIN_PASSWORD = "admin123"

# Known PSP IDs
PSP_NETWORK_ID = "psp_a12648489a08"  # Has pending transactions
PSP_UNI_ID = "psp_d1ecff082f1e"  # No pending transactions


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return headers with authentication"""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }


class TestPSPSummary:
    """Test PSP summary endpoint"""
    
    def test_get_psp_summary(self, auth_headers):
        """Verify PSP summary includes pending transaction counts"""
        response = requests.get(
            f"{BASE_URL}/api/psp-summary",
            headers=auth_headers
        )
        assert response.status_code == 200
        psps = response.json()
        assert isinstance(psps, list)
        assert len(psps) >= 2  # At least 'uni' and 'network'
        
        # Find the network PSP
        network_psp = next((p for p in psps if p["psp_id"] == PSP_NETWORK_ID), None)
        assert network_psp is not None
        assert "pending_transactions_count" in network_psp
        assert "pending_amount" in network_psp
        print(f"Network PSP has {network_psp['pending_transactions_count']} pending transactions")


class TestPendingTransactions:
    """Test pending transactions endpoint"""
    
    def test_get_pending_transactions_network(self, auth_headers):
        """Get pending transactions for 'network' PSP"""
        response = requests.get(
            f"{BASE_URL}/api/psp/{PSP_NETWORK_ID}/pending-transactions",
            headers=auth_headers
        )
        assert response.status_code == 200
        transactions = response.json()
        assert isinstance(transactions, list)
        print(f"Found {len(transactions)} pending transactions for network PSP")
        
        # Verify transaction structure
        if len(transactions) > 0:
            tx = transactions[0]
            assert "transaction_id" in tx
            assert "amount" in tx
            assert "psp_commission_amount" in tx
            # Check for created_at (Tx Date column)
            assert "created_at" in tx
            print(f"Transaction {tx['transaction_id']} has created_at: {tx.get('created_at')}")
    
    def test_get_pending_transactions_uni(self, auth_headers):
        """Verify 'uni' PSP has 0 pending transactions (already settled)"""
        response = requests.get(
            f"{BASE_URL}/api/psp/{PSP_UNI_ID}/pending-transactions",
            headers=auth_headers
        )
        assert response.status_code == 200
        transactions = response.json()
        assert len(transactions) == 0, "uni PSP should have 0 pending transactions"
        print("uni PSP correctly shows 0 pending transactions")


class TestBatchSettleEndpoint:
    """Test the batch settle endpoint"""
    
    def test_batch_settle_empty_list(self, auth_headers):
        """Test batch settle with empty transaction list"""
        response = requests.post(
            f"{BASE_URL}/api/psp/{PSP_NETWORK_ID}/settle-batch",
            headers=auth_headers,
            json={"transaction_ids": []}
        )
        assert response.status_code == 400
        assert "No transactions selected" in response.json().get("detail", "")
        print("Empty transaction list correctly rejected")
    
    def test_batch_settle_invalid_psp(self, auth_headers):
        """Test batch settle with invalid PSP ID"""
        response = requests.post(
            f"{BASE_URL}/api/psp/invalid_psp_id/settle-batch",
            headers=auth_headers,
            json={"transaction_ids": ["tx_123"]}
        )
        assert response.status_code == 404
        assert "PSP not found" in response.json().get("detail", "")
        print("Invalid PSP correctly rejected")
    
    def test_batch_settle_wrong_psp_transactions(self, auth_headers):
        """Test batch settle with transactions from wrong PSP"""
        response = requests.post(
            f"{BASE_URL}/api/psp/{PSP_UNI_ID}/settle-batch",
            headers=auth_headers,
            json={"transaction_ids": ["tx_nonexistent"]}
        )
        # Should fail because transactions don't exist/belong to PSP
        assert response.status_code == 400
        print("Wrong PSP transactions correctly rejected")


class TestBatchSettleFlow:
    """Test the full batch settlement flow with real transactions"""
    
    def test_batch_settle_network_psp(self, auth_headers):
        """Test batch settlement for network PSP pending transactions"""
        # First, get pending transactions
        response = requests.get(
            f"{BASE_URL}/api/psp/{PSP_NETWORK_ID}/pending-transactions",
            headers=auth_headers
        )
        assert response.status_code == 200
        pending_txs = response.json()
        
        if len(pending_txs) == 0:
            pytest.skip("No pending transactions available for batch settlement test")
        
        # Collect transaction IDs
        tx_ids = [tx["transaction_id"] for tx in pending_txs]
        print(f"Found {len(tx_ids)} pending transactions: {tx_ids}")
        
        # Calculate expected totals
        gross_amount = sum(tx.get("amount", 0) for tx in pending_txs)
        total_commission = sum(tx.get("psp_commission_amount", 0) for tx in pending_txs)
        total_reserve = sum(tx.get("psp_reserve_fund_amount", tx.get("psp_chargeback_amount", 0)) for tx in pending_txs)
        total_extra = sum(tx.get("psp_extra_charges", 0) for tx in pending_txs)
        expected_net = gross_amount - total_commission - total_reserve - total_extra
        
        print(f"Expected settlement: Gross=${gross_amount}, Net=${expected_net}")
        
        # Execute batch settlement
        response = requests.post(
            f"{BASE_URL}/api/psp/{PSP_NETWORK_ID}/settle-batch",
            headers=auth_headers,
            json={"transaction_ids": tx_ids}
        )
        
        assert response.status_code == 200, f"Batch settle failed: {response.text}"
        settlement = response.json()
        
        # Verify settlement record
        assert settlement.get("settlement_type") == "compound"
        assert settlement.get("transaction_count") == len(tx_ids)
        assert "settlement_id" in settlement
        assert settlement.get("status") == "completed"
        
        # Verify amounts
        assert abs(settlement.get("gross_amount", 0) - gross_amount) < 0.01
        assert abs(settlement.get("net_amount", 0) - expected_net) < 0.01
        
        print(f"Batch settlement successful: {settlement['settlement_id']}")
        print(f"  Transactions: {settlement['transaction_count']}")
        print(f"  Gross: ${settlement['gross_amount']}")
        print(f"  Commission: ${settlement.get('commission_amount', 0)}")
        print(f"  Net: ${settlement['net_amount']}")
        
        # Verify pending transactions list is now empty
        response = requests.get(
            f"{BASE_URL}/api/psp/{PSP_NETWORK_ID}/pending-transactions",
            headers=auth_headers
        )
        assert response.status_code == 200
        remaining_pending = response.json()
        assert len(remaining_pending) == 0, "Pending transactions should be cleared after batch settle"
        print("Pending transactions list correctly cleared after batch settlement")


class TestSettlementHistory:
    """Test settlement history endpoint"""
    
    def test_get_settlement_history(self, auth_headers):
        """Verify settlement history includes compound settlements"""
        response = requests.get(
            f"{BASE_URL}/api/psp/{PSP_NETWORK_ID}/settlements",
            headers=auth_headers
        )
        assert response.status_code == 200
        settlements = response.json()
        
        # Check for compound settlements
        compound_settlements = [s for s in settlements if s.get("settlement_type") == "compound"]
        print(f"Found {len(compound_settlements)} compound settlements in history")
        
        if len(compound_settlements) > 0:
            settlement = compound_settlements[0]
            assert "transaction_count" in settlement
            assert "transaction_ids" in settlement
            assert settlement["transaction_count"] == len(settlement["transaction_ids"])
            print(f"Compound settlement {settlement['settlement_id']}: {settlement['transaction_count']} transactions")


class TestTreasuryAccounts:
    """Test treasury accounts endpoint for settlement destination selection"""
    
    def test_get_treasury_accounts(self, auth_headers):
        """Verify treasury accounts are available for settlement destination"""
        response = requests.get(
            f"{BASE_URL}/api/treasury?page_size=200",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        accounts = data.get("items", data) if isinstance(data, dict) else data
        assert len(accounts) > 0, "At least one treasury account should exist"
        
        # Verify account structure
        account = accounts[0]
        assert "account_id" in account
        assert "account_name" in account
        print(f"Found {len(accounts)} treasury accounts for settlement destination")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
