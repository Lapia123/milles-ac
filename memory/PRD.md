# FX Broker Back-Office Accounting System - PRD

## Original Problem Statement
Build account software for FX broker - a back-office accounting system with admin, sub-admin, and accountant roles.

## Latest Update (2026-02-19)
New features added:
1. Math captcha (addition only) for approve/reject transactions
2. MT5 Number and CRM Customer ID fields for clients
3. Multi-currency support with USD final balance conversion

## User Personas
1. **Admin** - Full system access
2. **Sub-Admin** - Can manage clients and transactions
3. **Accountant** - Can approve/reject pending transactions

## Core Features
- Client management (with MT5 Number, CRM Customer ID)
- Transaction ledger with proof of payment upload
- Multi-currency transactions (AED, EUR, GBP, etc.) converted to USD
- Treasury/Bank account management with USD equivalent display
- Transaction approval workflow with math captcha security
- Basic + Advanced Reporting

## Exchange Rates (to USD)
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
- MT5 Number (new)
- CRM Customer ID (new)
- KYC Status, Notes

### Transaction Fields
- Client selection (direct, not trading account)
- Transaction type, Amount in USD
- Base Currency (AED, EUR, etc.)
- Base Amount (original currency amount)
- Destination Bank/Treasury
- Proof of Payment (image upload)
- Reference, Description

### Treasury Fields
- Account Name, Bank Name
- Currency (USD, EUR, GBP, AED, etc.)
- Balance (in original currency)
- Balance USD (converted equivalent)
- Account Number, Routing, SWIFT

### Security
- Math Captcha for approve/reject (addition only: 1+2=?)
- JWT + Google OAuth authentication

## Demo Credentials
- Admin: admin@fxbroker.com / admin123
- Accountant: accountant@fxbroker.com / accountant123

## Prioritized Backlog

### P1 (Next Phase)
- [ ] Live exchange rate API integration
- [ ] Email notifications for approvals
- [ ] KYC document upload
- [ ] Audit log

### P2 (Future)
- [ ] Export reports to PDF/Excel
- [ ] Two-factor authentication
- [ ] MT5 API integration
