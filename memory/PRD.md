# FX Broker Back-Office Accounting System - PRD

## Original Problem Statement
Build account software for FX broker - a back-office accounting system with admin, sub-admin, accountant, and vendor roles.

## Latest Update (2026-02-19)

### Vendor Portal Feature - COMPLETED
New vendor management system with dedicated vendor portal:

1. **Vendor User Role**
   - New role `vendor` with separate login credentials
   - Vendor redirected to `/vendor-portal` after login
   - Filtered navigation (only My Portal, Settings)

2. **Vendor Portal Features**
   - View only assigned transactions (deposits & withdrawals)
   - Approve/Reject transactions with math captcha
   - For withdrawals: Must upload screenshot proof when completing

3. **Admin - Vendor Management**
   - CRUD for vendors (creates user account + vendor record)
   - Per-vendor commission rates:
     - Deposit commission %
     - Withdrawal commission %
     - Bank settlement commission %
     - Cash settlement commission %
   - Settlement destination (Treasury account)
   - Settlement with Bank/Cash type selection

4. **Transaction Form Update**
   - Destination types: Treasury / PSP / **Vendor**
   - When Vendor selected: Dropdown of active vendors

### Previous Updates
- **2026-02-19**: PSP Management with commission tracking, settlement workflow
- **2026-02-18**: Math captcha, MT5 Number, CRM Customer ID, Multi-currency support

## User Personas
1. **Admin** - Full system access, manage vendors/PSPs, settle transactions
2. **Sub-Admin** - Can manage clients and create transactions
3. **Accountant** - Can approve/reject pending transactions
4. **Vendor** - Can view/approve/reject their assigned transactions, upload withdrawal proofs

## Core Features
- Client management (with MT5 Number, CRM Customer ID)
- Transaction ledger with proof of payment upload
- Multi-currency transactions converted to USD
- Treasury/Bank account management
- PSP management with commission tracking and settlement
- **Vendor Portal** with approve/reject workflow and proof upload
- Transaction approval workflow with math captcha
- Reports

## What's Implemented

### Vendor System
- Vendor CRUD (name, email, password, commissions)
- Vendor login -> /vendor-portal redirect
- Vendor-specific sidebar (My Portal, Settings only)
- Vendor approve/reject with captcha
- Vendor complete withdrawal with screenshot upload
- Bank vs Cash settlement with different commission rates
- Settlement history per vendor

### Transaction Destinations
- Treasury / Bank Account
- PSP (Payment Service Provider)
- Vendor

## API Endpoints

### Vendor Endpoints
- `GET /api/vendors` - List all vendors with pending counts
- `GET /api/vendors/{vendor_id}` - Get single vendor
- `POST /api/vendors` - Create vendor (Admin only)
- `PUT /api/vendors/{vendor_id}` - Update vendor (Admin only)
- `DELETE /api/vendors/{vendor_id}` - Delete vendor (Admin only)
- `GET /api/vendor/me` - Get current vendor info (Vendor role only)
- `GET /api/vendors/{vendor_id}/transactions` - Get vendor's transactions
- `POST /api/vendor/transactions/{tx_id}/approve` - Vendor approve
- `POST /api/vendor/transactions/{tx_id}/reject` - Vendor reject
- `POST /api/vendor/transactions/{tx_id}/complete` - Vendor complete withdrawal with proof
- `POST /api/vendors/{vendor_id}/settle` - Admin settle with Bank/Cash type
- `GET /api/vendors/{vendor_id}/settlements` - Settlement history

### Other Endpoints
- Auth, Clients, Transactions, Treasury, PSPs (unchanged)

## Demo Credentials
- **Admin:** admin@fxbroker.com / admin123
- **Accountant:** accountant@fxbroker.com / accountant123
- **Vendor 1:** vendor1@fxbroker.com / vendor123
- **Vendor 2:** vendor2@fxbroker.com / vendor123

## Seeded Data
- 3 PSPs: Stripe (2.9%), PayPal (3.5%), Skrill (2.5%)
- 2 Vendors: MoneyExchange Pro, FastPay Solutions

## Prioritized Backlog

### P0 - COMPLETED
- [x] PSP Management Page with CRUD
- [x] PSP destination in Transaction form
- [x] Commission toggle (Client/Broker)
- [x] Settlement workflow with Treasury transfer
- [x] Vendor Portal with separate login
- [x] Vendor approve/reject with captcha
- [x] Vendor withdrawal completion with proof upload
- [x] Admin vendor settlement with Bank/Cash types

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
│   ├── server.py
│   └── tests/
│       └── test_vendor_features.py
├── frontend/
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── App.js
│       ├── context/AuthContext.js
│       ├── components/
│       │   ├── Layout.js
│       │   └── ui/
│       └── pages/
│           ├── AccountantDashboard.js
│           ├── Clients.js
│           ├── Dashboard.js
│           ├── Login.js
│           ├── PSPs.js
│           ├── Reports.js
│           ├── Settings.js
│           ├── Transactions.js
│           ├── Treasury.js
│           ├── VendorDashboard.js  # NEW
│           └── Vendors.js          # NEW
└── memory/
    └── PRD.md
```

## Testing Status
- Backend: 100% (21/21 vendor tests + 14/14 PSP tests passed)
- Frontend: 100% (all features working)
- Test reports: /app/test_reports/iteration_5.json

## DB Schema

### vendors collection
```json
{
  "vendor_id": "vendor_xxx",
  "user_id": "user_xxx",
  "vendor_name": "string",
  "email": "string",
  "deposit_commission": 1.5,
  "withdrawal_commission": 2.0,
  "bank_settlement_commission": 0.5,
  "cash_settlement_commission": 1.0,
  "settlement_destination_id": "treasury_xxx",
  "status": "active",
  "total_volume": 0.0,
  "total_commission": 0.0,
  "pending_settlement": 0.0
}
```

### vendor_settlements collection
```json
{
  "settlement_id": "vstl_xxx",
  "vendor_id": "vendor_xxx",
  "settlement_type": "bank|cash",
  "gross_amount": 1000.0,
  "commission_rate": 0.5,
  "commission_amount": 5.0,
  "net_amount": 995.0,
  "transaction_count": 5,
  "status": "completed"
}
```
