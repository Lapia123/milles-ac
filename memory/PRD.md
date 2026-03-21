# Miles Capitals - Back-Office Accounting Software PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for FX brokerage "Miles Capitals" with modules for transactions, clients, PSP management, treasury, exchangers, reconciliation, reports, and more.

## Core Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend:** FastAPI + MongoDB Atlas (port 8001)
- **Storage:** Cloudflare R2 (file uploads)
- **Cache:** Redis

## What's Been Implemented

### Current Session (Mar 17-21, 2026)
- **[FIX] Destination carried over from TX Request to Transaction**
- **[FIX] Treasury destination option in Transaction Request forms**
- **[FEATURE] Edit Transaction on Transactions Summary:** CRM Ref, Amount, Reference, Payment Currency, Transaction Date
- **[FEATURE] Bank Receipt Date on Approval:** Optional field for reconciliation date matching
- **[FIX] Reconciliation date matching:** Fixed date-only string not matching ISO datetime ranges
- **[FIX] Daily Report 4x emails:** Scheduler dedup with lock + 30-min check
- **[FEATURE] Exchangers full-page detail view** with back button
- **[FEATURE] PSP Compound Settlement Date** for reconciliation matching
- **[FEATURE] Bulk Upload Transactions:** CSV + Excel support, template download, row-by-row validation with error preview, all-or-nothing import. Columns: Client Email, Type, Payment Currency, Amount, Exchange Rate, Destination Type, Destination, Transaction Date, Reference, CRM Reference, Description

## Pending Issues
- P1: "Operation failed" generic toast during transaction creation
- P1: Database performance issues
- P2: Eye icon on Reconciliation history tab
- P3: Session management redirect bug
- P3: Withdrawal to Exchanger error

## Upcoming Tasks
- P1: Reconciliation backend logic (automated matching)
- P2: Refactor backend/server.py into modular routers
- P2: Reconciliation "Final Approval" step
- P3: Frontend pagination/client search refactor

## Key Credentials
- Admin: admin@fxbroker.com / admin123
- Exchanger (musi): musi@fxbroker.com / password
- Accountant (safvan): 7209unneen@gmail.com / password
- CRM Admin (Shafeel): Shafeel@fxbroker.com / password
