# Miles Capitals - Back-Office Accounting Software PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for FX brokerage "Miles Capitals" with modules for transactions, clients, PSP management, treasury, exchangers, reconciliation, reports, and more.

## Core Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend:** FastAPI + MongoDB Atlas (port 8001)
- **Storage:** Cloudflare R2 (file uploads)
- **Cache:** Redis

## What's Been Implemented

### Previous Sessions
- Full auth system (JWT), role-based access (Admin, Accountant, CRM Admin, Exchanger)
- Client management, Transaction lifecycle, PSP management, Treasury, Exchangers
- Reconciliation module (basic), Reports & Analytics, Income & Expenses, Loans, O/S Accounts, LP Management
- Audit logs, messaging system
- File storage migration to Cloudflare R2
- PSP compound settlement, transaction back-dating, security captcha
- Enhanced transaction request status display & filtering
- PSP module overhaul (calculations, dual-currency, extra charges)

### Current Session (Mar 17, 2026)
- **[FIX] Destination carried over from TX Request to Transaction:** Auto-processing (deposits) and manual processing (withdrawals) now correctly populate psp_name, vendor_name, destination_account_name. GET /api/transactions enriches missing names.
- **[FIX] Treasury destination option added to Transaction Request forms**
- **[FEATURE] Edit Transaction on Transactions Summary:** CRM Reference, Amount, Reference, Payment Currency (base_amount, base_currency, exchange_rate), and Transaction Date editable on all pending transactions
- **[FEATURE] Bank Receipt Date on Approval:** Added optional "Bank Receipt Date" field to approval dialog. Treasury transactions use this date for reconciliation matching instead of approval date. Defaults to transaction_date.

## Pending Issues
- **P1:** "Operation failed" generic toast during transaction creation (unreproduced)
- **P1:** Database performance issues causing slow page loads
- **P2:** Eye icon on Reconciliation history tab doesn't open detail view
- **P3:** Minor session management redirect bug (recurring)
- **P3:** Error during withdrawal creation to an Exchanger

## Upcoming Tasks
- **P1:** Implement Reconciliation backend logic (automated matching)
- **P2:** Refactor `backend/server.py` into modular APIRouter files
- **P2:** Implement Reconciliation "Final Approval" step
- **P3:** Refactor frontend pagination into reusable hook
- **P3:** Refactor duplicated client search component

## Key Credentials
- Admin: admin@fxbroker.com / admin123
- Exchanger (musi): musi@fxbroker.com / password
- Accountant (safvan): 7209unneen@gmail.com / password
- CRM Admin (Shafeel): Shafeel@fxbroker.com / password
