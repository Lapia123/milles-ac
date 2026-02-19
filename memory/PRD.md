# FX Broker Back-Office Accounting System - PRD

## Original Problem Statement
Build account software for FX broker - a back-office accounting system with admin, sub-admin, and accountant roles.

## Latest Update (2026-02-19)
### PSP (Payment Service Provider) Feature - COMPLETED
New PSP management system with manual ledgering workflow:
1. PSP Management Page (like Treasury)
   - CRUD for PSPs (name, commission rate %, settlement days)
   - Settlement destination (Treasury account)
   - Pending balance tracking per PSP
   - Visual indicators for settlements due/overdue (color coded)

2. Transaction Form Updates
   - Destination Type selector (Treasury / PSP)
   - When PSP selected: PSP dropdown, Commission Paid By toggle
   - Commission calculation preview (Client side / Broker side)
   - Expected settlement date display

3. Settlement Workflow
   - Pending settlements list per PSP
   - "Mark as Settled" button
   - Settlement transfers net amount to Treasury
   - Settlement history log

### Previous Updates (2026-02-18)
- Math captcha (addition only) for approve/reject transactions
- MT5 Number and CRM Customer ID fields for clients
- Multi-currency support with USD final balance conversion

## User Personas
1. **Admin** - Full system access, can manage PSPs and settle transactions
2. **Sub-Admin** - Can manage clients and create transactions
3. **Accountant** - Can approve/reject pending transactions

## Core Features
- Client management (with MT5 Number, CRM Customer ID)
- Transaction ledger with proof of payment upload
- Multi-currency transactions (AED, EUR, GBP, etc.) converted to USD
- Treasury/Bank account management with USD equivalent display
- PSP management with commission tracking and settlement workflow
- Transaction approval workflow with math captcha security
- Basic + Advanced Reporting

## Exchange Rates (to USD) - HARDCODED
- USD: 1.0
- EUR: 1.08
- GBP: 1.27
- AED: 0.27
- SAR: 0.27
- INR: 0.012
- JPY: 0.0067

## What's Implemented

### Client Fields
- First Name, Last Name, Email, Phone, Country
- MT5 Number
- CRM Customer ID
- KYC Status, Notes

### Transaction Fields
- Client selection
- Transaction type, Amount in USD
- Base Currency (AED, EUR, etc.) with conversion
- Destination Type: Treasury OR PSP
- For PSP: Commission Paid By (Client/Broker)
- Commission calculation and net amount
- Expected settlement date tracking
- Proof of Payment (image upload)
- Reference, Description

### Treasury Fields
- Account Name, Bank Name
- Currency (USD, EUR, GBP, AED, etc.)
- Balance (in original currency)
- Balance USD (converted equivalent)
- Account Number, Routing, SWIFT

### PSP Fields (NEW)
- PSP Name (Stripe, PayPal, etc.)
- Commission Rate (%)
- Settlement Days (T+1, T+2, etc.)
- Settlement Destination (Treasury account)
- Min Settlement Amount
- Total Volume, Total Commission
- Pending Settlement Amount
- Status (Active/Inactive)

### Security
- Math Captcha for approve/reject (addition only: 1+2=?)
- JWT + Google OAuth authentication

## API Endpoints

### PSP Endpoints (NEW)
- `GET /api/psp` - List all PSPs
- `GET /api/psp/{psp_id}` - Get single PSP
- `POST /api/psp` - Create PSP (Admin only)
- `PUT /api/psp/{psp_id}` - Update PSP (Admin only)
- `DELETE /api/psp/{psp_id}` - Delete PSP (Admin only)
- `GET /api/psp-summary` - Get PSPs with pending counts and overdue info
- `GET /api/psp/{psp_id}/pending-transactions` - List pending PSP transactions
- `GET /api/psp/{psp_id}/settlements` - List settlement history
- `POST /api/psp/transactions/{tx_id}/settle` - Mark transaction as settled

### Other Endpoints
- `/api/auth/{register, login, google, callback}`
- `/api/clients` (CRUD)
- `/api/transactions` (CRUD)
- `/api/transactions/{id}/{approve|reject}`
- `/api/treasury-accounts` (CRUD)

## Demo Credentials
- Admin: admin@fxbroker.com / admin123
- Accountant: accountant@fxbroker.com / accountant123

## Seeded PSPs
- Stripe: 2.9% commission, T+2 settlement
- PayPal: 3.5% commission, T+3 settlement
- Skrill: 2.5% commission, T+1 settlement

## Prioritized Backlog

### P0 - COMPLETED
- [x] PSP Management Page with CRUD
- [x] PSP destination in Transaction form
- [x] Commission toggle (Client/Broker)
- [x] Settlement workflow with Treasury transfer

### P1 (Next Phase)
- [ ] Live exchange rate API integration
- [ ] Email notifications for approvals
- [ ] KYC document upload
- [ ] Audit log

### P2 (Future)
- [ ] Export reports to PDF/Excel
- [ ] Two-factor authentication
- [ ] MT5 API integration
- [ ] Advanced P&L reporting
- [ ] Backend refactoring (break server.py into modules)

## Code Architecture
```
/app/
├── backend/
│   ├── .env
│   ├── requirements.txt
│   ├── server.py         # FastAPI app with all models and routes
│   └── tests/
│       └── test_psp_features.py
├── frontend/
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── App.js
│       ├── components/
│       │   ├── Layout.js   # Sidebar with PSP nav
│       │   └── ui/
│       └── pages/
│           ├── AccountantDashboard.js
│           ├── Clients.js
│           ├── Dashboard.js
│           ├── PSPs.js      # NEW PSP management
│           ├── Reports.js
│           ├── Settings.js
│           ├── Transactions.js
│           └── Treasury.js
└── memory/
    └── PRD.md
```

## Testing Status
- Backend: 100% (14/14 PSP tests passed)
- Frontend: 100% (all PSP features working)
- Test report: /app/test_reports/iteration_4.json
