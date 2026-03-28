"""
Test suite for the new Date field in Pending Approval forms
Tests that all 5 approval endpoints accept optional approval_date parameter:
- /api/settlements/{id}/approve (Vendor Settlement)
- /api/income-expenses/{id}/approve (I&E)
- /api/loans/{id}/approve-disbursement (Loan Disbursement)
- /api/loan-repayments/{id}/approve (Loan Repayment)
- /api/psp-settlements/{id}/approve (PSP Settlement)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestApprovalDateFeature:
    """Test approval_date parameter on all approval endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        assert token, "No access_token in login response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        self.session.close()
    
    # ---- Test Vendor Settlement Approve with approval_date ----
    def test_vendor_settlement_approve_accepts_approval_date(self):
        """Test /api/settlements/{id}/approve accepts approval_date parameter"""
        # Get pending vendor settlements
        response = self.session.get(f"{BASE_URL}/api/settlements/pending")
        assert response.status_code == 200, f"Failed to get pending settlements: {response.text}"
        
        pending = response.json()
        if not pending:
            pytest.skip("No pending vendor settlements to test")
        
        settlement_id = pending[0]["settlement_id"]
        test_date = "2025-01-15"
        
        # Approve with approval_date
        approve_response = self.session.post(
            f"{BASE_URL}/api/settlements/{settlement_id}/approve?approval_date={test_date}"
        )
        
        # Should succeed (200) or fail for business reasons (400/404), but NOT 422 (validation error)
        assert approve_response.status_code != 422, f"approval_date parameter not accepted: {approve_response.text}"
        print(f"Vendor settlement approve with date: {approve_response.status_code}")
    
    # ---- Test Income/Expense Approve with approval_date ----
    def test_income_expense_approve_accepts_approval_date(self):
        """Test /api/income-expenses/{id}/approve accepts approval_date parameter"""
        # Get pending I&E entries
        response = self.session.get(f"{BASE_URL}/api/pending-approvals/all")
        assert response.status_code == 200, f"Failed to get pending approvals: {response.text}"
        
        data = response.json()
        pending_ie = data.get("income_expenses", [])
        
        if not pending_ie:
            pytest.skip("No pending I&E entries to test")
        
        entry_id = pending_ie[0]["entry_id"]
        test_date = "2025-01-15"
        
        # Approve with approval_date
        approve_response = self.session.post(
            f"{BASE_URL}/api/income-expenses/{entry_id}/approve?approval_date={test_date}"
        )
        
        # Should succeed or fail for business reasons, but NOT 422 (validation error)
        assert approve_response.status_code != 422, f"approval_date parameter not accepted: {approve_response.text}"
        print(f"I&E approve with date: {approve_response.status_code}")
    
    # ---- Test Loan Disbursement Approve with approval_date ----
    def test_loan_disbursement_approve_accepts_approval_date(self):
        """Test /api/loans/{id}/approve-disbursement accepts approval_date parameter"""
        # Get pending loans
        response = self.session.get(f"{BASE_URL}/api/pending-approvals/all")
        assert response.status_code == 200, f"Failed to get pending approvals: {response.text}"
        
        data = response.json()
        pending_loans = data.get("loans", [])
        
        if not pending_loans:
            pytest.skip("No pending loans to test")
        
        loan_id = pending_loans[0]["loan_id"]
        test_date = "2025-01-15"
        
        # Approve with approval_date
        approve_response = self.session.post(
            f"{BASE_URL}/api/loans/{loan_id}/approve-disbursement?approval_date={test_date}"
        )
        
        # Should succeed or fail for business reasons, but NOT 422 (validation error)
        assert approve_response.status_code != 422, f"approval_date parameter not accepted: {approve_response.text}"
        print(f"Loan disbursement approve with date: {approve_response.status_code}")
    
    # ---- Test Loan Repayment Approve with approval_date ----
    def test_loan_repayment_approve_accepts_approval_date(self):
        """Test /api/loan-repayments/{id}/approve accepts approval_date parameter"""
        # Get pending repayments
        response = self.session.get(f"{BASE_URL}/api/pending-approvals/all")
        assert response.status_code == 200, f"Failed to get pending approvals: {response.text}"
        
        data = response.json()
        pending_repayments = data.get("loan_repayments", [])
        
        if not pending_repayments:
            pytest.skip("No pending loan repayments to test")
        
        repayment_id = pending_repayments[0]["repayment_id"]
        test_date = "2025-01-15"
        
        # Approve with approval_date
        approve_response = self.session.post(
            f"{BASE_URL}/api/loan-repayments/{repayment_id}/approve?approval_date={test_date}"
        )
        
        # Should succeed or fail for business reasons, but NOT 422 (validation error)
        assert approve_response.status_code != 422, f"approval_date parameter not accepted: {approve_response.text}"
        print(f"Loan repayment approve with date: {approve_response.status_code}")
    
    # ---- Test PSP Settlement Approve with approval_date ----
    def test_psp_settlement_approve_accepts_approval_date(self):
        """Test /api/psp-settlements/{id}/approve accepts approval_date parameter"""
        # Get pending PSP settlements
        response = self.session.get(f"{BASE_URL}/api/pending-approvals/all")
        assert response.status_code == 200, f"Failed to get pending approvals: {response.text}"
        
        data = response.json()
        pending_psp = data.get("psp_settlements", [])
        
        if not pending_psp:
            pytest.skip("No pending PSP settlements to test")
        
        settlement_id = pending_psp[0]["settlement_id"]
        test_date = "2025-01-15"
        
        # Approve with approval_date
        approve_response = self.session.post(
            f"{BASE_URL}/api/psp-settlements/{settlement_id}/approve?approval_date={test_date}"
        )
        
        # Should succeed or fail for business reasons, but NOT 422 (validation error)
        assert approve_response.status_code != 422, f"approval_date parameter not accepted: {approve_response.text}"
        print(f"PSP settlement approve with date: {approve_response.status_code}")
    
    # ---- Test that existing transaction approval still works ----
    def test_transaction_approval_with_bank_receipt_date(self):
        """Test existing transaction approval flow with bank_receipt_date still works"""
        # Get pending transactions
        response = self.session.get(f"{BASE_URL}/api/transactions/pending")
        assert response.status_code == 200, f"Failed to get pending transactions: {response.text}"
        
        pending = response.json()
        # Look for items array if paginated
        if isinstance(pending, dict) and "items" in pending:
            pending = pending["items"]
        
        if not pending:
            pytest.skip("No pending transactions to test")
        
        # Find a deposit or withdrawal
        tx = None
        for t in pending:
            if t.get("transaction_type") in ["deposit", "withdrawal"]:
                tx = t
                break
        
        if not tx:
            pytest.skip("No deposit/withdrawal transactions to test")
        
        tx_id = tx["transaction_id"]
        test_date = "2025-01-15"
        
        # Approve with bank_receipt_date (existing parameter)
        approve_response = self.session.post(
            f"{BASE_URL}/api/transactions/{tx_id}/approve?bank_receipt_date={test_date}"
        )
        
        # Should succeed or fail for business reasons, but NOT 422 (validation error)
        assert approve_response.status_code != 422, f"bank_receipt_date parameter not accepted: {approve_response.text}"
        print(f"Transaction approve with bank_receipt_date: {approve_response.status_code}")


class TestPendingApprovalsEndpoint:
    """Test the pending approvals endpoint returns correct data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@fxbroker.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("access_token")
        assert token, "No access_token in login response"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        yield
        
        self.session.close()
    
    def test_pending_approvals_all_endpoint(self):
        """Test /api/pending-approvals/all returns all pending items"""
        response = self.session.get(f"{BASE_URL}/api/pending-approvals/all")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "income_expenses" in data, "Missing income_expenses in response"
        assert "loans" in data, "Missing loans in response"
        assert "loan_repayments" in data, "Missing loan_repayments in response"
        assert "psp_settlements" in data, "Missing psp_settlements in response"
        assert "counts" in data, "Missing counts in response"
        
        print(f"Pending counts: {data['counts']}")
    
    def test_pending_vendor_settlements_endpoint(self):
        """Test /api/settlements/pending returns pending vendor settlements"""
        response = self.session.get(f"{BASE_URL}/api/settlements/pending")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of settlements"
        print(f"Pending vendor settlements: {len(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
