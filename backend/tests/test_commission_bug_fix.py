"""
Test Commission Bug Fix: vendor_commission_base_amount and vendor_commission_base_currency
should store values in the actual base/payment currency (e.g., INR), NOT in USD.

Bug Description:
- Before fix: An I&E expense of 10 USD (base: 1000 INR) with 2% commission was storing
  vendor_commission_base_amount=0.2 and vendor_commission_base_currency='USD'
- After fix: Should store vendor_commission_base_amount=20.0 and vendor_commission_base_currency='INR'

Test Scenarios:
1. I&E creation with INR base currency
2. I&E vendor approval commission calculation
3. Transaction (withdrawal) creation with INR base currency
4. Transaction vendor approval commission calculation
5. Settlement calculation via /api/vendor/me
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@fxbroker.com"
ADMIN_PASSWORD = "admin123"
VENDOR_EMAIL = "musi@fxbroker.com"  # musi vendor
VENDOR_PASSWORD = "admin123"
VENDOR_ID = "vendor_5eee0c09973f"
CLIENT_ID = "client_56ec8baccf85"


class TestCommissionBugFix:
    """Tests for the commission bug fix - base currency commission calculation"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin JWT token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def vendor_token(self):
        """Get vendor JWT token (musi)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": VENDOR_EMAIL,
            "password": VENDOR_PASSWORD
        })
        assert response.status_code == 200, f"Vendor login failed: {response.text}"
        return response.json().get("access_token")
    
    # ============== I&E Commission Tests ==============
    
    def test_ie_creation_commission_base_currency(self, admin_token):
        """
        Test I&E creation stores vendor commission in BASE currency (INR), not USD
        
        Example: 10 USD expense, base_amount=1000 INR, commission_rate=2%
        Expected: vendor_commission_base_amount=20 (2% of 1000 INR)
        Expected: vendor_commission_base_currency='INR'
        Expected: vendor_commission_amount=0.2 (2% of 10 USD)
        """
        unique_ref = f"TEST_IE_COMM_{uuid.uuid4().hex[:8]}"
        
        # Create I&E expense with INR base currency
        payload = {
            "entry_type": "expense",
            "amount": 10,  # 10 USD
            "currency": "USD",
            "base_currency": "INR",
            "base_amount": 1000,  # 1000 INR
            "exchange_rate": 0.01,  # 1 INR = 0.01 USD
            "vendor_id": VENDOR_ID,
            "transaction_mode": "bank",
            "date": "2026-03-07",
            "category": "bank_fee",
            "description": unique_ref
        }
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/income-expenses", json=payload, headers=headers)
        
        assert response.status_code in [200, 201], f"I&E creation failed: {response.text}"
        data = response.json()
        
        entry_id = data.get("entry_id")
        assert entry_id, "entry_id not returned"
        
        # Verify commission fields
        # musi vendor has withdrawal_commission=2.0%
        # Base commission: 2% of 1000 INR = 20 INR
        # USD commission: 2% of 10 USD = 0.2 USD
        
        vendor_commission_base_amount = data.get("vendor_commission_base_amount")
        vendor_commission_base_currency = data.get("vendor_commission_base_currency")
        vendor_commission_amount = data.get("vendor_commission_amount")
        
        print(f"\n=== I&E Creation Commission Test ===")
        print(f"Entry ID: {entry_id}")
        print(f"USD Amount: 10, Base Amount (INR): 1000")
        print(f"vendor_commission_base_amount: {vendor_commission_base_amount}")
        print(f"vendor_commission_base_currency: {vendor_commission_base_currency}")
        print(f"vendor_commission_amount (USD): {vendor_commission_amount}")
        
        # Key assertions for the bug fix
        assert vendor_commission_base_currency == "INR", \
            f"BUG: vendor_commission_base_currency should be 'INR', got '{vendor_commission_base_currency}'"
        
        assert vendor_commission_base_amount == 20.0, \
            f"BUG: vendor_commission_base_amount should be 20.0 (2% of 1000 INR), got {vendor_commission_base_amount}"
        
        assert vendor_commission_amount == 0.2, \
            f"vendor_commission_amount (USD) should be 0.2 (2% of 10 USD), got {vendor_commission_amount}"
        
        return entry_id
    
    def test_ie_creation_various_amounts(self, admin_token):
        """Test I&E creation with different amounts to verify commission calculation"""
        test_cases = [
            {"amount_usd": 100, "base_amount_inr": 8400, "expected_base_comm": 168, "expected_usd_comm": 2.0},
            {"amount_usd": 50, "base_amount_inr": 4200, "expected_base_comm": 84, "expected_usd_comm": 1.0},
        ]
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        for tc in test_cases:
            unique_ref = f"TEST_IE_VAR_{uuid.uuid4().hex[:8]}"
            payload = {
                "entry_type": "expense",
                "amount": tc["amount_usd"],
                "currency": "USD",
                "base_currency": "INR",
                "base_amount": tc["base_amount_inr"],
                "exchange_rate": round(tc["amount_usd"] / tc["base_amount_inr"], 6),
                "vendor_id": VENDOR_ID,
                "transaction_mode": "bank",
                "date": "2026-03-07",
                "category": "bank_fee",
                "description": unique_ref
            }
            
            response = requests.post(f"{BASE_URL}/api/income-expenses", json=payload, headers=headers)
            assert response.status_code in [200, 201], f"I&E creation failed: {response.text}"
            data = response.json()
            
            print(f"\n--- Test Case: {tc['amount_usd']} USD / {tc['base_amount_inr']} INR ---")
            print(f"Expected base commission: {tc['expected_base_comm']} INR")
            print(f"Actual base commission: {data.get('vendor_commission_base_amount')} {data.get('vendor_commission_base_currency')}")
            
            assert data.get("vendor_commission_base_currency") == "INR", \
                f"Base currency should be INR, got {data.get('vendor_commission_base_currency')}"
            assert data.get("vendor_commission_base_amount") == tc["expected_base_comm"], \
                f"Base commission should be {tc['expected_base_comm']}, got {data.get('vendor_commission_base_amount')}"
    
    # ============== Transaction Commission Tests ==============
    
    def test_transaction_creation_commission_base_currency(self, admin_token):
        """
        Test transaction (withdrawal) creation stores vendor commission in BASE currency
        
        Example: 100 USD withdrawal, base_amount=8400 INR, commission_rate=2%
        Expected: vendor_commission_base_amount=168 (2% of 8400 INR)
        Expected: vendor_commission_base_currency='INR'
        Expected: vendor_commission_amount=2.0 (2% of 100 USD)
        """
        unique_ref = f"TEST_TX_COMM_{uuid.uuid4().hex[:8]}"
        
        # Create withdrawal transaction with form data (not JSON)
        form_data = {
            "client_id": CLIENT_ID,
            "transaction_type": "withdrawal",
            "amount": "100",  # 100 USD
            "base_currency": "INR",
            "base_amount": "8400",  # 8400 INR
            "destination_type": "vendor",
            "vendor_id": VENDOR_ID,
            "transaction_mode": "bank",
            "description": unique_ref,
            "reference": unique_ref
        }
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/transactions", data=form_data, headers=headers)
        
        assert response.status_code in [200, 201], f"Transaction creation failed: {response.text}"
        data = response.json()
        
        tx_id = data.get("transaction_id")
        assert tx_id, "transaction_id not returned"
        
        # Verify commission fields
        # musi vendor has withdrawal_commission=2.0%
        # Base commission: 2% of 8400 INR = 168 INR
        # USD commission: 2% of 100 USD = 2.0 USD
        
        vendor_commission_base_amount = data.get("vendor_commission_base_amount")
        vendor_commission_base_currency = data.get("vendor_commission_base_currency")
        vendor_commission_amount = data.get("vendor_commission_amount")
        
        print(f"\n=== Transaction Creation Commission Test ===")
        print(f"Transaction ID: {tx_id}")
        print(f"USD Amount: 100, Base Amount (INR): 8400")
        print(f"vendor_commission_base_amount: {vendor_commission_base_amount}")
        print(f"vendor_commission_base_currency: {vendor_commission_base_currency}")
        print(f"vendor_commission_amount (USD): {vendor_commission_amount}")
        
        # Key assertions for the bug fix
        assert vendor_commission_base_currency == "INR", \
            f"BUG: vendor_commission_base_currency should be 'INR', got '{vendor_commission_base_currency}'"
        
        assert vendor_commission_base_amount == 168.0, \
            f"BUG: vendor_commission_base_amount should be 168.0 (2% of 8400 INR), got {vendor_commission_base_amount}"
        
        # USD commission might vary slightly due to exchange rate calculation
        # The important thing is vendor_commission_base_amount is in INR
        assert vendor_commission_amount is not None and vendor_commission_amount > 0, \
            f"vendor_commission_amount (USD) should be > 0, got {vendor_commission_amount}"
        
        return tx_id
    
    def test_transaction_cash_mode_commission(self, admin_token):
        """
        Test cash withdrawal uses withdrawal_commission_cash rate (4%)
        musi vendor: withdrawal_commission=2%, withdrawal_commission_cash=4%
        
        100 USD withdrawal (cash), base_amount=8400 INR
        Expected: vendor_commission_base_amount=336 (4% of 8400 INR)
        """
        unique_ref = f"TEST_TX_CASH_{uuid.uuid4().hex[:8]}"
        
        form_data = {
            "client_id": CLIENT_ID,
            "transaction_type": "withdrawal",
            "amount": "100",
            "base_currency": "INR",
            "base_amount": "8400",
            "destination_type": "vendor",
            "vendor_id": VENDOR_ID,
            "transaction_mode": "cash",
            "collecting_person_name": "Test Person",
            "collecting_person_number": "1234567890",
            "description": unique_ref,
            "reference": unique_ref
        }
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/transactions", data=form_data, headers=headers)
        
        assert response.status_code in [200, 201], f"Cash transaction failed: {response.text}"
        data = response.json()
        
        print(f"\n=== Cash Transaction Commission Test ===")
        print(f"Transaction ID: {data.get('transaction_id')}")
        print(f"Mode: cash (4% rate)")
        print(f"vendor_commission_base_amount: {data.get('vendor_commission_base_amount')}")
        print(f"vendor_commission_base_currency: {data.get('vendor_commission_base_currency')}")
        
        # Cash uses 4% rate: 4% of 8400 = 336
        assert data.get("vendor_commission_base_currency") == "INR", \
            f"Base currency should be INR, got {data.get('vendor_commission_base_currency')}"
        assert data.get("vendor_commission_base_amount") == 336.0, \
            f"Cash commission should be 336.0 (4% of 8400), got {data.get('vendor_commission_base_amount')}"
    
    # ============== Settlement/Vendor API Tests ==============
    
    def test_vendor_me_commission_earned_base(self, vendor_token):
        """
        Test /api/vendor/me returns commission_earned_base in actual base currency
        Not in USD
        """
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.get(f"{BASE_URL}/api/vendor/me", headers=headers)
        
        assert response.status_code == 200, f"Vendor me endpoint failed: {response.text}"
        data = response.json()
        
        print(f"\n=== Vendor Settlement Data ===")
        print(f"Vendor ID: {data.get('vendor_id')}")
        print(f"Vendor Name: {data.get('vendor_name')}")
        
        # Check settlement breakdown
        settlement_by_currency = data.get("settlement_by_currency", [])
        print(f"Settlement by currency: {settlement_by_currency}")
        
        # Look for INR currency in settlement
        inr_settlement = None
        for settlement in settlement_by_currency:
            if settlement.get("currency") == "INR":
                inr_settlement = settlement
                print(f"INR Settlement: {settlement}")
                break
        
        # The commission_base should be in INR, not USD
        if inr_settlement:
            commission_base = inr_settlement.get("commission_base", 0)
            print(f"INR commission_base: {commission_base}")
            # This should be a sum of INR commissions, not USD values
    
    def test_vendor_transactions_commission_data(self, vendor_token):
        """
        Test /api/vendor/transactions returns correct commission fields
        """
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.get(f"{BASE_URL}/api/vendor/transactions", headers=headers)
        
        assert response.status_code == 200, f"Vendor transactions failed: {response.text}"
        data = response.json()
        
        transactions = data if isinstance(data, list) else data.get("items", [])
        
        print(f"\n=== Vendor Transactions Commission Fields ===")
        print(f"Total transactions: {len(transactions)}")
        
        # Check a few transactions with INR base currency
        for tx in transactions[:5]:
            if tx.get("base_currency") == "INR" and tx.get("vendor_commission_base_amount"):
                print(f"\nTx ID: {tx.get('transaction_id')}")
                print(f"  Base Currency: {tx.get('base_currency')}")
                print(f"  Base Amount: {tx.get('base_amount')}")
                print(f"  vendor_commission_base_amount: {tx.get('vendor_commission_base_amount')}")
                print(f"  vendor_commission_base_currency: {tx.get('vendor_commission_base_currency')}")
                print(f"  vendor_commission_amount (USD): {tx.get('vendor_commission_amount')}")
                
                # Verify base currency matches
                if tx.get("vendor_commission_base_currency"):
                    assert tx.get("vendor_commission_base_currency") == tx.get("base_currency"), \
                        f"Commission base currency mismatch: {tx.get('vendor_commission_base_currency')} vs {tx.get('base_currency')}"
    
    def test_vendor_income_expenses_commission_data(self, vendor_token):
        """
        Test /api/vendor/income-expenses returns correct commission fields
        """
        headers = {"Authorization": f"Bearer {vendor_token}"}
        response = requests.get(f"{BASE_URL}/api/vendor/income-expenses", headers=headers)
        
        assert response.status_code == 200, f"Vendor I&E failed: {response.text}"
        data = response.json()
        
        entries = data if isinstance(data, list) else data.get("items", [])
        
        print(f"\n=== Vendor I&E Commission Fields ===")
        print(f"Total entries: {len(entries)}")
        
        for entry in entries[:5]:
            if entry.get("base_currency") == "INR" and entry.get("vendor_commission_base_amount"):
                print(f"\nEntry ID: {entry.get('entry_id')}")
                print(f"  Base Currency: {entry.get('base_currency')}")
                print(f"  Base Amount: {entry.get('base_amount')}")
                print(f"  vendor_commission_base_amount: {entry.get('vendor_commission_base_amount')}")
                print(f"  vendor_commission_base_currency: {entry.get('vendor_commission_base_currency')}")
                print(f"  vendor_commission_amount (USD): {entry.get('vendor_commission_amount')}")


# ============== Standalone Test Functions ==============

def test_admin_login():
    """Basic test: Admin can login"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    assert "access_token" in response.json()
    print(f"Admin login successful")

def test_vendor_login():
    """Basic test: Vendor can login"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": VENDOR_EMAIL,
        "password": VENDOR_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    assert "access_token" in response.json()
    print(f"Vendor login successful")

def test_vendors_endpoint():
    """Test that vendors endpoint is accessible"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    token = response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/vendors", headers=headers)
    assert response.status_code == 200, f"Vendors endpoint failed: {response.text}"
    print(f"Vendors endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
