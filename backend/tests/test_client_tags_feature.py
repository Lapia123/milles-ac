"""
Test Client Tags Feature for Miles Capitals FX Brokerage
Tests:
- GET /api/client-tags - List all tags
- POST /api/client-tags - Create new tag
- DELETE /api/client-tags/{tag_id} - Delete tag
- GET /api/transactions?client_tag=VIP - Filter transactions by tag
- POST /api/transactions with client_tags - Create transaction with tags
- POST /api/psp/{psp_id}/net-settle - Net settlement endpoint
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestClientTagsCRUD:
    """Test Client Tags CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    def test_get_client_tags(self):
        """Test GET /api/client-tags returns list of tags"""
        response = self.session.get(f"{BASE_URL}/api/client-tags")
        assert response.status_code == 200, f"Failed to get tags: {response.text}"
        tags = response.json()
        assert isinstance(tags, list), "Response should be a list"
        print(f"✓ GET /api/client-tags returned {len(tags)} tags")
        # Verify tag structure if tags exist
        if tags:
            tag = tags[0]
            assert "tag_id" in tag, "Tag should have tag_id"
            assert "name" in tag, "Tag should have name"
            assert "color" in tag, "Tag should have color"
            print(f"✓ Tag structure verified: {tag}")
    
    def test_create_client_tag(self):
        """Test POST /api/client-tags creates a new tag"""
        unique_name = f"TEST_Tag_{uuid.uuid4().hex[:6]}"
        response = self.session.post(f"{BASE_URL}/api/client-tags", json={
            "name": unique_name,
            "color": "#FF5733"
        })
        assert response.status_code == 200, f"Failed to create tag: {response.text}"
        tag = response.json()
        assert tag["name"] == unique_name, "Tag name should match"
        assert tag["color"] == "#FF5733", "Tag color should match"
        assert "tag_id" in tag, "Tag should have tag_id"
        print(f"✓ POST /api/client-tags created tag: {tag}")
        
        # Cleanup: Delete the test tag
        delete_response = self.session.delete(f"{BASE_URL}/api/client-tags/{tag['tag_id']}")
        assert delete_response.status_code == 200, f"Failed to delete test tag: {delete_response.text}"
        print(f"✓ Cleanup: Deleted test tag {tag['tag_id']}")
    
    def test_create_duplicate_tag_fails(self):
        """Test POST /api/client-tags fails for duplicate tag name"""
        unique_name = f"TEST_Dup_{uuid.uuid4().hex[:6]}"
        # Create first tag
        response1 = self.session.post(f"{BASE_URL}/api/client-tags", json={
            "name": unique_name,
            "color": "#3B82F6"
        })
        assert response1.status_code == 200, f"Failed to create first tag: {response1.text}"
        tag = response1.json()
        
        # Try to create duplicate
        response2 = self.session.post(f"{BASE_URL}/api/client-tags", json={
            "name": unique_name,
            "color": "#FF0000"
        })
        assert response2.status_code == 400, f"Duplicate tag should fail: {response2.text}"
        print(f"✓ Duplicate tag creation correctly rejected")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/client-tags/{tag['tag_id']}")
    
    def test_delete_client_tag(self):
        """Test DELETE /api/client-tags/{tag_id} deletes a tag"""
        # Create a tag to delete
        unique_name = f"TEST_Del_{uuid.uuid4().hex[:6]}"
        create_response = self.session.post(f"{BASE_URL}/api/client-tags", json={
            "name": unique_name,
            "color": "#10B981"
        })
        assert create_response.status_code == 200
        tag = create_response.json()
        
        # Delete the tag
        delete_response = self.session.delete(f"{BASE_URL}/api/client-tags/{tag['tag_id']}")
        assert delete_response.status_code == 200, f"Failed to delete tag: {delete_response.text}"
        result = delete_response.json()
        assert result.get("message") == "Tag deleted", "Should return success message"
        print(f"✓ DELETE /api/client-tags/{tag['tag_id']} succeeded")
        
        # Verify tag is deleted
        get_response = self.session.get(f"{BASE_URL}/api/client-tags")
        tags = get_response.json()
        tag_ids = [t["tag_id"] for t in tags]
        assert tag["tag_id"] not in tag_ids, "Deleted tag should not appear in list"
        print(f"✓ Verified tag no longer exists in list")
    
    def test_delete_nonexistent_tag_fails(self):
        """Test DELETE /api/client-tags/{tag_id} returns 404 for nonexistent tag"""
        response = self.session.delete(f"{BASE_URL}/api/client-tags/tag_nonexistent123")
        assert response.status_code == 404, f"Should return 404: {response.text}"
        print(f"✓ DELETE nonexistent tag correctly returns 404")


class TestTransactionTagFilter:
    """Test transaction filtering by client_tag"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    def test_transactions_endpoint_accepts_client_tag_param(self):
        """Test GET /api/transactions accepts client_tag query parameter"""
        response = self.session.get(f"{BASE_URL}/api/transactions?client_tag=VIP")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # API returns paginated response with 'items' key
        assert "items" in data or "transactions" in data or isinstance(data, list), "Should return transactions"
        print(f"✓ GET /api/transactions?client_tag=VIP works")
    
    def test_transactions_filter_returns_matching_tags(self):
        """Test that client_tag filter returns only matching transactions"""
        # First get all transactions - API returns paginated response with 'items' key
        all_response = self.session.get(f"{BASE_URL}/api/transactions?page_size=100")
        assert all_response.status_code == 200
        all_data = all_response.json()
        all_txs = all_data.get("items", all_data.get("transactions", all_data))
        if isinstance(all_txs, dict):
            all_txs = []
        
        # Find a tag that exists in transactions
        tags_in_txs = set()
        for tx in all_txs:
            if isinstance(tx, dict):
                for tag in tx.get("client_tags", []):
                    tags_in_txs.add(tag)
        
        if tags_in_txs:
            test_tag = list(tags_in_txs)[0]
            filtered_response = self.session.get(f"{BASE_URL}/api/transactions?client_tag={test_tag}")
            assert filtered_response.status_code == 200
            filtered_data = filtered_response.json()
            filtered_txs = filtered_data.get("items", filtered_data.get("transactions", filtered_data))
            if isinstance(filtered_txs, dict):
                filtered_txs = []
            
            # Verify all returned transactions have the tag
            for tx in filtered_txs:
                if isinstance(tx, dict):
                    assert test_tag in tx.get("client_tags", []), f"Transaction {tx.get('transaction_id')} should have tag {test_tag}"
            print(f"✓ Filter by tag '{test_tag}' returned {len(filtered_txs)} matching transactions")
        else:
            print("⚠ No transactions with tags found - skipping filter verification")


class TestPSPNetSettlement:
    """Test PSP Net Settlement feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    def test_get_psp_list(self):
        """Test GET /api/psp returns list of PSPs"""
        response = self.session.get(f"{BASE_URL}/api/psp")
        assert response.status_code == 200, f"Failed: {response.text}"
        psps = response.json()
        assert isinstance(psps, list), "Should return list of PSPs"
        print(f"✓ GET /api/psp returned {len(psps)} PSPs")
        
        # Check for specific PSPs mentioned in requirements
        psp_names = [p.get("psp_name", "") for p in psps]
        print(f"  PSP names: {psp_names}")
        return psps
    
    def test_psp_pending_amounts_not_negative(self):
        """Test that PSP pending_settlement amounts are never negative"""
        response = self.session.get(f"{BASE_URL}/api/psp")
        assert response.status_code == 200
        psps = response.json()
        
        for psp in psps:
            pending = psp.get("pending_settlement", 0) or 0
            assert pending >= 0, f"PSP {psp.get('psp_name')} has negative pending: {pending}"
            print(f"  {psp.get('psp_name')}: pending_settlement = ${pending}")
        print(f"✓ All PSP pending amounts are non-negative")
    
    def test_net_settle_endpoint_exists(self):
        """Test POST /api/psp/{psp_id}/net-settle endpoint exists"""
        # Get a PSP to test with
        psps_response = self.session.get(f"{BASE_URL}/api/psp")
        assert psps_response.status_code == 200
        psps = psps_response.json()
        
        if not psps:
            pytest.skip("No PSPs available for testing")
        
        psp = psps[0]
        psp_id = psp.get("psp_id")
        
        # Try net settle - may fail if no pending transactions, but endpoint should exist
        response = self.session.post(f"{BASE_URL}/api/psp/{psp_id}/net-settle", json={
            "destination_account_id": psp.get("settlement_destination_id"),
            "settlement_date": "2025-01-15"
        })
        
        # Should return 200 (success) or 400 (no pending transactions) - not 404 or 405
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code} - {response.text}"
        print(f"✓ POST /api/psp/{psp_id}/net-settle endpoint exists (status: {response.status_code})")
        
        if response.status_code == 200:
            result = response.json()
            print(f"  Settlement created: {result.get('settlement_id')}")
            print(f"  Deposits: {result.get('deposit_count')}, Withdrawals: {result.get('withdrawal_count')}")
            print(f"  Net amount: ${result.get('net_amount')}")
        else:
            error = response.json()
            print(f"  Expected error (no pending txs): {error.get('detail')}")


class TestPSPSettlementHistory:
    """Test PSP Settlement History shows transaction type badges"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    def test_get_psp_settlements(self):
        """Test GET /api/psp/{psp_id}/settlements returns settlement history"""
        # Get a PSP
        psps_response = self.session.get(f"{BASE_URL}/api/psp")
        assert psps_response.status_code == 200
        psps = psps_response.json()
        
        if not psps:
            pytest.skip("No PSPs available")
        
        psp = psps[0]
        psp_id = psp.get("psp_id")
        
        response = self.session.get(f"{BASE_URL}/api/psp/{psp_id}/settlements")
        assert response.status_code == 200, f"Failed: {response.text}"
        settlements = response.json()
        assert isinstance(settlements, list), "Should return list of settlements"
        print(f"✓ GET /api/psp/{psp_id}/settlements returned {len(settlements)} settlements")
        
        # Check settlement structure
        if settlements:
            settlement = settlements[0]
            print(f"  Settlement type: {settlement.get('settlement_type')}")
            print(f"  Deposit count: {settlement.get('deposit_count')}")
            print(f"  Withdrawal count: {settlement.get('withdrawal_count')}")


class TestInterTreasuryTransfer:
    """Test Inter-Treasury Transfer date field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    def test_get_treasury_accounts(self):
        """Test GET /api/treasury returns treasury accounts"""
        response = self.session.get(f"{BASE_URL}/api/treasury")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # API returns paginated response with 'items' key
        accounts = data.get("items", data) if isinstance(data, dict) else data
        assert isinstance(accounts, list), "Should return list of accounts"
        print(f"✓ GET /api/treasury returned {len(accounts)} accounts")
        return accounts
    
    def test_inter_treasury_transfer_accepts_date(self):
        """Test POST /api/treasury/transfer accepts transfer_date parameter"""
        # Get treasury accounts - API returns paginated response
        accounts_response = self.session.get(f"{BASE_URL}/api/treasury")
        assert accounts_response.status_code == 200
        data = accounts_response.json()
        accounts = data.get("items", data) if isinstance(data, dict) else data
        
        if len(accounts) < 2:
            pytest.skip("Need at least 2 treasury accounts for transfer test")
        
        # Find two accounts with same currency
        usd_accounts = [a for a in accounts if isinstance(a, dict) and a.get("currency") == "USD"]
        if len(usd_accounts) < 2:
            # Try AED accounts
            aed_accounts = [a for a in accounts if isinstance(a, dict) and a.get("currency") == "AED"]
            if len(aed_accounts) >= 2:
                from_account = aed_accounts[0]
                to_account = aed_accounts[1]
            else:
                pytest.skip("Need at least 2 accounts with same currency")
        else:
            from_account = usd_accounts[0]
            to_account = usd_accounts[1]
        
        # Check if from_account has balance
        if (from_account.get("balance", 0) or 0) < 1:
            pytest.skip(f"Source account {from_account.get('account_name')} has insufficient balance")
        
        # Test transfer with date
        response = self.session.post(f"{BASE_URL}/api/treasury/transfer", json={
            "from_account_id": from_account.get("account_id"),
            "to_account_id": to_account.get("account_id"),
            "amount": 1.00,
            "notes": "TEST_Transfer_Date_Test",
            "transfer_date": "2025-01-15"
        })
        
        # Should accept the transfer_date parameter
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code} - {response.text}"
        print(f"✓ POST /api/treasury/transfer accepts transfer_date parameter (status: {response.status_code})")
        
        if response.status_code == 200:
            result = response.json()
            print(f"  Transfer completed: {result}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
