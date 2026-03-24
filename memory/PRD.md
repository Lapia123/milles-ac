# Miles Capitals - Back-Office Accounting Software PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for FX brokerage "Miles Capitals" with modules for transactions, clients, PSP management, treasury, exchangers, reconciliation, reports, and more.

## Core Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend:** FastAPI + MongoDB Atlas (port 8001)
- **Storage:** Cloudflare R2 (file uploads)
- **Cache:** Redis

## What's Been Implemented

### Session Mar 24, 2026
- **[FEATURE] Treasury Summary Enhancement:** Added per-currency balance breakdown cards (AED, USDT, INR, USD with account counts), Active Accounts card, alongside existing Total USD Balance.
- **[FEATURE] Treasury Statement Export (PDF/Excel):** Replaced single CSV download with dropdown offering CSV, Excel (.xls), and Print/PDF. All exports include account summary (opening balance, total credits, total debits, closing balance), proper debit/credit columns, and description.
- **[FEATURE] Treasury History Summary Cards:** Added Opening Balance, Total Credits, Total Debits, Closing Balance summary cards inside the history dialog.
- **[FEATURE] Treasury History Table Improvement:** Split Amount column into separate Debit (red) and Credit (green) columns. Added Description column showing client name/notes.
- **[FIX] Bulk Upload Vendor Commission:** Fixed bulk_create_transactions not calculating vendor_commission_base_amount/currency. Retroactively fixed REF0C749335 (24.0 INR).
- **[FIX] Transaction Report Downloads:** Fixed destination "undefined", added Payment Currency column.
- **[FIX] "Operation failed" Toast (P1):** Descriptive backend errors + frontend parsing.
- **[FIX] Database Performance (P1):** Added ~20 MongoDB indexes.
- **[FIX] Reconciliation Eye Icon (P2):** Fixed stale closure in dialog.

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
