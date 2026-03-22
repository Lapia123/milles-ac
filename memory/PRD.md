# Miles Capitals - Back-Office Accounting Software PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for FX brokerage "Miles Capitals" with modules for transactions, clients, PSP management, treasury, exchangers, reconciliation, reports, and more.

## Core Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend:** FastAPI + MongoDB Atlas (port 8001)
- **Storage:** Cloudflare R2 (file uploads)
- **Cache:** Redis

## What's Been Implemented

### Session Mar 22, 2026
- **[FIX] Transaction Report Downloads:** Fixed destination showing "undefined" by using correct field `destination_account_name` instead of `treasury_account_name`. Added Payment Currency, Exchange Rate, CRM Reference columns to CSV/Excel/PDF exports.
- **[FIX] "Operation failed" Toast (P1):** Improved error handling in transaction creation - backend now wraps create_transaction in try/except with descriptive error messages; frontend parses JSON errors and falls back to response text with status code.
- **[FIX] Database Performance (P1):** Added ~20 comprehensive MongoDB indexes covering transaction_id, psp_id, crm_reference, psps, users, treasury_accounts, reconciliations, transaction_requests, activity_log, client_bank_accounts, loan_transactions, app_settings.
- **[FIX] Reconciliation Eye Icon (P2):** Fixed stale closure in dialog onOpenChange handler.
- **[FIX] Transaction Creation Validation:** Added backend input validation for empty client_id, missing vendor_id for vendor destinations, missing psp_id for PSP destinations, missing account_id for treasury/USDT, negative/zero amounts.

### Session Mar 17-21, 2026
- Destination carried over from TX Request to Transaction
- Treasury destination option in Transaction Request forms
- Edit Transaction on Transactions Summary (CRM Ref, Amount, Reference, Payment Currency, Transaction Date)
- Bank Receipt Date on Approval
- Reconciliation date matching fix
- Daily Report 4x emails fix (APScheduler)
- Exchangers full-page detail view
- PSP Compound Settlement Date
- Bulk Upload Transactions (CSV + Excel)
- Currency Rounding Bug fix

## Pending Issues
- P3: Session management redirect bug
- P3: Withdrawal to Exchanger error (validation improved but full flow untested)

## Upcoming Tasks
- P1: Reconciliation backend logic (automated matching)
- P2: Refactor backend/server.py into modular routers (17K+ lines)
- P2: Reconciliation "Final Approval" step
- P3: Frontend pagination/client search refactor

## Key Credentials
- Admin: admin@fxbroker.com / admin123
- Exchanger (musi): musi@fxbroker.com / password
- Accountant (safvan): 7209unneen@gmail.com / password
- CRM Admin (Shafeel): Shafeel@fxbroker.com / password
