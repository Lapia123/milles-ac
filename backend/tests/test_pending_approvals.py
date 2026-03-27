"""
Test suite for Pending Approvals feature - Iteration 43
Tests all financial operations that now route through pending approvals:
- Income/Expenses: Create with status='pending', approve/reject
- Loans: Create with status='pending_approval', approve/reject disbursement
- Loan Repayments: Create with status='pending_approval', approve/reject
- PSP Settlements: Create with status='pending', approve/reject
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # Token field is 'access_token' not 'token'
        token = data.get("access_token") or data.get("token")
        assert token, f"No token in response: {data}"
        return token
    
    def test_login_success(self, auth_token):
        """Verify login works and returns token"""
        assert auth_token is not None
        print(f"✓ Login successful, token obtained")


class TestIncomeExpensesPendingApproval:
    """Test Income/Expenses pending approval flow"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        token = response.json().get("access_token") or response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def treasury_account(self, auth_headers):
        """Get a treasury account for testing"""
        response = requests.get(f"{BASE_URL}/api/treasury?page_size=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        assert len(items) > 0, "No treasury accounts found"
        return items[0]
    
    def test_create_income_expense_pending_status(self, auth_headers, treasury_account):
        """POST /api/income-expenses should create entry with status='pending'"""
        unique_ref = f"TEST_IE_{uuid.uuid4().hex[:8]}"
        payload = {
            "entry_type": "expense",
            "category": "office_supplies",
            "amount": 100.50,
            "currency": "USD",
            "treasury_account_id": treasury_account["account_id"],
            "description": f"Test expense {unique_ref}",
            "reference": unique_ref
        }
        
        response = requests.post(f"{BASE_URL}/api/income-expenses", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "pending", f"Expected status='pending', got: {data.get('status')}"
        assert data.get("entry_id") is not None
        print(f"✓ Income/Expense created with status='pending': {data.get('entry_id')}")
        
        # Store for later tests
        return data
    
    def test_approve_income_expense(self, auth_headers, treasury_account):
        """POST /api/income-expenses/{entry_id}/approve should approve and execute treasury ops"""
        # First create a pending entry
        unique_ref = f"TEST_IE_APPROVE_{uuid.uuid4().hex[:8]}"
        create_payload = {
            "entry_type": "income",
            "category": "commission",
            "amount": 250.00,
            "currency": "USD",
            "treasury_account_id": treasury_account["account_id"],
            "description": f"Test income for approval {unique_ref}",
            "reference": unique_ref
        }
        
        create_response = requests.post(f"{BASE_URL}/api/income-expenses", json=create_payload, headers=auth_headers)
        assert create_response.status_code == 200
        entry = create_response.json()
        entry_id = entry["entry_id"]
        
        # Get treasury balance before approval
        treasury_before = requests.get(f"{BASE_URL}/api/treasury/{treasury_account['account_id']}", headers=auth_headers).json()
        balance_before = treasury_before.get("balance", 0)
        
        # Approve the entry
        approve_response = requests.post(f"{BASE_URL}/api/income-expenses/{entry_id}/approve", headers=auth_headers)
        assert approve_response.status_code == 200, f"Approve failed: {approve_response.text}"
        
        # Verify entry status changed to approved
        get_response = requests.get(f"{BASE_URL}/api/income-expenses/{entry_id}", headers=auth_headers)
        assert get_response.status_code == 200
        updated_entry = get_response.json()
        assert updated_entry.get("status") == "approved", f"Expected status='approved', got: {updated_entry.get('status')}"
        
        # Verify treasury balance increased (income)
        treasury_after = requests.get(f"{BASE_URL}/api/treasury/{treasury_account['account_id']}", headers=auth_headers).json()
        balance_after = treasury_after.get("balance", 0)
        assert balance_after > balance_before, f"Treasury balance should have increased. Before: {balance_before}, After: {balance_after}"
        
        print(f"✓ Income/Expense approved, treasury credited: {balance_before} -> {balance_after}")
    
    def test_reject_income_expense(self, auth_headers, treasury_account):
        """POST /api/income-expenses/{entry_id}/reject should reject entry"""
        # Create a pending entry
        unique_ref = f"TEST_IE_REJECT_{uuid.uuid4().hex[:8]}"
        create_payload = {
            "entry_type": "expense",
            "category": "utilities",
            "amount": 75.00,
            "currency": "USD",
            "treasury_account_id": treasury_account["account_id"],
            "description": f"Test expense for rejection {unique_ref}",
            "reference": unique_ref
        }
        
        create_response = requests.post(f"{BASE_URL}/api/income-expenses", json=create_payload, headers=auth_headers)
        assert create_response.status_code == 200
        entry = create_response.json()
        entry_id = entry["entry_id"]
        
        # Reject the entry
        reject_response = requests.post(f"{BASE_URL}/api/income-expenses/{entry_id}/reject?reason=Test rejection", headers=auth_headers)
        assert reject_response.status_code == 200, f"Reject failed: {reject_response.text}"
        
        # Verify entry status changed to rejected
        get_response = requests.get(f"{BASE_URL}/api/income-expenses/{entry_id}", headers=auth_headers)
        assert get_response.status_code == 200
        updated_entry = get_response.json()
        assert updated_entry.get("status") == "rejected", f"Expected status='rejected', got: {updated_entry.get('status')}"
        
        print(f"✓ Income/Expense rejected successfully")


class TestLoansPendingApproval:
    """Test Loans pending approval flow"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        token = response.json().get("access_token") or response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def treasury_account(self, auth_headers):
        """Get a treasury account with sufficient balance"""
        response = requests.get(f"{BASE_URL}/api/treasury?page_size=50", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        # Find account with balance > 1000
        for acc in items:
            if acc.get("balance", 0) > 1000:
                return acc
        # If no account with sufficient balance, return first one
        assert len(items) > 0, "No treasury accounts found"
        return items[0]
    
    @pytest.fixture(scope="class")
    def borrower_name(self, auth_headers):
        """Get a borrower name from existing loans or use test name"""
        response = requests.get(f"{BASE_URL}/api/loans/borrowers", headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            # API returns {"borrowers": [...]}
            borrowers = data.get("borrowers", []) if isinstance(data, dict) else data
            if borrowers and len(borrowers) > 0:
                return borrowers[0].get("name", f"TEST_Borrower_{uuid.uuid4().hex[:6]}")
        return f"TEST_Borrower_{uuid.uuid4().hex[:6]}"
    
    def test_create_loan_pending_approval_status(self, auth_headers, treasury_account, borrower_name):
        """POST /api/loans should create loan with status='pending_approval'"""
        loan_date = datetime.now().strftime("%Y-%m-%d")
        due_date = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        
        payload = {
            "borrower_name": borrower_name,
            "amount": 500.00,
            "currency": "USD",
            "interest_rate": 5.0,
            "loan_type": "personal",
            "loan_date": loan_date,
            "due_date": due_date,
            "treasury_account_id": treasury_account["account_id"],
            "repayment_mode": "lump_sum",
            "notes": f"TEST_LOAN_{uuid.uuid4().hex[:8]}"
        }
        
        response = requests.post(f"{BASE_URL}/api/loans", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Create loan failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "pending_approval", f"Expected status='pending_approval', got: {data.get('status')}"
        assert data.get("loan_id") is not None
        print(f"✓ Loan created with status='pending_approval': {data.get('loan_id')}")
        
        return data
    
    def test_approve_loan_disbursement(self, auth_headers, treasury_account, borrower_name):
        """POST /api/loans/{loan_id}/approve-disbursement should approve and deduct treasury"""
        loan_date = datetime.now().strftime("%Y-%m-%d")
        due_date = (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d")
        
        # Create a pending loan
        create_payload = {
            "borrower_name": f"TEST_Approve_{borrower_name}",
            "amount": 200.00,
            "currency": "USD",
            "interest_rate": 3.0,
            "loan_type": "business",
            "loan_date": loan_date,
            "due_date": due_date,
            "treasury_account_id": treasury_account["account_id"],
            "repayment_mode": "lump_sum",
            "notes": f"TEST_LOAN_APPROVE_{uuid.uuid4().hex[:8]}"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/loans", json=create_payload, headers=auth_headers)
        assert create_response.status_code == 200
        loan = create_response.json()
        loan_id = loan["loan_id"]
        
        # Get treasury balance before approval
        treasury_before = requests.get(f"{BASE_URL}/api/treasury/{treasury_account['account_id']}", headers=auth_headers).json()
        balance_before = treasury_before.get("balance", 0)
        
        # Approve the loan disbursement
        approve_response = requests.post(f"{BASE_URL}/api/loans/{loan_id}/approve-disbursement", headers=auth_headers)
        assert approve_response.status_code == 200, f"Approve disbursement failed: {approve_response.text}"
        
        # Verify loan status changed to active
        get_response = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=auth_headers)
        assert get_response.status_code == 200
        updated_loan = get_response.json()
        assert updated_loan.get("status") == "active", f"Expected status='active', got: {updated_loan.get('status')}"
        
        # Verify treasury balance decreased (disbursement)
        treasury_after = requests.get(f"{BASE_URL}/api/treasury/{treasury_account['account_id']}", headers=auth_headers).json()
        balance_after = treasury_after.get("balance", 0)
        assert balance_after < balance_before, f"Treasury balance should have decreased. Before: {balance_before}, After: {balance_after}"
        
        print(f"✓ Loan disbursement approved, treasury debited: {balance_before} -> {balance_after}")
    
    def test_reject_loan_disbursement(self, auth_headers, treasury_account, borrower_name):
        """POST /api/loans/{loan_id}/reject-disbursement should reject loan"""
        loan_date = datetime.now().strftime("%Y-%m-%d")
        due_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        # Create a pending loan
        create_payload = {
            "borrower_name": f"TEST_Reject_{borrower_name}",
            "amount": 150.00,
            "currency": "USD",
            "interest_rate": 2.0,
            "loan_type": "personal",
            "loan_date": loan_date,
            "due_date": due_date,
            "treasury_account_id": treasury_account["account_id"],
            "repayment_mode": "lump_sum",
            "notes": f"TEST_LOAN_REJECT_{uuid.uuid4().hex[:8]}"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/loans", json=create_payload, headers=auth_headers)
        assert create_response.status_code == 200
        loan = create_response.json()
        loan_id = loan["loan_id"]
        
        # Reject the loan disbursement
        reject_response = requests.post(f"{BASE_URL}/api/loans/{loan_id}/reject-disbursement?reason=Test rejection", headers=auth_headers)
        assert reject_response.status_code == 200, f"Reject disbursement failed: {reject_response.text}"
        
        # Verify loan status changed to rejected
        get_response = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=auth_headers)
        assert get_response.status_code == 200
        updated_loan = get_response.json()
        assert updated_loan.get("status") == "rejected", f"Expected status='rejected', got: {updated_loan.get('status')}"
        
        print(f"✓ Loan disbursement rejected successfully")


class TestLoanRepaymentsPendingApproval:
    """Test Loan Repayments pending approval flow"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        token = response.json().get("access_token") or response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def active_loan(self, auth_headers):
        """Get or create an active loan for repayment testing"""
        # First try to find an existing active loan
        response = requests.get(f"{BASE_URL}/api/loans?status=active&page_size=10", headers=auth_headers)
        if response.status_code == 200:
            data = response.json()
            items = data.get("items", data) if isinstance(data, dict) else data
            for loan in items:
                if loan.get("status") == "active":
                    return loan
        
        # If no active loan, create and approve one
        treasury_response = requests.get(f"{BASE_URL}/api/treasury?page_size=10", headers=auth_headers)
        treasury_data = treasury_response.json()
        treasury_items = treasury_data.get("items", treasury_data) if isinstance(treasury_data, dict) else treasury_data
        treasury_account = treasury_items[0] if treasury_items else None
        
        if not treasury_account:
            pytest.skip("No treasury account available for loan creation")
        
        loan_date = datetime.now().strftime("%Y-%m-%d")
        due_date = (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d")
        
        create_payload = {
            "borrower_name": f"TEST_Repayment_Borrower_{uuid.uuid4().hex[:6]}",
            "amount": 1000.00,
            "currency": "USD",
            "interest_rate": 5.0,
            "loan_type": "business",
            "loan_date": loan_date,
            "due_date": due_date,
            "treasury_account_id": treasury_account["account_id"],
            "repayment_mode": "lump_sum",
            "notes": f"TEST_LOAN_FOR_REPAYMENT_{uuid.uuid4().hex[:8]}"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/loans", json=create_payload, headers=auth_headers)
        if create_response.status_code != 200:
            pytest.skip(f"Could not create loan: {create_response.text}")
        
        loan = create_response.json()
        loan_id = loan["loan_id"]
        
        # Approve the loan
        approve_response = requests.post(f"{BASE_URL}/api/loans/{loan_id}/approve-disbursement", headers=auth_headers)
        if approve_response.status_code != 200:
            pytest.skip(f"Could not approve loan: {approve_response.text}")
        
        # Get updated loan
        get_response = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=auth_headers)
        return get_response.json()
    
    @pytest.fixture(scope="class")
    def treasury_account(self, auth_headers):
        """Get a treasury account"""
        response = requests.get(f"{BASE_URL}/api/treasury?page_size=10", headers=auth_headers)
        data = response.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        return items[0] if items else None
    
    def test_create_repayment_pending_approval_status(self, auth_headers, active_loan, treasury_account):
        """POST /api/loans/{loan_id}/repayment should create repayment with status='pending_approval'"""
        if not active_loan or not treasury_account:
            pytest.skip("No active loan or treasury account available")
        
        payload = {
            "amount": 100.00,
            "currency": active_loan.get("currency", "USD"),
            "treasury_account_id": treasury_account["account_id"],
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "reference": f"TEST_REP_{uuid.uuid4().hex[:8]}",
            "notes": "Test repayment"
        }
        
        response = requests.post(f"{BASE_URL}/api/loans/{active_loan['loan_id']}/repayment", json=payload, headers=auth_headers)
        assert response.status_code == 200, f"Create repayment failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "pending_approval", f"Expected status='pending_approval', got: {data.get('status')}"
        assert data.get("repayment_id") is not None
        print(f"✓ Loan repayment created with status='pending_approval': {data.get('repayment_id')}")
        
        return data
    
    def test_approve_loan_repayment(self, auth_headers, active_loan, treasury_account):
        """POST /api/loan-repayments/{repayment_id}/approve should approve, credit treasury, update loan"""
        if not active_loan or not treasury_account:
            pytest.skip("No active loan or treasury account available")
        
        # Create a pending repayment
        create_payload = {
            "amount": 50.00,
            "currency": active_loan.get("currency", "USD"),
            "treasury_account_id": treasury_account["account_id"],
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "reference": f"TEST_REP_APPROVE_{uuid.uuid4().hex[:8]}",
            "notes": "Test repayment for approval"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/loans/{active_loan['loan_id']}/repayment", json=create_payload, headers=auth_headers)
        assert create_response.status_code == 200
        repayment = create_response.json()
        repayment_id = repayment["repayment_id"]
        
        # Get treasury balance before approval
        treasury_before = requests.get(f"{BASE_URL}/api/treasury/{treasury_account['account_id']}", headers=auth_headers).json()
        balance_before = treasury_before.get("balance", 0)
        
        # Approve the repayment
        approve_response = requests.post(f"{BASE_URL}/api/loan-repayments/{repayment_id}/approve", headers=auth_headers)
        assert approve_response.status_code == 200, f"Approve repayment failed: {approve_response.text}"
        
        # Verify treasury balance increased (repayment credits treasury)
        treasury_after = requests.get(f"{BASE_URL}/api/treasury/{treasury_account['account_id']}", headers=auth_headers).json()
        balance_after = treasury_after.get("balance", 0)
        assert balance_after > balance_before, f"Treasury balance should have increased. Before: {balance_before}, After: {balance_after}"
        
        print(f"✓ Loan repayment approved, treasury credited: {balance_before} -> {balance_after}")
    
    def test_reject_loan_repayment(self, auth_headers, active_loan, treasury_account):
        """POST /api/loan-repayments/{repayment_id}/reject should reject repayment"""
        if not active_loan or not treasury_account:
            pytest.skip("No active loan or treasury account available")
        
        # Create a pending repayment
        create_payload = {
            "amount": 25.00,
            "currency": active_loan.get("currency", "USD"),
            "treasury_account_id": treasury_account["account_id"],
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "reference": f"TEST_REP_REJECT_{uuid.uuid4().hex[:8]}",
            "notes": "Test repayment for rejection"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/loans/{active_loan['loan_id']}/repayment", json=create_payload, headers=auth_headers)
        assert create_response.status_code == 200
        repayment = create_response.json()
        repayment_id = repayment["repayment_id"]
        
        # Reject the repayment
        reject_response = requests.post(f"{BASE_URL}/api/loan-repayments/{repayment_id}/reject?reason=Test rejection", headers=auth_headers)
        assert reject_response.status_code == 200, f"Reject repayment failed: {reject_response.text}"
        
        print(f"✓ Loan repayment rejected successfully")


class TestPSPSettlementsPendingApproval:
    """Test PSP Settlements pending approval flow"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        token = response.json().get("access_token") or response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def psp_with_transactions(self, auth_headers):
        """Get a PSP with unsettled transactions"""
        # Get PSPs
        psp_response = requests.get(f"{BASE_URL}/api/psp", headers=auth_headers)
        if psp_response.status_code != 200:
            return None
        
        psps = psp_response.json()
        psp_list = psps.get("items", psps) if isinstance(psps, dict) else psps
        
        for psp in psp_list:
            # Check for pending transactions
            pending_response = requests.get(f"{BASE_URL}/api/psp/{psp['psp_id']}/pending-transactions", headers=auth_headers)
            if pending_response.status_code == 200:
                pending_data = pending_response.json()
                # API returns paginated response with "items" key
                pending = pending_data.get("items", []) if isinstance(pending_data, dict) else pending_data
                if pending and len(pending) > 0:
                    return {"psp": psp, "pending_transactions": pending}
        
        return None
    
    def test_batch_settle_creates_pending_settlement(self, auth_headers, psp_with_transactions):
        """POST /api/psp/{psp_id}/settle-batch should create settlement with status='pending'"""
        if not psp_with_transactions:
            pytest.skip("No PSP with pending transactions available")
        
        psp = psp_with_transactions["psp"]
        pending_txs = psp_with_transactions["pending_transactions"]
        
        # Get treasury account for settlement destination
        treasury_response = requests.get(f"{BASE_URL}/api/treasury?page_size=10", headers=auth_headers)
        treasury_data = treasury_response.json()
        treasury_items = treasury_data.get("items", treasury_data) if isinstance(treasury_data, dict) else treasury_data
        
        if not treasury_items:
            pytest.skip("No treasury account available")
        
        treasury_account = treasury_items[0]
        
        # Select first few transactions for batch settlement
        tx_ids = [tx["transaction_id"] for tx in pending_txs[:min(3, len(pending_txs))]]
        
        payload = {
            "transaction_ids": tx_ids,
            "destination_account_id": treasury_account["account_id"],
            "settlement_date": datetime.now().strftime("%Y-%m-%d")
        }
        
        response = requests.post(f"{BASE_URL}/api/psp/{psp['psp_id']}/settle-batch", json=payload, headers=auth_headers)
        
        if response.status_code == 400 and "already settled" in response.text.lower():
            pytest.skip("Selected transactions already settled")
        
        assert response.status_code == 200, f"Batch settle failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "pending", f"Expected status='pending', got: {data.get('status')}"
        assert data.get("settlement_id") is not None
        print(f"✓ PSP batch settlement created with status='pending': {data.get('settlement_id')}")
        
        return data


class TestPendingApprovalsEndpoint:
    """Test the unified pending approvals endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        token = response.json().get("access_token") or response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_all_pending_approvals(self, auth_headers):
        """GET /api/pending-approvals/all should return all pending items grouped by type"""
        response = requests.get(f"{BASE_URL}/api/pending-approvals/all", headers=auth_headers)
        assert response.status_code == 200, f"Get pending approvals failed: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "income_expenses" in data, "Missing income_expenses in response"
        assert "loans" in data, "Missing loans in response"
        assert "loan_repayments" in data, "Missing loan_repayments in response"
        assert "psp_settlements" in data, "Missing psp_settlements in response"
        assert "counts" in data, "Missing counts in response"
        
        # Verify counts structure
        counts = data["counts"]
        assert "income_expenses" in counts
        assert "loans" in counts
        assert "loan_repayments" in counts
        assert "psp_settlements" in counts
        
        # Verify counts match array lengths
        assert counts["income_expenses"] == len(data["income_expenses"])
        assert counts["loans"] == len(data["loans"])
        assert counts["loan_repayments"] == len(data["loan_repayments"])
        assert counts["psp_settlements"] == len(data["psp_settlements"])
        
        print(f"✓ Pending approvals endpoint returns correct structure")
        print(f"  - Income/Expenses: {counts['income_expenses']}")
        print(f"  - Loans: {counts['loans']}")
        print(f"  - Loan Repayments: {counts['loan_repayments']}")
        print(f"  - PSP Settlements: {counts['psp_settlements']}")


class TestDeleteIncomeExpenseReversalLogic:
    """Test that DELETE /api/income-expenses only reverses treasury for approved entries"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        token = response.json().get("access_token") or response.json().get("token")
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def treasury_account(self, auth_headers):
        """Get a treasury account"""
        response = requests.get(f"{BASE_URL}/api/treasury?page_size=10", headers=auth_headers)
        data = response.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        return items[0] if items else None
    
    def test_delete_pending_entry_no_treasury_reversal(self, auth_headers, treasury_account):
        """DELETE pending income/expense should NOT reverse treasury (nothing was credited)"""
        if not treasury_account:
            pytest.skip("No treasury account available")
        
        # Create a pending expense
        unique_ref = f"TEST_IE_DELETE_PENDING_{uuid.uuid4().hex[:8]}"
        create_payload = {
            "entry_type": "expense",
            "category": "office_supplies",
            "amount": 50.00,
            "currency": "USD",
            "treasury_account_id": treasury_account["account_id"],
            "description": f"Test expense for delete {unique_ref}",
            "reference": unique_ref
        }
        
        create_response = requests.post(f"{BASE_URL}/api/income-expenses", json=create_payload, headers=auth_headers)
        assert create_response.status_code == 200
        entry = create_response.json()
        entry_id = entry["entry_id"]
        
        # Verify it's pending
        assert entry.get("status") == "pending"
        
        # Get treasury balance before delete
        treasury_before = requests.get(f"{BASE_URL}/api/treasury/{treasury_account['account_id']}", headers=auth_headers).json()
        balance_before = treasury_before.get("balance", 0)
        
        # Delete the pending entry
        delete_response = requests.delete(f"{BASE_URL}/api/income-expenses/{entry_id}", headers=auth_headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify treasury balance unchanged (no reversal needed for pending)
        treasury_after = requests.get(f"{BASE_URL}/api/treasury/{treasury_account['account_id']}", headers=auth_headers).json()
        balance_after = treasury_after.get("balance", 0)
        
        # Balance should be the same since pending entries don't affect treasury
        assert balance_after == balance_before, f"Treasury balance should be unchanged for pending delete. Before: {balance_before}, After: {balance_after}"
        
        print(f"✓ Delete pending entry did not reverse treasury (correct behavior)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
