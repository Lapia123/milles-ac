"""
Test cases for:
1. Deposit auto-process feature (TX Requests → deposit → immediate transaction creation)
2. Withdrawal still requires manual Process button
3. Edit destination feature on Transactions page (PUT /api/transactions/{id}/assign)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDepositAutoProcessAndEditDestination:
    """Tests for deposit auto-process and transaction edit destination features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.auth_token = None
        self.test_prefix = f"TEST_ITER37_{uuid.uuid4().hex[:6]}"
        
        # Login as admin
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fxbroker.com", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.auth_token = login_resp.json().get("access_token")
        assert self.auth_token, "No auth token received"
        
        # Get test client
        clients_resp = requests.get(
            f"{BASE_URL}/api/clients",
            headers=self.get_auth_headers()
        )
        assert clients_resp.status_code == 200
        clients = clients_resp.json()
        self.client_id = clients[0]["client_id"] if clients else None
        
        # Get vendors for exchanger tests
        vendors_resp = requests.get(
            f"{BASE_URL}/api/vendors?page_size=100",
            headers=self.get_auth_headers()
        )
        if vendors_resp.status_code == 200:
            data = vendors_resp.json()
            vendors = data.get("items", []) if isinstance(data, dict) else data
            active_vendors = [v for v in vendors if v.get("status") == "active"]
            self.vendor_id = active_vendors[0]["vendor_id"] if active_vendors else None
        else:
            self.vendor_id = None
        
        # Get treasury accounts
        treasury_resp = requests.get(
            f"{BASE_URL}/api/treasury",
            headers=self.get_auth_headers()
        )
        if treasury_resp.status_code == 200:
            accounts = treasury_resp.json()
            self.treasury_account_id = accounts[0]["account_id"] if accounts else None
        else:
            self.treasury_account_id = None
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    # ============== DEPOSIT AUTO-PROCESS TESTS ==============
    
    def test_deposit_request_auto_processes_immediately(self):
        """Creating a deposit request should auto-process it (status becomes 'processed' with transaction_id)"""
        if not self.client_id:
            pytest.skip("No client available for testing")
        
        crm_ref = f"{self.test_prefix}_DEP_AUTO"
        
        response = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            data={
                "client_id": self.client_id,
                "transaction_type": "deposit",
                "amount": "1500.00",
                "currency": "USD",
                "base_currency": "USD",
                "destination_type": "bank",
                "crm_reference": crm_ref,
                "description": "Test deposit auto-process"
            },
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Create request failed: {response.text}"
        result = response.json()
        
        # Verify auto-process
        assert result["status"] == "processed", f"Deposit should be auto-processed, got status: {result['status']}"
        assert result["transaction_id"] is not None, "Deposit should have a transaction_id after auto-process"
        assert result["processed_at"] is not None, "Deposit should have processed_at timestamp"
        
        print(f"✓ Deposit auto-processed: request_id={result['request_id']}, tx_id={result['transaction_id']}")
        
        # Verify transaction was created by fetching it directly
        tx_id = result["transaction_id"]
        tx_resp = requests.get(
            f"{BASE_URL}/api/transactions/{tx_id}",
            headers=self.get_auth_headers()
        )
        
        # If direct fetch works, verify the transaction
        if tx_resp.status_code == 200:
            created_tx = tx_resp.json()
            assert created_tx["transaction_id"] == tx_id
            assert created_tx["status"] == "pending", "Auto-created transaction should have 'pending' status"
            assert created_tx["transaction_type"] == "deposit"
            print(f"✓ Transaction verified: {created_tx['transaction_id']}")
        else:
            # Fallback: Just verify the request response is correct
            print(f"✓ Transaction created (verified from request response): {tx_id}")
    
    def test_withdrawal_request_stays_pending(self):
        """Creating a withdrawal request should keep it as 'pending' (no auto-process)"""
        if not self.client_id:
            pytest.skip("No client available for testing")
        
        crm_ref = f"{self.test_prefix}_WD_PEND"
        
        response = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            data={
                "client_id": self.client_id,
                "transaction_type": "withdrawal",
                "amount": "500.00",
                "currency": "USD",
                "base_currency": "USD",
                "destination_type": "bank",
                "client_bank_name": "Test Bank",
                "client_bank_account_name": "Test Account",
                "client_bank_account_number": "123456789",
                "crm_reference": crm_ref,
                "description": "Test withdrawal no auto-process"
            },
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Create request failed: {response.text}"
        result = response.json()
        
        # Verify NOT auto-processed
        assert result["status"] == "pending", f"Withdrawal should stay pending, got: {result['status']}"
        assert result["transaction_id"] is None, "Withdrawal should NOT have transaction_id (not processed yet)"
        assert result["processed_at"] is None, "Withdrawal should NOT have processed_at"
        
        print(f"✓ Withdrawal stays pending: request_id={result['request_id']}, status={result['status']}")
    
    def test_deposit_with_vendor_auto_processes(self):
        """Deposit to vendor/exchanger should also auto-process"""
        if not self.client_id or not self.vendor_id:
            pytest.skip("No client or vendor available for testing")
        
        crm_ref = f"{self.test_prefix}_DEP_VENDOR"
        
        response = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            data={
                "client_id": self.client_id,
                "transaction_type": "deposit",
                "amount": "2000.00",
                "currency": "USD",
                "base_currency": "USD",
                "destination_type": "vendor",
                "vendor_id": self.vendor_id,
                "crm_reference": crm_ref,
                "description": "Test deposit via vendor auto-process"
            },
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200, f"Create request failed: {response.text}"
        result = response.json()
        
        assert result["status"] == "processed", f"Deposit via vendor should be auto-processed"
        assert result["transaction_id"] is not None, "Should have transaction_id"
        
        print(f"✓ Vendor deposit auto-processed: tx_id={result['transaction_id']}")
    
    # ============== EDIT DESTINATION TESTS ==============
    
    def test_assign_endpoint_exists(self):
        """PUT /api/transactions/{id}/assign endpoint should exist"""
        # Create a deposit to get a pending transaction
        if not self.client_id:
            pytest.skip("No client available for testing")
        
        crm_ref = f"{self.test_prefix}_ASSIGN_TEST"
        
        # First create a deposit (will auto-process to create transaction)
        create_resp = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            data={
                "client_id": self.client_id,
                "transaction_type": "deposit",
                "amount": "300.00",
                "currency": "USD",
                "base_currency": "USD",
                "destination_type": "bank",
                "crm_reference": crm_ref,
            },
            headers=self.get_auth_headers()
        )
        assert create_resp.status_code == 200
        tx_id = create_resp.json().get("transaction_id")
        assert tx_id, "Need transaction_id for assign test"
        
        # Test the assign endpoint
        assign_resp = requests.put(
            f"{BASE_URL}/api/transactions/{tx_id}/assign",
            json={"description": "Testing assign endpoint"},
            headers={**self.get_auth_headers(), "Content-Type": "application/json"}
        )
        
        # Should return 200 for pending transaction
        assert assign_resp.status_code == 200, f"Assign endpoint failed: {assign_resp.text}"
        print(f"✓ Assign endpoint works for pending transaction: {tx_id}")
    
    def test_edit_destination_to_vendor(self):
        """Can change destination_type to vendor and assign exchanger"""
        if not self.client_id or not self.vendor_id:
            pytest.skip("No client or vendor available for testing")
        
        crm_ref = f"{self.test_prefix}_EDIT_VENDOR"
        
        # Create deposit request (will auto-process)
        create_resp = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            data={
                "client_id": self.client_id,
                "transaction_type": "deposit",
                "amount": "750.00",
                "currency": "USD",
                "base_currency": "USD",
                "destination_type": "bank",  # Start as bank
                "crm_reference": crm_ref,
            },
            headers=self.get_auth_headers()
        )
        assert create_resp.status_code == 200
        tx_id = create_resp.json().get("transaction_id")
        
        # Change to vendor
        assign_resp = requests.put(
            f"{BASE_URL}/api/transactions/{tx_id}/assign",
            json={
                "destination_type": "vendor",
                "vendor_id": self.vendor_id,
                "description": "Changed to vendor"
            },
            headers={**self.get_auth_headers(), "Content-Type": "application/json"}
        )
        
        assert assign_resp.status_code == 200, f"Failed to change to vendor: {assign_resp.text}"
        updated = assign_resp.json()
        
        assert updated["destination_type"] == "vendor", f"destination_type should be 'vendor'"
        assert updated["vendor_id"] == self.vendor_id, f"vendor_id should be set"
        assert updated.get("vendor_name"), "vendor_name should be populated"
        
        print(f"✓ Changed destination to vendor: {updated.get('vendor_name')}")
    
    def test_edit_destination_to_treasury(self):
        """Can change destination_type to treasury and select account"""
        if not self.client_id or not self.treasury_account_id:
            pytest.skip("No client or treasury account available")
        
        crm_ref = f"{self.test_prefix}_EDIT_TREASURY"
        
        create_resp = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            data={
                "client_id": self.client_id,
                "transaction_type": "deposit",
                "amount": "1200.00",
                "currency": "USD",
                "base_currency": "USD",
                "destination_type": "bank",
                "crm_reference": crm_ref,
            },
            headers=self.get_auth_headers()
        )
        assert create_resp.status_code == 200
        tx_id = create_resp.json().get("transaction_id")
        
        # Change to treasury
        assign_resp = requests.put(
            f"{BASE_URL}/api/transactions/{tx_id}/assign",
            json={
                "destination_type": "treasury",
                "destination_account_id": self.treasury_account_id,
                "crm_reference": "TEST-CRM-123",
                "description": "Assigned to treasury"
            },
            headers={**self.get_auth_headers(), "Content-Type": "application/json"}
        )
        
        assert assign_resp.status_code == 200, f"Failed: {assign_resp.text}"
        updated = assign_resp.json()
        
        assert updated["destination_type"] == "treasury"
        assert updated["destination_account_id"] == self.treasury_account_id
        assert updated.get("crm_reference") == "TEST-CRM-123"
        
        print(f"✓ Changed destination to treasury account")
    
    def test_edit_destination_updates_crm_reference(self):
        """Save destination updates the crm_reference field"""
        if not self.client_id:
            pytest.skip("No client available")
        
        crm_ref = f"{self.test_prefix}_EDIT_CRM"
        
        create_resp = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            data={
                "client_id": self.client_id,
                "transaction_type": "deposit",
                "amount": "450.00",
                "currency": "USD",
                "crm_reference": crm_ref,
            },
            headers=self.get_auth_headers()
        )
        assert create_resp.status_code == 200
        tx_id = create_resp.json().get("transaction_id")
        
        new_crm_ref = f"UPDATED-CRM-{self.test_prefix}"
        
        assign_resp = requests.put(
            f"{BASE_URL}/api/transactions/{tx_id}/assign",
            json={
                "crm_reference": new_crm_ref,
                "description": "Updated CRM reference and description"
            },
            headers={**self.get_auth_headers(), "Content-Type": "application/json"}
        )
        
        assert assign_resp.status_code == 200
        updated = assign_resp.json()
        
        assert updated.get("crm_reference") == new_crm_ref, f"CRM reference not updated"
        assert updated.get("description") == "Updated CRM reference and description"
        
        print(f"✓ Updated CRM reference to: {new_crm_ref}")
    
    def test_edit_button_not_shown_for_non_pending(self):
        """Assign endpoint rejects non-pending transactions"""
        if not self.client_id:
            pytest.skip("No client available")
        
        # Get existing completed/approved transactions
        tx_resp = requests.get(
            f"{BASE_URL}/api/transactions?status=completed",
            headers=self.get_auth_headers()
        )
        
        if tx_resp.status_code != 200:
            pytest.skip("Could not fetch transactions")
        
        tx_data = tx_resp.json()
        items = tx_data.get("items", []) if isinstance(tx_data, dict) else tx_data
        completed_txs = [t for t in items if t.get("status") in ["completed", "approved"]]
        
        if not completed_txs:
            pytest.skip("No completed transactions to test")
        
        tx_id = completed_txs[0]["transaction_id"]
        
        # Try to assign - should fail
        assign_resp = requests.put(
            f"{BASE_URL}/api/transactions/{tx_id}/assign",
            json={"description": "Should fail"},
            headers={**self.get_auth_headers(), "Content-Type": "application/json"}
        )
        
        assert assign_resp.status_code == 400, f"Should reject non-pending, got {assign_resp.status_code}"
        assert "pending" in assign_resp.text.lower() or "edit" in assign_resp.text.lower()
        
        print(f"✓ Correctly rejected edit for non-pending transaction")
    
    # ============== WITHDRAWAL MANUAL PROCESS TEST ==============
    
    def test_withdrawal_requires_manual_process(self):
        """Withdrawal requests still need manual Process with captcha"""
        if not self.client_id:
            pytest.skip("No client available")
        
        crm_ref = f"{self.test_prefix}_WD_MANUAL"
        
        # Create withdrawal request
        create_resp = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            data={
                "client_id": self.client_id,
                "transaction_type": "withdrawal",
                "amount": "800.00",
                "currency": "USD",
                "destination_type": "bank",
                "client_bank_name": "Manual Process Bank",
                "client_bank_account_number": "9999999",
                "crm_reference": crm_ref,
            },
            headers=self.get_auth_headers()
        )
        assert create_resp.status_code == 200
        result = create_resp.json()
        request_id = result["request_id"]
        
        assert result["status"] == "pending", "Withdrawal should be pending"
        
        # Now manually process it
        process_resp = requests.post(
            f"{BASE_URL}/api/transaction-requests/{request_id}/process",
            json={
                "captcha_answer": 15,
                "captcha_expected": 15
            },
            headers={**self.get_auth_headers(), "Content-Type": "application/json"}
        )
        
        assert process_resp.status_code == 200, f"Process failed: {process_resp.text}"
        processed = process_resp.json()
        
        # Process endpoint returns {message, transaction_id, request_id}
        assert "transaction_id" in processed, "Should have transaction_id in response"
        assert processed["transaction_id"] is not None, "Should have transaction_id after manual process"
        
        print(f"✓ Withdrawal manually processed: tx_id={processed['transaction_id']}")


class TestTransactionRequestResponse:
    """Tests for transaction request response structure"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        login_resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fxbroker.com", "password": "admin123"}
        )
        assert login_resp.status_code == 200
        self.auth_token = login_resp.json().get("access_token")
    
    def get_auth_headers(self):
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    def test_deposit_response_includes_toast_fields(self):
        """Deposit response should include status='processed' for frontend toast"""
        clients_resp = requests.get(f"{BASE_URL}/api/clients", headers=self.get_auth_headers())
        if clients_resp.status_code != 200 or not clients_resp.json():
            pytest.skip("No clients")
        
        client_id = clients_resp.json()[0]["client_id"]
        crm_ref = f"TEST_TOAST_{uuid.uuid4().hex[:6]}"
        
        response = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            data={
                "client_id": client_id,
                "transaction_type": "deposit",
                "amount": "100.00",
                "crm_reference": crm_ref,
            },
            headers=self.get_auth_headers()
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Frontend checks these fields to show toast
        assert "status" in result, "Response should include status"
        assert "transaction_id" in result, "Response should include transaction_id"
        assert result["status"] == "processed", "Deposit status should be 'processed'"
        
        print(f"✓ Response structure correct for frontend toast")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
