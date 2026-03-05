# Miles Capitals FX Broker Back-Office System - PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for an FX broker named "Miles Capitals" with modules for Client Management, Transactions, Exchangers, Income & Expenses, Treasury, Loans, LP Management, Dealing P&L, RBAC, Reporting, and Reconciliation.

## What's Been Implemented

### Core Modules (Completed)
- Client Management, Transactions, Treasury, LP Management, Dealing P&L
- PSP Management, Exchangers/Vendors, Income & Expenses, Loans, Debts
- Reconciliation Phase 1, Audit & Compliance, Logs, Reports, Settings

### Date: Mar 5, 2026

**UI Bug Fixes - Messages & Reconciliation Pages (COMPLETE):**
- **Request**: Fix non-working dropdowns on Messages and Reconciliation pages
- **Root Cause 1 (Messages)**: `getAuthHeaders` function was missing from AuthContext.js export
- **Root Cause 2 (Reconciliation)**: Frontend calling `/api/psps` but backend route is `/api/psp` (singular)
- **Changes**:
  - Added `getAuthHeaders` as a useCallback function to AuthContext.js and exported it in the Provider value
  - Fixed Reconciliation.js to use correct `/api/psp` endpoint
  - Added better error handling to Reconciliation.js fetch functions
- **Verified**: Testing agent confirmed Messages dropdown working with 10 users; all backend APIs confirmed working via curl
- **Reference**: /app/test_reports/iteration_33.json

### Date: Mar 4, 2026

**Redis Caching & Pagination (COMPLETE):**
- **Request**: Improve performance on slow-loading Vendors and Income/Expenses pages
- **Changes**:
  - Backend: Pagination with `page` and `page_size` query params (default: 10)
  - Backend: Redis caching for `/api/vendors` and `/api/income-expenses` endpoints
  - Backend: Cache invalidation on CRUD operations
  - Frontend (Vendors.js): Search bar, "Showing X of Y exchangers", pagination controls
  - Frontend (IncomeExpenses.js): "Showing X of Y entries", classic pagination with page numbers
  - Fixed pagination stability bug (secondary sort by entry_id)
- **Cache TTL**: vendors_list: 30s, income_expenses: 30s
- **Verified**: 100% tests passed - Reference: /app/test_reports/iteration_32.json

**Exchanger Portal Tab Merge (COMPLETE):**
- **Request**: Merge "Income & Expense Entries" and "Loan Transactions" tabs into single "Other Transactions" tab
- **Changes**: 
  - Removed duplicate/broken TabsContent blocks from VendorDashboard.js
  - Fixed function name from `openIeActionDialog` to `openIeAction`
  - Portal now has 3 tabs: "Transactions", "Other Transactions", "Settlement History"
  - "Other Transactions" displays unified table with:
    - Source column: I&E badge (amber) or Loan badge (purple)
    - Type: IN/OUT classification
    - Combined pending count badge
    - Approve/Reject actions for pending entries
- **Verified**: 17/17 tests passed - Reference: /app/test_reports/iteration_31.json

**Admin Impersonation (COMPLETE)** — Secure token switching with audit logging

**Full RBAC Migration (COMPLETE)** — 184+ routes → `require_permission(Module, Action)`, frontend permission-based sidebar

**Vendor Portal Enhancement (COMPLETE)** — All transaction statuses, filters (status/type/date/search), Excel + PDF export

**Settlement Balance Fix (COMPLETE)** — I&E entries with status `converted_to_loan` now correctly excluded from settlement calculation

**Expense-to-Loan Settlement Bug Fix (COMPLETE - Dec 2025):**
- **Issue**: When expense was converted to loan, the amount was incorrectly affecting vendor settlement balance
- **Root Cause**: Settlement pipelines included `converted_to_loan` status in the match criteria
- **Fix**: Added `"converted_to_loan": {"$ne": True}` filter to 3 settlement pipelines:
  - `/api/vendors` (vendor list endpoint)
  - `/api/vendors/{vendor_id}` (single vendor endpoint)
  - `/api/vendor/me` (vendor portal endpoint)
- **Result**: Converted expenses are now excluded from settlement; accounting integrity maintained
- **Verified**: 10/10 tests passed - Reference: /app/test_reports/iteration_30.json

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
- [ ] Apply pagination/caching to other endpoints (loans, clients)

### P3 - Low Priority
- [ ] Refactor `backend/server.py` into modular routers
- [ ] Fix React duplicate key warning in IncomeExpenses.js

---

## 3rd Party Integrations
- MongoDB Atlas, Gmail SMTP, ExchangeRate-API, APScheduler
- pdfplumber, reportlab, openpyxl
- Redis (for caching)
