# Miles Capitals FX Broker Back-Office System - PRD

## Original Problem Statement
Build a comprehensive back-office accounting software for an FX broker named "Miles Capitals" with modules for Client Management, Transactions, Exchangers, Income & Expenses, Treasury, Loans, LP Management, Dealing P&L, RBAC, Reporting, and **Reconciliation**.

## What's Been Implemented

### Date: Mar 3, 2026

**Comprehensive Manual Reconciliation System:**

1. **Daily Reconciliation Dashboard**
   - Today's pending items view
   - Quick reconcile single items
   - Bulk reconcile multiple items with checkboxes
   - Real-time stats: Total, Reconciled, Pending, Flagged
   - "Select All Pending" feature

2. **Bank Statement Reconciliation**
   - Upload support: CSV, Excel (.xlsx, .xls), **PDF** (using pdfplumber)
   - Treasury account selection
   - Recent uploads history
   - Batch details view with matching status

3. **PSP Reconciliation**
   - Variance calculation between records and settlements
   - Auto-match by reference
   - Manual override capability

4. **Client Reconciliation**
   - Balance discrepancy tracking
   - Manual adjustment entries

5. **Exchanger Reconciliation**
   - Bank vs Cash balance comparison
   - Settlement approval workflow

6. **General Manual Actions**
   - Flag for Review (with reason)
   - Create Adjustment Entry (with treasury account link)
   - Bulk Reconcile selected items
   - Export Unmatched Items (JSON)
   - Full Audit Trail/History

7. **Daily Report Integration**
   - Reconciliation summary added to daily email report
   - Shows: Reconciled, Pending, Flagged counts
   - Category breakdown (Bank, PSP, Transaction, etc.)
   - Items requiring attention

**Other Fixes:**
- Super Admin role removed (safvan -> Admin)
- Delete action added to permission system
- Admin role updated to Level 100 with full permissions (102 total)
- Delete buttons added to: Treasury, PSP, Vendors, Loans, Income/Expenses
- Fixed daily report manual trigger (wrong DB query)

### Date: Mar 4, 2026

**Admin Impersonation Feature (COMPLETE):**

1. **Backend Endpoints:**
   - `POST /api/admin/impersonate/{user_id}` - Start impersonation, generates JWT for target user
   - `POST /api/admin/stop-impersonate` - End impersonation, logs logout time
   - `GET /api/admin/impersonation-logs` - Full audit trail of all impersonation activity

2. **Security:**
   - Only Admin role can impersonate (403 for non-admins)
   - Cannot impersonate another Admin (403)
   - Cannot impersonate inactive users (400)
   - IP address logged for every impersonation
   - Activity logged in system_logs collection

3. **Frontend - Settings > Users Tab:**
   - "Login as User" button in dropdown for each non-admin user
   - Confirmation dialog before impersonation
   - Role-based redirect after impersonation (vendor -> /vendor-portal, sub_admin -> /clients, etc.)

4. **Frontend - Impersonation Banner (Layout):**
   - Red sticky banner at top of page showing "You are impersonating [User Name]"
   - Shows admin name who initiated the impersonation
   - "Return to Admin" button restores original admin session securely

5. **Secure Token Management:**
   - Admin token saved in sessionStorage (survives page navigation, cleared on tab close)
   - Impersonated user token in localStorage
   - On "Return to Admin", admin token restored and user profile reloaded

6. **Database:**
   - `impersonation_logs` collection: log_id, admin_id, admin_name, user_id, user_name, login_time, logout_time, ip_address, status

---

## API Endpoints

### Reconciliation
```
GET  /api/reconciliation/daily           - Get today's pending items
POST /api/reconciliation/quick-reconcile - Reconcile single item
POST /api/reconciliation/bulk-reconcile  - Bulk reconcile items
POST /api/reconciliation/flag            - Flag item for review
POST /api/reconciliation/adjustment      - Create adjustment entry
GET  /api/reconciliation/history         - Audit trail
GET  /api/reconciliation/flagged         - Get flagged items
GET  /api/reconciliation/export-unmatched- Export unmatched items
POST /api/reconciliation/write-off       - Write off small variance
GET  /api/reconciliation/daily-summary   - Summary for reports
POST /api/reconciliation/bank/upload     - Upload bank statement (CSV/Excel/PDF)
```

### Admin Impersonation
```
POST /api/admin/impersonate/{user_id}    - Start impersonation
POST /api/admin/stop-impersonate         - End impersonation session
GET  /api/admin/impersonation-logs       - Audit trail of impersonations
```

### Reports
```
POST /api/settings/email/send-daily-report - Manual trigger daily report
POST /api/reports/send-now                 - Manual trigger daily report (alt)
GET  /api/reports/email-logs               - Email send history
```

---

## Database Collections
```
reconciliation_items       - Items pending/completed reconciliation
reconciliation_history     - Audit trail of all actions
reconciliation_adjustments - Adjustment entries
reconciliation_entries     - Uploaded bank statement entries
impersonation_logs         - Admin impersonation audit trail
```

---

## Current Roles
| Role | Level | Permissions |
|------|-------|-------------|
| Admin | 100 | 102 (full access with delete) |
| Accountant | 70 | 47 |
| Sub Admin | 50 | 9 |
| Exchanger | 20 | 5 |
| Viewer | 10 | 4 |

---

## Test Credentials
- **Admin:** admin@fxbroker.com / admin123
- **Accountant:** admin3@fxbroker.com / admin123
- **Exchanger:** kenway@fxbroker.com / password

---

## Prioritized Backlog

### P1 - High Priority
- [ ] Comprehensive E2E test run of entire application
- [ ] Reconciliation System Phase 2 & 3 (PSP, Client, Exchanger enhancements)
- [ ] Complete backend RBAC migration (replace old decorators with `require_permission`)
- [ ] Implement frontend permission gates (conditional UI based on permissions)

### P2 - Medium Priority
- [ ] Add more reconciliation matching rules
- [ ] Auto-match bank statement entries with treasury transactions
- [ ] PSP settlement report upload
- [ ] Investigate withdrawal creation to Exchanger error
- [ ] Fix session management redirect bug

### P3 - Low Priority
- [ ] Refactor `backend/server.py` into modular routers
- [ ] Clean up migration endpoints

---

## 3rd Party Integrations
- MongoDB Atlas (database)
- Gmail SMTP (email dispatch)
- ExchangeRate-API (currency conversion)
- APScheduler (daily email automation)
- pdfplumber (PDF parsing for bank statements)
