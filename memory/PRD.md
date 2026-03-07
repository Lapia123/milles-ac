# Miles Capitals FX Broker Back-Office System - PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for an FX broker named "Miles Capitals" with modules for Client Management, Transactions, Exchangers, Income & Expenses, Treasury, Loans, LP Management, Dealing P&L, RBAC, Reporting, and Reconciliation.

## What's Been Implemented

### Core Modules (Completed)
- Client Management, Transactions, Treasury, LP Management, Dealing P&L
- PSP Management, Exchangers/Vendors, Income & Expenses, Loans, Debts
- Reconciliation Phase 1, Audit & Compliance, Logs, Reports, Settings

### Date: Mar 7, 2026

**Exchanger Portal UI Enhancements (COMPLETE):**
- Removed white filter bar from Transactions tab (was jarring in dark mode)
- Added filter bar (Search, Status, Source, Date range) + Export (Excel/CSV, PDF) to Other Transactions tab
- Added filter bar (Search, Status, Date range) + Export (Excel/CSV, PDF) to Settlement History tab
- Filters support I&E/Loan source filtering, status, date range, and text search
- Files Modified: `frontend/src/pages/VendorDashboard.js`

**Commission Base Currency Bug Fix (COMPLETE):**
- **Issue**: `vendor_commission_base_amount` and `vendor_commission_base_currency` were storing USD values instead of the actual base/payment currency (e.g., INR). For an I&E expense of 10 USD (base: 1000 INR, 2% rate), commission was stored as 0.2 USD instead of 20.0 INR.
- **Root Cause**: Four endpoints were incorrectly calculating commission on USD amount instead of base_amount:
  1. I&E creation (server.py line ~6791) - both `ie_commission_amount` and `ie_commission_base_amount` set to same value
  2. I&E vendor approval (server.py line ~7157) - used `amount` (USD) instead of `base_amount` (INR), used `currency` instead of `base_currency`
  3. Transaction creation (server.py line ~5639) - both fields set to same value
  4. Transaction vendor approval (server.py line ~4766) - `vendor_commission_amount` set to base amount, also `commission_amount_usd` was undefined (would crash)
- **Fix Applied**:
  - `vendor_commission_amount` now stores USD commission (2% of USD amount)
  - `vendor_commission_base_amount` now stores base currency commission (2% of base_amount)
  - `vendor_commission_base_currency` now stores the base currency code (e.g., "INR")
  - Frontend (VendorDashboard.js, Vendors.js) updated to display `vendor_commission_base_amount` + `vendor_commission_base_currency`
- **Files Modified**: `backend/server.py`, `frontend/src/pages/VendorDashboard.js`, `frontend/src/pages/Vendors.js`
- **Verified**: Testing agent iteration 35 - 100% backend/frontend pass

**Reports Page Crash Fix (COMPLETE):**
- **Issue**: Reports page crashed with `allTransactions.map is not a function` because `/api/transactions` returns paginated `{items: [...]}` not an array
- **Fix**: Extracted `.items` from paginated responses for both transactions and income-expenses. Removed broken `/api/treasury/transactions` call (non-existent endpoint). Added `page_size=500` to get full dataset.
- **Files Modified**: `frontend/src/pages/Reports.js`

**Vendor Settlements 403 Fix (COMPLETE):**
- **Issue**: VendorDashboard.js called `/api/vendors/{id}/settlements` which requires admin EXCHANGERS.VIEW permission, causing 403 for vendor users
- **Fix**: Created new `/api/vendor/settlements` endpoint using `require_vendor` auth. Updated VendorDashboard.js to use it.
- **Files Modified**: `backend/server.py`, `frontend/src/pages/VendorDashboard.js`

### Date: Mar 6, 2026

**Loan Transaction Commission Calculation Fix (COMPLETE):**
- Added commission calculation to loan disbursement and repayment
- Updated existing loan transactions with missing commission data

**Exchanger Portal Commission Column (COMPLETE):**
- Added "Commission" column to VendorDashboard.js "Other Transactions" table

**Transactions Page Pagination UI (COMPLETE):**
- Added pagination controls to Transactions page

### Date: Mar 5, 2026

**Reconciliation History Filters & Export (COMPLETE)**
**PSP Statement Parser Added (COMPLETE)** - 14 PSPs supported
**Multi-Bank Statement Parser Added (COMPLETE)** - 11 UAE banks supported
**Reconciliation PDF Parsing Enhancement (COMPLETE)** - OCR-based parsing
**Treasury Currency Conversion Fix (COMPLETE)**
**UI Bug Fixes - Messages & Reconciliation Pages (COMPLETE)**

### Date: Mar 4, 2026

**Redis Caching & Pagination (COMPLETE)**
**Exchanger Portal Tab Merge (COMPLETE)**
**Admin Impersonation (COMPLETE)**
**Full RBAC Migration (COMPLETE)** - 184+ routes
**Vendor Portal Enhancement (COMPLETE)**
**Settlement Balance Fix (COMPLETE)**
**Comprehensive Logging Audit & Fix (COMPLETE)**
**Auto-Refresh UI (COMPLETE)**

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
- **Exchanger (musi):** musi@fxbroker.com / admin123

---

## Prioritized Backlog

### P1 - High Priority
- [ ] Database Performance Optimization (MongoDB Atlas slow, Redis caching partially helps)
- [ ] Reconciliation System Phase 2 & 3 (PSP, Client, Exchanger matching)
- [ ] Extend frontend permission gates to hide CRUD buttons per page

### P2 - Medium Priority
- [ ] Auto-match bank statement entries with treasury transactions
- [ ] Fix Reconciliation page eye icon (detail view not working)
- [ ] Fix Reconciliation page loading instability
- [ ] Fix session management redirect bug (recurring 3+)
- [ ] Investigate withdrawal creation to Exchanger error
- [ ] Apply pagination/caching to other endpoints (loans, clients)

### P3 - Low Priority
- [ ] Refactor `backend/server.py` into modular routers (CRITICAL for maintainability - settlement logic duplicated across 3 endpoints)
- [ ] Fix React duplicate key warning in IncomeExpenses.js

---

## 3rd Party Integrations
- MongoDB Atlas, Gmail SMTP, ExchangeRate-API, APScheduler
- pdfplumber, reportlab, openpyxl
- Redis (for caching)
- pdf2image, pytesseract, Pillow (for OCR)
