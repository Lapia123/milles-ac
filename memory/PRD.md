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

### Date: Feb 28, 2026

**PSP Settlement History Bug Fix:**
- Fixed issue where PSP settlements weren't appearing in Settlement History tab
- Modified `/record-payment` endpoint to create `psp_settlements` records
- Added backfill migration endpoint `/api/psp/backfill-settlements`
- Enhanced Settlement History UI with Reference, Net Received, Date columns
- Successfully migrated existing settlement REF832FB603 (+8,710 USD)

**Previous Session Work:**
- Granular RBAC System (Foundation) - Backend models, permission logic, default roles, management APIs, and "Roles & Permissions" UI page
- LP Management Module - Full-featured module for managing Liquidity Providers
- System-wide Currency Auto-Conversion - Implemented in Loans, LP, and Income/Expense modules
- Database Migration to MongoDB Atlas - Successfully connected
- Loan Management Enhancements - Filters added, date parsing and balance calculation bugs fixed
- Transaction Ledger Enhancement - Added client_email column
- System Configuration - Custom SMTP configured, Google Sign-in removed from login page

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

### P3 - Low Priority/Technical Debt
- [ ] Refactor `backend/server.py` into modular APIRouter files

---

## Key Endpoints

### RBAC Endpoints
- `GET /api/roles` - List all roles
- `POST /api/roles` - Create role
- `PUT /api/roles/{role_id}` - Update role
- `GET /api/permissions/my` - Get current user permissions
- `PUT /api/users/{user_id}/role` - Assign role to user

### LP Management Endpoints
- Full CRUD for LPs (`/api/lps`)
- `/api/lps/{lp_id}/deposit` - Deposit to LP
- `/api/lps/{lp_id}/withdraw` - Withdraw from LP

### PSP Endpoints
- `/api/psp` - List/Create PSPs
- `/api/psp/{psp_id}/settlements` - Get PSP settlement history
- `/api/psp/transactions/{transaction_id}/record-payment` - Record payment received
- `/api/psp/backfill-settlements` - Migration: backfill existing settlements

---

## Database Schema

### Collections
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
- `app_settings` - Application configuration (SMTP, etc.)

---

## Test Credentials
- **Admin:** admin@fxbroker.com / admin123
- **Accountant:** admin3@fxbroker.com / admin123
- **Exchanger:** kenway@fxbroker.com / password

---

## Key Files
- `backend/server.py` - Main backend (needs refactoring)
- `frontend/src/pages/Settings.js` - User management (IN PROGRESS)
- `frontend/src/pages/RolesPermissions.js` - RBAC UI
- `frontend/src/pages/PSPs.js` - PSP management
- `frontend/src/pages/LPs.js` - LP management
- `frontend/src/pages/Loans.js` - Loan management
- `frontend/src/components/Layout.js` - App layout & navigation
