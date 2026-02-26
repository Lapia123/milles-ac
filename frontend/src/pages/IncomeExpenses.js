import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp, TrendingDown, Plus, DollarSign, Calendar,
  Filter, Trash2, BarChart3, ArrowUpRight, ArrowDownRight,
  Wallet, X, Store, ArrowRightLeft, Clock, Search, Building2,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const incomeCategories = [
  { value: 'commission', label: 'Commission Income' },
  { value: 'service_fee', label: 'Service Fees' },
  { value: 'interest', label: 'Interest Income' },
  { value: 'other', label: 'Other Income' },
];

const expenseCategories = [
  { value: 'bank_fee', label: 'Bank Fees' },
  { value: 'transfer_charge', label: 'Transfer Charges' },
  { value: 'vendor_payment', label: 'Exchanger Payments' },
  { value: 'operational', label: 'Operational Costs' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'software', label: 'Software/Subscriptions' },
  { value: 'other', label: 'Other Expenses' },
];

const currencies = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR', 'JPY', 'USDT'];

export default function IncomeExpenses() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [vendors, setExchangers] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [summary, setSummary] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [convertDialog, setConvertDialog] = useState({ open: false, entry: null });
  const [convertForm, setConvertForm] = useState({ borrower_name: '', interest_rate: 0, due_date: '', notes: '' });
  const [borrowerSearch, setBorrowerSearch] = useState('');
  const [showAddBorrower, setShowAddBorrower] = useState(false);

  const [filters, setFilters] = useState({ startDate: '', endDate: '', category: '', treasuryAccountId: '' });

  const [formData, setFormData] = useState({
    entry_type: 'income', category: '', custom_category: '', amount: '',
    currency: 'USD', treasury_account_id: '', vendor_id: '',
    vendor_bank_account_name: '', vendor_bank_account_number: '',
    vendor_bank_ifsc: '', vendor_bank_branch: '',
    description: '', reference: '', date: new Date().toISOString().split('T')[0],
  });

  const isAdmin = user?.role === 'admin';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };

  const fetchEntries = useCallback(async () => {
    try {
      let url = `${API_URL}/api/income-expenses?limit=200`;
      if (activeTab !== 'all' && activeTab !== 'reports') url += `&entry_type=${activeTab}`;
      if (filters.startDate) url += `&start_date=${filters.startDate}`;
      if (filters.endDate) url += `&end_date=${filters.endDate}`;
      if (filters.category) url += `&category=${filters.category}`;
      if (filters.treasuryAccountId) url += `&treasury_account_id=${filters.treasuryAccountId}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (response.ok) setEntries(await response.json());
    } catch { toast.error('Failed to load entries'); }
    finally { setLoading(false); }
  }, [activeTab, filters]);

  const fetchTreasuryAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/treasury`, { headers: getAuthHeaders() });
      if (response.ok) {
        const accounts = await response.json();
        setTreasuryAccounts(accounts.filter(a => a.status === 'active'));
      }
    } catch {}
  };

  const fetchExchangers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/vendors`, { headers: getAuthHeaders() });
      if (response.ok) setExchangers(await response.json());
    } catch {}
  };

  const fetchBorrowers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/loans/borrowers`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setBorrowers(data.borrowers || []);
      }
    } catch {}
  };

  const fetchSummary = async () => {
    try {
      let url = `${API_URL}/api/income-expenses/reports/summary`;
      const params = [];
      if (filters.startDate) params.push(`start_date=${filters.startDate}`);
      if (filters.endDate) params.push(`end_date=${filters.endDate}`);
      if (params.length) url += `?${params.join('&')}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (response.ok) setSummary(await response.json());
    } catch {}
  };

  const fetchMonthlyData = async () => {
    try {
      const year = new Date().getFullYear();
      const response = await fetch(`${API_URL}/api/income-expenses/reports/monthly?year=${year}`, { headers: getAuthHeaders() });
      if (response.ok) setMonthlyData(await response.json());
    } catch {}
  };

  useEffect(() => { fetchEntries(); fetchTreasuryAccounts(); fetchExchangers(); fetchBorrowers(); fetchSummary(); fetchMonthlyData(); }, []);
  useEffect(() => { fetchEntries(); fetchSummary(); }, [fetchEntries]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category) { toast.error('Please select a category'); return; }
    if (!formData.amount || parseFloat(formData.amount) <= 0) { toast.error('Please enter a valid amount'); return; }
    if (!formData.treasury_account_id && !formData.vendor_id) { toast.error('Please select an account or vendor'); return; }

    try {
      const payload = { ...formData, amount: parseFloat(formData.amount) };
      if (!payload.vendor_id) {
        delete payload.vendor_id;
        delete payload.vendor_bank_account_name;
        delete payload.vendor_bank_account_number;
        delete payload.vendor_bank_ifsc;
        delete payload.vendor_bank_branch;
      } else {
        // When vendor is selected, clear treasury_account_id
        delete payload.treasury_account_id;
      }
      const response = await fetch(`${API_URL}/api/income-expenses`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload),
      });
      if (response.ok) {
        const msg = formData.vendor_id
          ? `${formData.entry_type === 'income' ? 'Income' : 'Expense'} sent to vendor for approval`
          : `${formData.entry_type === 'income' ? 'Income' : 'Expense'} recorded successfully`;
        toast.success(msg);
        setIsDialogOpen(false); resetForm(); fetchEntries(); fetchSummary(); fetchTreasuryAccounts();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save entry');
      }
    } catch { toast.error('Failed to save entry'); }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Delete this entry? This will reverse the treasury balance change.')) return;
    try {
      const response = await fetch(`${API_URL}/api/income-expenses/${entryId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (response.ok) { toast.success('Entry deleted'); fetchEntries(); fetchSummary(); fetchTreasuryAccounts(); }
      else { const err = await response.json(); toast.error(err.detail || 'Delete failed'); }
    } catch { toast.error('Delete failed'); }
  };

  const handleConvertToLoan = async () => {
    if (!convertForm.borrower_name || !convertForm.due_date) {
      toast.error('Please fill borrower name and due date'); return;
    }
    try {
      const response = await fetch(`${API_URL}/api/income-expenses/${convertDialog.entry.entry_id}/convert-to-loan`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(convertForm),
      });
      if (response.ok) {
        toast.success('Expense converted to loan successfully');
        setConvertDialog({ open: false, entry: null });
        setConvertForm({ borrower_name: '', interest_rate: 0, due_date: '', notes: '' });
        setBorrowerSearch('');
        setShowAddBorrower(false);
        fetchEntries(); fetchSummary(); fetchBorrowers();
      } else {
        const err = await response.json();
        toast.error(err.detail || 'Conversion failed');
      }
    } catch { toast.error('Conversion failed'); }
  };

  const resetForm = () => {
    setFormData({
      entry_type: 'income', category: '', custom_category: '', amount: '',
      currency: 'USD', treasury_account_id: '', vendor_id: '',
      vendor_bank_account_name: '', vendor_bank_account_number: '',
      vendor_bank_ifsc: '', vendor_bank_branch: '',
      description: '', reference: '', date: new Date().toISOString().split('T')[0],
    });
  };

  const clearFilters = () => setFilters({ startDate: '', endDate: '', category: '', treasuryAccountId: '' });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getCategoryLabel = (category, customCategory) => {
    if (customCategory) return customCategory;
    const allCats = [...incomeCategories, ...expenseCategories];
    const found = allCats.find(c => c.value === category);
    return found ? found.label : category;
  };

  const currentCategories = formData.entry_type === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="income-expenses-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-slate-800" style={{ fontFamily: 'Barlow Condensed' }}>Income & Expenses</h1>
          <p className="text-slate-500">Track and manage your business income and expenses</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan" data-testid="add-entry-btn">
          <Plus className="w-4 h-4 mr-2" /> Add Entry
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Income</p>
                  <p className="text-3xl font-bold font-mono text-green-400">${summary.total_income_usd?.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-sm"><TrendingUp className="w-6 h-6 text-green-400" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Expenses</p>
                  <p className="text-3xl font-bold font-mono text-red-400">${summary.total_expense_usd?.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-sm"><TrendingDown className="w-6 h-6 text-red-400" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Net Profit/Loss</p>
                  <p className={`text-3xl font-bold font-mono ${summary.net_profit_usd >= 0 ? 'text-blue-600' : 'text-red-400'}`}>${summary.net_profit_usd?.toLocaleString()}</p>
                </div>
                <div className={`p-3 rounded-sm ${summary.net_profit_usd >= 0 ? 'bg-blue-100' : 'bg-red-500/10'}`}>
                  <DollarSign className={`w-6 h-6 ${summary.net_profit_usd >= 0 ? 'text-blue-600' : 'text-red-400'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="all" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600">All Entries</TabsTrigger>
          <TabsTrigger value="income" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Income</TabsTrigger>
          <TabsTrigger value="expense" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">Expenses</TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600">Reports</TabsTrigger>
        </TabsList>

        {/* Filters */}
        {activeTab !== 'reports' && (
          <Card className="bg-white border-slate-200 mt-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[150px] space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Start Date</Label>
                  <Input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]" />
                </div>
                <div className="flex-1 min-w-[150px] space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">End Date</Label>
                  <Input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]" />
                </div>
                <div className="flex-1 min-w-[150px] space-y-1">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Treasury Account</Label>
                  <Select value={filters.treasuryAccountId} onValueChange={(value) => setFilters({ ...filters, treasuryAccountId: value === 'all' ? '' : value })}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800"><SelectValue placeholder="All Accounts" /></SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="all" className="text-slate-800 hover:bg-slate-100">All Accounts</SelectItem>
                      {treasuryAccounts.map((acc) => (
                        <SelectItem key={acc.account_id} value={acc.account_id} className="text-slate-800 hover:bg-slate-100">{acc.account_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={clearFilters} className="border-slate-200 text-slate-500 hover:bg-slate-100"><X className="w-4 h-4 mr-2" />Clear</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {['all', 'income', 'expense'].map(tabVal => (
          <TabsContent key={tabVal} value={tabVal} className="mt-4">
            <EntriesTable entries={entries} loading={loading} onDelete={handleDelete} isAdmin={isAdmin}
              formatDate={formatDate} getCategoryLabel={getCategoryLabel}
              onConvertToLoan={(entry) => { setConvertDialog({ open: true, entry }); setConvertForm({ ...convertForm, borrower_name: entry.description || '', treasury_account_id: entry.treasury_account_id || '' }); }} />
          </TabsContent>
        ))}

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4 space-y-6">
          {summary && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white border-slate-200">
                <CardHeader><CardTitle className="text-lg text-slate-800 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-400" />Income by Category</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(summary.income_by_category || {}).map(([cat, amount]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-slate-500 capitalize">{cat.replace('_', ' ')}</span>
                        <span className="text-green-400 font-mono">${amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {Object.keys(summary.income_by_category || {}).length === 0 && <p className="text-slate-500 text-sm">No income recorded</p>}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardHeader><CardTitle className="text-lg text-slate-800 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-red-400" />Expenses by Category</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(summary.expense_by_category || {}).map(([cat, amount]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-slate-500 capitalize">{cat.replace('_', ' ')}</span>
                        <span className="text-red-400 font-mono">${amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {Object.keys(summary.expense_by_category || {}).length === 0 && <p className="text-slate-500 text-sm">No expenses recorded</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <Card className="bg-white border-slate-200">
            <CardHeader><CardTitle className="text-lg text-slate-800 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-600" />Monthly P&L ({new Date().getFullYear()})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-transparent">
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Month</TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Income</TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Expenses</TableHead>
                      <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.map((row) => (
                      <TableRow key={row.month} className="border-slate-200 hover:bg-slate-100">
                        <TableCell className="text-slate-800">{row.month}</TableCell>
                        <TableCell className="text-green-400 font-mono text-right">${row.income.toLocaleString()}</TableCell>
                        <TableCell className="text-red-400 font-mono text-right">${row.expense.toLocaleString()}</TableCell>
                        <TableCell className={`font-mono text-right ${row.net >= 0 ? 'text-blue-600' : 'text-red-400'}`}>${row.net.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Entry Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              Add {formData.entry_type === 'income' ? 'Income' : 'Expense'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Entry Type Toggle */}
            <div className="flex gap-2">
              <Button type="button" variant={formData.entry_type === 'income' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, entry_type: 'income', category: '' })}
                className={formData.entry_type === 'income' ? 'bg-green-500 hover:bg-green-600 text-slate-800 flex-1' : 'border-slate-200 text-slate-500 hover:bg-slate-100 flex-1'}
                data-testid="toggle-income">
                <TrendingUp className="w-4 h-4 mr-2" />Income
              </Button>
              <Button type="button" variant={formData.entry_type === 'expense' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, entry_type: 'expense', category: '' })}
                className={formData.entry_type === 'expense' ? 'bg-red-500 hover:bg-red-600 text-slate-800 flex-1' : 'border-slate-200 text-slate-500 hover:bg-slate-100 flex-1'}
                data-testid="toggle-expense">
                <TrendingDown className="w-4 h-4 mr-2" />Expense
              </Button>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800" data-testid="entry-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {currentCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-slate-800 hover:bg-slate-100">{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.category === 'other' && (
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Custom Category</Label>
                <Input value={formData.custom_category} onChange={(e) => setFormData({ ...formData, custom_category: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]" placeholder="Enter custom category name" />
              </div>
            )}

            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Amount *</Label>
                <Input type="number" step="0.01" min="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] font-mono" placeholder="0.00" data-testid="entry-amount" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Currency</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {currencies.map((cur) => (<SelectItem key={cur} value={cur} className="text-slate-800 hover:bg-slate-100">{cur}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Account / Exchanger Selection */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">
                {formData.entry_type === 'income' ? 'Credit to Account / Exchanger *' : 'Deduct from Account / Exchanger *'}
              </Label>
              <Select value={formData.vendor_id ? `vendor_${formData.vendor_id}` : formData.treasury_account_id}
                onValueChange={(value) => {
                  if (value.startsWith('vendor_')) {
                    setFormData({ ...formData, vendor_id: value.replace('vendor_', ''), treasury_account_id: '' });
                  } else {
                    setFormData({ ...formData, treasury_account_id: value, vendor_id: '', vendor_bank_account_name: '', vendor_bank_account_number: '', vendor_bank_ifsc: '', vendor_bank_branch: '' });
                  }
                }}>
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800" data-testid="entry-account">
                  <SelectValue placeholder="Select account or vendor" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <div className="px-2 py-1 text-xs text-blue-600 font-semibold uppercase tracking-wider">Treasury Accounts</div>
                  {treasuryAccounts.map((acc) => (
                    <SelectItem key={acc.account_id} value={acc.account_id} className="text-slate-800 hover:bg-slate-100">
                      {acc.account_name} ({acc.balance?.toLocaleString()} {acc.currency})
                    </SelectItem>
                  ))}
                  {vendors.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-amber-400 font-semibold uppercase tracking-wider mt-2 border-t border-slate-200 pt-2">Exchangers (Requires Approval)</div>
                      {vendors.map((v) => (
                        <SelectItem key={v.vendor_id} value={`vendor_${v.vendor_id}`} className="text-slate-800 hover:bg-slate-100">
                          <span className="flex items-center gap-2"><Store className="w-3 h-3 text-amber-400" />{v.vendor_name}</span>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Exchanger Bank Account (when vendor selected) */}
            {formData.vendor_id && (
              <>
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400">
                  <Clock className="w-3 h-3 inline mr-1" /> This entry will be sent to vendor for approval before treasury is updated
                </div>
                <div className="space-y-3 p-3 bg-slate-50/50 border border-slate-200 rounded">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Exchanger Bank Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-[10px] uppercase">Account Holder Name</Label>
                      <Input value={formData.vendor_bank_account_name} onChange={(e) => setFormData({ ...formData, vendor_bank_account_name: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] h-8 text-sm" placeholder="Name" data-testid="vendor-bank-name" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-[10px] uppercase">Account Number</Label>
                      <Input value={formData.vendor_bank_account_number} onChange={(e) => setFormData({ ...formData, vendor_bank_account_number: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] h-8 text-sm" placeholder="Account number" data-testid="vendor-bank-number" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-[10px] uppercase">IFSC Code</Label>
                      <Input value={formData.vendor_bank_ifsc} onChange={(e) => setFormData({ ...formData, vendor_bank_ifsc: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] h-8 text-sm" placeholder="IFSC code" data-testid="vendor-bank-ifsc" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-slate-400 text-[10px] uppercase">Branch</Label>
                      <Input value={formData.vendor_bank_branch} onChange={(e) => setFormData({ ...formData, vendor_bank_branch: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] h-8 text-sm" placeholder="Branch name" data-testid="vendor-bank-branch" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">Date</Label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]" rows={2} placeholder="Enter description..." />
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label className="text-slate-500 text-xs uppercase tracking-wider">Reference / Invoice #</Label>
              <Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]" placeholder="INV-001, REF-123, etc." />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }} className="border-slate-200 text-slate-500 hover:bg-slate-100">Cancel</Button>
              <Button type="submit" className={formData.entry_type === 'income' ? 'bg-green-500 hover:bg-green-600 text-slate-800 font-bold uppercase tracking-wider' : 'bg-red-500 hover:bg-red-600 text-slate-800 font-bold uppercase tracking-wider'} data-testid="save-entry-btn">
                {formData.vendor_id ? 'Send for Approval' : `Save ${formData.entry_type === 'income' ? 'Income' : 'Expense'}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Convert to Loan Dialog */}
      <Dialog open={convertDialog.open} onOpenChange={(open) => { 
        if (!open) {
          setConvertDialog({ open: false, entry: null });
          setBorrowerSearch('');
          setShowAddBorrower(false);
        }
      }}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" /> Convert Expense to Loan
            </DialogTitle>
          </DialogHeader>
          {convertDialog.entry && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="text-xs text-slate-400">Expense Amount</p>
                <p className="text-lg font-mono text-red-400">{convertDialog.entry.amount?.toLocaleString()} {convertDialog.entry.currency}</p>
                <p className="text-xs text-slate-400 mt-1">{convertDialog.entry.description}</p>
              </div>
              
              {/* Borrower Company Searchable Dropdown */}
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> Borrower Company *
                </Label>
                {!showAddBorrower ? (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        value={borrowerSearch} 
                        onChange={(e) => setBorrowerSearch(e.target.value)}
                        className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] pl-9" 
                        placeholder="Search or select borrower..."
                        data-testid="convert-borrower-search"
                      />
                    </div>
                    {(borrowerSearch || borrowers.length > 0) && (
                      <div className="absolute z-50 w-full mt-1 bg-slate-50 border border-slate-200 rounded-md max-h-40 overflow-y-auto">
                        {/* Add New Option */}
                        <div 
                          className="px-3 py-2 cursor-pointer hover:bg-blue-100 text-blue-600 flex items-center gap-2 border-b border-slate-200"
                          onClick={() => {
                            setShowAddBorrower(true);
                            setConvertForm({ ...convertForm, borrower_name: borrowerSearch });
                          }}
                        >
                          <Plus className="w-4 h-4" /> Add new: "{borrowerSearch || 'New Company'}"
                        </div>
                        {/* Existing Borrowers */}
                        {borrowers
                          .filter(b => b.toLowerCase().includes(borrowerSearch.toLowerCase()))
                          .map((borrower, idx) => (
                            <div 
                              key={idx}
                              className={`px-3 py-2 cursor-pointer hover:bg-slate-100 text-slate-800 ${convertForm.borrower_name === borrower ? 'bg-blue-100' : ''}`}
                              onClick={() => {
                                setConvertForm({ ...convertForm, borrower_name: borrower });
                                setBorrowerSearch(borrower);
                                setShowAddBorrower(true);
                              }}
                            >
                              <Building2 className="w-3 h-3 inline mr-2 text-slate-400" />{borrower}
                            </div>
                          ))
                        }
                        {borrowers.filter(b => b.toLowerCase().includes(borrowerSearch.toLowerCase())).length === 0 && !borrowerSearch && (
                          <div className="px-3 py-2 text-slate-400 text-sm">No existing borrowers</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input 
                      value={convertForm.borrower_name} 
                      onChange={(e) => setConvertForm({ ...convertForm, borrower_name: e.target.value })} 
                      className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1] flex-1" 
                      placeholder="Company name" 
                      data-testid="convert-borrower"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => { setShowAddBorrower(false); setBorrowerSearch(''); setConvertForm({ ...convertForm, borrower_name: '' }); }}
                      className="text-slate-400 hover:text-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Interest Rate (%)</Label>
                  <Input type="number" step="0.01" value={convertForm.interest_rate} onChange={(e) => setConvertForm({ ...convertForm, interest_rate: parseFloat(e.target.value) || 0 })} className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase tracking-wider">Due Date *</Label>
                  <Input type="date" value={convertForm.due_date} onChange={(e) => setConvertForm({ ...convertForm, due_date: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]" data-testid="convert-due-date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-500 text-xs uppercase tracking-wider">Notes</Label>
                <Textarea value={convertForm.notes} onChange={(e) => setConvertForm({ ...convertForm, notes: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-800 focus:border-[#66FCF1]" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setConvertDialog({ open: false, entry: null }); setBorrowerSearch(''); setShowAddBorrower(false); }} className="border-slate-200 text-slate-500 hover:bg-slate-100">Cancel</Button>
                <Button onClick={handleConvertToLoan} className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold" data-testid="confirm-convert-btn">Convert to Loan</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Entries Table Component with visual distinction & convert-to-loan
function EntriesTable({ entries, loading, onDelete, isAdmin, formatDate, getCategoryLabel, onConvertToLoan }) {
  if (loading) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="p-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }
  if (entries.length === 0) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="p-12 text-center">
          <Wallet className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-500">No entries found</p>
          <p className="text-sm text-slate-500/60 mt-2">Click "Add Entry" to record income or expenses</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (entry) => {
    if (entry.converted_to_loan) return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">Loan</Badge>;
    if (entry.status === 'pending_vendor') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]"><Clock className="w-2.5 h-2.5 mr-1" />Pending</Badge>;
    if (entry.status === 'rejected') return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Rejected</Badge>;
    return null;
  };

  return (
    <Card className="bg-white border-slate-200">
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200 hover:bg-transparent">
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Date</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Type</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Category</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Description</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Account / Exchanger</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs">Status</TableHead>
                <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs text-right">Amount</TableHead>
                {isAdmin && <TableHead className="text-slate-500 font-bold uppercase tracking-wider text-xs w-24">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const isIncome = entry.entry_type === 'income';
                const borderColor = isIncome ? 'border-l-green-500' : 'border-l-red-500';
                const isConverted = entry.converted_to_loan;
                return (
                  <TableRow key={entry.entry_id} className={`border-slate-200 hover:bg-slate-100 border-l-4 ${borderColor} ${isConverted ? 'opacity-50' : ''}`} data-testid={`entry-row-${entry.entry_id}`}>
                    <TableCell className="text-slate-800 text-sm">{formatDate(entry.date)}</TableCell>
                    <TableCell>
                      <Badge className={isIncome ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                        {isIncome ? <><ArrowDownRight className="w-3 h-3 mr-1" /> Income</> : <><ArrowUpRight className="w-3 h-3 mr-1" /> Expense</>}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{getCategoryLabel(entry.category, entry.custom_category)}</TableCell>
                    <TableCell className="text-slate-800 text-sm max-w-[200px] truncate">{entry.description || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {entry.vendor_name ? (
                        <div>
                          <span className="flex items-center gap-1 text-amber-400"><Store className="w-3 h-3" />{entry.vendor_name}</span>
                          {entry.vendor_bank_account_number && <p className="text-[10px] text-slate-400 mt-0.5">A/C: {entry.vendor_bank_account_number}</p>}
                          {entry.vendor_bank_ifsc && <p className="text-[10px] text-slate-400">IFSC: {entry.vendor_bank_ifsc}</p>}
                          {entry.vendor_bank_branch && <p className="text-[10px] text-slate-400">Branch: {entry.vendor_bank_branch}</p>}
                          {entry.vendor_bank_account_name && <p className="text-[10px] text-slate-400">Name: {entry.vendor_bank_account_name}</p>}
                          {/* Legacy single field fallback */}
                          {entry.vendor_bank_account && !entry.vendor_bank_account_number && <p className="text-[10px] text-slate-400 mt-0.5">{entry.vendor_bank_account}</p>}
                        </div>
                      ) : (
                        <span className="text-blue-600">{entry.treasury_account_name || '-'}</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(entry)}</TableCell>
                    <TableCell className={`font-mono text-right ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                      {isIncome ? '+' : '-'}{entry.amount?.toLocaleString()} {entry.currency}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1">
                          {!isIncome && !isConverted && entry.status !== 'pending_vendor' && (
                            <Button variant="ghost" size="sm" onClick={() => onConvertToLoan(entry)} className="text-blue-600 hover:text-[#45A29E] hover:bg-blue-100 text-xs h-7 px-2" title="Convert to Loan" data-testid={`convert-loan-${entry.entry_id}`}>
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => onDelete(entry.entry_id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2" data-testid={`delete-entry-${entry.entry_id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
