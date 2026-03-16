# Miles Capitals - Back-Office Accounting Software PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for FX brokerage "Miles Capitals" with modules for transactions, clients, PSP management, treasury, exchangers, reconciliation, reports, and more.

## Core Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend:** FastAPI + MongoDB Atlas (port 8001)
- **Storage:** Cloudflare R2 (file uploads)
- **Cache:** Redis

## What's Been Implemented

### Session 1-N (Previous Sessions)
- Full auth system (JWT), role-based access (Admin, Accountant, CRM Admin, Exchanger)
- Client management (CRUD, KYC, bank accounts)
- Transaction lifecycle (create, approve, reject, settle)
- PSP management (CRUD, settlements, reserve funds, chargebacks)
- Treasury accounts with balance tracking
- Exchanger/Vendor management with commissions
- Reconciliation module (basic)
- Reports & Analytics (PDF/Excel export, scheduled reports)
- Income & Expenses module
- Loans module, O/S Accounts, LP Management
- Audit logs, messaging system

### Current Session (Mar 16, 2026)
- **[FIX] Destination carried over from TX Request to Transaction:** Auto-processing (deposits) and manual processing (withdrawals) now correctly populate `psp_name`, `vendor_name`, `destination_account_name` in the transaction document. GET /api/transactions also enriches missing destination names from their respective collections.
- **[FIX] Treasury destination option added to Transaction Request forms:** Both Edit and Create forms for deposit requests now include "Treasury / Bank Account" as a destination option with treasury account selector.
- **[FEATURE] Edit Transaction fields on Transactions Summary:** Added ability to edit CRM Reference, Amount, and Reference on all pending transactions (before approval). Includes uniqueness validation for CRM Reference and Reference.

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
