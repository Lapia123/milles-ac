# Miles Capitals Back Office - Product Requirements Document

## Overview
A back-office accounting software for FX broker "Miles Capitals" with dark blue and white theme.

## User Roles
- **Admin**: Full system access
- **Sub-admin**: Limited access — Clients, Transactions, Settings only. No Dashboard.
- **Accountant**: Transaction approvals, settlements, Exchangers management, Income & Expenses, Loans, O/S Accounts
- **Vendor/Exchanger**: Vendor-specific portal access

## Core Features (Implemented)

### Authentication
- JWT (email/password) + Google Social Login (Emergent-managed)

### Client Management
- Full CRUD, KYC tracking, MT5 Number, CRM Customer ID, saved bank accounts
- Enhanced filters, CSV export, searchable client selector in transaction form

### Transaction Management
- Deposits, withdrawals, transfers with proof uploads
- Multiple currencies, live FX conversion
- Broker commission on deposits/withdrawals (configurable)
- Destinations: Treasury, PSP, Vendor, Client Bank, USDT

### Treasury Management
- Bank/USDT accounts, total balance in USD, inter-treasury transfers

### Accountant Dashboard
- Approve/reject transactions, math captcha, settlement approvals

### PSP Management
- Commission tracking, per-PSP rates, reserve fund with per-transaction storage
- Currency conversion on all settlements and reserve fund releases
- Two-step settlement process

### Vendor Portal (Enhanced Feb 25, 2026)
- Separate login, assigned transactions, settlement requests
- **Tabbed layout**: Transactions, Income/Expenses, Settlement History
- **IE History**: Shows all income/expense entries linked to vendor
- **IE Approval/Rejection**: Vendor can approve/reject pending entries
- **Proof Upload Required**: Vendors MUST upload proof screenshot before approving ANY transaction
- Settlement History with Statement of Settlement (printable)

### Income & Expenses (Enhanced Feb 26, 2026)
- **Visual Distinction**: Green left border + green badge for income, Red left border + red badge for expenses
- **Exchanger Integration**: Exchangers (money partners) available in Account dropdown with "Requires Approval" label
- **Bank Account Field**: When exchanger selected, bank account details can be specified
- **Pending Exchanger Status**: Exchanger-linked entries start as "pending_vendor", treasury only updates after approval
- **Convert Expense to Loan (Enhanced)**: 
  - Searchable borrower company dropdown with existing borrowers list
  - "Add new" option to add a new company
  - Treasury Account field REMOVED (uses expense's treasury automatically)
- **No Double Entry**: Converted expenses excluded from reports, marked with "Loan" badge
- **NEW: Vendor Suppliers Tab** (Feb 26, 2026):
  - Separate collection `vendor_suppliers` for service providers (rent, utilities, office supplies)
  - Distinct from Exchangers (money partners)
  - Fields: name, contact_person, email, phone, address, bank details (bank_name, account_name, account_number, ifsc, branch)
  - Full CRUD with soft-delete when linked to entries
- **NEW: Account Categories Tab** (Feb 26, 2026):
  - Collection `ie_categories` for custom account categories
  - Types: income, expense, or both
  - Full CRUD with soft-delete (mark inactive) when linked to entries
- **Enhanced Add Entry Form**:
  - Searchable category dropdown with "+ Add new category" option
  - Optional linking to Client and Vendor Supplier
  - Shows custom categories with folder icon, default categories below

### Loan Management (Enhanced Feb 26, 2026)
- **MAJOR OVERHAUL** - Complete redesign with new tabbed interface
- **Dashboard Tab**: Portfolio overview, Aging analysis, Top borrowers, Upcoming dues
- **Borrowers Tab**: Vendor loan statistics (total loans, disbursed, outstanding, active)
- **All Loans Tab**: Summary cards, filter tabs, enhanced actions (View, Repay, Swap, Delete, Write-off)
- **Transactions Tab**: Full loan transaction history with types (Disbursement, Repayment, Swap, Write-off)
- **Create Loan Enhanced**: Searchable borrower dropdown (vendors + new), Loan types (Short/Long/Credit Line), Simple interest, Repayment modes (Lump Sum, EMI, Custom), Collateral field
- **Loan Swapping**: Transfer to another borrower, adjust terms, full history tracking
- **Write-off**: Mark as bad debt with amount and reason
- **CSV Export**: Export all loans data

### Outstanding Accounts
- Debtors & Creditors, party linking, interest, payment recording, aging summary

### Reports
- 7 tabs (Transaction, Vendor, Commission, Client, Treasury, PSP, Financial), CSV export

### Daily Email Reports
- Gmail SMTP, configurable recipients, APScheduler

### Live FX Rates
- Real-time from ExchangeRate-API, 1-hour cache, dashboard ticker

### Broker Commission
- Global configurable rates for deposits/withdrawals in Settings

### Reconciliation Module (Scaffold)
- Bank/Treasury, PSP, Client, Vendor reconciliation views

### Audit & Compliance Module
- Dashboard with health score, 5 audit categories, findings, history, settings
- Automated daily scan with email alerts, admin-only access

## Key API Endpoints (New/Updated)

### Vendor Suppliers (NEW Feb 26, 2026)
- `GET /api/vendor-suppliers` - List all service vendors with search/status filter
- `GET /api/vendor-suppliers/{supplier_id}` - Get vendor details
- `POST /api/vendor-suppliers` - Create vendor supplier
- `PUT /api/vendor-suppliers/{supplier_id}` - Update vendor
- `DELETE /api/vendor-suppliers/{supplier_id}` - Delete/deactivate vendor

### IE Categories (NEW Feb 26, 2026)
- `GET /api/ie-categories` - List categories with type/active filter
- `GET /api/ie-categories/{category_id}` - Get category details
- `POST /api/ie-categories` - Create category
- `PUT /api/ie-categories/{category_id}` - Update category
- `DELETE /api/ie-categories/{category_id}` - Delete/deactivate category

### Income & Expenses
- `POST /api/income-expenses` - Create entry (now with vendor_supplier_id, client_id, ie_category_id)
- `POST /api/income-expenses/{id}/convert-to-loan` - Convert expense to loan (treasury_account_id now optional)
- `POST /api/income-expenses/{id}/vendor-approve` - Vendor approves entry
- `POST /api/income-expenses/{id}/vendor-reject` - Vendor rejects entry
- `POST /api/income-expenses/{id}/vendor-upload-proof` - Upload proof for IE entry
- `GET /api/vendor/income-expenses` - Get vendor's IE entries

### Loans
- `GET /api/loans/dashboard` - Get comprehensive loan dashboard data
- `GET /api/loans/transactions` - Get loan transactions log
- `GET /api/loans/vendors` - Get vendors with loan statistics
- `POST /api/loans/{id}/swap` - Transfer/swap loan to another borrower
- `POST /api/loans/{id}/write-off` - Write off loan as bad debt
- `GET /api/loans/export/csv` - Export loans to CSV
- `GET /api/loans/borrowers` - Get unique borrower company names

## Test Credentials
- **Admin**: admin@fxbroker.com / password
- **Vendor**: vendor3@fxbroker.com / password

## UI Terminology (Updated Feb 26, 2026)
- "Deposit Commission" renamed to "Money In Commission"
- "Withdrawal Commission" renamed to "Money Out Commission"
- Commission displays now show **USD (base currency) first**, with original currency in parentheses

## Recent Changes (Feb 27, 2026)
- **Multi-mode Commission**: Exchangers now have 4 commission rates: Money In (Bank/Cash) and Money Out (Bank/Cash). Commission is auto-calculated based on transaction mode.
- **Transaction Mode**: Added Bank/Cash mode to Transactions and Income & Expenses. Cash mode shows collecting person name & phone fields.
- **Mode Column**: Added Mode (Bank/Cash) column to Admin exchanger detail, Vendor portal transactions, and I&E tables.
- **Role Permissions:** Accountant can now settle exchanger balances, manage treasury accounts, manage exchangers, and manage PSPs.
- **Delete Removed:** All delete buttons removed from every page for all roles.
- **Bug Fix:** Settlement balance now includes income/expense entries.
- Sub-Admin: Dashboard removed, lands on Clients page.
- Treasury: Added opening balance field.
- I&E: Added export (CSV/XLSX/PDF), advanced filters, fixed status badges.
- Transactions: Added destination filter.

## Known Issues
- P2: Minor session management redirect issue after login

## Future/Backlog
- P1: Complete Reconciliation Module (CSV/Excel upload + auto-matching)
- P2: Fix session management redirect issue
- P2: Refactor server.py monolith into APIRouter modules (now ~7900+ lines)

## Database Collections (Key)
- `vendor_suppliers`: Service providers (rent, utilities) - distinct from `vendors` (exchangers/money partners)
- `ie_categories`: Custom income/expense account categories
- `income_expenses`: Enhanced with vendor_supplier_id, client_id, ie_category_id fields
