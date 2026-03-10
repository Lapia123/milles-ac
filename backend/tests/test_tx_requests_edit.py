"""
Test Transaction Requests Page Changes:
1. Verify PUT /api/transaction-requests/{id} accepts editing fields (amount, base_currency, base_amount, exchange_rate)
2. Test create new request
3. Test filter by status
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

class TestTransactionRequestsEdit:
    """Test transaction requests edit functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get token"""
        res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com", "password": "admin123"
        })
        assert res.status_code == 200, f"Login failed: {res.text}"
        return res.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def client_id(self, headers):
        """Get a valid client_id"""
        res = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        assert res.status_code == 200
        clients = res.json()
        return clients[0]["client_id"] if clients else None
    
    def test_login_success(self, auth_token):
        """Test login works"""
        assert auth_token, "Auth token should be non-empty"
        print("Login successful")
    
    def test_get_transaction_requests(self, headers):
        """Test GET /api/transaction-requests"""
        res = requests.get(f"{BASE_URL}/api/transaction-requests", headers=headers)
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "items" in data, "Response should contain 'items'"
        print(f"Found {len(data['items'])} transaction requests")
    
    def test_filter_requests_by_status_pending(self, headers):
        """Test filter by status=pending"""
        res = requests.get(f"{BASE_URL}/api/transaction-requests?status=pending", headers=headers)
        assert res.status_code == 200
        data = res.json()
        for item in data.get("items", []):
            assert item["status"] == "pending", f"Found non-pending item: {item['status']}"
        print(f"Filter by pending works: {len(data.get('items', []))} pending requests")
    
    def test_filter_requests_by_status_processed(self, headers):
        """Test filter by status=processed"""
        res = requests.get(f"{BASE_URL}/api/transaction-requests?status=processed", headers=headers)
        assert res.status_code == 200
        data = res.json()
        for item in data.get("items", []):
            assert item["status"] == "processed", f"Found non-processed item: {item['status']}"
        print(f"Filter by processed works: {len(data.get('items', []))} processed requests")
    
    def test_create_pending_request(self, headers, client_id):
        """Create a new pending request with bank destination"""
        if not client_id:
            pytest.skip("No client found")
        
        unique_ref = f"TEST-CRM-{uuid.uuid4().hex[:8]}"
        payload = {
            "transaction_type": "withdrawal",
            "client_id": client_id,
            "amount": "500",
            "currency": "USD",
            "base_currency": "USD",
            "destination_type": "bank",
            "description": "Test withdrawal request",
            "crm_reference": unique_ref,
            "client_bank_name": "Test Bank",
            "client_bank_account_name": "Test Account Holder",
            "client_bank_account_number": "1234567890"
        }
        # Using form data since that's how the API expects it
        res = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            headers={"Authorization": headers["Authorization"]},
            data=payload
        )
        assert res.status_code in [200, 201], f"Create failed: {res.text}"
        data = res.json()
        assert data.get("status") == "pending", "New request should be pending"
        assert data.get("request_id"), "Should have request_id"
        print(f"Created pending request: {data['request_id']}")
        return data
    
    def test_edit_pending_request_amount(self, headers, client_id):
        """Create and edit a pending request - change amount"""
        if not client_id:
            pytest.skip("No client found")
        
        # Create new pending request first
        unique_ref = f"TEST-EDIT-{uuid.uuid4().hex[:8]}"
        create_res = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            headers={"Authorization": headers["Authorization"]},
            data={
                "transaction_type": "withdrawal",
                "client_id": client_id,
                "amount": "100",
                "currency": "USD",
                "base_currency": "USD",
                "destination_type": "bank",
                "crm_reference": unique_ref,
                "client_bank_name": "Edit Test Bank",
                "client_bank_account_number": "9999888877"
            }
        )
        assert create_res.status_code in [200, 201], f"Create failed: {create_res.text}"
        req = create_res.json()
        request_id = req["request_id"]
        
        # Now edit the amount
        edit_res = requests.put(
            f"{BASE_URL}/api/transaction-requests/{request_id}",
            headers=headers,
            json={"amount": 250}
        )
        assert edit_res.status_code == 200, f"Edit amount failed: {edit_res.text}"
        updated = edit_res.json()
        assert updated["amount"] == 250, f"Amount not updated: {updated.get('amount')}"
        print(f"Amount updated from 100 to 250 for request {request_id}")
    
    def test_edit_pending_request_base_currency(self, headers, client_id):
        """Edit pending request - change base_currency to non-USD with exchange rate"""
        if not client_id:
            pytest.skip("No client found")
        
        # Create request
        unique_ref = f"TEST-CUR-{uuid.uuid4().hex[:8]}"
        create_res = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            headers={"Authorization": headers["Authorization"]},
            data={
                "transaction_type": "withdrawal",
                "client_id": client_id,
                "amount": "100",
                "currency": "USD",
                "base_currency": "USD",
                "destination_type": "bank",
                "crm_reference": unique_ref,
                "client_bank_name": "Currency Test Bank",
                "client_bank_account_number": "1122334455"
            }
        )
        assert create_res.status_code in [200, 201]
        request_id = create_res.json()["request_id"]
        
        # Edit to EUR with exchange rate
        edit_res = requests.put(
            f"{BASE_URL}/api/transaction-requests/{request_id}",
            headers=headers,
            json={
                "base_currency": "EUR",
                "base_amount": 92.5,
                "exchange_rate": 1.08,
                "amount": 99.9  # 92.5 * 1.08
            }
        )
        assert edit_res.status_code == 200, f"Edit currency failed: {edit_res.text}"
        updated = edit_res.json()
        assert updated["base_currency"] == "EUR", f"base_currency not updated"
        assert updated["base_amount"] == 92.5, f"base_amount not updated"
        assert updated["exchange_rate"] == 1.08, f"exchange_rate not updated"
        print(f"Currency fields updated: base_currency=EUR, base_amount=92.5, rate=1.08")
    
    def test_edit_pending_request_destination(self, headers, client_id):
        """Edit pending request - change destination_type and bank details"""
        if not client_id:
            pytest.skip("No client found")
        
        # Create request
        unique_ref = f"TEST-DEST-{uuid.uuid4().hex[:8]}"
        create_res = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            headers={"Authorization": headers["Authorization"]},
            data={
                "transaction_type": "withdrawal",
                "client_id": client_id,
                "amount": "200",
                "currency": "USD",
                "destination_type": "bank",
                "crm_reference": unique_ref,
                "client_bank_name": "Old Bank",
                "client_bank_account_number": "OLD123"
            }
        )
        assert create_res.status_code in [200, 201]
        request_id = create_res.json()["request_id"]
        
        # Edit destination
        edit_res = requests.put(
            f"{BASE_URL}/api/transaction-requests/{request_id}",
            headers=headers,
            json={
                "destination_type": "usdt",
                "client_usdt_address": "TRX123ABC456DEF789",
                "client_usdt_network": "TRC20"
            }
        )
        assert edit_res.status_code == 200, f"Edit destination failed: {edit_res.text}"
        updated = edit_res.json()
        assert updated["destination_type"] == "usdt"
        assert updated["client_usdt_address"] == "TRX123ABC456DEF789"
        assert updated["client_usdt_network"] == "TRC20"
        print(f"Destination changed from bank to USDT for request {request_id}")
    
    def test_cannot_edit_processed_request(self, headers):
        """Verify processed requests cannot be edited"""
        # Get a processed request
        res = requests.get(f"{BASE_URL}/api/transaction-requests?status=processed", headers=headers)
        assert res.status_code == 200
        data = res.json()
        processed_items = data.get("items", [])
        
        if not processed_items:
            pytest.skip("No processed requests found")
        
        processed_req = processed_items[0]
        request_id = processed_req["request_id"]
        
        # Try to edit it
        edit_res = requests.put(
            f"{BASE_URL}/api/transaction-requests/{request_id}",
            headers=headers,
            json={"amount": 999999}
        )
        assert edit_res.status_code == 400, f"Should fail to edit processed request"
        assert "pending" in edit_res.json().get("detail", "").lower()
        print(f"Correctly blocked editing of processed request {request_id}")
    
    def test_delete_pending_request(self, headers, client_id):
        """Test deleting a pending request"""
        if not client_id:
            pytest.skip("No client found")
        
        # Create request to delete
        unique_ref = f"TEST-DEL-{uuid.uuid4().hex[:8]}"
        create_res = requests.post(
            f"{BASE_URL}/api/transaction-requests",
            headers={"Authorization": headers["Authorization"]},
            data={
                "transaction_type": "deposit",
                "client_id": client_id,
                "amount": "50",
                "destination_type": "bank",
                "crm_reference": unique_ref
            }
        )
        if create_res.status_code not in [200, 201]:
            pytest.skip("Could not create request for delete test")
        
        request_id = create_res.json()["request_id"]
        
        # Delete it
        del_res = requests.delete(
            f"{BASE_URL}/api/transaction-requests/{request_id}",
            headers=headers
        )
        assert del_res.status_code in [200, 204], f"Delete failed: {del_res.text}"
        print(f"Successfully deleted request {request_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
