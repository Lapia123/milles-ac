import requests
import sys
from datetime import datetime

class FXBrokerAPITester:
    def __init__(self, base_url="https://broker-backoffice.preview.emergentagent.com"):
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
            # Validate response structure - updated for treasury instead of trading accounts
            required_keys = ['clients', 'treasury', 'transactions']
            has_all_keys = all(key in response for key in required_keys)
            if has_all_keys:
                print(f"   Stats: {response.get('clients', {}).get('total', 0)} clients, {response.get('treasury', {}).get('total', 0)} treasury accounts")
            return has_all_keys
        return False

    def test_clients_crud(self):
        """Test clients CRUD operations"""
        # Get clients
        success, clients = self.run_test("Get Clients", "GET", "api/clients", 200)
        if not success:
            return False

        # Create client with NEW FIELDS: MT5 Number and CRM Customer ID
        client_data = {
            "first_name": f"Test_{datetime.now().strftime('%H%M%S')}",
            "last_name": "Client", 
            "email": f"test.client.{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "+1234567890",
            "country": "USA",
            "mt5_number": f"MT5{datetime.now().strftime('%H%M%S')}",
            "crm_customer_id": f"CRM-{datetime.now().strftime('%H%M%S')}"
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

        # Get specific client and verify new fields
        success, client = self.run_test("Get Specific Client", "GET", f"api/clients/{client_id}", 200)
        if success:
            # Verify MT5 and CRM fields are present
            has_mt5 = 'mt5_number' in client and client['mt5_number']
            has_crm = 'crm_customer_id' in client and client['crm_customer_id']
            if has_mt5 and has_crm:
                print(f"   ✅ MT5 Number: {client['mt5_number']}, CRM ID: {client['crm_customer_id']}")
            else:
                print(f"   ❌ Missing new fields - MT5: {has_mt5}, CRM: {has_crm}")
                return False
        
        return success

    def test_treasury_crud(self):
        """Test treasury accounts CRUD operations (Admin only)"""
        # Get treasury accounts
        success, accounts = self.run_test("Get Treasury Accounts", "GET", "api/treasury", 200)
        if not success:
            return False

        # Create treasury account (Admin only)
        account_data = {
            "account_name": f"Test_Bank_{datetime.now().strftime('%H%M%S')}",
            "account_type": "bank",
            "bank_name": "Test Bank",
            "account_number": f"****{datetime.now().strftime('%H%M%S')[-4:]}",
            "currency": "USD",
            "description": "API Test Account"
        }
        success, new_account = self.run_test("Create Treasury Account", "POST", "api/treasury", 200, data=account_data)
        if not success or not new_account.get('account_id'):
            return False

        account_id = new_account['account_id']
        print(f"   Created treasury account: {new_account.get('account_name')}")

        # Update account
        update_data = {"description": "Updated via API test"}
        success, updated = self.run_test("Update Treasury Account", "PUT", f"api/treasury/{account_id}", 200, data=update_data)
        
        return success

    def test_transactions_crud(self):
        """Test transactions CRUD operations - now linked to clients directly"""
        # Get existing clients first
        success, clients = self.run_test("Get Clients for Transactions", "GET", "api/clients", 200)
        if not success or not clients:
            return False

        client_id = clients[0]['client_id']
        
        # Get treasury accounts for destination
        success, treasury_accounts = self.run_test("Get Treasury for Transactions", "GET", "api/treasury", 200)
        if not success or not treasury_accounts:
            return False
            
        destination_account_id = treasury_accounts[0]['account_id']

        # Get transactions
        success, transactions = self.run_test("Get Transactions", "GET", "api/transactions", 200)
        if not success:
            return False

        # Create transaction using form data (multipart)
        import requests
        url = f"{self.base_url}/api/transactions"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        form_data = {
            'client_id': client_id,
            'transaction_type': 'deposit',
            'amount': '1500.00',
            'currency': 'USD',
            'destination_account_id': destination_account_id,
            'description': 'API Test transaction'
        }
        
        self.tests_run += 1
        print(f"\n🔍 Testing Create Transaction (Form Data)...")
        
        try:
            response = requests.post(url, data=form_data, headers=headers)
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                new_tx = response.json()
                tx_id = new_tx.get('transaction_id')
                print(f"   Created transaction: {new_tx.get('reference')}")
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append(f"Create Transaction: Expected 200, got {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"Create Transaction: {str(e)}")
            return False

        if not tx_id:
            return False

        # Update transaction status
        update_data = {"status": "approved"}
        success, updated = self.run_test("Update Transaction", "PUT", f"api/transactions/{tx_id}", 200, data=update_data)
        
        return success

    def test_accountant_login(self):
        """Test login with accountant credentials"""
        success, response = self.run_test(
            "Login with Accountant Credentials",
            "POST", 
            "api/auth/login",
            200,
            data={"email": "accountant@fxbroker.com", "password": "accountant123"}
        )
        if success and 'access_token' in response:
            accountant_token = response['access_token']
            print(f"   Accountant token received: {accountant_token[:20]}...")
            return True, accountant_token
        return False, None

    def test_pending_transactions(self, accountant_token):
        """Test getting pending transactions (accountant/admin only)"""
        # Temporarily switch to accountant token
        original_token = self.token
        self.token = accountant_token
        
        success, response = self.run_test("Get Pending Transactions", "GET", "api/transactions/pending", 200)
        
        # Switch back to admin token
        self.token = original_token
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

    def test_multi_currency_transactions(self):
        """Test multi-currency transaction support (NEW FEATURE)"""
        # Get existing clients first
        success, clients = self.run_test("Get Clients for Multi-Currency Tx", "GET", "api/clients", 200)
        if not success or not clients:
            return False

        client_id = clients[0]['client_id']
        
        # Get treasury accounts for destination
        success, treasury_accounts = self.run_test("Get Treasury for Multi-Currency", "GET", "api/treasury", 200)
        if not success or not treasury_accounts:
            return False
            
        destination_account_id = treasury_accounts[0]['account_id']

        # Create AED transaction (should auto-convert to USD)
        import requests
        url = f"{self.base_url}/api/transactions"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        form_data = {
            'client_id': client_id,
            'transaction_type': 'deposit',
            'amount': '540.00',  # This should be USD equivalent
            'currency': 'USD',
            'base_currency': 'AED', 
            'base_amount': '2000.00',  # 2000 AED = 540 USD (2000 * 0.27)
            'destination_account_id': destination_account_id,
            'description': 'Multi-currency AED deposit test'
        }
        
        self.tests_run += 1
        print(f"\n🔍 Testing Multi-Currency Transaction (AED → USD)...")
        
        try:
            response = requests.post(url, data=form_data, headers=headers)
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                new_tx = response.json()
                print(f"   Created AED transaction: {new_tx.get('reference')}")
                print(f"   Base: {new_tx.get('base_amount')} {new_tx.get('base_currency')} → USD: ${new_tx.get('amount')}")
                
                # Verify currency conversion
                expected_usd = 2000 * 0.27  # AED to USD rate
                actual_usd = new_tx.get('amount')
                if abs(actual_usd - expected_usd) < 1:  # Allow small rounding difference
                    print(f"   ✅ Currency conversion correct: {expected_usd} ≈ {actual_usd}")
                    return True
                else:
                    print(f"   ❌ Currency conversion failed: expected ~{expected_usd}, got {actual_usd}")
                    self.failed_tests.append(f"Multi-Currency: Wrong conversion - expected ~{expected_usd}, got {actual_usd}")
                    return False
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append(f"Multi-Currency Transaction: Expected 200, got {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"Multi-Currency Transaction: {str(e)}")
            return False

    def test_treasury_usd_conversion(self):
        """Test treasury accounts show USD equivalent (NEW FEATURE)"""
        success, accounts = self.run_test("Get Treasury Accounts for USD Check", "GET", "api/treasury", 200)
        if not success:
            return False
            
        # Check if accounts have balance_usd field
        usd_conversion_working = True
        for account in accounts:
            if 'balance_usd' not in account:
                print(f"   ❌ Account {account.get('account_name')} missing balance_usd field")
                usd_conversion_working = False
            else:
                currency = account.get('currency', 'USD')
                balance = account.get('balance', 0)
                balance_usd = account.get('balance_usd', 0)
                print(f"   ✅ {account.get('account_name')}: {balance} {currency} = ${balance_usd} USD")
        
        return usd_conversion_working

def main():
    print("🚀 Starting FX Broker API Tests")
    print("=" * 50)
    
    tester = FXBrokerAPITester()
    
    # Test sequence
    tests = [
        ("Seed Demo Data", tester.test_seed_data),
        ("Admin Authentication", tester.test_login),
        ("Auth Verification", tester.test_auth_me),
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("Clients CRUD (with MT5 & CRM)", tester.test_clients_crud),
        ("Treasury Accounts CRUD", tester.test_treasury_crud),
        ("Treasury USD Conversion (NEW)", tester.test_treasury_usd_conversion),
        ("Transactions CRUD", tester.test_transactions_crud),
        ("Multi-Currency Transactions (NEW)", tester.test_multi_currency_transactions),
        ("Reports & Analytics", tester.test_reports_endpoints),
    ]
    
    # Test accountant functionality
    accountant_success, accountant_token = tester.test_accountant_login()
    if accountant_success:
        tests.append(("Pending Transactions (Accountant)", lambda: tester.test_pending_transactions(accountant_token)))
    
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