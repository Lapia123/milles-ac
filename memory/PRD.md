# Miles Capitals FX Broker Back-Office System - PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for an FX broker named "Miles Capitals" with modules for Client Management, Transactions, Exchangers, Income & Expenses, Treasury, Loans, LP Management, Dealing P&L, RBAC, Reporting, and Reconciliation.

## What's Been Implemented

### Core Modules (Completed)
- Client Management (CRUD, bank accounts)
- Transactions (deposits, withdrawals, approvals)
- Treasury (accounts, transfers, history)
- LP Management (deposits, withdrawals, P&L)
- Dealing P&L (daily entries, email reports)
- PSP Management (settlements, reserves)
- Exchangers/Vendors (settlements, approvals)
- Income & Expenses (CRUD, vendor suppliers, categories, bulk import)
- Loans (CRUD, repayments, borrowers)
- Debts/O/S Accounts (CRUD, payments)
- Reconciliation System Phase 1 (bank upload, daily dashboard, flagging, adjustments)
- Audit & Compliance (scans, history, settings)
- Logs (activity, auth, audit)
- Reports (dashboard, financial summaries, email dispatch)
- Settings (email SMTP, commission, FX rates)

### Date: Mar 4, 2026

**Admin Impersonation Feature (COMPLETE):**
- Secure impersonation with audit logging
- Red banner with "Return to Admin" button
- Cannot impersonate other admins

**Full RBAC Migration (COMPLETE):**
- 184+ backend routes migrated to `require_permission(Module, Action)`
- Dashboard API now requires `dashboard:view` permission
- Frontend `usePermissions` hook for dynamic sidebar navigation
- `ProtectedRoute` in App.js now uses permission-based checks (not hardcoded roles)

**Vendor Portal Enhancement (COMPLETE):**
- New `GET /api/vendor/transactions` endpoint — returns ALL statuses (not just pending)
- Filtering: status (all/pending/approved/rejected/completed), type (deposit/withdrawal), date range, search
- `GET /api/vendor/transactions/export/excel` — Excel export with styled headers
- `GET /api/vendor/transactions/export/pdf` — PDF export with summary stats
- Frontend: filter bar, transaction count, Excel & PDF export buttons
- Testing: 19/19 backend tests pass, all frontend UI verified

---

## Current Roles
| Role | Level | Permission Count |
|------|-------|-----------------|
| Admin | 100 | 102 (full access) |
| Accountant | 70 | 47 |
| Sub Admin | 50 | 9 |
| Exchanger | 20 | 5 |
| Viewer | 10 | 4 |

## Test Credentials
- **Admin:** admin@fxbroker.com / admin123
- **Accountant:** admin3@fxbroker.com / admin123
- **Exchanger:** kenway@fxbroker.com / password

---

## Prioritized Backlog

### P1 - High Priority
- [ ] Reconciliation System Phase 2 & 3 (PSP, Client, Exchanger)
- [ ] Complete frontend permission gates (hide CRUD buttons on all pages)

### P2 - Medium Priority
- [ ] Auto-match bank statement entries with treasury transactions
- [ ] Investigate withdrawal creation to Exchanger error
- [ ] Fix session management redirect bug

### P3 - Low Priority
- [ ] Refactor `backend/server.py` into modular routers
- [ ] Clean up migration endpoints

---

## 3rd Party Integrations
- MongoDB Atlas (database)
- Gmail SMTP (email dispatch)
- ExchangeRate-API (currency conversion)
- APScheduler (daily email automation)
- pdfplumber (PDF parsing for bank statements)
- reportlab (PDF generation for exports)
- openpyxl (Excel generation for exports)
