import requests
import sys
from datetime import datetime

class FXBrokerAPITester:
    def __init__(self, base_url="https://broker-ledger-pro.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)
        if self.token:
            request_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Response: {response.text[:200]}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_seed_data(self):
        """Seed demo data"""
        success, response = self.run_test("Seed Demo Data", "POST", "api/seed", 200)
        return success

    def test_login(self):
        """Test login with demo credentials"""
        success, response = self.run_test(
            "Login with Demo Credentials",
            "POST", 
            "api/auth/login",
            200,
            data={"email": "admin@fxbroker.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_auth_me(self):
        """Test getting current user"""
        success, response = self.run_test("Get Current User", "GET", "api/auth/me", 200)
        return success and response.get('email') == 'admin@fxbroker.com'

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test("Dashboard Stats", "GET", "api/reports/dashboard", 200)
        if success:
            # Validate response structure
            required_keys = ['clients', 'accounts', 'transactions']
            has_all_keys = all(key in response for key in required_keys)
            if has_all_keys:
                print(f"   Stats: {response.get('clients', {}).get('total', 0)} clients, {response.get('accounts', {}).get('total', 0)} accounts")
            return has_all_keys
        return False

    def test_clients_crud(self):
        """Test clients CRUD operations"""
        # Get clients
        success, clients = self.run_test("Get Clients", "GET", "api/clients", 200)
        if not success:
            return False

        # Create client
        client_data = {
            "first_name": f"Test_{datetime.now().strftime('%H%M%S')}",
            "last_name": "Client", 
            "email": f"test.client.{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "+1234567890",
            "country": "USA"
        }
        success, new_client = self.run_test("Create Client", "POST", "api/clients", 200, data=client_data)
        if not success or not new_client.get('client_id'):
            return False

        client_id = new_client['client_id']
        print(f"   Created client ID: {client_id}")

        # Update client
        update_data = {"notes": "Updated via API test"}
        success, updated = self.run_test("Update Client", "PUT", f"api/clients/{client_id}", 200, data=update_data)
        if not success:
            return False

        # Get specific client
        success, client = self.run_test("Get Specific Client", "GET", f"api/clients/{client_id}", 200)
        
        return success

    def test_trading_accounts_crud(self):
        """Test trading accounts CRUD operations"""
        # Get existing clients first
        success, clients = self.run_test("Get Clients for Accounts", "GET", "api/clients", 200)
        if not success or not clients:
            return False

        client_id = clients[0]['client_id']

        # Get accounts
        success, accounts = self.run_test("Get Trading Accounts", "GET", "api/trading-accounts", 200)
        if not success:
            return False

        # Create trading account
        account_data = {
            "client_id": client_id,
            "account_type": "MT4",
            "currency": "USD",
            "leverage": 100
        }
        success, new_account = self.run_test("Create Trading Account", "POST", "api/trading-accounts", 200, data=account_data)
        if not success or not new_account.get('account_id'):
            return False

        account_id = new_account['account_id']
        print(f"   Created account: {new_account.get('account_number')}")

        # Update account
        update_data = {"leverage": 200}
        success, updated = self.run_test("Update Trading Account", "PUT", f"api/trading-accounts/{account_id}", 200, data=update_data)
        
        return success

    def test_transactions_crud(self):
        """Test transactions CRUD operations"""
        # Get existing accounts first
        success, accounts = self.run_test("Get Accounts for Transactions", "GET", "api/trading-accounts", 200)
        if not success or not accounts:
            return False

        account_id = accounts[0]['account_id']

        # Get transactions
        success, transactions = self.run_test("Get Transactions", "GET", "api/transactions", 200)
        if not success:
            return False

        # Create transaction
        tx_data = {
            "account_id": account_id,
            "transaction_type": "deposit",
            "amount": 1000.00,
            "currency": "USD",
            "description": "Test deposit"
        }
        success, new_tx = self.run_test("Create Transaction", "POST", "api/transactions", 200, data=tx_data)
        if not success or not new_tx.get('transaction_id'):
            return False

        tx_id = new_tx['transaction_id']
        print(f"   Created transaction: {new_tx.get('reference')}")

        # Update transaction status
        update_data = {"status": "completed"}
        success, updated = self.run_test("Update Transaction", "PUT", f"api/transactions/{tx_id}", 200, data=update_data)
        
        return success

    def test_reports_endpoints(self):
        """Test reports and analytics endpoints"""
        # Transaction summary
        success1, _ = self.run_test("Transaction Summary", "GET", "api/reports/transactions-summary?days=30", 200)
        
        # Client analytics
        success2, _ = self.run_test("Client Analytics", "GET", "api/reports/client-analytics", 200)
        
        # Recent activity
        success3, _ = self.run_test("Recent Activity", "GET", "api/reports/recent-activity?limit=5", 200)
        
        return success1 and success2 and success3

def main():
    print("🚀 Starting FX Broker API Tests")
    print("=" * 50)
    
    tester = FXBrokerAPITester()
    
    # Test sequence
    tests = [
        ("Seed Demo Data", tester.test_seed_data),
        ("Authentication", tester.test_login),
        ("Auth Verification", tester.test_auth_me),
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("Clients CRUD", tester.test_clients_crud),
        ("Trading Accounts CRUD", tester.test_trading_accounts_crud),
        ("Transactions CRUD", tester.test_transactions_crud),
        ("Reports & Analytics", tester.test_reports_endpoints),
    ]
    
    for test_name, test_func in tests:
        print(f"\n🧪 {test_name.upper()} TESTS")
        print("-" * 30)
        try:
            result = test_func()
            if not result:
                print(f"❌ {test_name} tests failed")
        except Exception as e:
            print(f"❌ {test_name} tests crashed: {str(e)}")
            tester.failed_tests.append(f"{test_name}: {str(e)}")

    # Print summary
    print(f"\n📊 TEST SUMMARY")
    print("=" * 50)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if tester.failed_tests:
        print(f"\n❌ FAILED TESTS:")
        for failure in tester.failed_tests:
            print(f"   - {failure}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())