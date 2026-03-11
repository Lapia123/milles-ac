"""
Backend API Tests for Pagination Feature - Iteration 38
Tests pagination format on 8 endpoints: treasury, lp, logs, transactions, loans, income-expenses, transaction-requests
Each endpoint should return: {items, total, page, page_size, total_pages}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPaginationBackendAPIs:
    """Tests paginated response format for all 8 endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Auth failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Auth headers for requests"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def validate_paginated_response(self, data, endpoint_name):
        """Helper to validate paginated response format"""
        # Check required keys exist
        assert "items" in data, f"{endpoint_name}: Missing 'items' key in response"
        assert "total" in data, f"{endpoint_name}: Missing 'total' key in response"
        assert "page" in data, f"{endpoint_name}: Missing 'page' key in response"
        assert "page_size" in data, f"{endpoint_name}: Missing 'page_size' key in response"
        assert "total_pages" in data, f"{endpoint_name}: Missing 'total_pages' key in response"
        
        # Check types
        assert isinstance(data["items"], list), f"{endpoint_name}: 'items' should be a list"
        assert isinstance(data["total"], int), f"{endpoint_name}: 'total' should be int"
        assert isinstance(data["page"], int), f"{endpoint_name}: 'page' should be int"
        assert isinstance(data["page_size"], int), f"{endpoint_name}: 'page_size' should be int"
        assert isinstance(data["total_pages"], int), f"{endpoint_name}: 'total_pages' should be int"
        
        # Check values are reasonable
        assert data["total"] >= 0, f"{endpoint_name}: 'total' should be >= 0"
        assert data["page"] >= 1, f"{endpoint_name}: 'page' should be >= 1"
        assert data["page_size"] >= 1, f"{endpoint_name}: 'page_size' should be >= 1"
        assert data["total_pages"] >= 0, f"{endpoint_name}: 'total_pages' should be >= 0"
        
        return True
    
    # Test 1: Treasury endpoint
    def test_treasury_pagination_format(self, headers):
        """GET /api/treasury?page=1&page_size=5 returns paginated format"""
        response = requests.get(f"{BASE_URL}/api/treasury?page=1&page_size=5", headers=headers)
        assert response.status_code == 200, f"Treasury API failed: {response.text}"
        
        data = response.json()
        self.validate_paginated_response(data, "Treasury")
        
        # Additional: verify items match expected format for treasury accounts
        if data["items"]:
            first_item = data["items"][0]
            assert "account_id" in first_item or "account_name" in first_item, "Treasury item should have account_id or account_name"
        
        print(f"✓ Treasury pagination: {data['total']} items, page {data['page']}/{data['total_pages']}")
    
    # Test 2: LP accounts endpoint
    def test_lp_pagination_format(self, headers):
        """GET /api/lp?page=1&page_size=5 returns paginated format"""
        response = requests.get(f"{BASE_URL}/api/lp?page=1&page_size=5", headers=headers)
        assert response.status_code == 200, f"LP API failed: {response.text}"
        
        data = response.json()
        self.validate_paginated_response(data, "LP")
        
        print(f"✓ LP pagination: {data['total']} items, page {data['page']}/{data['total_pages']}")
    
    # Test 3: Logs endpoint
    def test_logs_pagination_format(self, headers):
        """GET /api/logs?page=1&page_size=5 returns paginated format with 'items'"""
        response = requests.get(f"{BASE_URL}/api/logs?page=1&page_size=5", headers=headers)
        assert response.status_code == 200, f"Logs API failed: {response.text}"
        
        data = response.json()
        self.validate_paginated_response(data, "Logs")
        
        # Special check: logs should use 'items' not 'logs'
        assert "items" in data, "Logs should return 'items' key (not 'logs')"
        
        print(f"✓ Logs pagination: {data['total']} items, page {data['page']}/{data['total_pages']}")
    
    # Test 4: Transactions endpoint
    def test_transactions_pagination_format(self, headers):
        """GET /api/transactions?page=1&page_size=5 returns paginated format"""
        response = requests.get(f"{BASE_URL}/api/transactions?page=1&page_size=5", headers=headers)
        assert response.status_code == 200, f"Transactions API failed: {response.text}"
        
        data = response.json()
        self.validate_paginated_response(data, "Transactions")
        
        print(f"✓ Transactions pagination: {data['total']} items, page {data['page']}/{data['total_pages']}")
    
    # Test 5: Loans endpoint
    def test_loans_pagination_format(self, headers):
        """GET /api/loans?page=1&page_size=5 returns paginated format"""
        response = requests.get(f"{BASE_URL}/api/loans?page=1&page_size=5", headers=headers)
        assert response.status_code == 200, f"Loans API failed: {response.text}"
        
        data = response.json()
        self.validate_paginated_response(data, "Loans")
        
        print(f"✓ Loans pagination: {data['total']} items, page {data['page']}/{data['total_pages']}")
    
    # Test 6: Income-Expenses endpoint
    def test_income_expenses_pagination_format(self, headers):
        """GET /api/income-expenses?page=1&page_size=5 returns paginated format"""
        response = requests.get(f"{BASE_URL}/api/income-expenses?page=1&page_size=5", headers=headers)
        assert response.status_code == 200, f"Income-Expenses API failed: {response.text}"
        
        data = response.json()
        self.validate_paginated_response(data, "Income-Expenses")
        
        print(f"✓ Income-Expenses pagination: {data['total']} items, page {data['page']}/{data['total_pages']}")
    
    # Test 7: Transaction Requests endpoint
    def test_transaction_requests_pagination_format(self, headers):
        """GET /api/transaction-requests?page=1&page_size=5 returns paginated format"""
        response = requests.get(f"{BASE_URL}/api/transaction-requests?page=1&page_size=5", headers=headers)
        assert response.status_code == 200, f"Transaction Requests API failed: {response.text}"
        
        data = response.json()
        self.validate_paginated_response(data, "Transaction-Requests")
        
        print(f"✓ Transaction Requests pagination: {data['total']} items, page {data['page']}/{data['total_pages']}")
    
    # Test 8: Verify page_size parameter works
    def test_page_size_parameter_works(self, headers):
        """Verify page_size param controls returned items count"""
        # Get with page_size=2
        response = requests.get(f"{BASE_URL}/api/treasury?page=1&page_size=2", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Items should be at most page_size
        assert len(data["items"]) <= 2, "Items should respect page_size limit"
        assert data["page_size"] == 2, "page_size should be 2"
        
        print(f"✓ page_size parameter works correctly")
    
    # Test 9: Verify page navigation works
    def test_page_navigation_works(self, headers):
        """Verify page param returns correct page of data"""
        # Get first page
        response1 = requests.get(f"{BASE_URL}/api/logs?page=1&page_size=10", headers=headers)
        assert response1.status_code == 200
        data1 = response1.json()
        
        if data1["total_pages"] > 1:
            # Get second page
            response2 = requests.get(f"{BASE_URL}/api/logs?page=2&page_size=10", headers=headers)
            assert response2.status_code == 200
            data2 = response2.json()
            
            # Pages should be different
            assert data2["page"] == 2, "Second request should return page 2"
            
            # Items should be different (if enough data)
            if data1["items"] and data2["items"]:
                first_ids_1 = [item.get("log_id") for item in data1["items"][:3]]
                first_ids_2 = [item.get("log_id") for item in data2["items"][:3]]
                # At least some should be different
                if first_ids_1 and first_ids_2:
                    assert first_ids_1 != first_ids_2, "Page 1 and Page 2 should have different items"
        
        print(f"✓ Page navigation works correctly (total_pages: {data1['total_pages']})")
    
    # Test 10: Verify treasury is still usable in dropdown format  
    def test_treasury_dropdown_compatibility(self, headers):
        """Verify treasury can still be used for dropdowns (high page_size returns all)"""
        response = requests.get(f"{BASE_URL}/api/treasury?page_size=200", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should have items key
        assert "items" in data, "Treasury response should have 'items' key for dropdown compatibility"
        
        print(f"✓ Treasury dropdown compatibility: {len(data['items'])} items available")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
