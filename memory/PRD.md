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
- JWT (email/password)
- Google Social Login (Emergent-managed)

### Client Management
- Full CRUD for clients
- KYC status tracking
- MT5 Number, CRM Customer ID
- Saved bank account details
- **NEW (Feb 21, 2026)**: Enhanced filters (transaction type, balance range) and CSV export

### Transaction Management
- Track deposits, withdrawals, transfers
- Multiple currencies support
- Destinations: Treasury, PSP, Vendor, Client Bank, USDT
- Proof of payment uploads

### Treasury Management
- Bank/USDT accounts
- Total balance in USD
- Transaction history
- Inter-treasury transfers

### Accountant Dashboard
- Approve/reject pending transactions
- Math captcha protection
- Settlement approvals
- Deposit approval with mandatory screenshot upload

### PSP Management (Enhanced Feb 22, 2026)
- Manual ledger for Payment Service Providers
- Commission tracking with per-PSP commission rate
- **Chargeback Rate %**: Per-PSP chargeback percentage
- **Holding Days**: Days PSP holds funds before release
- **Settlement Days**: T+N settlement period
- Settlement management with treasury destination
- **Per-Transaction Charges**:
  - Record chargeback_amount (actual chargeback on specific transaction)
  - Record extra_charges (additional fees like processing fees)
  - Net Settlement = Gross - Commission - Chargeback - Extra Charges
- **Holding & Release Tracking**:
  - psp_holding_release_date calculated on transaction creation
  - Status badges: "Holding" (in holding period), "Ready" (past release date)
- **Record Payment Received**:
  - Record actual amount received from PSP
  - Track variance between expected and actual
  - Treasury balance auto-updated
  - Treasury transaction record created with type 'psp_settlement'

### Vendor Portal
- Separate vendor login
- Assigned transaction management
- Settlement requests
- Commission calculation on transaction approval
- Commission column in transactions table
- Total Commission Earned card
- Settlement formula: (Deposits - Withdrawals - Commission)

### Income & Expenses Ledger
- Track company income/expenses
- Custom categories
- Treasury account integration

### Loan Management
- Track loans to other companies
- Borrower, amount, interest rate, dates
- Repayment tracking
- Treasury integration

### Debt Management (NEW - Feb 21, 2026)
- **Debtors (Receivables)**: Track money owed TO the company
- **Creditors (Payables)**: Track money owed BY the company
- Party linking: Can link to existing Clients, Vendors, or standalone parties
- Interest calculation on overdue debts (simple interest formula)
- Payment recording with treasury integration
- Aging summary (Current, 1-30, 31-60, 61-90, 90+ days)
- Status auto-calculation: pending, partially_paid, fully_paid, overdue

### Comprehensive Reports Module (NEW - Feb 21, 2026)
**7 Report Tabs with CSV Export:**

1. **Transaction Reports**
   - Total Deposits/Withdrawals with USD amounts
   - Deposits by Currency (base amount + USD equivalent)
   - Withdrawals by Currency (base amount + USD equivalent)
   - Transaction Volume chart (30 days)
   - CSV export per currency table

2. **Vendor Reports**
   - Vendor Settlement Summary
   - Net Settlement = Deposits - Withdrawals - Commission
   - Commission rates displayed
   - Currency breakdown per vendor
   - CSV export

3. **Commission Reports**
   - Total Commission Paid
   - Commission by Vendor (deposit vs withdrawal split)
   - Commission by Currency (base + USD)
   - CSV export

4. **Client Reports**
   - Total/Active Clients
   - Client Balance Report
   - Net balance per client
   - Transaction counts
   - CSV export

5. **Treasury Reports**
   - Total Balance in USD
   - Balance by Currency
   - Account list with USD equivalents
   - Recent transfers
   - CSV export

6. **PSP Reports**
   - Volume, Commission, Net amounts
   - Settled vs Pending counts
   - CSV export

7. **Financial Reports**
   - P&L Summary (Income - Expenses)
   - Income by Category (pie chart)
   - Expenses by Category (pie chart)
   - Loan Summary
   - Vendor Commission Summary
   - Treasury Balance

## Recent Updates

### February 22, 2026 - PSP Enhanced Features & Daily Email Reports
**Implemented:**
- PSP Settings: chargeback_rate (%) and holding_days fields
- Per-transaction charges: chargeback_amount, extra_charges, charges_description
- Holding release date tracking with status badges (Holding/Ready)
- Record Payment Received with actual amount and variance tracking
- Treasury integration: Balance updates on payment receipt
- Duplicate transaction prevention (reference uniqueness + 5-min time window)
- **Daily Email Reports System:**
  - Gmail SMTP integration with App Password
  - Settings page to configure SMTP, director emails, and schedule
  - Comprehensive HTML daily report with business summary
  - APScheduler for automated 3:00 AM daily sends
  - Test email and Send Now functionality
  - Email send history/logs

### February 21, 2026 - Debt Management Module
**Implemented:**
- Full CRUD for debts (Receivables & Payables)
- Party types: Client, Vendor, Other (external parties)
- Interest calculation on overdue debts
- Payment recording with treasury integration
- Aging summary dashboard
- Auto-status calculation

### February 21, 2026 - Comprehensive Reports Module
**Implemented:**
- 7 report tabs with full data visualization
- All reports include base currency with USD equivalents
- Date range filters on all reports
- CSV export functionality for each report type
- Charts: Area charts, Bar charts, Pie charts using Recharts
- Responsive design with proper loading states

### February 21, 2026 - Enhanced Clients Page
**Implemented:**
- Transaction type filter (All, Deposits Only, Withdrawals Only, No Transactions)
- Balance range filters (Min/Max)
- Export dropdown (Clients CSV, All Transactions CSV)
- "Showing X of Y clients" counter
- Clear filters button
- All filters work with existing search and KYC status filter

## Technical Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, lucide-react, Recharts
- **Backend**: FastAPI, Motor (async MongoDB), Pydantic
- **Database**: MongoDB
- **Authentication**: JWT & Google OAuth

## Key API Endpoints

### Debt Management Endpoints
- `/api/debts` - List/Create debts
- `/api/debts/{debt_id}` - Get/Update/Delete debt
- `/api/debts/{debt_id}/payments` - Record/List payments
- `/api/debts/summary/overview` - Summary with aging

### Reports Endpoints
- `/api/reports/transactions-detailed` - Transactions with currency breakdown
- `/api/reports/vendor-summary` - Vendor settlements with commission
- `/api/reports/vendor-commissions` - Detailed commission report
- `/api/reports/client-balances` - Client balance summaries
- `/api/reports/treasury-summary` - Treasury accounts and balances
- `/api/reports/psp-summary` - PSP volumes and commissions
- `/api/reports/financial-summary` - P&L and financial overview
- `/api/reports/transactions-summary` - Chart data (existing)
- `/api/reports/dashboard` - Dashboard stats (existing)
- `/api/reports/client-analytics` - Client analytics (existing)

### PSP Management Endpoints (Enhanced)
- `/api/psp` - List/Create PSPs (includes chargeback_rate, holding_days)
- `/api/psp/{psp_id}` - Get/Update/Delete PSP
- `/api/psp-summary` - PSP summary with pending amounts
- `/api/psp/{psp_id}/pending-transactions` - Pending transactions for a PSP
- `/api/psp/{psp_id}/settlements` - Settlement history
- `/api/psp/transactions/{id}/charges` - PUT: Record chargeback_amount, extra_charges
- `/api/psp/transactions/{id}/record-payment` - POST: Record payment received (credits treasury)
- `/api/psp/transactions/{id}/settle` - POST: Legacy immediate settlement

### Other Key Endpoints
- `/api/auth/*` - Authentication
- `/api/clients/*` - Client management
- `/api/transactions/*` - Transaction management
- `/api/treasury/*` - Treasury management
- `/api/income-expenses/*` - Income/Expense tracking
- `/api/loans/*` - Loan management
- `/api/vendor/me` - Vendor portal info
- `/api/vendors/{id}` - Admin view vendor details

## Test Credentials
- **Admin**: admin@fxbroker.com / password

## Known Issues
- P2: Minor session management redirect issue (not started)

## Completed Tasks
- ✅ Client page filters and CSV download
- ✅ Comprehensive Reports module (7 tabs)
- ✅ All reports include base currency breakdown
- ✅ CSV export for all report types
- ✅ Date filtering on reports
- ✅ Debt Management module (Receivables & Payables)
- ✅ Interest calculation on overdue debts
- ✅ Payment recording with treasury integration
- ✅ PSP Enhanced Features (Feb 22, 2026):
  - ✅ Chargeback rate and holding days in PSP settings
  - ✅ Per-transaction chargeback and extra charges recording
  - ✅ Holding release date tracking with status badges
  - ✅ Record Payment Received with treasury integration
  - ✅ Net settlement calculation with all deductions
- ✅ Duplicate Transaction Prevention:
  - ✅ Unique reference number enforcement
  - ✅ Time-window duplicate detection (5 minutes)
- ✅ Daily Email Reports System:
  - ✅ Gmail SMTP integration
  - ✅ Settings page (SMTP config, director emails, schedule)
  - ✅ Comprehensive HTML daily business report
  - ✅ 3:00 AM auto-send via APScheduler
  - ✅ Test email and Send Now buttons
  - ✅ Email history/logs
- ✅ Reconciliation Module:
  - ✅ Bank/Treasury Reconciliation (CSV/Excel upload)
  - ✅ PSP Settlement Reconciliation (expected vs actual)
  - ✅ Client Account Reconciliation (balance verification)
  - ✅ Vendor Commission Reconciliation
  - ✅ Summary dashboard with discrepancy alerts
  - ✅ Detailed transaction drill-down views

## Future/Backlog
- P2: Advanced Reporting (additional custom reports)
- P2: Refactor server.py monolith into APIRouter modules
- P3: Real-time currency exchange rates (currently hardcoded)

## Mocked/Placeholder
- Currency exchange rates are hardcoded in backend/server.py (EXCHANGE_RATES_TO_USD dictionary)

## Current Data State
- 1 client: safvan kappilakath
- 3 deposits: $60,750 USD (225,000 AED)
- 2 withdrawals: $22,950 USD (85,000 AED)
- Net balance: $37,800
- 1 vendor: kenway with $459 commission
- 2 treasury accounts: ENBD (AED), ICIC (INR) = $37,969.53 total
