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

### PSP Management (Enhanced Feb 25, 2026)
- Commission tracking, per-PSP rates
- **Reserve Fund** (renamed from Chargeback): Reserve Fund Rate %, per-transaction tracking
- **Per-transaction reserve fund amount**: Stored at creation time, not just at settlement
- **New fee fields**: Gateway Fee (per tx), Refund Fee, Monthly Minimum Fee
- Holding & Release Tracking with status badges
- **Reserve Fund Ledger**: Full ledger tab with summary cards (Total Held, Due This Week, Released, Holding Period)
- **Release Tracker**: Status (Held/Due/Released), Days Remaining, Hold Date, Release Date
- **Single & Bulk Release**: Release reserve funds back to treasury with automatic currency conversion
- **Currency Conversion**: All PSP settlements and reserve fund releases auto-convert to treasury account currency using live FX rates
- **Dashboard Reserve Fund Card**: Global total reserve fund held with due-for-release amount
- **Per-PSP Reserve Held**: Shown on each PSP card
- Two-step settlement process (Record Charges -> Record Payment)

### Vendor Portal
- Separate login, assigned transactions, settlement requests
- Settlement History with Statement of Settlement (printable)
- Commission calculation on deposit/withdrawal approval

### Income & Expenses Ledger
- Track company income/expenses, custom categories, treasury integration

### Loan Management
- Borrower, amount, interest, dates, repayment tracking

### Outstanding Accounts
- Debtors & Creditors, party linking, interest, payment recording, aging summary

### Reports
- 7 tabs (Transaction, Vendor, Commission, Client, Treasury, PSP, Financial), CSV export

### Daily Email Reports
- Gmail SMTP, configurable recipients, APScheduler

### Live FX Rates
- Real-time from ExchangeRate-API (open.er-api.com), 1-hour cache, dashboard ticker

### Broker Commission
- Global configurable rates for deposits/withdrawals in Settings

### Reconciliation Module (Scaffold)
- Bank/Treasury, PSP, Client, Vendor reconciliation views

## Key API Endpoints

### Currency Conversion (NEW - Feb 25)
- `convert_currency(amount, from_currency, to_currency)` - Converts between any two currencies via USD intermediate

### Reserve Fund Endpoints
- `GET /api/psps/{psp_id}/reserve-funds` - Get reserve fund ledger for a PSP
- `POST /api/psps/reserve-funds/{txId}/release` - Release single reserve fund (with currency conversion)
- `POST /api/psps/reserve-funds/bulk-release` - Bulk release reserve funds (with currency conversion)
- `GET /api/psps/reserve-funds/global-summary` - Global reserve fund stats

### PSP Settlement Endpoints (Updated - Feb 25)
- `POST /api/psp/transactions/{id}/settle` - Immediate settle with currency conversion
- `POST /api/psp/transactions/{id}/record-payment` - Record payment with currency conversion
- `POST /api/psp-settlements/{id}/complete` - Complete batch settlement with currency conversion

### FX & Commission
- `GET /api/fx-rates` - Live exchange rates
- `GET/PUT /api/settings/commission` - Commission settings

### Settlement Statement
- `GET /api/settlements/{id}/statement` - Full settlement statement with transactions

## Test Credentials
- **Admin**: admin@fxbroker.com / password
- **Vendor**: vendor1@fxbroker.com / password

## Known Issues
- P2: Minor session management redirect issue after login

## Future/Backlog
- P1: Complete Reconciliation Module (CSV/Excel upload + auto-matching)
- P2: Fix session management redirect issue
- P2: Refactor server.py monolith into APIRouter modules
