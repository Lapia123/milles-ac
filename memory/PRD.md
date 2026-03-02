# Miles Capitals FX Broker Back-Office System - PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for an FX (foreign exchange) broker named "Miles Capitals". The application includes modules for:
- Client Management
- Transactions
- Exchanger Portal
- Income & Expenses
- Treasury
- Loans
- LP (Liquidity Provider) Management
- Dealing P&L (NEW)
- Granular Role-Based Access Control (RBAC)
- Reporting & Reconciliation

## User Personas
1. **Super Admin** - Full system access
2. **Admin** - Most administrative functions
3. **Accountant** - Financial operations
4. **Exchanger** - Limited transaction access

## Core Requirements
- JWT-based authentication
- Distinct "Bank" vs "Cash" transaction modes
- Four-part commission structure
- System-wide currency auto-conversion for treasury operations
- MongoDB Atlas as database backend
- Custom SMTP for email dispatch

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI, Motor (async MongoDB), Pydantic
- **Database:** MongoDB Atlas
- **Auth:** JWT + Emergent-managed Google Auth (disabled)

---

## What's Been Implemented

### Date: Mar 2, 2026

**Dealing P&L Feature:**
- New "Dealing P&L" tab in LP Management module
- Daily P&L calculation from MT5 and LP data
- Summary dashboard (30-day totals, profitable/loss days, best day)
- Record table with calculated broker P&L
- Add/Delete functionality for daily records
- Formula: Broker P&L = -(Client Booked) - (Floating Change) + LP Booked + LP Floating Change

### Date: Mar 1, 2026

**Bug Fixes:**
- PSP Settlement History not showing records - Fixed by creating psp_settlements entries on record-payment
- Treasury date mismatch - Fixed to use entry date instead of current timestamp
- Income/Expenses Amount field not accepting digits - Changed to text input with decimal validation
- Daily Report Schedule auto-save - Toggle now saves immediately

### Previous Session Work:
- Granular RBAC System (Foundation)
- LP Management Module
- System-wide Currency Auto-Conversion
- Database Migration to MongoDB Atlas
- Loan Management Enhancements
- Transaction Ledger Enhancement
- System Configuration (SMTP, Google Sign-in removed)

---

## Prioritized Backlog

### P0 - Critical/Blockers
- [ ] Fix Settings page redirect issue (blocking RBAC integration)

### P1 - High Priority
- [ ] Verify RBAC permission enforcement for Exchanger role
- [ ] Complete User Management + RBAC integration
- [ ] Enforce granular permissions across backend endpoints

### P2 - Medium Priority
- [ ] Implement frontend permission gates (conditional UI rendering)
- [ ] Complete Reconciliation Module
- [ ] Add screenshot upload to Dealing P&L records

### P3 - Low Priority/Technical Debt
- [ ] Refactor `backend/server.py` into modular APIRouter files

---

## Key Endpoints

### Dealing P&L Endpoints (NEW)
- `GET /api/dealing-pnl` - List records with calculations
- `GET /api/dealing-pnl/summary` - Summary statistics (30 days)
- `POST /api/dealing-pnl` - Create/update daily record
- `DELETE /api/dealing-pnl/{date}` - Delete record

### RBAC Endpoints
- `GET /api/roles` - List all roles
- `POST /api/roles` - Create role
- `PUT /api/roles/{role_id}` - Update role
- `GET /api/permissions/my` - Get current user permissions

### LP Management Endpoints
- Full CRUD for LPs (`/api/lp`)
- `/api/lp/{lp_id}/deposit` - Deposit to LP
- `/api/lp/{lp_id}/withdraw` - Withdraw from LP

### PSP Endpoints
- `/api/psp` - List/Create PSPs
- `/api/psp/{psp_id}/settlements` - Get PSP settlement history
- `/api/psp/transactions/{transaction_id}/record-payment` - Record payment

---

## Database Schema

### New Collections
- `dealing_pnl` - Daily dealing P&L records
  - date, mt5_booked_pnl, mt5_floating_pnl, lp_booked_pnl, lp_floating_pnl
  - mt5_screenshot, lp_screenshot, notes
  - created_at, created_by, updated_at, updated_by

### Existing Collections
- `users` - User accounts with `role_id` reference
- `roles` - Granular RBAC roles
- `clients` - Client records
- `transactions` - All financial transactions
- `treasury_accounts` - Treasury account management
- `treasury_transactions` - Treasury transaction logs
- `psps` - Payment Service Providers
- `psp_settlements` - PSP settlement history
- `lp_accounts` - Liquidity Provider accounts
- `lp_transactions` - LP transaction records
- `loans` - Loan management
- `income_expenses` - Income & expense records
- `app_settings` - Application configuration

---

## Test Credentials
- **Admin:** admin@fxbroker.com / admin123
- **Accountant:** admin3@fxbroker.com / admin123
- **Exchanger:** kenway@fxbroker.com / password

---

## Key Files
- `backend/server.py` - Main backend (needs refactoring)
- `frontend/src/pages/LPAccounts.js` - LP Management + Dealing P&L
- `frontend/src/pages/Settings.js` - User management
- `frontend/src/pages/RolesPermissions.js` - RBAC UI
- `frontend/src/pages/PSPs.js` - PSP management
- `frontend/src/pages/Loans.js` - Loan management
