# FX Broker Back-Office Accounting System - PRD

## Original Problem Statement
Build account software for FX broker - a back-office accounting system with admin, sub-admin, accountant, and vendor roles.

## Latest Update (2026-02-19)

### Settlement Approval Workflow & Treasury History - COMPLETED

1. **Settlement Approval Workflow**
   - Vendor settlements now go to "pending" status first
   - Settlements appear in Approvals page under "Settlements" tab
   - Accountant/Admin can approve or reject with math captcha verification
   - Treasury balance updated only upon settlement approval
   - Rejected settlements allow transactions to be re-settled

2. **Treasury History & Statement Download**
   - New "View History" button on treasury account cards
   - History dialog with transaction table (Date, Type, Reference, Amount)
   - Date filters (Start Date, End Date)
   - Transaction type filter (All Types, Deposit, Withdrawal, Settlement In)
   - Download Statement button generates CSV file

3. **Approvals Page Enhancements**
   - Two tabs: "Transactions" and "Settlements"
   - Stats cards showing pending counts for both
   - Math captcha for approve/reject actions

### Previous Updates
- **2026-02-19**: Vendor Settlement with manual commission & multi-currency
- **2026-02-19**: Vendor Portal feature
- **2026-02-19**: PSP Management with commission tracking
- **2026-02-18**: Math captcha, MT5 Number, CRM Customer ID, Multi-currency

## User Roles
1. **Admin** - Full access, manage vendors/PSPs, manual settlements
2. **Sub-Admin** - Manage clients, create transactions
3. **Accountant** - Approve/reject pending transactions AND settlements
4. **Vendor** - View/approve/reject assigned transactions, upload withdrawal proofs

## Core Features
- Client management
- Transaction ledger with proof upload
- Multi-currency transactions
- Treasury/Bank account management with history & statement download
- PSP management with settlements
- **Vendor Portal** with approve/reject workflow
- **Manual Vendor Settlement** with commission & charges
- **Settlement Approval Workflow** - two-step approval process

## API Endpoints

### Settlement Approval Endpoints (New)
```
GET /api/settlements/pending
# Returns all pending vendor settlements for approval

POST /api/settlements/{settlement_id}/approve
# Approves settlement, updates treasury, marks transactions as settled

POST /api/settlements/{settlement_id}/reject?reason=X
# Rejects settlement, resets transactions for re-settlement
```

### Treasury History Endpoint (New)
```
GET /api/treasury/{account_id}/history
Query params:
  - start_date: ISO date string (optional)
  - end_date: ISO date string (optional)
  - transaction_type: deposit|withdrawal|settlement_in (optional)
  - limit: number (default 100)
```

### Vendor Settlement
```
POST /api/vendors/{vendor_id}/settle
Body:
{
  "settlement_type": "bank|cash",
  "destination_account_id": "treasury_xxx",  // Required
  "commission_amount": 50.00,                // Manual entry
  "charges_amount": 10.00,                   // Optional
  "charges_description": "Bank fee",         // Optional
  "source_currency": "USD",
  "destination_currency": "AED",
  "exchange_rate": 3.67
}
# Settlement now goes to "pending" status, requires approval
```

## Demo Credentials
- **Admin:** admin@fxbroker.com / admin123
- **Accountant:** accountant@fxbroker.com / accountant123
- **Vendor 1:** vendor1@fxbroker.com / vendor123
- **Vendor 2:** vendor2@fxbroker.com / vendor123

## Settlement Flow (Updated)

1. **Transaction Created** → Destination: Vendor
2. **Vendor Approves** → Status: Approved
3. **Admin Creates Settlement** →
   - Select settlement type (Bank/Cash)
   - Select destination treasury
   - Enter commission amount
   - Enter any additional charges
   - System shows preview
   - Confirm → **Settlement goes to PENDING status**
4. **Accountant/Admin Approves Settlement** →
   - View on Approvals page → Settlements tab
   - Complete math captcha
   - Approve → Treasury balance updated
   - OR Reject → Transactions reset for re-settlement

## Prioritized Backlog

### P0 - COMPLETED
- [x] PSP Management
- [x] Vendor Portal
- [x] Manual Vendor Settlement
- [x] Commission & Charges recording
- [x] Multi-currency settlement support
- [x] Settlement Approval Workflow
- [x] Treasury History with filters
- [x] Statement Download (CSV)

### P1 (Next Phase)
- [ ] Live exchange rate API integration
- [ ] Email notifications
- [ ] KYC document upload

### P2 (Future)
- [ ] Export reports
- [ ] Two-factor auth
- [ ] MT5 API integration
- [ ] Backend refactoring (APIRouter modules)

## DB Schema

### vendor_settlements (Updated)
```json
{
  "settlement_id": "vstl_xxx",
  "vendor_id": "vendor_xxx",
  "settlement_type": "bank|cash",
  "gross_amount": 1000.0,
  "source_currency": "USD",
  "commission_amount": 50.0,
  "charges_amount": 10.0,
  "charges_description": "Bank fee",
  "net_amount_source": 940.0,
  "exchange_rate": 3.67,
  "destination_currency": "AED",
  "settlement_amount": 3449.8,
  "settlement_destination_id": "treasury_xxx"
}
```
