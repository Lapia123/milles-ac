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
- **Reserve Fund**: Reserve Fund Rate %, per-transaction tracking
- **Per-transaction reserve fund amount**: Stored at creation time
- **New fee fields**: Gateway Fee (per tx), Refund Fee, Monthly Minimum Fee
- Holding & Release Tracking with status badges
- **Reserve Fund Ledger**: Full ledger tab with summary cards
- **Release Tracker**: Status (Held/Due/Released), Days Remaining
- **Single & Bulk Release**: Release reserve funds back to treasury with automatic currency conversion
- **Currency Conversion**: All PSP settlements and reserve fund releases auto-convert to treasury account currency using live FX rates
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

### Audit & Compliance Module (NEW - Feb 25, 2026)
- **Dashboard**: Health score ring (0-100), issue breakdown (Critical/Warning/Info), scan summary, 5 category cards
- **5 Audit Categories**:
  1. Transaction Integrity: Missing fields, completed deposits without proof
  2. FX Rate Verification: Compare stored rates vs market rates (configurable threshold)
  3. PSP Settlement: Net amount math, reserve fund rate consistency, currency conversion checks
  4. Anomaly Detection: Large transactions (configurable threshold), duplicates within 5min, round amounts
  5. Treasury Balance: Cross-check stored vs calculated balances
- **Findings Tab**: Filterable by severity & category, expandable finding cards with details
- **History Tab**: Past scan records with score trends
- **Settings Tab**: Configurable thresholds, automated daily scan toggle, email alerts
- **Automated Daily Scan**: Scheduled via APScheduler, sends email alerts when issues found
- **Admin-only access**: Sidebar nav item and routes restricted to admin role

## Key API Endpoints

### Currency Conversion
- `convert_currency(amount, from_currency, to_currency)` - Converts between any two currencies via USD intermediate

### Audit & Compliance
- `POST /api/audit/run-scan` - Run full audit scan
- `GET /api/audit/latest` - Get most recent scan result
- `GET /api/audit/history` - Get scan history
- `GET /api/audit/settings` - Get audit configuration
- `PUT /api/audit/settings` - Update audit configuration

### Reserve Fund Endpoints
- `GET /api/psps/{psp_id}/reserve-funds` - Reserve fund ledger
- `POST /api/psps/reserve-funds/{txId}/release` - Release single reserve fund (with currency conversion)
- `POST /api/psps/reserve-funds/bulk-release` - Bulk release (with currency conversion)
- `GET /api/psps/reserve-funds/global-summary` - Global reserve fund stats

### PSP Settlement Endpoints
- `POST /api/psp/transactions/{id}/settle` - Immediate settle with currency conversion
- `POST /api/psp/transactions/{id}/record-payment` - Record payment with currency conversion
- `POST /api/psp-settlements/{id}/complete` - Complete batch settlement with currency conversion

## Database Schema (Key Collections)
- **audit_scans**: scan_id, scanned_at, health_score, stats, findings[], summary
- **app_settings** (setting_type: "audit"): large_transaction_threshold, fx_deviation_threshold, auto_scan_enabled, auto_scan_time, alert_emails

## Test Credentials
- **Admin**: admin@fxbroker.com / password
- **Vendor**: vendor3@fxbroker.com / password

## Known Issues
- P2: Minor session management redirect issue after login

## Future/Backlog
- P1: Complete Reconciliation Module (CSV/Excel upload + auto-matching)
- P2: Fix session management redirect issue
- P2: Refactor server.py monolith into APIRouter modules
