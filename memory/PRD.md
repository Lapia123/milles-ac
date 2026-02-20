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
- ✅ JWT (email/password)
- ✅ Google Social Login (Emergent-managed)

### Client Management
- ✅ Full CRUD for clients
- ✅ KYC status tracking
- ✅ MT5 Number, CRM Customer ID
- ✅ Saved bank account details

### Transaction Management
- ✅ Track deposits, withdrawals, transfers
- ✅ Multiple currencies support
- ✅ Destinations: Treasury, PSP, Vendor, Client Bank, USDT
- ✅ Proof of payment uploads

### Treasury Management
- ✅ Bank/USDT accounts
- ✅ Total balance in USD
- ✅ Transaction history
- ✅ Inter-treasury transfers

### Accountant Dashboard
- ✅ Approve/reject pending transactions
- ✅ Math captcha protection
- ✅ Settlement approvals
- ✅ **NEW (Feb 20, 2026)**: Deposit approval with mandatory screenshot upload

### PSP Management
- ✅ Manual ledger for Payment Service Providers
- ✅ Commission tracking
- ✅ Settlement management

### Vendor Portal
- ✅ Separate vendor login
- ✅ Assigned transaction management
- ✅ Settlement requests

### Income & Expenses Ledger
- ✅ Track company income/expenses
- ✅ Custom categories
- ✅ Treasury account integration

### Loan Management
- ✅ Track loans to other companies
- ✅ Borrower, amount, interest rate, dates
- ✅ Repayment tracking
- ✅ Treasury integration

## Recent Updates

### February 20, 2026 - Deposit Approval Screenshot Feature
**Implemented:**
1. **Deposit Approval Dialog** - When approving a deposit:
   - Shows transaction details (reference, amount, client)
   - Shows deposit destination (treasury account)
   - **Mandatory screenshot upload** before approval
   - "Continue to Approve" button disabled until screenshot uploaded

2. **Transaction Approval Proof Display**:
   - Transactions page shows teal icon indicator for transactions with accountant proof
   - View dialog shows "Accountant Approval Proof" section
   - Thumbnail preview with click-to-view-fullsize
   - Upload metadata (date, uploaded by)

3. **Backend Changes**:
   - `/api/transactions/{id}/upload-proof` - Works for both deposits AND withdrawals
   - `/api/transactions/{id}/approve` - Requires `accountant_proof_image` for deposits

### Previously Completed
- Inter-Treasury Transfer Feature
- Income & Expenses Ledger
- Loan Management Module
- Deployment Readiness (N+1 query fixes, JWT secret handling)
- Rebranding to "Miles Capitals"

## Technical Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, lucide-react
- **Backend**: FastAPI, Motor (async MongoDB), Pydantic
- **Database**: MongoDB
- **Authentication**: JWT & Google OAuth

## Key API Endpoints
- `/api/auth/*` - Authentication
- `/api/clients/*` - Client management
- `/api/transactions/*` - Transaction management
- `/api/transactions/{id}/upload-proof` - Upload approval proof
- `/api/transactions/{id}/approve` - Approve transaction
- `/api/treasury/*` - Treasury management
- `/api/treasury/transfer` - Inter-treasury transfer
- `/api/income-expenses/*` - Income/Expense tracking
- `/api/loans/*` - Loan management

## Test Credentials
- **Admin**: admin@fxbroker.com / password
- **Accountant**: accountant@fxbroker.com / password
- **Vendor**: vendor1@fxbroker.com / password

## Known Issues
- P2: Minor session management redirect issue (not started)

## Future/Backlog
- P2: Advanced Reporting (commission reports, client analytics)
- P2: Refactor server.py monolith into APIRouter modules

## Mocked/Placeholder
- Currency exchange rates are hardcoded in backend/server.py
