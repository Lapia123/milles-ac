# Miles Capitals - Back-Office Accounting Software PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for FX brokerage "Miles Capitals" with modules for transactions, clients, PSP management, treasury, exchangers, reconciliation, reports, loans, and more.

## Core Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend:** FastAPI + MongoDB Atlas (port 8001)
- **Storage:** Cloudflare R2 (file uploads)
- **Cache:** Redis

## What's Been Implemented

### Session Mar 24, 2026
- **[FEATURE] Loan Attachments:** File upload on New Loan form (PDF, Excel, Images, max 10MB). Files stored in Cloudflare R2. Shown in Loan Transactions Log with clickable links. Also viewable/uploadable from Loan Detail dialog.
- **[FEATURE] Treasury Period Filter:** Preset date ranges (Today, Yesterday, This/Last Week/Month, Last 3 Months, This Year, Custom Range).
- **[FIX] Treasury UI Compacted:** Single-row summary bar, pagination (100/page), Debit/Credit split columns.
- **[FEATURE] Treasury Export (PDF/Excel/CSV):** Full statement export with summary header.
- **[FIX] Bulk Upload Vendor Commission:** Fixed missing base currency commission fields.
- **[FIX] Transaction Report Downloads:** Fixed destination "undefined", added Payment Currency.
- **[FIX] "Operation failed" Toast (P1):** Descriptive backend errors.
- **[FIX] Database Performance (P1):** ~20 MongoDB indexes.
- **[FIX] Reconciliation Eye Icon (P2):** Fixed dialog closure.

### Earlier Sessions
- Destination bug fix, TX edit, Bank Receipt Date, Reconciliation date fix
- APScheduler fix, Exchangers UI overhaul, PSP Settlement Date
- Bulk Upload Transactions, Currency Rounding fix

## Key API Endpoints (New)
- `POST /api/loans/{loan_id}/attachments` — Upload files to loan (multipart)
- `DELETE /api/loans/{loan_id}/attachments/{attachment_id}` — Remove attachment

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
