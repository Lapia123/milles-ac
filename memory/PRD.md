# Miles Capitals FX Broker Back-Office System - PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for an FX broker named "Miles Capitals" with modules for Client Management, Transactions, Exchangers, Income & Expenses, Treasury, Loans, LP Management, Dealing P&L, RBAC, Reporting, and Reconciliation.

## What's Been Implemented

### Core Modules (Completed)
- Client Management, Transactions, Treasury, LP Management, Dealing P&L
- PSP Management, Exchangers/Vendors, Income & Expenses, Loans, Debts
- Reconciliation Phase 1, Audit & Compliance, Logs, Reports, Settings


**Transaction Date Field (COMPLETE):**
- Added "Transaction Date" date picker field to both Create Transaction and Transaction Request forms
- Defaults to today's date, user can change to any date
- Backend stores `transaction_date` in both transactions and transaction_requests collections
- Carried over when transaction requests are auto-processed into transactions
- Files Modified: `backend/server.py` (both create endpoints), `Transactions.js`, `TransactionRequests.js`

**R2 Cloud Storage Migration (COMPLETE):**
- Migrated ALL file/image uploads from base64-in-MongoDB to Cloudflare R2 bucket storage
- Endpoints migrated: vendor proof, accountant proof, transaction creation with proof, transaction request proof, income/expense vendor proof, invoice upload, message attachments
- Backend utility function `upload_to_r2()` with organized folders (proofs/, invoices/, attachments/)
- Frontend backward-compatible: if value starts with 'http' use as URL, otherwise base64 for legacy data
- Files: `backend/server.py`, `backend/.env`, `Transactions.js`, `AccountantDashboard.js`, `VendorDashboard.js`, `IncomeExpenses.js`

**PSP Settlement History - Expandable Compound Detail (COMPLETE):**
- Added expand/collapse chevron button for compound settlements in Settlement History
- Clicking expand fetches and shows all included transactions in a detail sub-table
- Sub-table shows: Reference, Client, Currency, Amount (USD), Pay Amount (local currency), Commission, Date
- New backend endpoint `GET /api/psp/{psp_id}/settlement/{settlement_id}/transactions` returns transaction details
- Files Modified: `backend/server.py`, `frontend/src/pages/PSPs.js`

**Batch Settlement Action Bar & Dialog - Payment Currency Display (COMPLETE):**
- Action bar now shows Gross, Deductions, Net in both USD and payment currency (e.g., "Gross: $4,860 (18,000 AED)")
- Confirmation dialog shows dual-currency breakdown for all lines + avg FX rate
- Files Modified: `frontend/src/pages/PSPs.js`

**FX Rate Fix for Compound Settlement (COMPLETE):**
- When treasury currency matches payment currency, settlement now uses actual transaction exchange rates instead of generic conversion
- Calculates base_gross from actual base_amounts and derives net in payment currency directly
- Ensures exact amount matching between PSP bank deposit and treasury credit
- Files Modified: `backend/server.py`

**PSP Pending Settlements - Approved Only Filter (COMPLETE):**
- Fixed PSP pending settlements to only show APPROVED transactions (previously showed both pending and approved)
- Updated both `/api/psp/{psp_id}/pending-transactions` and `/api/psp-summary` endpoints
- Ensures unapproved transactions don't appear in the settlement area
- Files Modified: `backend/server.py`

**PSP Settlement History - Payment Currency Column (COMPLETE):**
- Added "Pay Currency" column to the Settlement History tab showing the payment currency of each settlement
- Backend enriches settlements with `payment_currency`, `avg_exchange_rate`, and `base_gross_amount` from linked transactions
- Gross, Commission, Reserve Fund, and Net amounts now display in both USD and payment currency (blue text below USD amounts)
- Added "Compound" badge to compound settlement entries
- Files Modified: `backend/server.py` (settlements endpoint enrichment), `frontend/src/pages/PSPs.js` (Settlement History table)

### Date: Mar 13, 2026

**PSP Compound/Batch Settlement Model (COMPLETE):**
- Added checkbox column to PSP Pending Settlements table for selecting individual transactions
- Added "Select All" checkbox in table header to toggle all transactions
- Added "Tx Date" column showing when each transaction was originally initiated
- When transactions are selected, a batch action bar appears showing: selected count, total Gross, total Deductions, total Net
- "Settle Selected" button opens a Compound Settlement confirmation dialog with full breakdown (Gross, Commission, Reserve Fund, Extra Charges, Net to Treasury)
- Dialog includes Destination Treasury Account selector (defaults to PSP's configured destination)
- Backend endpoint `POST /api/psp/{psp_id}/settle-batch` creates ONE settlement record from multiple transactions
- Credits treasury with a single lump sum entry (matching how PSPs actually deposit to bank)
- All selected transactions marked as settled with the same settlement_id
- Files Modified: `backend/server.py` (new BatchSettleRequest model + settle-batch endpoint), `frontend/src/pages/PSPs.js` (checkboxes, Tx Date column, batch action bar, compound settlement dialog)
- Verified: Testing agent iteration 38 - 100% backend/frontend pass

**PSP Detail Dialog Width Fix (COMPLETE):**
- Fixed PSP detail dialog being too narrow, cutting off Status and Actions columns on the right side
- Changed dialog max-width from `max-w-4xl` to `max-w-6xl`
- File Modified: `frontend/src/pages/PSPs.js`

**PSP Commission Preview - Payment Currency Display (COMPLETE):**
- Enhanced the PSP commission preview in the Create Transaction form to show amounts in both USD and payment currency
- When a non-USD payment currency is selected (e.g., AED), the preview now shows: Gross, Commission, and Client Receives in both USD and the payment currency
- Payment currency amounts shown in blue below the USD amounts for easy distinction
- File Modified: `frontend/src/pages/Transactions.js`

### Date: Mar 11, 2026

**Client Search Fix in Transaction Requests & Transactions (COMPLETE):**
- Fixed critical bug where the client search picker only searched within first 200 preloaded clients (out of 2600+)
- Replaced cmdk-based client-side filtering with server-side search using debounced API calls to `GET /api/clients?search=...`
- Fixed on both pages: TransactionRequests (New Request form + Edit form) and Transactions (Create Transaction dialog)
- Now correctly finds any client by name or email across the entire database
- Shows loading spinner during search, displays preloaded clients when no search term
- Files Modified: `frontend/src/pages/TransactionRequests.js`, `frontend/src/pages/Transactions.js`
- Verified: Screenshots confirmed searching "nafidpv99@gmail.com" returns correct result on both pages

**Treasury Running Balance Column (COMPLETE):**

**Pending Approvals Destination Guard (COMPLETE):**
- Added visual "No Destination" warning (red triangle + red text) for transactions without a proper destination assigned
- Red-tinted background on rows missing destinations for easy visual scanning
- Approve button disabled/grayed out when no destination is set — forces team to reject or hold until backoffice assigns destination
- Prevents approval of unallocated transactions from TX Requests area
- File Modified: `frontend/src/pages/AccountantDashboard.js`
- Verified: Screenshot confirmed red warnings and disabled Approve buttons for 10 transactions without destinations
- Added "Pay Currency" column to PSP Pending Settlements table
- Shows payment currency with exchange rate for non-USD transactions
- Gross, Commission/Deductions, and Net amounts now display in both USD and payment currency (e.g., AED)
- Payment currency amounts shown in blue below the USD amounts for easy distinction
- File Modified: `frontend/src/pages/PSPs.js`
- Verified: Screenshot confirmed AED transaction shows dual-currency amounts (USD + AED)
- Fixed bug where PSP/Treasury/Vendor dropdowns were empty for roles without those module permissions (e.g., senior_crm_admin)
- Root cause: Each dropdown fetched from its own module endpoint requiring separate permissions (PSP.VIEW, TREASURY.VIEW, etc.)
- Created unified `GET /api/transactions/form-data` endpoint that returns all dropdown data with only Transaction VIEW permission
- Frontend now uses this single endpoint instead of 4 separate calls, with fallback to individual endpoints
- Files Modified: `backend/server.py` (new endpoint), `frontend/src/pages/Transactions.js` (unified fetch)
- Verified: Screenshot confirmed Shafeel (CRM Admin) can see and select PSP "uni (2% commission, T+1)" in Create Transaction form
- Added "Running Balance" column to Treasury Transaction History table
- Backend calculates running balance starting from current account balance, working backwards through each transaction
- Frontend displays the running balance in a new column with proper currency formatting
- CSV statement export also includes the Running Balance column
- Files Modified: `backend/server.py` (history endpoint), `frontend/src/pages/Treasury.js` (table + CSV export)
- Verified: Screenshot + API test confirmed running balance is correct for ENBD account (58,385.33 AED)
- Fixed bug where bank details and USDT details filled in Transaction Requests were not shown in the Transactions detail view or Pending Approvals view
- Added "Client Bank Details" section (Bank Name, Account Holder, Account Number, SWIFT/IBAN, Currency) to both:
  - Transactions page: Transaction Details dialog (eye icon)
  - Approvals page (AccountantDashboard): View Transaction dialog (eye icon)
- Added "USDT Details" section (Wallet Address, Network) to both dialogs
- Updated Transactions table Destination column to show bank name or USDT address when no treasury/vendor destination
- Files Modified: `frontend/src/pages/Transactions.js`, `frontend/src/pages/AccountantDashboard.js`
- Verified: Screenshots confirmed bank details visible on both Transactions and Approvals pages

### Date: Mar 10, 2026

**Transaction Requests Edit Flow Rebuilt (COMPLETE):**
- Removed Edit/Assign pencil button and dialog from Transactions page (`Transactions.js`)
- Rebuilt `TransactionRequests.js` from table-based to card-based layout with expandable editable forms
- Each pending request renders as an expandable card with full edit form (type, client, amount, currency, destination, bank/USDT details, reference, CRM ref, description)
- Processed requests show read-only summary when expanded
- Added manual Payment Currency dropdown (USD, EUR, GBP, AED, SAR, INR, JPY, USDT) to both Create and Edit forms
- Non-USD currency shows base amount + exchange rate fields with auto-calculation to USD
- Backend PUT endpoint updated to accept: amount, currency, base_currency, base_amount, exchange_rate, transaction_type, client_id
- Save Changes, Process, Delete actions per pending card
- Files Modified: `frontend/src/pages/Transactions.js`, `frontend/src/pages/TransactionRequests.js`, `backend/server.py`
- Verified: Testing agent iteration 36 - 100% backend/frontend pass

**Deposit Auto-Process & Edit Destination (COMPLETE):**
- Deposit transaction requests now auto-process immediately when created (skip manual Process step, transaction created automatically)
- Withdrawal requests remain pending and require manual Process with captcha verification
- Frontend shows distinct toast: "Deposit auto-processed! Transaction created" for deposits
- Added Edit Destination button (pencil icon) back to Transactions page for all pending transactions
- Edit Destination dialog allows changing: destination_type (vendor/bank/treasury/psp/usdt), assign exchanger, select treasury account, CRM reference, description
- Backend uses existing PUT /api/transactions/{id}/assign endpoint
- Files Modified: `backend/server.py`, `frontend/src/pages/Transactions.js`, `frontend/src/pages/TransactionRequests.js`
- Verified: Testing agent iteration 37 - 100% backend/frontend pass

**Transaction Requests Filters & Export (COMPLETE):**

**Clients Page Pagination (COMPLETE):**
- Added backend pagination to GET /api/clients (page, page_size params)
- Optimized: Only aggregates transaction summaries for fetched page of clients (not all)
- Classic pagination UI: page numbers, First/Prev/Next/Last buttons, "Rows per page" selector (10/20/50/100)
- Shows "X–Y of Z" range indicator
- Page resets to 1 on filter changes
- Fixed 5 other pages (Transactions, TransactionRequests, TradingAccounts, Debts, IncomeExpenses) to handle new paginated response format
- Files Modified: `backend/server.py`, `frontend/src/pages/Clients.js`, + 5 other frontend pages

**Universal Pagination (8 Pages) (COMPLETE):**
- Created reusable `PaginationControls` component with: Rows per page selector (10/20/50/100), First/Prev/page numbers/Next/Last buttons, X–Y of Z counter
- Backend: Added pagination to Treasury, LP, Logs endpoints (Transactions, Loans, I&E, TX Requests already had it)
- Frontend: Added PaginationControls to all 8 pages: Transactions, TransactionRequests, Treasury, LPAccounts, Loans, IncomeExpenses, Logs, VendorDashboard
- Fixed all pages that consume /api/treasury (Transactions, Loans, PSPs, Vendors, Debts, Reconciliation, AccountantDashboard, LPAccounts) to handle new paginated format
- Files Modified: `PaginationControls.js` (new), `backend/server.py`, 8 frontend pages + 8 consumer pages
- Added Search filter (client name, reference, CRM reference, description)
- Added Date Range filters (From/To date pickers)
- Added Export dropdown with Excel (XLS) and PDF options
- Backend updated with search ($regex) and date_from/date_to query parameters
- PDF export opens print-friendly page with summary (deposits/withdrawals/pending/processed counts)
- Excel export generates HTML-based XLS with all request data columns
- Clear filters button appears when any filter is active
- Files Modified: `frontend/src/pages/TransactionRequests.js`, `backend/server.py`
- BUG: When a withdrawal had destination_type "treasury", approving it did NOT deduct from the treasury account balance
- ROOT CAUSE: The approve_transaction endpoint only handled withdrawals to bank/usdt destinations, skipping treasury destination entirely
- FIX: Added an `elif destination_type == "treasury"` branch in the approval logic that deducts from the destination treasury account, with proper currency conversion and treasury transaction recording
- Verified: USDT treasury went from 1000→950 after approving a 50 USDT withdrawal to treasury


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
- [ ] Audit & fix client search across all pages (scalability)
- [ ] Reconciliation System Phase 2 & 3 (PSP, Client, Exchanger)
- [ ] Extend frontend permission gates to hide CRUD buttons per page

### P2 - Medium Priority
- [ ] Auto-match bank statement entries with treasury transactions
- [ ] Fix Reconciliation page eye icon (detail view not working)
- [ ] Fix Reconciliation page loading instability
- [ ] Fix session management redirect bug (recurring 3+)
- [ ] Investigate withdrawal creation to Exchanger error
- [ ] Database performance optimization

### P3 - Low Priority
- [ ] Refactor `backend/server.py` into modular routers (CRITICAL for maintainability)
- [ ] Refactor duplicated client search into reusable component
- [ ] Refactor pagination state into `usePagination` hook
- [ ] Fix React duplicate key warning in IncomeExpenses.js

---

## 3rd Party Integrations
- MongoDB Atlas, Gmail SMTP, ExchangeRate-API, APScheduler
- pdfplumber, reportlab, openpyxl
- Redis (for caching)
- pdf2image, pytesseract, Pillow (for OCR)
