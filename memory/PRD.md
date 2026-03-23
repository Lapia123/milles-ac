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
- **[FIX] Bulk Upload Vendor Commission:** Fixed bulk_create_transactions endpoint not calculating `vendor_commission_base_amount` and `vendor_commission_base_currency`. Now correctly computes commission in the payment/base currency (e.g., INR) and USD separately.
- **[FIX] Transaction Report Downloads:** Fixed destination showing "undefined" by using correct field `destination_account_name`. Added Payment Currency, Exchange Rate, CRM Reference columns.
- **[FIX] "Operation failed" Toast (P1):** Backend try/except wrapper with descriptive errors; frontend JSON error parsing with status codes.
- **[FIX] Database Performance (P1):** Added ~20 MongoDB indexes (transaction_id, psp_id, users, treasury_accounts, reconciliations, etc.)
- **[FIX] Reconciliation Eye Icon (P2):** Fixed stale closure in dialog onOpenChange.
- **[FIX] Transaction Creation Validation:** Backend input validation for missing required fields.
- **[DB FIX] Retroactive commission fix:** Updated REF0C749335 to include vendor_commission_base_amount=24.0 INR.

### Session Mar 17-21, 2026
- Destination carried over from TX Request to Transaction
- Treasury destination option in Transaction Request forms
- Edit Transaction on Transactions Summary
- Bank Receipt Date on Approval
- Reconciliation date matching fix
- Daily Report 4x emails fix (APScheduler)
- Exchangers full-page detail view
- PSP Compound Settlement Date
- Bulk Upload Transactions (CSV + Excel)
- Currency Rounding Bug fix

## Pending Issues
- P3: Session management redirect bug
- P3: Withdrawal to Exchanger error

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
