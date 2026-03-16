"""
Test: Destination Info Fix and Transaction Edit Feature (P0 Fixes)
Tests:
1. Destination names (psp_name, vendor_name, destination_account_name) appear in transaction list
2. Edit Transaction dialog (CRM Reference, Amount, Reference) on pending transactions
3. Editing is blocked on non-pending transactions
4. CRM Reference and Reference uniqueness validation during edit
"""
import pytest
import requests
import uuid
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDestinationFixAndEditFeature:
    """Tests for destination info enrichment and transaction edit functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_client(self, auth_headers):
        """Get or create a test client"""
        # Get existing clients
        response = requests.get(f"{BASE_URL}/api/clients?page_size=10", headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            clients = data.get("items", data) if isinstance(data, dict) else data
            if clients:
                return clients[0]
        
        # Create a test client if none exists
        client_data = {
            "first_name": "TestDestFix",
            "last_name": f"Client{uuid.uuid4().hex[:4]}",
            "email": f"destfix_{uuid.uuid4().hex[:8]}@test.com",
            "phone": "+1234567890"
        }
        response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=auth_headers)
        if response.status_code in [200, 201]:
            return response.json()
        pytest.skip("Could not get or create test client")
    
    @pytest.fixture(scope="class")
    def test_psp(self, auth_headers):
        """Get an active PSP"""
        response = requests.get(f"{BASE_URL}/api/psp", headers=auth_headers)
        if response.status_code == 200:
            psps = response.json()
            active_psps = [p for p in psps if p.get("status") == "active"]
            if active_psps:
                return active_psps[0]
        pytest.skip("No active PSP found")
    
    @pytest.fixture(scope="class")
    def test_vendor(self, auth_headers):
        """Get an active vendor"""
        response = requests.get(f"{BASE_URL}/api/vendors?page_size=100", headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            vendors = data.get("items", data) if isinstance(data, dict) else data
            active = [v for v in vendors if v.get("status") == "active"]
            if active:
                return active[0]
        pytest.skip("No active vendor found")
    
    @pytest.fixture(scope="class")
    def test_treasury(self, auth_headers):
        """Get an active treasury account"""
        response = requests.get(f"{BASE_URL}/api/treasury?page_size=100", headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            treasuries = data.get("items", data) if isinstance(data, dict) else data
            active = [t for t in treasuries if t.get("status") == "active"]
            if active:
                return active[0]
        pytest.skip("No active treasury account found")

    # ============ DESTINATION INFO ENRICHMENT TESTS ============

    def test_get_transactions_enriches_psp_name(self, auth_headers, test_psp):
        """Test that GET /api/transactions enriches psp_name from PSP collection"""
        # Get transactions with PSP destination
        response = requests.get(f"{BASE_URL}/api/transactions?page_size=200", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        transactions = data.get("items", data) if isinstance(data, dict) else data
        
        # Find transactions with PSP destination
        psp_transactions = [tx for tx in transactions if tx.get("destination_type") == "psp" and tx.get("psp_id")]
        
        if psp_transactions:
            # Check that psp_name is populated
            for tx in psp_transactions[:3]:  # Check first 3
                print(f"  PSP Transaction {tx.get('transaction_id')}: psp_id={tx.get('psp_id')}, psp_name={tx.get('psp_name')}")
                # psp_name should either be stored or enriched
                if tx.get("psp_id"):
                    assert tx.get("psp_name") is not None, f"Transaction {tx.get('transaction_id')} missing psp_name"
            print("PASS: PSP transactions have psp_name enriched")
        else:
            print("INFO: No PSP transactions found to verify enrichment")

    def test_get_transactions_enriches_vendor_name(self, auth_headers, test_vendor):
        """Test that GET /api/transactions enriches vendor_name from vendors collection"""
        response = requests.get(f"{BASE_URL}/api/transactions?page_size=200", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        transactions = data.get("items", data) if isinstance(data, dict) else data
        
        # Find transactions with vendor destination
        vendor_transactions = [tx for tx in transactions if tx.get("destination_type") == "vendor" and tx.get("vendor_id")]
        
        if vendor_transactions:
            for tx in vendor_transactions[:3]:
                print(f"  Vendor Transaction {tx.get('transaction_id')}: vendor_id={tx.get('vendor_id')}, vendor_name={tx.get('vendor_name')}")
                if tx.get("vendor_id"):
                    assert tx.get("vendor_name") is not None, f"Transaction {tx.get('transaction_id')} missing vendor_name"
            print("PASS: Vendor transactions have vendor_name enriched")
        else:
            print("INFO: No vendor transactions found to verify enrichment")

    def test_get_transactions_enriches_treasury_name(self, auth_headers, test_treasury):
        """Test that GET /api/transactions enriches destination_account_name from treasury collection"""
        response = requests.get(f"{BASE_URL}/api/transactions?page_size=200", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        transactions = data.get("items", data) if isinstance(data, dict) else data
        
        # Find transactions with treasury destination
        treasury_transactions = [tx for tx in transactions if tx.get("destination_type") in ["treasury", "usdt"] and tx.get("destination_account_id")]
        
        if treasury_transactions:
            for tx in treasury_transactions[:3]:
                print(f"  Treasury Transaction {tx.get('transaction_id')}: dest_account_id={tx.get('destination_account_id')}, dest_account_name={tx.get('destination_account_name')}")
                if tx.get("destination_account_id"):
                    assert tx.get("destination_account_name") is not None, f"Transaction {tx.get('transaction_id')} missing destination_account_name"
            print("PASS: Treasury transactions have destination_account_name enriched")
        else:
            print("INFO: No treasury transactions found to verify enrichment")

    # ============ EDIT TRANSACTION TESTS ============

    def test_edit_crm_reference_on_pending_transaction(self, auth_headers):
        """Test editing CRM Reference on a pending transaction via PUT /api/transactions/{id}"""
        # Find a pending transaction
        response = requests.get(f"{BASE_URL}/api/transactions?status=pending&page_size=50", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        transactions = data.get("items", data) if isinstance(data, dict) else data
        pending = [tx for tx in transactions if tx.get("status") == "pending"]
        
        if not pending:
            pytest.skip("No pending transactions to test edit")
        
        tx = pending[0]
        tx_id = tx["transaction_id"]
        new_crm_ref = f"TEST-CRM-{uuid.uuid4().hex[:6].upper()}"
        
        # Edit CRM Reference
        response = requests.put(
            f"{BASE_URL}/api/transactions/{tx_id}",
            json={"crm_reference": new_crm_ref},
            headers={**auth_headers, "Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Edit failed: {response.text}"
        
        updated = response.json()
        assert updated.get("crm_reference") == new_crm_ref, f"CRM Reference not updated: expected {new_crm_ref}, got {updated.get('crm_reference')}"
        print(f"PASS: CRM Reference edited on pending transaction {tx_id} → {new_crm_ref}")

    def test_edit_amount_on_pending_transaction(self, auth_headers):
        """Test editing Amount on a pending transaction"""
        response = requests.get(f"{BASE_URL}/api/transactions?status=pending&page_size=50", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        transactions = data.get("items", data) if isinstance(data, dict) else data
        pending = [tx for tx in transactions if tx.get("status") == "pending"]
        
        if not pending:
            pytest.skip("No pending transactions to test edit")
        
        tx = pending[0]
        tx_id = tx["transaction_id"]
        original_amount = tx.get("amount", 100)
        new_amount = round(original_amount + 10.50, 2)
        
        response = requests.put(
            f"{BASE_URL}/api/transactions/{tx_id}",
            json={"amount": new_amount},
            headers={**auth_headers, "Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Amount edit failed: {response.text}"
        
        updated = response.json()
        assert updated.get("amount") == new_amount, f"Amount not updated: expected {new_amount}, got {updated.get('amount')}"
        print(f"PASS: Amount edited on pending transaction {tx_id}: {original_amount} → {new_amount}")

    def test_edit_reference_on_pending_transaction(self, auth_headers):
        """Test editing Reference on a pending transaction"""
        response = requests.get(f"{BASE_URL}/api/transactions?status=pending&page_size=50", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        transactions = data.get("items", data) if isinstance(data, dict) else data
        pending = [tx for tx in transactions if tx.get("status") == "pending"]
        
        if not pending:
            pytest.skip("No pending transactions to test edit")
        
        tx = pending[0]
        tx_id = tx["transaction_id"]
        new_ref = f"REF-TEST-{uuid.uuid4().hex[:6].upper()}"
        
        response = requests.put(
            f"{BASE_URL}/api/transactions/{tx_id}",
            json={"reference": new_ref},
            headers={**auth_headers, "Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Reference edit failed: {response.text}"
        
        updated = response.json()
        assert updated.get("reference") == new_ref, f"Reference not updated: expected {new_ref}, got {updated.get('reference')}"
        print(f"PASS: Reference edited on pending transaction {tx_id} → {new_ref}")

    def test_edit_blocked_on_approved_transaction(self, auth_headers):
        """Test that editing CRM/Amount/Reference is blocked on approved transactions"""
        response = requests.get(f"{BASE_URL}/api/transactions?status=approved&page_size=50", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        transactions = data.get("items", data) if isinstance(data, dict) else data
        approved = [tx for tx in transactions if tx.get("status") == "approved"]
        
        if not approved:
            pytest.skip("No approved transactions to test blocking")
        
        tx = approved[0]
        tx_id = tx["transaction_id"]
        
        # Try to edit CRM Reference on approved transaction - should fail
        response = requests.put(
            f"{BASE_URL}/api/transactions/{tx_id}",
            json={"crm_reference": "SHOULD-FAIL"},
            headers={**auth_headers, "Content-Type": "application/json"}
        )
        assert response.status_code == 400, f"Edit should be blocked on approved transaction, got {response.status_code}"
        assert "pending" in response.text.lower() or "only" in response.text.lower(), f"Unexpected error message: {response.text}"
        print(f"PASS: Edit correctly blocked on approved transaction {tx_id}")

    def test_edit_blocked_on_rejected_transaction(self, auth_headers):
        """Test that editing is blocked on rejected transactions"""
        response = requests.get(f"{BASE_URL}/api/transactions?status=rejected&page_size=50", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        transactions = data.get("items", data) if isinstance(data, dict) else data
        rejected = [tx for tx in transactions if tx.get("status") == "rejected"]
        
        if not rejected:
            pytest.skip("No rejected transactions to test blocking")
        
        tx = rejected[0]
        tx_id = tx["transaction_id"]
        
        response = requests.put(
            f"{BASE_URL}/api/transactions/{tx_id}",
            json={"amount": 999.99},
            headers={**auth_headers, "Content-Type": "application/json"}
        )
        assert response.status_code == 400, f"Edit should be blocked on rejected transaction"
        print(f"PASS: Edit correctly blocked on rejected transaction {tx_id}")

    def test_crm_reference_uniqueness_validation(self, auth_headers):
        """Test that CRM Reference uniqueness is validated during edit"""
        # Get two pending transactions
        response = requests.get(f"{BASE_URL}/api/transactions?status=pending&page_size=50", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        transactions = data.get("items", data) if isinstance(data, dict) else data
        pending = [tx for tx in transactions if tx.get("status") == "pending"]
        
        if len(pending) < 2:
            pytest.skip("Need at least 2 pending transactions for uniqueness test")
        
        # Set a unique CRM ref on first transaction
        tx1 = pending[0]
        unique_crm = f"UNIQUE-CRM-{uuid.uuid4().hex[:6].upper()}"
        
        response = requests.put(
            f"{BASE_URL}/api/transactions/{tx1['transaction_id']}",
            json={"crm_reference": unique_crm},
            headers={**auth_headers, "Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        # Try to set the same CRM ref on second transaction - should fail
        tx2 = pending[1]
        response = requests.put(
            f"{BASE_URL}/api/transactions/{tx2['transaction_id']}",
            json={"crm_reference": unique_crm},
            headers={**auth_headers, "Content-Type": "application/json"}
        )
        assert response.status_code == 400, f"Duplicate CRM Reference should be rejected"
        assert "already exists" in response.text.lower() or "crm" in response.text.lower()
        print(f"PASS: CRM Reference uniqueness validated - duplicate '{unique_crm}' correctly rejected")

    def test_reference_uniqueness_validation(self, auth_headers):
        """Test that Reference uniqueness is validated during edit"""
        response = requests.get(f"{BASE_URL}/api/transactions?status=pending&page_size=50", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        transactions = data.get("items", data) if isinstance(data, dict) else data
        pending = [tx for tx in transactions if tx.get("status") == "pending"]
        
        if len(pending) < 2:
            pytest.skip("Need at least 2 pending transactions for uniqueness test")
        
        tx1 = pending[0]
        unique_ref = f"UNIQUE-REF-{uuid.uuid4().hex[:6].upper()}"
        
        response = requests.put(
            f"{BASE_URL}/api/transactions/{tx1['transaction_id']}",
            json={"reference": unique_ref},
            headers={**auth_headers, "Content-Type": "application/json"}
        )
        assert response.status_code == 200
        
        tx2 = pending[1]
        response = requests.put(
            f"{BASE_URL}/api/transactions/{tx2['transaction_id']}",
            json={"reference": unique_ref},
            headers={**auth_headers, "Content-Type": "application/json"}
        )
        assert response.status_code == 400, f"Duplicate Reference should be rejected"
        assert "already exists" in response.text.lower() or "reference" in response.text.lower()
        print(f"PASS: Reference uniqueness validated - duplicate '{unique_ref}' correctly rejected")

    # ============ TRANSACTION REQUEST DEPOSIT AUTO-PROCESSING TESTS ============

    def test_deposit_request_auto_processing_with_psp(self, auth_headers, test_client, test_psp):
        """Test that creating a deposit request to PSP populates psp_name in the resulting transaction"""
        # Create a deposit transaction request via PSP
        form_data = {
            "transaction_type": "deposit",
            "client_id": test_client["client_id"],
            "amount": "150.00",
            "currency": "USD",
            "base_currency": "USD",
            "destination_type": "psp",
            "psp_id": test_psp["psp_id"],
            "reference": f"DEP-PSP-{uuid.uuid4().hex[:6].upper()}",
            "crm_reference": f"CRM-DEP-{uuid.uuid4().hex[:6].upper()}",
            "transaction_date": "2026-01-15"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            data=form_data,
            headers={**auth_headers}
        )
        
        if response.status_code not in [200, 201]:
            print(f"WARNING: Could not create deposit request: {response.text}")
            pytest.skip(f"Could not create deposit request: {response.text}")
        
        result = response.json()
        
        # Deposits are auto-processed - check if transaction was created
        if result.get("status") == "processed" or result.get("transaction_id"):
            tx_id = result.get("transaction_id")
            print(f"  Deposit auto-processed, transaction_id: {tx_id}")
            
            # Fetch the created transaction
            tx_response = requests.get(f"{BASE_URL}/api/transactions/{tx_id}", headers=auth_headers)
            if tx_response.status_code == 200:
                tx = tx_response.json()
                print(f"  Transaction psp_id: {tx.get('psp_id')}, psp_name: {tx.get('psp_name')}")
                
                assert tx.get("psp_id") == test_psp["psp_id"], "PSP ID not set correctly"
                assert tx.get("psp_name") == test_psp["psp_name"], f"psp_name not populated: expected {test_psp['psp_name']}, got {tx.get('psp_name')}"
                print(f"PASS: PSP deposit correctly populated psp_name='{tx.get('psp_name')}'")
        else:
            print(f"  Request created with status: {result.get('status')}")

    def test_deposit_request_auto_processing_with_vendor(self, auth_headers, test_client, test_vendor):
        """Test that creating a deposit request to vendor populates vendor_name in the resulting transaction"""
        form_data = {
            "transaction_type": "deposit",
            "client_id": test_client["client_id"],
            "amount": "200.00",
            "currency": "USD",
            "base_currency": "USD",
            "destination_type": "vendor",
            "vendor_id": test_vendor["vendor_id"],
            "reference": f"DEP-VND-{uuid.uuid4().hex[:6].upper()}",
            "crm_reference": f"CRM-VND-{uuid.uuid4().hex[:6].upper()}",
            "transaction_date": "2026-01-15"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            data=form_data,
            headers={**auth_headers}
        )
        
        if response.status_code not in [200, 201]:
            print(f"WARNING: Could not create vendor deposit request: {response.text}")
            pytest.skip(f"Could not create vendor deposit request: {response.text}")
        
        result = response.json()
        
        if result.get("status") == "processed" or result.get("transaction_id"):
            tx_id = result.get("transaction_id")
            print(f"  Vendor deposit auto-processed, transaction_id: {tx_id}")
            
            tx_response = requests.get(f"{BASE_URL}/api/transactions/{tx_id}", headers=auth_headers)
            if tx_response.status_code == 200:
                tx = tx_response.json()
                print(f"  Transaction vendor_id: {tx.get('vendor_id')}, vendor_name: {tx.get('vendor_name')}")
                
                assert tx.get("vendor_id") == test_vendor["vendor_id"], "Vendor ID not set correctly"
                assert tx.get("vendor_name") == test_vendor["vendor_name"], f"vendor_name not populated: expected {test_vendor['vendor_name']}, got {tx.get('vendor_name')}"
                print(f"PASS: Vendor deposit correctly populated vendor_name='{tx.get('vendor_name')}'")

    def test_deposit_request_auto_processing_with_treasury(self, auth_headers, test_client, test_treasury):
        """Test that creating a deposit request to treasury populates destination_account_name"""
        form_data = {
            "transaction_type": "deposit",
            "client_id": test_client["client_id"],
            "amount": "175.00",
            "currency": "USD",
            "base_currency": "USD",
            "destination_type": "treasury",
            "destination_account_id": test_treasury["account_id"],
            "reference": f"DEP-TRS-{uuid.uuid4().hex[:6].upper()}",
            "crm_reference": f"CRM-TRS-{uuid.uuid4().hex[:6].upper()}",
            "transaction_date": "2026-01-15"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            data=form_data,
            headers={**auth_headers}
        )
        
        if response.status_code not in [200, 201]:
            print(f"WARNING: Could not create treasury deposit request: {response.text}")
            pytest.skip(f"Could not create treasury deposit request: {response.text}")
        
        result = response.json()
        
        if result.get("status") == "processed" or result.get("transaction_id"):
            tx_id = result.get("transaction_id")
            print(f"  Treasury deposit auto-processed, transaction_id: {tx_id}")
            
            tx_response = requests.get(f"{BASE_URL}/api/transactions/{tx_id}", headers=auth_headers)
            if tx_response.status_code == 200:
                tx = tx_response.json()
                print(f"  Transaction dest_account_id: {tx.get('destination_account_id')}, dest_account_name: {tx.get('destination_account_name')}")
                
                assert tx.get("destination_account_id") == test_treasury["account_id"], "Treasury account ID not set correctly"
                assert tx.get("destination_account_name") == test_treasury["account_name"], f"destination_account_name not populated: expected {test_treasury['account_name']}, got {tx.get('destination_account_name')}"
                print(f"PASS: Treasury deposit correctly populated destination_account_name='{tx.get('destination_account_name')}'")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
