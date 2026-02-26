# Miles Capitals Back Office - Product Requirements Document

## Overview
A back-office accounting software for FX broker "Miles Capitals" with dark blue and white theme.

## User Roles
- **Admin**: Full system access
- **Sub-admin**: Limited admin capabilities
- **Accountant**: Transaction approvals, settlements
- **Vendor**: Vendor-specific portal access

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

### Income & Expenses (Enhanced Feb 25, 2026)
- **Visual Distinction**: Green left border + green badge for income, Red left border + red badge for expenses
- **Vendor Integration**: Vendors available in Account dropdown with "Requires Approval" label
- **Bank Account Field**: When vendor selected, bank account details can be specified
- **Pending Vendor Status**: Vendor-linked entries start as "pending_vendor", treasury only updates after approval
- **Convert Expense to Loan**: Button on expense rows to convert to loan with borrower selection
- **No Double Entry**: Converted expenses excluded from reports, marked with "Loan" badge
- Track company income/expenses, custom categories, treasury integration

### Loan Management (Enhanced Feb 25, 2026)
- **Multiple Loans per Company**: Same borrower can have multiple active loans
- **CSV Export**: Export all loans to CSV for external use
- Borrower, amount, interest, dates, repayment tracking
- Converted-from-expense loans tracked with source reference

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

### Income & Expenses
- `POST /api/income-expenses` - Create entry (with optional vendor_id, vendor_bank_account)
- `POST /api/income-expenses/{id}/convert-to-loan` - Convert expense to loan
- `POST /api/income-expenses/{id}/vendor-approve` - Vendor approves entry
- `POST /api/income-expenses/{id}/vendor-reject` - Vendor rejects entry
- `POST /api/income-expenses/{id}/vendor-upload-proof` - Upload proof for IE entry
- `GET /api/vendor/income-expenses` - Get vendor's IE entries

### Loans
- `GET /api/loans/export/csv` - Export loans to CSV

## Test Credentials
- **Admin**: admin@fxbroker.com / password
- **Vendor**: vendor3@fxbroker.com / password

## UI Terminology (Updated Feb 26, 2026)
- "Deposit Commission" renamed to "Money In Commission"
- "Withdrawal Commission" renamed to "Money Out Commission"
- Commission displays now show **USD (base currency) first**, with original currency in parentheses

## Known Issues
- P2: Minor session management redirect issue after login

## Future/Backlog
- P1: Complete Reconciliation Module (CSV/Excel upload + auto-matching)
- P2: Fix session management redirect issue
- P2: Refactor server.py monolith into APIRouter modules
