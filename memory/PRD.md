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
- `POST /api/admin/impersonate/{user_id}` — generates JWT for target user
- `POST /api/admin/stop-impersonate` — ends session, logs time
- `GET /api/admin/impersonation-logs` — full audit trail
- Red impersonation banner in Layout with "Return to Admin" button
- Secure token switching (admin token in sessionStorage)
- Security: only Admin can impersonate, can't impersonate other admins, IP logging

**Full RBAC Migration (COMPLETE):**
- **184+ backend routes** migrated from legacy decorators (`require_admin`, `require_accountant_or_admin`, `get_current_user`) to granular `require_permission(Module, Action)` system
- **Dashboard API** now requires `dashboard:view` permission (was unprotected)
- **POST /transactions** now requires `transactions:create` permission (was unprotected)
- **9 security holes fixed**: routes that were missing auth entirely now require proper permissions
- **Frontend `usePermissions` hook** created — fetches user permissions from `/api/permissions/my`
- **Sidebar navigation** now dynamically shows/hides based on user's actual permissions
- Removed redundant inline permission checks from roles endpoints
- All legacy role-based if-checks removed from navigation
- **Testing**: 44/44 backend tests pass, all frontend tests pass

**RBAC Route Coverage:**
| Module | Routes | Permission System |
|--------|--------|-------------------|
| Users | 7 | require_permission |
| Clients | 9 | require_permission |
| Treasury | 8 | require_permission |
| LP Management | 9 | require_permission |
| Dealing P&L | 6 | require_permission |
| PSP | 20 | require_permission |
| Exchangers | 12 | require_permission |
| Transactions | 8 | require_permission |
| Income & Expenses | 23 | require_permission |
| Loans | 13 | require_permission |
| Debts | 8 | require_permission |
| Reconciliation | 21 | require_permission |
| Roles | 6 | require_permission |
| Settings | 6 | require_permission |
| Logs | 6 | require_permission |
| Audit | 5 | require_permission |
| Reports | 13 | require_permission |
| Vendor-specific | 5 | require_vendor |
| Admin-only | 1 | require_admin |
| Utility | 4 | get_current_user |
| Auth | 5 | public |

---

## Current Roles
| Role | Level | Permission Count |
|------|-------|-----------------|
| Admin | 100 | 102 (full access) |
| Accountant | 70 | 47 |
| Sub Admin | 50 | 9 |
| Exchanger | 20 | 5 (dashboard:view, transactions:view+approve, ie:view+approve) |
| Viewer | 10 | 4 |

## Test Credentials
- **Admin:** admin@fxbroker.com / admin123
- **Accountant:** admin3@fxbroker.com / admin123
- **Exchanger:** kenway@fxbroker.com / password

---

## Prioritized Backlog

### P1 - High Priority
- [ ] Reconciliation System Phase 2 & 3 (PSP, Client, Exchanger enhancements)
- [ ] Complete frontend permission gates (hide Create/Edit/Delete buttons based on permissions in all pages)

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
