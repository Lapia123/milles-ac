# FX Broker Back-Office Accounting System - PRD

## Original Problem Statement
Build account software for FX broker - a back-office accounting system with admin, sub-admin, accountant, and vendor roles.

## Latest Update (2026-02-19)

### New Transaction Destination Types & USDT Support - COMPLETED

1. **New Destination Types**
   - Treasury/Bank Account (existing)
   - **Client Bank (Withdrawal)** - Shows client bank details form instead of treasury selector
   - **USDT** - For both deposit and withdrawal
   - PSP (existing)
   - Vendor (existing)

2. **Client Bank Withdrawal**
   - Bank Name, Account Name, Account Number, SWIFT/IBAN, Currency
   - NO treasury account selector shown for this type
   - Details stored with transaction and shown in Approvals

3. **USDT Transactions**
   - Deposit: Select USDT treasury account
   - Withdrawal: Enter client USDT address + Network (TRC20/ERC20/BEP20)
   - Details shown in Pending Approvals

4. **USDT Treasury Accounts**
   - New account type: USDT Wallet
   - Fields: Wallet Address, Network, Private Notes/Labels, Balance

5. **Pending Approvals Enhancements**
   - Shows client bank/USDT details for withdrawal transactions
   - Upload Proof button for accountants to upload payment screenshot
   - Proof stored as `accountant_proof_image` in transaction

### Previous Updates
- **2026-02-19**: Settlement Approval Workflow & Treasury History
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

### Transaction Endpoints (Updated)
```
POST /api/transactions
# Form data fields:
# - client_id, transaction_type, amount, currency
# - destination_type: "treasury" | "bank" | "usdt" | "psp" | "vendor"
# - destination_account_id (for treasury/usdt deposits)
# - client_bank_name, client_bank_account_name, client_bank_account_number, 
#   client_bank_swift_iban, client_bank_currency (for bank withdrawals)
# - client_usdt_address, client_usdt_network (for usdt withdrawals)
# - psp_id, vendor_id, commission_paid_by

POST /api/transactions/{id}/upload-proof
# Upload proof of payment for withdrawal transactions (accountant)
# multipart/form-data: proof_image file
```

### Treasury Endpoints (Updated)
```
POST /api/treasury
# Create treasury account (including USDT type)
Body:
{
  "account_name": "USDT Hot Wallet",
  "account_type": "usdt",  // "bank" | "usdt" | "crypto_wallet" | "payment_gateway"
  "currency": "USDT",
  "usdt_address": "TXyz...",  // For USDT type
  "usdt_network": "TRC20",    // TRC20 | ERC20 | BEP20
  "usdt_notes": "Hot wallet for withdrawals"
}
```

### Settlement Approval Endpoints
```
GET /api/settlements/pending
POST /api/settlements/{id}/approve
POST /api/settlements/{id}/reject?reason=X
```

### Treasury History Endpoint
```
GET /api/treasury/{account_id}/history
Query: start_date, end_date, transaction_type, limit
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
- [x] New destination types (Client Bank, USDT)
- [x] USDT Treasury accounts
- [x] Upload proof for withdrawals in Approvals

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
  "settlement_destination_id": "treasury_xxx",
  "status": "pending|approved|rejected",
  "approved_at": "ISO date",
  "approved_by": "user_id",
  "approved_by_name": "User Name",
  "rejection_reason": "optional reason"
}
```

### treasury_transactions (New Collection)
```json
{
  "treasury_transaction_id": "ttx_xxx",
  "account_id": "treasury_xxx",
  "transaction_type": "settlement_in|deposit|withdrawal",
  "amount": 3449.8,
  "currency": "AED",
  "reference": "Vendor Settlement: VendorName",
  "settlement_id": "vstl_xxx",
  "vendor_id": "vendor_xxx",
  "created_at": "ISO date",
  "created_by": "user_id"
}
```
