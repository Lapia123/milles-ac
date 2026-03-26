# Miles Capitals - Back-Office Accounting Software

## Problem Statement
Comprehensive back-office accounting software for FX brokerage "Miles Capitals". Manages transactions, treasury, PSPs, exchangers, clients, reconciliation, loans, and reporting.

## Tech Stack
- **Frontend:** React + Shadcn UI + Tailwind CSS
- **Backend:** FastAPI (Python) — monolithic server.py (~17K lines)
- **Database:** MongoDB Atlas
- **Storage:** Cloudflare R2 (via boto3)
- **Other:** Redis (caching), pandas/openpyxl (bulk uploads)

## Core Features
- Transaction Management (deposits/withdrawals, CRUD, bulk upload)
- Transaction Requests (approval workflow)
- Treasury Management (accounts, transfers, statements, export)
- PSP Management (settlements, commissions, withdrawal management, net settlements)
- Exchanger Management (vendors, commissions)
- Client Management (with tags)
- Loan Management (with file attachments)
- Reconciliation System
- Accountant Dashboard (approval workflow)
- Multi-role access control (Admin, CRM, Accountant)
- Daily Report Scheduler
- Audit Logging

## Completed Features (This Session - March 2026)
- [x] PSP Pending Settlement calculation fix (includes withdrawals + all deductions)
- [x] PSP Net Settlement feature (settle all deposits + withdrawals at once)
- [x] Settlement History: transaction type badges (DEPOSIT/WITHDRAWAL), full details
- [x] PSP pending amounts never show negative (clamped to 0)
- [x] Backend charges endpoint now adjusts PSP pending_settlement
- [x] Inter-Treasury Transfer: added Transfer Date field
- [x] Client Tags system: CRUD API, tag selector in Create Transaction & TX Request forms, tag filter, Tags column in table, Manage Tags dialog
- [x] PSP Detail View: Full-page overlay with date filters
- [x] PSP Pagination: Backend (all 4 endpoints) + Frontend (Deposits, Withdrawals, Settlement History, main PSP grid)
- [x] Fixed PSPs.js JSX syntax error (broken closing tags from mid-edit state)

## Completed Features (Previous Sessions)
- [x] Destination bug fix (auto-processing deposits/withdrawals)
- [x] Transaction Summary edit (CRM ref, amount, reference, date, payment currency)
- [x] Bank Receipt Date in approval flow
- [x] Reconciliation date matching fix
- [x] APScheduler duplicate email fix
- [x] Exchangers UI redesign (full-page overlay)
- [x] PSP Settlement Date
- [x] Bulk Upload Transactions (CSV/Excel)
- [x] Currency Rounding Bug fix
- [x] Transaction Report Downloads fix
- [x] "Operation failed" Toast improvement
- [x] Database Performance (20+ MongoDB indexes)
- [x] Reconciliation Eye Icon fix
- [x] Bulk Upload Vendor Commission fix
- [x] PSP Balance Logic fix (withdrawals)
- [x] PSP Pending Settlements fix (exclude withdrawals from list)
- [x] Loan Export Balance fix
- [x] Loan Attachments (Cloudflare R2)
- [x] Treasury Page UI/UX overhaul
- [x] PSP as Withdrawal Source
- [x] PSP Withdrawal Management
- [x] PSP Extra Commission for deposits/withdrawals
- [x] PSP Detail View: Full-page overlay with date filters
- [x] PSP Pagination: Backend (all 4 endpoints) + Frontend (all tabs + main grid)
- [x] PSPs.js JSX syntax error fix (broken closing tags from mid-edit state)
- [x] Transaction/TX Request creation bug fix (route ordering for pending-count, improved error messages)
- [x] PSP Detail View: Full viewport height layout (no gap below table content)

## Pending Issues
- P3: Error during withdrawal creation to an Exchanger
- P3: Minor session management redirect bug (recurring 4+)

## Upcoming Tasks
- P1: Implement Reconciliation Backend Logic (automated matching)
- P2: Implement Reconciliation "Final Approval" step

## Future/Backlog
- P2: Refactor backend/server.py (17K+ lines → modular FastAPI routers) — CRITICAL TECH DEBT
- P3: Refactor frontend pagination logic (reusable hook)
- P3: Refactor client search component (reusable module)

## Key API Endpoints
- POST /api/client-tags — Create tag
- GET /api/client-tags — List tags
- DELETE /api/client-tags/{tag_id} — Delete tag
- GET /api/transactions?client_tag=VIP — Filter by tag
- POST /api/psp/{psp_id}/net-settle — Net settlement
- POST /api/treasury/inter-transfer — Transfer with date

## Credentials
- Admin: admin@fxbroker.com / admin123
- CRM Admin: Shafeel@fxbroker.com / password
