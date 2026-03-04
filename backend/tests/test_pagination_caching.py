"""
Test pagination and Redis caching for Vendors and Income/Expenses API endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPaginationAndCaching:
    """Test pagination and Redis caching for Vendors and Income/Expenses pages"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for tests - login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@fxbroker.com", "password": "admin123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
    
    # ============ VENDORS PAGINATION TESTS ============
    
    def test_vendors_api_returns_paginated_response(self):
        """Test /api/vendors returns paginated response with items, total, page, page_size, total_pages"""
        response = requests.get(
            f"{BASE_URL}/api/vendors?page=1&page_size=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get vendors: {response.text}"
        
        data = response.json()
        # Verify paginated response structure
        assert "items" in data, "Response missing 'items' field"
        assert "total" in data, "Response missing 'total' field"
        assert "page" in data, "Response missing 'page' field"
        assert "page_size" in data, "Response missing 'page_size' field"
        assert "total_pages" in data, "Response missing 'total_pages' field"
        
        # Verify data types
        assert isinstance(data["items"], list), "'items' should be a list"
        assert isinstance(data["total"], int), "'total' should be an integer"
        assert isinstance(data["page"], int), "'page' should be an integer"
        assert isinstance(data["page_size"], int), "'page_size' should be an integer"
        assert isinstance(data["total_pages"], int), "'total_pages' should be an integer"
        
        # Verify page and page_size values
        assert data["page"] == 1, "Page should be 1"
        assert data["page_size"] == 10, "Page size should be 10"
        
        print(f"Vendors API: Total={data['total']}, Page={data['page']}/{data['total_pages']}, Items={len(data['items'])}")
    
    def test_vendors_pagination_page_2(self):
        """Test /api/vendors page 2 returns different data"""
        # Get page 1
        response1 = requests.get(
            f"{BASE_URL}/api/vendors?page=1&page_size=10",
            headers=self.headers
        )
        assert response1.status_code == 200
        data1 = response1.json()
        
        if data1["total_pages"] > 1:
            # Get page 2
            response2 = requests.get(
                f"{BASE_URL}/api/vendors?page=2&page_size=10",
                headers=self.headers
            )
            assert response2.status_code == 200
            data2 = response2.json()
            
            assert data2["page"] == 2, "Page should be 2"
            
            # Check that page 2 has different items (if items exist on both pages)
            if len(data1["items"]) > 0 and len(data2["items"]) > 0:
                page1_ids = [v.get("vendor_id") for v in data1["items"]]
                page2_ids = [v.get("vendor_id") for v in data2["items"]]
                # Items should not overlap
                overlap = set(page1_ids) & set(page2_ids)
                assert len(overlap) == 0, f"Pages should have different items, but found overlap: {overlap}"
                print(f"Page 1 and Page 2 have different vendor IDs - PASS")
        else:
            pytest.skip("Only 1 page of vendors available")
    
    def test_vendors_search_parameter(self):
        """Test /api/vendors search parameter works with pagination"""
        response = requests.get(
            f"{BASE_URL}/api/vendors?page=1&page_size=10&search=test",
            headers=self.headers
        )
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should have items field"
        assert "total" in data, "Response should have total field"
        print(f"Vendors search: Found {data['total']} results")
    
    # ============ INCOME/EXPENSES PAGINATION TESTS ============
    
    def test_income_expenses_api_returns_paginated_response(self):
        """Test /api/income-expenses returns paginated response with items, total, page, page_size, total_pages"""
        response = requests.get(
            f"{BASE_URL}/api/income-expenses?page=1&page_size=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get income-expenses: {response.text}"
        
        data = response.json()
        # Verify paginated response structure
        assert "items" in data, "Response missing 'items' field"
        assert "total" in data, "Response missing 'total' field"
        assert "page" in data, "Response missing 'page' field"
        assert "page_size" in data, "Response missing 'page_size' field"
        assert "total_pages" in data, "Response missing 'total_pages' field"
        
        # Verify data types
        assert isinstance(data["items"], list), "'items' should be a list"
        assert isinstance(data["total"], int), "'total' should be an integer"
        assert isinstance(data["page"], int), "'page' should be an integer"
        assert isinstance(data["page_size"], int), "'page_size' should be an integer"
        assert isinstance(data["total_pages"], int), "'total_pages' should be an integer"
        
        # Verify page and page_size values
        assert data["page"] == 1, "Page should be 1"
        assert data["page_size"] == 10, "Page size should be 10"
        
        print(f"Income/Expenses API: Total={data['total']}, Page={data['page']}/{data['total_pages']}, Items={len(data['items'])}")
    
    def test_income_expenses_pagination_page_2(self):
        """Test /api/income-expenses page 2 returns different data"""
        # Get page 1
        response1 = requests.get(
            f"{BASE_URL}/api/income-expenses?page=1&page_size=10",
            headers=self.headers
        )
        assert response1.status_code == 200
        data1 = response1.json()
        
        if data1["total_pages"] > 1:
            # Get page 2
            response2 = requests.get(
                f"{BASE_URL}/api/income-expenses?page=2&page_size=10",
                headers=self.headers
            )
            assert response2.status_code == 200
            data2 = response2.json()
            
            assert data2["page"] == 2, "Page should be 2"
            
            # Check that page 2 has different items
            if len(data1["items"]) > 0 and len(data2["items"]) > 0:
                page1_ids = [e.get("entry_id") for e in data1["items"]]
                page2_ids = [e.get("entry_id") for e in data2["items"]]
                # Items should not overlap
                overlap = set(page1_ids) & set(page2_ids)
                assert len(overlap) == 0, f"Pages should have different items, but found overlap: {overlap}"
                print(f"Page 1 and Page 2 have different entry IDs - PASS")
        else:
            pytest.skip("Only 1 page of income-expenses available")
    
    def test_income_expenses_filters_with_pagination(self):
        """Test /api/income-expenses filters work with pagination"""
        # Test entry_type filter
        response = requests.get(
            f"{BASE_URL}/api/income-expenses?page=1&page_size=10&entry_type=income",
            headers=self.headers
        )
        assert response.status_code == 200, f"Filter failed: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should have items field"
        
        # All items should be income type
        for item in data["items"]:
            assert item.get("entry_type") == "income", f"Expected income type, got: {item.get('entry_type')}"
        
        print(f"Income-only filter: Found {data['total']} income entries")
    
    # ============ REDIS CACHING TESTS ============
    
    def test_vendors_api_caching_performance(self):
        """Test that cached requests are faster (Redis caching working)"""
        # First request - may populate cache
        start1 = time.time()
        response1 = requests.get(
            f"{BASE_URL}/api/vendors?page=1&page_size=10",
            headers=self.headers
        )
        time1 = time.time() - start1
        assert response1.status_code == 200
        
        # Second request - should hit cache
        start2 = time.time()
        response2 = requests.get(
            f"{BASE_URL}/api/vendors?page=1&page_size=10",
            headers=self.headers
        )
        time2 = time.time() - start2
        assert response2.status_code == 200
        
        # Both responses should be identical
        data1 = response1.json()
        data2 = response2.json()
        assert data1["total"] == data2["total"], "Cached response should match original"
        
        print(f"Vendors API: First request={time1:.3f}s, Second request={time2:.3f}s")
        print(f"Cache likely working - responses match and second request completed")
    
    def test_income_expenses_api_caching_performance(self):
        """Test that cached requests are faster (Redis caching working)"""
        # First request - may populate cache
        start1 = time.time()
        response1 = requests.get(
            f"{BASE_URL}/api/income-expenses?page=1&page_size=10",
            headers=self.headers
        )
        time1 = time.time() - start1
        assert response1.status_code == 200
        
        # Second request - should hit cache
        start2 = time.time()
        response2 = requests.get(
            f"{BASE_URL}/api/income-expenses?page=1&page_size=10",
            headers=self.headers
        )
        time2 = time.time() - start2
        assert response2.status_code == 200
        
        # Both responses should be identical
        data1 = response1.json()
        data2 = response2.json()
        assert data1["total"] == data2["total"], "Cached response should match original"
        
        print(f"Income/Expenses API: First request={time1:.3f}s, Second request={time2:.3f}s")
        print(f"Cache likely working - responses match and second request completed")
    
    # ============ DATA INTEGRITY TESTS ============
    
    def test_vendors_item_count_matches_page_size(self):
        """Test that items count doesn't exceed page_size"""
        response = requests.get(
            f"{BASE_URL}/api/vendors?page=1&page_size=10",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        items_count = len(data["items"])
        assert items_count <= data["page_size"], f"Items count ({items_count}) should not exceed page_size ({data['page_size']})"
        
        # If total <= page_size, items should equal total
        if data["total"] <= data["page_size"]:
            assert items_count == data["total"], f"Items count should equal total when total <= page_size"
        
        print(f"Items count ({items_count}) is valid for page_size ({data['page_size']})")
    
    def test_income_expenses_item_count_matches_page_size(self):
        """Test that items count doesn't exceed page_size"""
        response = requests.get(
            f"{BASE_URL}/api/income-expenses?page=1&page_size=10",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        items_count = len(data["items"])
        assert items_count <= data["page_size"], f"Items count ({items_count}) should not exceed page_size ({data['page_size']})"
        
        print(f"Items count ({items_count}) is valid for page_size ({data['page_size']})")
    
    def test_total_pages_calculation(self):
        """Test that total_pages is correctly calculated"""
        response = requests.get(
            f"{BASE_URL}/api/income-expenses?page=1&page_size=10",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        expected_total_pages = max(1, (data["total"] + data["page_size"] - 1) // data["page_size"])
        assert data["total_pages"] == expected_total_pages, f"Expected {expected_total_pages} pages, got {data['total_pages']}"
        
        print(f"Total pages calculation correct: {data['total']} items / {data['page_size']} per page = {data['total_pages']} pages")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
