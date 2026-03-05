# Miles Capitals FX Broker Back-Office System - PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for an FX broker named "Miles Capitals" with modules for Client Management, Transactions, Exchangers, Income & Expenses, Treasury, Loans, LP Management, Dealing P&L, RBAC, Reporting, and Reconciliation.

## What's Been Implemented

### Core Modules (Completed)
- Client Management, Transactions, Treasury, LP Management, Dealing P&L
- PSP Management, Exchangers/Vendors, Income & Expenses, Loans, Debts
- Reconciliation Phase 1, Audit & Compliance, Logs, Reports, Settings

### Date: Mar 5, 2026

**Multi-Bank Statement Parser Added (COMPLETE):**
- **Request**: Add support for more UAE bank statement formats
- **Implementation**: Created `backend/bank_parsers.py` module with:
  - Auto-detection of bank from PDF content/filename
  - Bank-specific parsing rules for each UAE bank
  - OCR-based text extraction using `pdf2image` + `pytesseract`
  - Pattern matching for dates (DD/MM/YYYY) and amounts
  - Debit/Credit identification based on context keywords
- **Supported Banks** (11 total):
  - Emirates NBD
  - Abu Dhabi Commercial Bank (ADCB)
  - First Abu Dhabi Bank (FAB)
  - Mashreq Bank
  - RAK Bank
  - Dubai Islamic Bank (DIB)
  - Commercial Bank of Dubai (CBD)
  - Commercial Bank International (CBI)
  - National Bank of Fujairah (NBF)
  - Ajman Bank
  - Generic/Other
- **New API Endpoints**:
  - `GET /api/reconciliation/supported-banks` - List all supported banks
  - Updated `/api/reconciliation/upload-statement` - Returns detected_bank in response
- **Result**: Emirates NBD statement now parses 23 entries correctly with proper debit/credit identification
- **Verified**: Curl test confirmed correct parsing and bank detection

**Reconciliation PDF Parsing Enhancement (COMPLETE):**
- **Request**: Fix Statement Entries parsing - was showing "USD 0.00" for all entries from Emirates NBD bank statements
- **Root Cause**: pdfplumber could not properly extract table data from bilingual (Arabic/English) PDF bank statements
- **Fix**: Implemented OCR-based PDF parsing using `pdf2image` and `pytesseract`:
  - Converts PDF pages to images
  - Uses OCR to extract text
  - Pattern matching to identify transaction lines (date DD/MM/YYYY format + amounts)
  - Properly extracts: Date, Description, and Amount from each transaction
  - Falls back to pdfplumber if OCR libraries unavailable
- **Changes**:
  - Modified `/api/reconciliation/upload-statement` endpoint in `backend/server.py`
  - Added `pdf2image` and `pytesseract` dependencies
  - Frontend now shows correct currency based on selected treasury account
- **Result**: PDF parsing now extracts 23 entries (vs 3 broken entries before) with correct dates, amounts, and descriptions
- **Verified**: Curl test confirmed proper parsing

**Treasury Currency Conversion Fix (COMPLETE):**
- **Request**: Fix incorrect currency conversion in treasury for withdrawals - should use manual exchange rate instead of live FX rates
- **Affected Transactions**: REFD182CF5D (AED), REF810528D6 (INR)
- **Root Cause**: When approving withdrawals, the system was converting USD back to treasury currency using live FX rates instead of using the original base_amount from the transaction
- **Fix**: Modified `approve_transaction` in `backend/server.py`:
  - Added priority check: if `base_currency` matches source account currency, use `base_amount` directly
  - Updated treasury transaction record to use manual exchange_rate and original amounts
- **Result**: 
  - AED withdrawal: 5000 AED at rate 0.27 → Treasury deducts exactly 5000 AED (not live rate conversion)
  - INR withdrawal: 8400 INR at rate 0.012 → Treasury deducts exactly 8400 INR (not live rate conversion)
- **Verified**: Curl tests confirmed correct deductions

**UI Bug Fixes - Dropdowns Investigation (NO BUG FOUND):**
- **Report**: User reported dropdowns not working on Income & Expenses, Transactions, and Exchangers pages
- **Investigation**: Tested all three pages via screenshots
- **Result**: All dropdowns are functioning correctly - Currency dropdown, Transaction type dropdown, Account selection all work
- **Status**: Marked as resolved (user may have experienced temporary issue or it was already fixed)

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
