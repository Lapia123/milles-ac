# FX Broker Back-Office Accounting System - PRD

## Original Problem Statement
Build account software for FX broker - a back-office accounting system with admin, sub-admin, accountant, and vendor roles.

## Latest Update (2026-02-19)

### Loan Management - COMPLETED

1. **Create Loan**
   - Borrower company name
   - Loan amount & currency (multi-currency support)
   - Annual interest rate (simple interest calculation)
   - Loan date & due date
   - Repayment mode: Lump Sum or Installments (with frequency)
   - Select treasury account to disburse from
   - Auto-deducts from treasury on creation

2. **Record Repayments**
   - Record partial or full payments
   - Select different treasury account for repayment
   - Multi-currency support (converts to loan currency)
   - Auto-credits treasury account
   - Shows outstanding balance

3. **Loan Status Tracking**
   - Active: Loan created, no repayments
   - Partially Paid: Some repayments made
   - Fully Paid: Total repaid >= loan amount + interest
   - Overdue: Due date passed (auto-detected)

4. **Loan Reports**
   - Total Disbursed (USD)
   - Outstanding Balance (USD)
   - Total Repaid (USD)
   - Interest Earned (USD)
   - Status breakdown counts
   - By-borrower breakdown

5. **Loan Details View**
   - Full loan information
   - Repayment history table
   - Record repayment from details view

### Income & Expenses Ledger - COMPLETED

1. **Income Entry**
   - Categories: Commission, Service Fees, Interest, Other (custom)
   - Select treasury account to credit
   - Multi-currency with USD conversion
   - Auto-updates treasury balance (credits on create, debits on delete)

2. **Expense Entry**
   - Categories: Bank Fees, Transfer Charges, Vendor Payments, Operational, Marketing, Software, Other (custom)
   - Select treasury account to deduct from
   - Validates sufficient balance before deduction
   - Auto-updates treasury balance (debits on create, credits on delete)

3. **Filtering & Reports**
   - Filter by: Entry type, Date range, Treasury account
   - Summary: Total Income, Total Expenses, Net Profit/Loss (USD)
   - Category breakdown for income and expenses
   - Monthly P&L report (12 months)

4. **Treasury Integration**
   - All entries linked to specific treasury accounts
   - Balance updated immediately on entry creation/deletion
   - Recorded in treasury_transactions as income/expense type

### Inter-Treasury Transfer Feature - COMPLETED

1. **Transfer Dialog**
   - Opens from "Transfer" button on Treasury page (visible when 2+ accounts exist)
   - Two-step process: Form entry → Security verification
   - Select source and destination accounts
   - Enter transfer amount with live preview
   - Exchange rate field appears for cross-currency transfers
   - Optional notes field

2. **Security Verification**
   - Math captcha required to confirm transfer (e.g., "5 + 7 = ?")
   - Transfer summary shown before confirmation
   - Back button to modify details

3. **Balance Updates**
   - Source account balance deducted immediately
   - Destination account credited with converted amount
   - Transfers recorded in treasury_transactions as transfer_out/transfer_in
   - Visible in View History for both accounts

### Enhanced Approvals & Client Bank Management - COMPLETED

1. **Approvals Page Filters**
   - Filter by Type (All, Deposit, Withdrawal, Transfer)
   - Filter by Destination (All, Treasury, Client Bank, USDT, PSP, Vendor)
   - Search by Client name
   - Clear Filters button

2. **Withdrawal Approval Flow (Enhanced)**
   - Dialog shows transaction details and destination (bank/USDT info)
   - **Mandatory**: Select Source Treasury/USDT Account (where funds come from)
   - **Mandatory**: Upload Proof of Payment Screenshot
   - Continue button disabled until both requirements met
   - Deducts balance from source account upon approval

3. **Client Bank Accounts Management**
   - Bank details saved to client profile when creating withdrawal
   - Saved Bank Accounts dropdown in Transaction form
   - "Add New Bank Account" option for new entries
   - Backend CRUD: GET/POST/PUT/DELETE /api/clients/{id}/bank-accounts

4. **USDT Currency Added**
   - USDT option in all currency dropdowns
   - Full list: USD, EUR, GBP, AED, SAR, INR, JPY, USDT

### Previous Updates
- **2026-02-19**: New destination types (Client Bank, USDT), USDT Treasury
- **2026-02-19**: Settlement Approval Workflow & Treasury History
- **2026-02-19**: Vendor Settlement with manual commission & multi-currency
- **2026-02-19**: Vendor Portal, PSP Management

## User Roles
1. **Admin** - Full access, manage vendors/PSPs, manual settlements, inter-treasury transfers
2. **Sub-Admin** - Manage clients, create transactions
3. **Accountant** - Approve/reject pending transactions AND settlements
4. **Vendor** - View/approve/reject assigned transactions, upload withdrawal proofs

## Core Features
- Client management
- Transaction ledger with proof upload
- Multi-currency transactions
- Treasury/Bank account management with history & statement download
- **Inter-Treasury Transfer** with math captcha security
- PSP management with settlements
- **Vendor Portal** with approve/reject workflow
- **Manual Vendor Settlement** with commission & charges
- **Settlement Approval Workflow** - two-step approval process

## API Endpoints

### Income & Expenses (NEW)
```
GET /api/income-expenses
# Query params: entry_type, category, start_date, end_date, treasury_account_id, limit

POST /api/income-expenses
Body:
{
  "entry_type": "income" | "expense",
  "category": "commission" | "service_fee" | "interest" | "bank_fee" | "operational" | "other",
  "custom_category": "Custom Name",  // Optional, used when category is "other"
  "amount": 5000.0,
  "currency": "USD",
  "treasury_account_id": "treasury_xxx",
  "description": "Monthly commission",  // Optional
  "reference": "INV-001",  // Optional
  "date": "2026-02-19"  // Optional, defaults to today
}

DELETE /api/income-expenses/{entry_id}
# Reverses treasury balance change and deletes entry

GET /api/income-expenses/reports/summary
# Query params: start_date, end_date
# Returns: total_income_usd, total_expense_usd, net_profit_usd, income_by_category, expense_by_category

GET /api/income-expenses/reports/monthly?year=2026
# Returns: Array of {month, income, expense, net} for 12 months

GET /api/income-expenses/categories
# Returns: income_categories, expense_categories, custom_income_categories, custom_expense_categories
```

### Inter-Treasury Transfer
```
POST /api/treasury/transfer
Body:
{
  "source_account_id": "treasury_xxx",
  "destination_account_id": "treasury_yyy",
  "amount": 1000.0,
  "exchange_rate": 1.08,  // Optional, defaults to 1
  "notes": "Internal transfer"  // Optional
}

Response:
{
  "transfer_id": "trf_xxx",
  "source_account": "Main Operating Account",
  "destination_account": "EUR Account",
  "source_amount": 1000.0,
  "source_currency": "USD",
  "destination_amount": 1080.0,
  "destination_currency": "EUR",
  "exchange_rate": 1.08,
  "created_at": "ISO date",
  "created_by_name": "System Admin"
}
```

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
- [x] Treasury History with filters & CSV download
- [x] New destination types (Client Bank, USDT)
- [x] USDT Treasury accounts
- [x] Approvals page filters (Type, Destination, Client)
- [x] Withdrawal approval requires source account + proof screenshot
- [x] Client bank accounts saved to profile
- [x] USDT added to all currency dropdowns
- [x] **Inter-Treasury Transfer with math captcha security**
- [x] **Income & Expenses Ledger with treasury integration**

### P1 (Next Phase)
- [ ] Live exchange rate API integration
- [ ] Email notifications
- [ ] KYC document upload

### P2 (Future)
- [ ] Export reports
- [ ] Two-factor auth
- [ ] MT5 API integration
- [ ] Backend refactoring (APIRouter modules)
- [ ] Session management bug fix (minor redirect issue after login)

## DB Schema

### treasury_transactions (Updated with transfer types)
```json
{
  "treasury_transaction_id": "ttx_xxx",
  "account_id": "treasury_xxx",
  "transaction_type": "settlement_in|deposit|withdrawal|transfer_out|transfer_in|income|expense",
  "amount": 3449.8,
  "currency": "AED",
  "reference": "Transfer to EUR Account",
  "transfer_id": "trf_xxx",  // For transfers
  "income_expense_id": "ie_xxx",  // For income/expenses
  "related_account_id": "treasury_yyy",  // For transfers
  "related_account_name": "EUR Account",  // For transfers
  "exchange_rate": 1.08,  // For transfers
  "destination_amount": 1080.0,  // For transfers
  "destination_currency": "EUR",  // For transfers
  "notes": "Internal transfer",  // For transfers
  "created_at": "ISO date",
  "created_by": "user_id",
  "created_by_name": "User Name"
}
```

### income_expenses (NEW)
```json
{
  "entry_id": "ie_xxx",
  "entry_type": "income|expense",
  "category": "commission|service_fee|interest|bank_fee|operational|marketing|software|other",
  "custom_category": "Custom Category Name",  // When category is "other"
  "amount": 5000.0,
  "currency": "USD",
  "amount_usd": 5000.0,  // Converted to USD for reporting
  "treasury_account_id": "treasury_xxx",
  "description": "Monthly commission income",
  "reference": "INV-001",
  "date": "2026-02-19",
  "created_at": "ISO date",
  "created_by": "user_id",
  "created_by_name": "User Name"
}
```

### vendor_settlements
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
