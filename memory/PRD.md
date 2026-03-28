# Miles Capitals - Back-Office Accounting Software

## Problem Statement
Comprehensive back-office accounting software for FX brokerage "Miles Capitals". Manages transactions, treasury, PSPs, exchangers, clients, reconciliation, loans, and reporting.

## Tech Stack
- **Frontend:** React + Shadcn UI + Tailwind CSS
- **Backend:** FastAPI (Python) — monolithic server.py (~18K lines)
- **Database:** MongoDB Atlas
- **Storage:** Cloudflare R2 (via boto3)
- **Other:** Redis (caching), pandas/openpyxl (bulk uploads)

## Core Features
- Transaction Management (deposits/withdrawals, CRUD, bulk upload)
- Transaction Requests (approval workflow)
- Treasury Management (accounts, transfers, statements, export, balance fix tool)
- PSP Management (settlements, commissions, withdrawal management, net settlements)
- Exchanger Management (vendors, commissions, custom settlements)
- Client Management (with tags)
- Loan Management (with file attachments)
- Income & Expenses (with pending approval workflow)
- Reconciliation System
- Accountant Dashboard (universal pending approval workflow - 6 tabs, all with date fields)
- Multi-role access control (Admin, CRM, Accountant)
- Daily Report Scheduler
- Audit Logging

## Completed Features (March 28, 2026)
- [x] **Date Field on All Pending Approval Forms (P0):**
  - Added date picker to all 5 non-transaction approval types: Vendor Settlement, I&E, Loan Disbursement, Loan Repayment, PSP Settlement
  - Generic Approval Dialog shows item summary + date field (defaults to today)
  - Backend endpoints updated to accept `approval_date` query parameter
  - Date is used for treasury transaction `created_at` timestamps
  - Existing transaction approval flow (deposit/withdrawal with Bank Receipt Date) unchanged

## Completed Features (March 27, 2026)
- [x] Pending Approvals for ALL Financial Operations
- [x] Treasury Fix Balance Effective Date
- [x] Exchanger Custom Amount Settlement (Multi-Currency)
- [x] Custom Settlement Vendor Balance Fix
- [x] I&E Treasury Currency Fix

## Completed Features (Previous Sessions)
- [x] PSP Pending Settlement calculation fix, Net Settlement feature, Settlement History
- [x] Client Tags system, PSP Detail View, PSP Pagination
- [x] Destination bug fix, Transaction Summary edit, Bank Receipt Date
- [x] Reconciliation date matching fix, APScheduler duplicate email fix
- [x] Exchangers UI redesign, PSP Settlement Date, Bulk Upload Transactions
- [x] Currency Rounding Bug fix, Transaction Report Downloads fix
- [x] Database Performance (20+ MongoDB indexes)
- [x] Treasury Page UI/UX overhaul, Treasury Balance Fix tool
- [x] PSP as Withdrawal Source, PSP Withdrawal Management, PSP Extra Commission
- [x] Tags column in Pending Approvals, inline Tag editing in Transactions
- [x] Daily Report shows all Treasury accounts, Treasury date filters always visible

## Pending Issues
- P1: "Operation failed" Toast during transaction creation (recurring, not started)
- P1: Error during withdrawal creation to an Exchanger
- P3: Minor session management redirect bug (recurring 4+)

## Upcoming Tasks
- P1: Implement Reconciliation Backend Logic (automated matching)
- P2: Implement Reconciliation "Final Approval" step

## Future/Backlog
- P2: Refactor backend/server.py (18K+ lines → modular FastAPI routers) — CRITICAL TECH DEBT
- P3: Refactor frontend pagination logic (reusable hook)
- P3: Refactor client search component (reusable module)

## Key API Endpoints
- GET /api/pending-approvals/all — All pending items grouped by type
- POST /api/income-expenses/{entry_id}/approve?approval_date=YYYY-MM-DD
- POST /api/loans/{loan_id}/approve-disbursement?approval_date=YYYY-MM-DD
- POST /api/loan-repayments/{repayment_id}/approve?approval_date=YYYY-MM-DD
- POST /api/psp-settlements/{settlement_id}/approve?approval_date=YYYY-MM-DD
- POST /api/settlements/{settlement_id}/approve?approval_date=YYYY-MM-DD
- POST /api/transactions/{transaction_id}/approve?bank_receipt_date=YYYY-MM-DD

## Credentials
- Admin: admin@fxbroker.com / admin123
- CRM Admin: Shafeel@fxbroker.com / password
