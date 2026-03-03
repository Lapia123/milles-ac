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
- Dealing P&L
- Granular Role-Based Access Control (RBAC)
- Reporting & Reconciliation

## User Personas
1. **Super Admin** - Full system access
2. **Admin** - Most administrative functions
3. **Accountant** - Financial operations
4. **Exchanger** - Limited transaction access via portal

## Core Requirements
- JWT-based authentication
- Distinct "Bank" vs "Cash" transaction modes
- Four-part commission structure
- System-wide currency auto-conversion for treasury operations
- MongoDB Atlas as database backend
- Custom SMTP for email dispatch
- Granular RBAC with permission matrix

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI, Motor (async MongoDB), Pydantic, APScheduler
- **Database:** MongoDB Atlas
- **Auth:** JWT + Emergent-managed Google Auth (disabled)

---

## What's Been Implemented

### Date: Mar 3, 2026

**RBAC Permission Enforcement (P1):**
- Migrated vendor endpoints to use granular `require_permission` decorator
- Updated endpoints: `vendor_approve_transaction`, `vendor_reject_transaction`, `vendor_approve_ie`, `vendor_reject_ie`
- Added `/api/users/assign-role-ids` migration endpoint to assign role_ids to existing users
- All users now have proper `role_id` assigned based on their legacy `role` field
- Permission changes on roles now immediately affect users

**Bug Verification (P0):**
- Settings page redirect issue verified NOT REPRODUCING - page works correctly

**Daily P&L Email (P2):**
- Verified already implemented via APScheduler
- Daily report includes P&L data when record exists for the day
- Scheduler runs at configured time (default 00:00 UTC)

### Date: Mar 2, 2026

**Dealing P&L Feature:**
- New "Dealing P&L" tab in LP Management module
- Daily P&L calculation from MT5 and LP data
- Summary dashboard (30-day totals, profitable/loss days, best day)
- Record table with calculated broker P&L
- Add/Delete functionality for daily records
- Formula: Broker P&L = -(Client Booked) - (Floating Change) + LP Booked + LP Floating Change
- P&L data included in daily email report

**Bug Fixes:**
- PSP Settlement History not showing records - Fixed
- Treasury date mismatch - Fixed
- Income/Expenses Amount field not accepting digits - Fixed
- Daily Report Schedule auto-save - Toggle now saves immediately

### Previous Session Work:
- Granular RBAC System (Foundation)
- LP Management Module
- System-wide Currency Auto-Conversion
- Database Migration to MongoDB Atlas
- Loan Management Enhancements
- Transaction Ledger Enhancement

---

## Prioritized Backlog

### P0 - Critical/Blockers
- [x] Fix Settings page redirect issue - VERIFIED WORKING
- [x] Enforce granular permissions on vendor endpoints - DONE

### P1 - High Priority
- [x] Verify RBAC permission enforcement for Exchanger role - DONE
- [ ] Enforce granular permissions across ALL backend endpoints (partial - only vendor endpoints done)
- [ ] Complete User Management + RBAC integration (users can be assigned roles but UI could be improved)

### P2 - Medium Priority
- [ ] Implement frontend permission gates (conditional UI rendering based on permissions)
- [ ] Complete Reconciliation Module
- [ ] Add screenshot upload to Dealing P&L records

### P3 - Low Priority/Technical Debt
- [ ] Refactor `backend/server.py` into modular APIRouter files
- [ ] Clean up migration endpoints (backfill-psp-settlements, sync-ie-dates, assign-role-ids)

---

## Key Endpoints

### RBAC Endpoints
- `GET /api/roles` - List all roles
- `GET /api/roles/{role_id}` - Get role details with permissions
- `POST /api/roles` - Create role
- `PUT /api/roles/{role_id}` - Update role permissions
- `GET /api/permissions/my` - Get current user's permissions
- `GET /api/permissions/modules` - Get all modules and actions
- `POST /api/users/assign-role-ids` - Migration endpoint to assign role_ids

### Vendor Endpoints (Now with Granular Permissions)
- `POST /api/vendor/transactions/{id}/approve` - Uses `require_permission(transactions, approve)`
- `POST /api/vendor/transactions/{id}/reject` - Uses `require_permission(transactions, approve)`
- `POST /api/income-expenses/{id}/vendor-approve` - Uses `require_permission(income_expenses, approve)`
- `POST /api/income-expenses/{id}/vendor-reject` - Uses `require_permission(income_expenses, approve)`

### Dealing P&L Endpoints
- `GET /api/dealing-pnl` - List records with calculations
- `GET /api/dealing-pnl/summary` - Summary statistics (30 days)
- `POST /api/dealing-pnl` - Create/update daily record
- `DELETE /api/dealing-pnl/{date}` - Delete record
- `POST /api/dealing-pnl/{date}/send-email` - Send P&L email for specific date

---

## Database Schema

### Key Collections
- `users` - User accounts with `role` and `role_id` fields
- `roles` - Granular RBAC roles with permissions matrix
- `dealing_pnl` - Daily P&L records with MT5 and LP data
- `app_settings` - Application configuration including email scheduler

### Role Permissions Structure
```json
{
  "role_id": "exchanger",
  "name": "vendor",
  "display_name": "Exchanger",
  "permissions": {
    "dashboard": ["view"],
    "transactions": ["view", "approve"],
    "income_expenses": ["view", "approve"]
  }
}
```

---

## Test Credentials
- **Admin:** admin@fxbroker.com / admin123
- **Super Admin:** safvan user / super_admin role
- **Accountant:** admin3@fxbroker.com / admin123
- **Exchanger:** kenway@fxbroker.com / password

---

## Test Files
- `/app/backend/tests/test_rbac_permissions.py` - RBAC and permission enforcement tests
- `/app/test_reports/iteration_23.json` - Latest test report

---

## Key Files
- `backend/server.py` - Main backend (needs refactoring)
- `frontend/src/pages/Settings.js` - User management + email settings
- `frontend/src/pages/RolesPermissions.js` - RBAC UI
- `frontend/src/pages/LPAccounts.js` - LP Management + Dealing P&L

---

## 3rd Party Integrations
- MongoDB Atlas (database)
- Gmail SMTP (email dispatch)
- ExchangeRate-API (currency conversion)
- APScheduler (daily email automation)

---

## Known Issues
- Minor accessibility warning in Roles dialog (missing aria-describedby)
- `server.py` monolith needs refactoring into modular routers
