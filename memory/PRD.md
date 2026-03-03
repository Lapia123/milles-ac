# Miles Capitals FX Broker Back-Office System - PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for an FX broker named "Miles Capitals" with modules for Client Management, Transactions, Exchangers, Income & Expenses, Treasury, Loans, LP Management, Dealing P&L, RBAC, Reporting, and Reconciliation.

## What's Been Implemented

### Core Modules (Completed)
- Client Management, Transactions, Treasury, LP Management, Dealing P&L
- PSP Management, Exchangers/Vendors, Income & Expenses, Loans, Debts
- Reconciliation Phase 1, Audit & Compliance, Logs, Reports, Settings

### Date: Mar 4, 2026

**Admin Impersonation (COMPLETE)** — Secure token switching with audit logging

**Full RBAC Migration (COMPLETE)** — 184+ routes → `require_permission(Module, Action)`, frontend permission-based sidebar

**Vendor Portal Enhancement (COMPLETE)** — All transaction statuses, filters (status/type/date/search), Excel + PDF export

**Settlement Balance Fix (COMPLETE)** — I&E entries with status `converted_to_loan` now included

**Comprehensive Logging Audit & Fix (COMPLETE):**
- **Root cause**: Only 7 `log_activity` calls existed across 89+ write endpoints
- **Fix**: Added `request: Request` parameter to 73 functions and `log_activity` calls to 74 endpoints
- Modules now fully logged: transactions, clients, users, treasury, lp_management, psp, exchangers, income_expenses, loans, debts, roles, reconciliation, settings, audit
- Transaction logs now appear in Logs page when filtering by module ✅
- Testing: 10/10 backend tests pass, all frontend pages verified

**Auto-Refresh UI (COMPLETE):**
- Created `useAutoRefresh` hook (visibility change + interval polling)
- Dashboard: 30s polling
- Transactions: 30s polling
- AccountantDashboard (Approvals): 15s polling
- VendorDashboard: 15s polling
- Pages auto-refresh when user switches back to tab

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
- **Exchanger:** kenway@fxbroker.com / password

---

## Prioritized Backlog

### P1 - High Priority
- [ ] Reconciliation System Phase 2 & 3 (PSP, Client, Exchanger)
- [ ] Extend frontend permission gates to hide CRUD buttons per page

### P2 - Medium Priority
- [ ] Auto-match bank statement entries with treasury transactions
- [ ] Investigate withdrawal creation to Exchanger error
- [ ] Fix session management redirect bug

### P3 - Low Priority
- [ ] Refactor `backend/server.py` into modular routers

---

## 3rd Party Integrations
- MongoDB Atlas, Gmail SMTP, ExchangeRate-API, APScheduler
- pdfplumber, reportlab, openpyxl
