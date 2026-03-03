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

### Date: Mar 4, 2026

**P0 Bug Fix - Daily Report:**
- Fixed incorrect DB query in `send_dealing_pnl_email` (`type: 'email_settings'` -> `setting_type: 'email'`)
- Both daily report endpoints verified working: `/settings/email/send-daily-report` and `/reports/send-now`
- Daily report successfully sent to 7209safvan@gmail.com

---

## New API Endpoints

### Reconciliation Endpoints
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

### Report Endpoints
```
POST /api/settings/email/send-daily-report - Manual trigger daily report
POST /api/reports/send-now                 - Manual trigger daily report (alt)
GET  /api/reports/email-logs               - Email send history
```

---

## Database Collections (New)

```
reconciliation_items       - Items pending/completed reconciliation
reconciliation_history     - Audit trail of all actions
reconciliation_adjustments - Adjustment entries
reconciliation_entries     - Uploaded bank statement entries
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
