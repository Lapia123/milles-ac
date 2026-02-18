# FX Broker Back-Office Accounting System - PRD

## Original Problem Statement
Build account software for FX broker - a back-office accounting system with admin and sub-admin roles for managing client accounts, trading accounts, transaction/ledger tracking, and reporting (basic + advanced including P&L, commissions, and client analytics). Authentication includes both JWT custom auth and Google OAuth.

## User Personas
1. **Admin** - Full system access, user management, all CRUD operations
2. **Sub-Admin** - Limited access, can manage clients, accounts, and transactions but cannot manage users

## Core Requirements
- Client account management (registration, KYC status, profile)
- Trading account management (MT4/MT5 accounts)
- Transaction/ledger tracking (deposits, withdrawals, transfers)
- Basic + Advanced Reporting (P&L, commissions, analytics)
- Authentication (JWT + Google OAuth)
- User management (Admin/Sub-admin roles)

## Architecture
- **Frontend**: React 19 with Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI with async MongoDB (motor)
- **Database**: MongoDB
- **Auth**: JWT tokens + Emergent Google OAuth

## What's Been Implemented (2026-02-18)
### Backend (FastAPI)
- [x] User authentication (JWT + Google OAuth via Emergent)
- [x] User management API (CRUD with role-based access)
- [x] Client management API (CRUD, search, filter by KYC status)
- [x] Trading accounts API (MT4/MT5 accounts, balance tracking)
- [x] Transactions API (deposits, withdrawals, status management)
- [x] Reports API (dashboard stats, transaction summaries, client analytics)
- [x] Demo data seeding endpoint

### Frontend (React)
- [x] Login page with email/password and Google OAuth
- [x] Dashboard with stats cards, charts, and recent activity
- [x] Clients management page with CRUD, search, filter
- [x] Trading Accounts page with account creation
- [x] Transactions ledger with filtering and status updates
- [x] Reports page with P&L, client analytics, geography tabs
- [x] Settings page with user management (admin only)
- [x] Responsive sidebar navigation
- [x] Dark theme "Obsidian Ledger" with neon cyan accents

### Design Theme
- Background: #0B0C10 (Obsidian)
- Surface: #1F2833
- Primary: #66FCF1 (Neon Cyan)
- Fonts: Barlow Condensed (headings), Manrope (body), JetBrains Mono (data)

## Prioritized Backlog

### P0 (Critical)
- All core features implemented ✅

### P1 (High Priority - Next Phase)
- [ ] Actual MT4/MT5 API integration for real trading data
- [ ] Document upload for KYC verification
- [ ] Email notifications for transactions
- [ ] Commission calculation module
- [ ] Client IB (Introducing Broker) relationships

### P2 (Medium Priority)
- [ ] Export reports to PDF/Excel
- [ ] Bulk transaction processing
- [ ] Audit log for all actions
- [ ] Two-factor authentication
- [ ] Multi-currency support with exchange rates

### P3 (Low Priority)
- [ ] Client portal (self-service)
- [ ] Mobile app
- [ ] Advanced charting with historical data
- [ ] Automated KYC verification

## Demo Credentials
- Email: admin@fxbroker.com
- Password: admin123

## API Endpoints
- POST /api/auth/login - JWT login
- POST /api/auth/session - Google OAuth session
- GET /api/auth/me - Current user
- GET/POST /api/clients - Client management
- GET/POST /api/trading-accounts - Account management
- GET/POST /api/transactions - Transaction ledger
- GET /api/reports/dashboard - Dashboard stats
- GET /api/reports/transactions-summary - Transaction charts
- GET /api/reports/client-analytics - Client analytics
- GET/POST /api/users - User management (admin only)
