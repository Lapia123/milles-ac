"""
Test Transaction and Transaction Request Creation Bug Fixes
============================================================
Tests for:
1. /api/transaction-requests/pending-count endpoint (was returning 404 before fix)
2. Transaction creation via FormData
3. Transaction Request creation (deposit auto-process, withdrawal stays pending)
4. Duplicate detection with informative error message
5. Validation error handling
"""

import pytest
import requests
import os
import random
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://accounting-suite-26.preview.emergentagent.com')

class TestTransactionCreationFixes:
    """Tests for transaction and transaction request creation bug fixes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get test data
        clients_resp = requests.get(f"{BASE_URL}/api/clients?page_size=1", headers=self.headers)
        assert clients_resp.status_code == 200
        clients_data = clients_resp.json()
        self.client_id = clients_data["items"][0]["client_id"] if "items" in clients_data else clients_data[0]["client_id"]
        
        psps_resp = requests.get(f"{BASE_URL}/api/psp", headers=self.headers)
        assert psps_resp.status_code == 200
        self.psp_id = psps_resp.json()[0]["psp_id"]
    
    def test_pending_count_endpoint_returns_200(self):
        """Test that /api/transaction-requests/pending-count returns 200 (was 404 before fix)"""
        response = requests.get(f"{BASE_URL}/api/transaction-requests/pending-count", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "count" in data, "Response should contain 'count' field"
        assert isinstance(data["count"], int), "Count should be an integer"
        print(f"✓ Pending count endpoint works: {data['count']} pending requests")
    
    def test_create_transaction_deposit_to_psp(self):
        """Test creating a new transaction (deposit to PSP) via FormData"""
        unique_amount = random.randint(1000, 9999)
        
        response = requests.post(
            f"{BASE_URL}/api/transactions",
            headers=self.headers,
            data={
                "client_id": self.client_id,
                "transaction_type": "deposit",
                "amount": unique_amount,
                "currency": "USD",
                "base_currency": "USD",
                "destination_type": "psp",
                "psp_id": self.psp_id,
                "commission_paid_by": "client",
                "description": "Test deposit to PSP - pytest",
                "reference": f"TEST-TX-{int(time.time())}"
            }
        )
        
        assert response.status_code == 200, f"Transaction creation failed: {response.text}"
        data = response.json()
        assert "transaction_id" in data, "Response should contain transaction_id"
        assert data["status"] == "pending", "New transaction should have pending status"
        assert data["transaction_type"] == "deposit"
        assert data["destination_type"] == "psp"
        assert data["psp_id"] == self.psp_id
        print(f"✓ Transaction created: {data['transaction_id']}")
    
    def test_create_transaction_request_deposit_auto_process(self):
        """Test that deposit transaction requests are auto-processed"""
        unique_amount = random.randint(1000, 9999)
        
        response = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            headers=self.headers,
            data={
                "client_id": self.client_id,
                "transaction_type": "deposit",
                "amount": unique_amount,
                "currency": "USD",
                "base_currency": "USD",
                "destination_type": "psp",
                "psp_id": self.psp_id,
                "description": "Test deposit request - auto-process",
                "reference": f"TXREQ-DEP-{int(time.time())}"
            }
        )
        
        assert response.status_code == 200, f"TX Request creation failed: {response.text}"
        data = response.json()
        assert "request_id" in data, "Response should contain request_id"
        assert data["status"] == "processed", "Deposit request should be auto-processed"
        assert data["transaction_id"] is not None, "Auto-processed request should have transaction_id"
        print(f"✓ Deposit request auto-processed: {data['request_id']} -> {data['transaction_id']}")
    
    def test_create_transaction_request_withdrawal_stays_pending(self):
        """Test that withdrawal transaction requests stay pending"""
        unique_amount = random.randint(1000, 9999)
        
        response = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            headers=self.headers,
            data={
                "client_id": self.client_id,
                "transaction_type": "withdrawal",
                "amount": unique_amount,
                "currency": "USD",
                "base_currency": "USD",
                "destination_type": "bank",
                "client_bank_name": "Test Bank",
                "client_bank_account_name": "Test Account",
                "client_bank_account_number": "1234567890",
                "description": "Test withdrawal request - should stay pending",
                "reference": f"TXREQ-WDR-{int(time.time())}"
            }
        )
        
        assert response.status_code == 200, f"TX Request creation failed: {response.text}"
        data = response.json()
        assert "request_id" in data, "Response should contain request_id"
        assert data["status"] == "pending", "Withdrawal request should stay pending"
        assert data["transaction_id"] is None, "Pending request should not have transaction_id"
        print(f"✓ Withdrawal request stays pending: {data['request_id']}")
    
    def test_duplicate_detection_with_informative_error(self):
        """Test that duplicate detection returns informative error message"""
        unique_amount = random.randint(1000, 9999)
        
        # First transaction - should succeed
        response1 = requests.post(
            f"{BASE_URL}/api/transactions",
            headers=self.headers,
            data={
                "client_id": self.client_id,
                "transaction_type": "deposit",
                "amount": unique_amount,
                "currency": "USD",
                "base_currency": "USD",
                "destination_type": "psp",
                "psp_id": self.psp_id,
                "commission_paid_by": "client",
                "description": "Duplicate test 1"
            }
        )
        assert response1.status_code == 200, f"First transaction failed: {response1.text}"
        first_tx_id = response1.json()["transaction_id"]
        
        # Second transaction with same details - should fail with duplicate error
        response2 = requests.post(
            f"{BASE_URL}/api/transactions",
            headers=self.headers,
            data={
                "client_id": self.client_id,
                "transaction_type": "deposit",
                "amount": unique_amount,
                "currency": "USD",
                "base_currency": "USD",
                "destination_type": "psp",
                "psp_id": self.psp_id,
                "commission_paid_by": "client",
                "description": "Duplicate test 2"
            }
        )
        
        assert response2.status_code == 400, f"Expected 400 for duplicate, got {response2.status_code}"
        error_data = response2.json()
        assert "detail" in error_data
        assert "duplicate" in error_data["detail"].lower() or "similar" in error_data["detail"].lower()
        assert first_tx_id in error_data["detail"], "Error should reference the original transaction ID"
        print(f"✓ Duplicate detection works with informative error: {error_data['detail'][:80]}...")
    
    def test_validation_error_missing_client_id(self):
        """Test validation error when client_id is missing"""
        response = requests.post(
            f"{BASE_URL}/api/transactions",
            headers=self.headers,
            data={
                "transaction_type": "deposit",
                "amount": 1000,
                "currency": "USD",
                "destination_type": "psp",
                "psp_id": self.psp_id
            }
        )
        
        assert response.status_code == 422, f"Expected 422 for validation error, got {response.status_code}"
        error_data = response.json()
        assert "detail" in error_data
        # Validation errors come as array
        if isinstance(error_data["detail"], list):
            error_msgs = [e.get("msg", "") for e in error_data["detail"]]
            assert any("required" in msg.lower() for msg in error_msgs), "Should indicate field is required"
        print(f"✓ Validation error for missing client_id handled correctly")
    
    def test_validation_error_missing_amount(self):
        """Test validation error when amount is missing"""
        response = requests.post(
            f"{BASE_URL}/api/transactions",
            headers=self.headers,
            data={
                "client_id": self.client_id,
                "transaction_type": "deposit",
                "currency": "USD",
                "destination_type": "psp",
                "psp_id": self.psp_id
            }
        )
        
        assert response.status_code == 422, f"Expected 422 for validation error, got {response.status_code}"
        error_data = response.json()
        assert "detail" in error_data
        print(f"✓ Validation error for missing amount handled correctly")
    
    def test_transaction_requests_list_endpoint(self):
        """Test that transaction requests list endpoint works"""
        response = requests.get(f"{BASE_URL}/api/transaction-requests?page_size=10", headers=self.headers)
        
        assert response.status_code == 200, f"TX Requests list failed: {response.text}"
        data = response.json()
        assert "items" in data, "Response should contain 'items'"
        assert "total" in data, "Response should contain 'total'"
        assert "total_pages" in data, "Response should contain 'total_pages'"
        print(f"✓ TX Requests list works: {data['total']} total requests")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
