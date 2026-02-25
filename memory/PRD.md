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
- Enhanced filters (transaction type, balance range) and CSV export

### Transaction Management
- Track deposits, withdrawals, transfers
- Multiple currencies support
- Destinations: Treasury, PSP, Vendor, Client Bank, USDT
- Proof of payment uploads
- Broker commission on deposits/withdrawals (configurable)

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

### PSP Management
- Manual ledger for Payment Service Providers
- Commission tracking with per-PSP commission rate
- Chargeback Rate %, Holding Days, Settlement Days
- Per-Transaction Charges (chargeback, extra charges)
- Holding & Release Tracking with status badges
- Record Payment Received with treasury integration

### Vendor Portal
- Separate vendor login
- Assigned transaction management
- Settlement requests
- Commission calculation on deposit/withdrawal approval
- Settlement formula: (Deposits - Withdrawals - Commission)

### Income & Expenses Ledger
- Track company income/expenses
- Custom categories
- Treasury account integration

### Loan Management
- Track loans to other companies
- Borrower, amount, interest rate, dates
- Repayment tracking, Treasury integration

### Outstanding Accounts (Debt Management)
- Debtors (Receivables) & Creditors (Payables)
- Party linking: Client, Vendor, Other
- Interest calculation, Payment recording with treasury
- Aging summary, Auto-status calculation

### Comprehensive Reports Module
- 7 report tabs (Transaction, Vendor, Commission, Client, Treasury, PSP, Financial)
- CSV export, date range filters, charts

### Daily Email Reports
- Gmail SMTP integration with App Password
- Configurable director emails, schedule
- APScheduler for automated sends

### Reconciliation Module (Scaffold)
- Bank/Treasury, PSP, Client, Vendor reconciliation views
- Summary dashboard

### Live FX Rates (NEW - Feb 25, 2026)
- Real-time exchange rates from ExchangeRate-API (open.er-api.com)
- No API key required, 1-hour cache with fallback to static rates
- Dashboard FX ticker bar with LIVE badge
- Currency conversion API endpoint
- Admin force-refresh capability
- Settings page FX rates grid with 20+ currencies

### Broker Commission (NEW - Feb 25, 2026)
- Global configurable commission rates for deposits and withdrawals
- Enable/disable toggle in Settings > Commission & FX tab
- Auto-applied on transaction creation
- Stored on each transaction: rate, USD amount, base currency amount
- Visible in transaction detail dialog

## Technical Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, lucide-react, Recharts
- **Backend**: FastAPI, Motor (async MongoDB), Pydantic, APScheduler
- **Database**: MongoDB
- **Authentication**: JWT & Google OAuth
- **FX Rates**: open.er-api.com (free, no API key)

## Key API Endpoints

### FX Rate Endpoints (NEW)
- `GET /api/fx-rates` - Get current live rates (popular + all)
- `POST /api/fx-rates/refresh` - Force refresh rates (admin)
- `GET /api/fx-rates/convert?amount=X&from_currency=Y&to_currency=Z` - Convert currencies

### Commission Settings Endpoints (NEW)
- `GET /api/settings/commission` - Get commission settings
- `PUT /api/settings/commission` - Update commission settings

### Other Key Endpoints
- `/api/auth/*` - Authentication
- `/api/clients/*` - Client management
- `/api/transactions/*` - Transaction management
- `/api/treasury/*` - Treasury management
- `/api/income-expenses/*` - Income/Expense tracking
- `/api/loans/*` - Loan management
- `/api/debts/*` - Outstanding accounts
- `/api/reports/*` - Reports
- `/api/settings/email` - Email config
- `/api/reconciliation/*` - Reconciliation
- `/api/psp*` - PSP management
- `/api/vendor/*` - Vendor portal

## Test Credentials
- **Admin**: admin@fxbroker.com / password

## Known Issues
- P2: Minor session management redirect issue after login (recurring, not started)

## Completed Tasks
- All previous tasks (see changelog)
- Live FX Rates integration (Feb 25, 2026)
- Broker Commission on deposits/withdrawals (Feb 25, 2026)
- Login page demo credentials fix (Feb 25, 2026)

## Future/Backlog
- P1: Complete Reconciliation Module (CSV/Excel upload + auto-matching)
- P2: Fix session management redirect issue
- P2: Refactor server.py monolith into APIRouter modules
- P2: Advanced custom reports
