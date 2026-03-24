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
- **[FIX] Treasury UI Compacted:** Replaced two-row oversized summary cards with a single compact horizontal bar showing Total USD, Active Accounts, and per-currency balances all in one line.
- **[FEATURE] Treasury History Pagination:** Added server-side pagination (15 per page) with First/Prev/Next/Last controls. Page resets on filter or account change.
- **[FEATURE] Treasury Summary Enhancement:** Per-currency balance cards, statement summary (opening/closing balance, credits/debits).
- **[FEATURE] Treasury Export (PDF/Excel/CSV):** Dropdown with CSV, Excel (.xls), and Print/PDF — all include account summary header.
- **[FEATURE] Treasury History Table:** Separate Debit/Credit columns, Description column.
- **[FIX] Bulk Upload Vendor Commission:** Fixed missing base currency commission fields.
- **[FIX] Transaction Report Downloads:** Fixed destination "undefined", added Payment Currency column.
- **[FIX] "Operation failed" Toast (P1):** Descriptive errors.
- **[FIX] Database Performance (P1):** ~20 MongoDB indexes.
- **[FIX] Reconciliation Eye Icon (P2):** Fixed dialog closure.

### Session Mar 17-21, 2026
- Destination carried over from TX Request to Transaction
- Edit Transaction on Transactions Summary
- Bank Receipt Date on Approval
- Daily Report 4x emails fix
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
