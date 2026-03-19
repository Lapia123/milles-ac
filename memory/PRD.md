# Miles Capitals - Back-Office Accounting Software PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for FX brokerage "Miles Capitals" with modules for transactions, clients, PSP management, treasury, exchangers, reconciliation, reports, and more.

## Core Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI (port 3000)
- **Backend:** FastAPI + MongoDB Atlas (port 8001)
- **Storage:** Cloudflare R2 (file uploads)
- **Cache:** Redis

## What's Been Implemented

### Current Session (Mar 17-19, 2026)
- **[FIX] Destination carried over from TX Request to Transaction:** Enriched psp_name, vendor_name, destination_account_name in auto-processing and manual processing. GET /api/transactions enriches missing names.
- **[FIX] Treasury destination option added to Transaction Request forms**
- **[FEATURE] Edit Transaction on Transactions Summary:** CRM Reference, Amount, Reference, Payment Currency, and Transaction Date editable on all pending transactions
- **[FEATURE] Bank Receipt Date on Approval:** Optional field for actual payment date, used for treasury/reconciliation date matching
- **[FIX] Reconciliation date matching:** Fixed date-only string not matching ISO datetime ranges; normalized all dates
- **[FIX] Daily Report 4x emails:** Fixed scheduler duplicate execution with lock + dedup check
- **[FEATURE] Exchangers full-page detail:** Converted from cramped modal to full-page view with back button
- **[FEATURE] PSP Compound Settlement Date:** Added settlement_date field to batch settle dialog; treasury transactions and settlement records use this date for reconciliation matching

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
