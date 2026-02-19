# FX Broker Back-Office Accounting System - PRD

## Original Problem Statement
Build account software for FX broker - a back-office accounting system with admin, sub-admin, accountant, and vendor roles.

## Latest Update (2026-02-19)

### Vendor Settlement Updates - COMPLETED
Simplified vendor creation and manual settlement:

1. **Add Vendor Form (Simplified)**
   - Vendor Name, Email, Password
   - Deposit Commission %, Withdrawal Commission %
   - Description
   - **Removed**: Settlement Commissions (Bank/Cash) and Settlement Destination from create form

2. **Manual Settlement (New Flow)**
   - Admin enters commission amount manually at settlement time
   - Admin selects destination treasury account at settlement time
   - Option to record additional charges/fees
   - Settlement preview showing calculations
   - Multi-currency support (vendor in INR → settlement in AED)

3. **Settlement Dialog Features**
   - Settlement Type: Bank / Cash
   - Settlement Destination: Select from treasury accounts
   - Commission Amount: Manual entry
   - Additional Charges: Optional with description
   - Settlement Preview with net calculations

### Previous Updates
- **2026-02-19 (Earlier)**: Vendor Portal feature
- **2026-02-19**: PSP Management with commission tracking
- **2026-02-18**: Math captcha, MT5 Number, CRM Customer ID, Multi-currency

## User Roles
1. **Admin** - Full access, manage vendors/PSPs, manual settlements
2. **Sub-Admin** - Manage clients, create transactions
3. **Accountant** - Approve/reject pending transactions
4. **Vendor** - View/approve/reject assigned transactions, upload withdrawal proofs

## Core Features
- Client management
- Transaction ledger with proof upload
- Multi-currency transactions
- Treasury/Bank account management
- PSP management with settlements
- **Vendor Portal** with approve/reject workflow
- **Manual Vendor Settlement** with commission & charges

## API Endpoints

### Vendor Settlement (Updated)
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
```

## Demo Credentials
- **Admin:** admin@fxbroker.com / admin123
- **Accountant:** accountant@fxbroker.com / accountant123
- **Vendor 1:** vendor1@fxbroker.com / vendor123
- **Vendor 2:** vendor2@fxbroker.com / vendor123

## Settlement Flow

1. **Transaction Created** → Destination: Vendor
2. **Vendor Approves** → Status: Approved
3. **Admin Settles** →
   - Select settlement type (Bank/Cash)
   - Select destination treasury
   - Enter commission amount
   - Enter any additional charges
   - System shows preview
   - Confirm → Funds added to treasury

## Prioritized Backlog

### P0 - COMPLETED
- [x] PSP Management
- [x] Vendor Portal
- [x] Manual Vendor Settlement
- [x] Commission & Charges recording
- [x] Multi-currency settlement support

### P1 (Next Phase)
- [ ] Live exchange rate API integration
- [ ] Email notifications
- [ ] KYC document upload

### P2 (Future)
- [ ] Export reports
- [ ] Two-factor auth
- [ ] MT5 API integration
- [ ] Backend refactoring

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
