"""
Test Transaction Creation Validation and Error Handling
Tests for:
1. Transaction creation with proper validation (empty client_id, vendor dest without vendor_id, negative amount, duplicate reference)
2. Error messages should be descriptive (not generic 'Operation failed')
3. Backend API responsiveness and correct HTTP status codes for validation errors
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTransactionValidation:
    """Test transaction creation validation and error handling"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.admin_email = "admin@fxbroker.com"
        self.admin_password = "admin123"
        self.token = None
        self.test_client_id = None
        self.test_treasury_id = None
        self.test_vendor_id = None
        
    def get_auth_token(self):
        """Get authentication token"""
        if self.token:
            return self.token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        return self.token
    
    def get_headers(self):
        """Get auth headers"""
        return {"Authorization": f"Bearer {self.get_auth_token()}"}
    
    def get_test_client_id(self):
        """Get a valid client ID for testing"""
        if self.test_client_id:
            return self.test_client_id
        response = requests.get(f"{BASE_URL}/api/clients?page_size=1", headers=self.get_headers())
        if response.status_code == 200:
            data = response.json()
            items = data.get("items", data) if isinstance(data, dict) else data
            if items and len(items) > 0:
                self.test_client_id = items[0].get("client_id")
        return self.test_client_id
    
    def get_test_treasury_id(self):
        """Get a valid treasury account ID for testing"""
        if self.test_treasury_id:
            return self.test_treasury_id
        response = requests.get(f"{BASE_URL}/api/treasury?page_size=1", headers=self.get_headers())
        if response.status_code == 200:
            data = response.json()
            items = data.get("items", data) if isinstance(data, dict) else data
            if items and len(items) > 0:
                self.test_treasury_id = items[0].get("account_id")
        return self.test_treasury_id
    
    def get_test_vendor_id(self):
        """Get a valid vendor ID for testing"""
        if self.test_vendor_id:
            return self.test_vendor_id
        response = requests.get(f"{BASE_URL}/api/vendors?page_size=1", headers=self.get_headers())
        if response.status_code == 200:
            data = response.json()
            items = data.get("items", data) if isinstance(data, dict) else data
            if items and len(items) > 0:
                self.test_vendor_id = items[0].get("vendor_id")
        return self.test_vendor_id

    # ===== VALIDATION TESTS =====
    
    def test_empty_client_id_returns_400(self):
        """Test that empty client_id returns 400 with descriptive error"""
        form_data = {
            "client_id": "",
            "transaction_type": "deposit",
            "amount": "100",
            "destination_type": "treasury",
            "destination_account_id": self.get_test_treasury_id() or "test_treasury"
        }
        response = requests.post(f"{BASE_URL}/api/transactions", 
                                 data=form_data, 
                                 headers=self.get_headers())
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        error_data = response.json()
        assert "detail" in error_data, "Error response should have 'detail' field"
        assert "client" in error_data["detail"].lower() or "required" in error_data["detail"].lower(), \
            f"Error should mention client is required, got: {error_data['detail']}"
        print(f"PASS: Empty client_id returns 400 with message: {error_data['detail']}")
    
    def test_vendor_destination_without_vendor_id_returns_400(self):
        """Test that vendor destination without vendor_id returns 400"""
        client_id = self.get_test_client_id()
        if not client_id:
            pytest.skip("No test client available")
        
        form_data = {
            "client_id": client_id,
            "transaction_type": "deposit",
            "amount": "100",
            "destination_type": "vendor",
            "vendor_id": ""  # Empty vendor_id
        }
        response = requests.post(f"{BASE_URL}/api/transactions", 
                                 data=form_data, 
                                 headers=self.get_headers())
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        error_data = response.json()
        assert "detail" in error_data, "Error response should have 'detail' field"
        assert "exchanger" in error_data["detail"].lower() or "vendor" in error_data["detail"].lower(), \
            f"Error should mention vendor/exchanger is required, got: {error_data['detail']}"
        print(f"PASS: Vendor destination without vendor_id returns 400 with message: {error_data['detail']}")
    
    def test_negative_amount_returns_400(self):
        """Test that negative amount returns 400"""
        client_id = self.get_test_client_id()
        treasury_id = self.get_test_treasury_id()
        if not client_id or not treasury_id:
            pytest.skip("No test client or treasury available")
        
        form_data = {
            "client_id": client_id,
            "transaction_type": "deposit",
            "amount": "-100",  # Negative amount
            "destination_type": "treasury",
            "destination_account_id": treasury_id
        }
        response = requests.post(f"{BASE_URL}/api/transactions", 
                                 data=form_data, 
                                 headers=self.get_headers())
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        error_data = response.json()
        assert "detail" in error_data, "Error response should have 'detail' field"
        assert "amount" in error_data["detail"].lower() or "greater" in error_data["detail"].lower(), \
            f"Error should mention amount must be positive, got: {error_data['detail']}"
        print(f"PASS: Negative amount returns 400 with message: {error_data['detail']}")
    
    def test_zero_amount_returns_400(self):
        """Test that zero amount returns 400"""
        client_id = self.get_test_client_id()
        treasury_id = self.get_test_treasury_id()
        if not client_id or not treasury_id:
            pytest.skip("No test client or treasury available")
        
        form_data = {
            "client_id": client_id,
            "transaction_type": "deposit",
            "amount": "0",  # Zero amount
            "destination_type": "treasury",
            "destination_account_id": treasury_id
        }
        response = requests.post(f"{BASE_URL}/api/transactions", 
                                 data=form_data, 
                                 headers=self.get_headers())
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        error_data = response.json()
        assert "detail" in error_data, "Error response should have 'detail' field"
        print(f"PASS: Zero amount returns 400 with message: {error_data['detail']}")
    
    def test_duplicate_reference_returns_400(self):
        """Test that duplicate reference returns 400 with descriptive error"""
        client_id = self.get_test_client_id()
        treasury_id = self.get_test_treasury_id()
        if not client_id or not treasury_id:
            pytest.skip("No test client or treasury available")
        
        unique_ref = f"TEST_REF_{uuid.uuid4().hex[:8]}"
        
        # Create first transaction with unique reference
        form_data = {
            "client_id": client_id,
            "transaction_type": "deposit",
            "amount": "100",
            "destination_type": "treasury",
            "destination_account_id": treasury_id,
            "reference": unique_ref
        }
        response1 = requests.post(f"{BASE_URL}/api/transactions", 
                                  data=form_data, 
                                  headers=self.get_headers())
        
        # First transaction should succeed
        assert response1.status_code == 200 or response1.status_code == 201, \
            f"First transaction should succeed, got {response1.status_code}: {response1.text}"
        
        # Try to create second transaction with same reference
        response2 = requests.post(f"{BASE_URL}/api/transactions", 
                                  data=form_data, 
                                  headers=self.get_headers())
        
        assert response2.status_code == 400, f"Expected 400 for duplicate, got {response2.status_code}"
        error_data = response2.json()
        assert "detail" in error_data, "Error response should have 'detail' field"
        assert "duplicate" in error_data["detail"].lower() or "already exists" in error_data["detail"].lower(), \
            f"Error should mention duplicate, got: {error_data['detail']}"
        print(f"PASS: Duplicate reference returns 400 with message: {error_data['detail']}")
    
    def test_psp_destination_without_psp_id_returns_400(self):
        """Test that PSP destination without psp_id returns 400"""
        client_id = self.get_test_client_id()
        if not client_id:
            pytest.skip("No test client available")
        
        form_data = {
            "client_id": client_id,
            "transaction_type": "deposit",
            "amount": "100",
            "destination_type": "psp",
            "psp_id": ""  # Empty psp_id
        }
        response = requests.post(f"{BASE_URL}/api/transactions", 
                                 data=form_data, 
                                 headers=self.get_headers())
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        error_data = response.json()
        assert "detail" in error_data, "Error response should have 'detail' field"
        assert "psp" in error_data["detail"].lower(), \
            f"Error should mention PSP is required, got: {error_data['detail']}"
        print(f"PASS: PSP destination without psp_id returns 400 with message: {error_data['detail']}")
    
    def test_treasury_destination_without_account_id_returns_400(self):
        """Test that treasury destination without account_id returns 400"""
        client_id = self.get_test_client_id()
        if not client_id:
            pytest.skip("No test client available")
        
        form_data = {
            "client_id": client_id,
            "transaction_type": "deposit",
            "amount": "100",
            "destination_type": "treasury",
            "destination_account_id": ""  # Empty account_id
        }
        response = requests.post(f"{BASE_URL}/api/transactions", 
                                 data=form_data, 
                                 headers=self.get_headers())
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        error_data = response.json()
        assert "detail" in error_data, "Error response should have 'detail' field"
        assert "account" in error_data["detail"].lower() or "treasury" in error_data["detail"].lower(), \
            f"Error should mention account is required, got: {error_data['detail']}"
        print(f"PASS: Treasury destination without account_id returns 400 with message: {error_data['detail']}")
    
    # ===== VALID TRANSACTION TEST =====
    
    def test_valid_transaction_creation_succeeds(self):
        """Test that valid transaction creation succeeds"""
        client_id = self.get_test_client_id()
        treasury_id = self.get_test_treasury_id()
        if not client_id or not treasury_id:
            pytest.skip("No test client or treasury available")
        
        unique_ref = f"TEST_VALID_{uuid.uuid4().hex[:8]}"
        
        form_data = {
            "client_id": client_id,
            "transaction_type": "deposit",
            "amount": "100",
            "destination_type": "treasury",
            "destination_account_id": treasury_id,
            "reference": unique_ref,
            "description": "Test transaction for validation"
        }
        response = requests.post(f"{BASE_URL}/api/transactions", 
                                 data=form_data, 
                                 headers=self.get_headers())
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "transaction_id" in data, "Response should contain transaction_id"
        print(f"PASS: Valid transaction created with ID: {data['transaction_id']}")
    
    def test_valid_vendor_transaction_creation_succeeds(self):
        """Test that valid vendor transaction creation succeeds"""
        client_id = self.get_test_client_id()
        vendor_id = self.get_test_vendor_id()
        if not client_id or not vendor_id:
            pytest.skip("No test client or vendor available")
        
        unique_ref = f"TEST_VENDOR_{uuid.uuid4().hex[:8]}"
        
        form_data = {
            "client_id": client_id,
            "transaction_type": "deposit",
            "amount": "100",
            "destination_type": "vendor",
            "vendor_id": vendor_id,
            "reference": unique_ref,
            "description": "Test vendor transaction"
        }
        response = requests.post(f"{BASE_URL}/api/transactions", 
                                 data=form_data, 
                                 headers=self.get_headers())
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "transaction_id" in data, "Response should contain transaction_id"
        print(f"PASS: Valid vendor transaction created with ID: {data['transaction_id']}")


class TestLoginFlow:
    """Test login flow works correctly"""
    
    def test_login_with_valid_credentials(self):
        """Test login with valid admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        assert "user" in data, "Response should contain user info"
        print(f"PASS: Login successful for admin user")
    
    def test_login_with_accountant_credentials(self):
        """Test login with accountant credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "7209unneen@gmail.com",
            "password": "password"
        })
        
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "access_token" in data, "Response should contain access_token"
        print(f"PASS: Login successful for accountant user")
    
    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: Invalid credentials return 401")


class TestTransactionsPageLoad:
    """Test transactions page loads and displays data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.token = None
        
    def get_auth_token(self):
        """Get authentication token"""
        if self.token:
            return self.token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json().get("access_token")
        return self.token
    
    def get_headers(self):
        """Get auth headers"""
        return {"Authorization": f"Bearer {self.get_auth_token()}"}
    
    def test_transactions_endpoint_returns_data(self):
        """Test that transactions endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/transactions", headers=self.get_headers())
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Can be paginated or array
        if isinstance(data, dict):
            assert "items" in data or "total" in data, "Paginated response should have items or total"
            print(f"PASS: Transactions endpoint returns paginated data with {data.get('total', len(data.get('items', [])))} items")
        else:
            assert isinstance(data, list), "Response should be list or paginated object"
            print(f"PASS: Transactions endpoint returns {len(data)} items")
    
    def test_transactions_form_data_endpoint(self):
        """Test that form-data endpoint returns dropdown options"""
        response = requests.get(f"{BASE_URL}/api/transactions/form-data", headers=self.get_headers())
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "clients" in data, "Response should contain clients"
        assert "treasury_accounts" in data, "Response should contain treasury_accounts"
        assert "psps" in data, "Response should contain psps"
        assert "vendors" in data, "Response should contain vendors"
        print(f"PASS: Form-data endpoint returns all dropdown options")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
