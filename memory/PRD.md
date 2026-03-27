# Miles Capitals - Back-Office Accounting Software

## Problem Statement
Comprehensive back-office accounting software for FX brokerage "Miles Capitals". Manages transactions, treasury, PSPs, exchangers, clients, reconciliation, loans, and reporting.

## Tech Stack
- **Frontend:** React + Shadcn UI + Tailwind CSS
- **Backend:** FastAPI (Python) — monolithic server.py (~17.8K lines)
- **Database:** MongoDB Atlas
- **Storage:** Cloudflare R2 (via boto3)
- **Other:** Redis (caching), pandas/openpyxl (bulk uploads)

## Core Features
- Transaction Management (deposits/withdrawals, CRUD, bulk upload)
- Transaction Requests (approval workflow)
- Treasury Management (accounts, transfers, statements, export, balance fix tool)
- PSP Management (settlements, commissions, withdrawal management, net settlements)
- Exchanger Management (vendors, commissions)
- Client Management (with tags)
- Loan Management (with file attachments)
- Income & Expenses (with pending approval workflow)
- Reconciliation System
- Accountant Dashboard (universal pending approval workflow - 6 tabs)
- Multi-role access control (Admin, CRM, Accountant)
- Daily Report Scheduler
- Audit Logging

## Completed Features (March 27, 2026)
- [x] **Pending Approvals for ALL Financial Operations (P0):**
  - Income/Expenses, Loan Disbursements, Loan Repayments, PSP Settlements all route through Pending Approvals
  - AccountantDashboard rewritten with 6 tabs, unified approve/reject endpoints
- [x] **Treasury Fix Balance Effective Date Bug Fix:**
  - Now uses Opening Balance mode — adjustment placed at start-of-day
  - Removes old adjustments on same date when re-fixing (no stacking)
  - Recalculates all running balances and final account balance
  - Fixed `loan_disbursement` missing from outflow_types
- [x] **Exchanger Custom Amount Settlement (Multi-Currency):**
  - Toggle between "Settle All" (full) and "Custom Amount" (partial) modes
  - Custom mode: enter any amount in any currency (USD, AED, EUR, GBP, INR, etc.)
  - Direct Transfer option: record payment without linking to treasury account
  - Treasury destination option: link to specific treasury account
  - All settlements go through Pending Approvals workflow
  - **Bug Fix**: Custom settlements now properly deduct from vendor balance in all views (detail, list, portal)
  - Balance breakdown shows "Custom Settled" line item per currency

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
- P1: Error during withdrawal creation to an Exchanger
- P3: Minor session management redirect bug (recurring 4+)

## Upcoming Tasks
- P1: Implement Reconciliation Backend Logic (automated matching)
- P2: Implement Reconciliation "Final Approval" step

## Future/Backlog
- P2: Refactor backend/server.py (17.8K+ lines → modular FastAPI routers) — CRITICAL TECH DEBT
- P3: Refactor frontend pagination logic (reusable hook)
- P3: Refactor client search component (reusable module)

## Key API Endpoints (New)
- GET /api/pending-approvals/all — All pending items grouped by type
- POST /api/income-expenses/{entry_id}/approve — Approve IE entry
- POST /api/income-expenses/{entry_id}/reject — Reject IE entry
- POST /api/loans/{loan_id}/approve-disbursement — Approve loan disbursement
- POST /api/loans/{loan_id}/reject-disbursement — Reject loan disbursement
- POST /api/loan-repayments/{repayment_id}/approve — Approve loan repayment
- POST /api/loan-repayments/{repayment_id}/reject — Reject loan repayment
- POST /api/psp-settlements/{settlement_id}/approve — Approve PSP settlement
- POST /api/psp-settlements/{settlement_id}/reject — Reject PSP settlement

## Credentials
- Admin: admin@fxbroker.com / admin123
- CRM Admin: Shafeel@fxbroker.com / password
