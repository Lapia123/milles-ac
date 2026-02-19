# FX Broker Back-Office Accounting System - PRD

## Original Problem Statement
Build account software for FX broker - a back-office accounting system with admin, sub-admin, and accountant roles for managing client accounts, transactions, treasury/bank accounts, and reporting.

## Latest Update (2026-02-19)
Major changes per user request:
1. Removed Trading Accounts feature
2. Transactions now directly linked to Clients (not trading accounts)
3. Added proof of payment upload and destination bank selection in transactions
4. Added Accountant Dashboard for approving/rejecting transactions
5. Added Treasury page for bank account management

## User Personas
1. **Admin** - Full system access, user management, treasury management, all operations
2. **Sub-Admin** - Can manage clients and transactions, limited settings access
3. **Accountant** - Can approve/reject pending transactions, view treasury

## Core Features
- Client account management (registration, KYC status)
- Transaction ledger (deposits, withdrawals with proof of payment)
- Treasury/Bank account management
- Transaction approval workflow (Accountant/Admin)
- Basic + Advanced Reporting
- Authentication (JWT + Google OAuth)

## Architecture
- **Frontend**: React 19 with Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI with async MongoDB
- **Database**: MongoDB
- **Auth**: JWT + Emergent Google OAuth

## What's Implemented

### Backend
- [x] User auth (JWT + Google OAuth)
- [x] User management with 3 roles (admin, sub_admin, accountant)
- [x] Client management API
- [x] Treasury/Bank accounts API
- [x] Transactions API with client selection and proof upload
- [x] Transaction approval/rejection workflow
- [x] Reports API

### Frontend Pages
- [x] Login (email/password + Google OAuth)
- [x] Dashboard (stats, charts, recent activity)
- [x] Clients (CRUD, KYC status)
- [x] Transactions (client selection, destination bank, proof upload)
- [x] Treasury (bank account management)
- [x] Approvals (accountant dashboard for approve/reject)
- [x] Reports (P&L, analytics)
- [x] Settings (user management)

## Demo Credentials
- Admin: admin@fxbroker.com / admin123
- Accountant: accountant@fxbroker.com / accountant123

## Prioritized Backlog

### P1 (Next Phase)
- [ ] Email notifications for transaction approvals/rejections
- [ ] Document upload for KYC verification
- [ ] Transaction history per client view
- [ ] Bulk transaction import

### P2 (Future)
- [ ] Export reports to PDF/Excel
- [ ] Audit log for all actions
- [ ] Two-factor authentication
- [ ] Multi-currency exchange rates
