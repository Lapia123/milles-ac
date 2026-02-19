import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  DollarSign,
  Calendar,
  Filter,
  Trash2,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Building2,
  X,
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
  { value: 'vendor_payment', label: 'Vendor Payments' },
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
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [summary, setSummary] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: '',
    treasuryAccountId: '',
  });
  
  // Form data
  const [formData, setFormData] = useState({
    entry_type: 'income',
    category: '',
    custom_category: '',
    amount: '',
    currency: 'USD',
    treasury_account_id: '',
    description: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
  });

  const isAdmin = user?.role === 'admin';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchEntries = useCallback(async () => {
    try {
      let url = `${API_URL}/api/income-expenses?limit=200`;
      if (activeTab !== 'all' && activeTab !== 'reports') {
        url += `&entry_type=${activeTab}`;
      }
      if (filters.startDate) url += `&start_date=${filters.startDate}`;
      if (filters.endDate) url += `&end_date=${filters.endDate}`;
      if (filters.category) url += `&category=${filters.category}`;
      if (filters.treasuryAccountId) url += `&treasury_account_id=${filters.treasuryAccountId}`;
      
      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setEntries(await response.json());
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Failed to load entries');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters]);

  const fetchTreasuryAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/treasury`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const accounts = await response.json();
        setTreasuryAccounts(accounts.filter(a => a.status === 'active'));
      }
    } catch (error) {
      console.error('Error fetching treasury accounts:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      let url = `${API_URL}/api/income-expenses/reports/summary`;
      const params = [];
      if (filters.startDate) params.push(`start_date=${filters.startDate}`);
      if (filters.endDate) params.push(`end_date=${filters.endDate}`);
      if (params.length) url += `?${params.join('&')}`;
      
      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setSummary(await response.json());
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const year = new Date().getFullYear();
      const response = await fetch(`${API_URL}/api/income-expenses/reports/monthly?year=${year}`, { 
        headers: getAuthHeaders(), 
        credentials: 'include' 
      });
      if (response.ok) {
        setMonthlyData(await response.json());
      }
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchTreasuryAccounts();
    fetchSummary();
    fetchMonthlyData();
  }, []);

  useEffect(() => {
    fetchEntries();
    fetchSummary();
  }, [fetchEntries]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!formData.treasury_account_id) {
      toast.error('Please select a treasury account');
      return;
    }
    
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
      };
      
      const response = await fetch(`${API_URL}/api/income-expenses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(`${formData.entry_type === 'income' ? 'Income' : 'Expense'} recorded successfully`);
        setIsDialogOpen(false);
        resetForm();
        fetchEntries();
        fetchSummary();
        fetchTreasuryAccounts();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save entry');
      }
    } catch (error) {
      toast.error('Failed to save entry');
    }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this entry? This will reverse the treasury balance change.')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/income-expenses/${entryId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      
      if (response.ok) {
        toast.success('Entry deleted');
        fetchEntries();
        fetchSummary();
        fetchTreasuryAccounts();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Delete failed');
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const resetForm = () => {
    setFormData({
      entry_type: 'income',
      category: '',
      custom_category: '',
      amount: '',
      currency: 'USD',
      treasury_account_id: '',
      description: '',
      reference: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      category: '',
      treasuryAccountId: '',
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
          <h1 className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
            Income & Expenses
          </h1>
          <p className="text-[#C5C6C7]">Track and manage your business income and expenses</p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan"
          data-testid="add-entry-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Entry
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#1F2833] border-white/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Total Income</p>
                  <p className="text-3xl font-bold font-mono text-green-400">${summary.total_income_usd?.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-sm">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1F2833] border-white/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Total Expenses</p>
                  <p className="text-3xl font-bold font-mono text-red-400">${summary.total_expense_usd?.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-sm">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1F2833] border-white/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Net Profit/Loss</p>
                  <p className={`text-3xl font-bold font-mono ${summary.net_profit_usd >= 0 ? 'text-[#66FCF1]' : 'text-red-400'}`}>
                    ${summary.net_profit_usd?.toLocaleString()}
                  </p>
                </div>
                <div className={`p-3 rounded-sm ${summary.net_profit_usd >= 0 ? 'bg-[#66FCF1]/10' : 'bg-red-500/10'}`}>
                  <DollarSign className={`w-6 h-6 ${summary.net_profit_usd >= 0 ? 'text-[#66FCF1]' : 'text-red-400'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#1F2833] border border-white/10">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#66FCF1]/20 data-[state=active]:text-[#66FCF1]">
            All Entries
          </TabsTrigger>
          <TabsTrigger value="income" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
            Income
          </TabsTrigger>
          <TabsTrigger value="expense" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-[#66FCF1]/20 data-[state=active]:text-[#66FCF1]">
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        {activeTab !== 'reports' && (
          <Card className="bg-[#1F2833] border-white/5 mt-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[150px] space-y-1">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Start Date</Label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                  />
                </div>
                <div className="flex-1 min-w-[150px] space-y-1">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">End Date</Label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                  />
                </div>
                <div className="flex-1 min-w-[150px] space-y-1">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Treasury Account</Label>
                  <Select
                    value={filters.treasuryAccountId}
                    onValueChange={(value) => setFilters({ ...filters, treasuryAccountId: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white">
                      <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2833] border-white/10">
                      <SelectItem value="all" className="text-white hover:bg-white/5">All Accounts</SelectItem>
                      {treasuryAccounts.map((acc) => (
                        <SelectItem key={acc.account_id} value={acc.account_id} className="text-white hover:bg-white/5">
                          {acc.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="border-white/10 text-[#C5C6C7] hover:bg-white/5"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Entries Table */}
        <TabsContent value="all" className="mt-4">
          <EntriesTable entries={entries} loading={loading} onDelete={handleDelete} isAdmin={isAdmin} formatDate={formatDate} getCategoryLabel={getCategoryLabel} />
        </TabsContent>
        
        <TabsContent value="income" className="mt-4">
          <EntriesTable entries={entries} loading={loading} onDelete={handleDelete} isAdmin={isAdmin} formatDate={formatDate} getCategoryLabel={getCategoryLabel} />
        </TabsContent>
        
        <TabsContent value="expense" className="mt-4">
          <EntriesTable entries={entries} loading={loading} onDelete={handleDelete} isAdmin={isAdmin} formatDate={formatDate} getCategoryLabel={getCategoryLabel} />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4 space-y-6">
          {/* Category Breakdown */}
          {summary && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income by Category */}
              <Card className="bg-[#1F2833] border-white/5">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Income by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(summary.income_by_category || {}).map(([cat, amount]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-[#C5C6C7] capitalize">{cat.replace('_', ' ')}</span>
                        <span className="text-green-400 font-mono">${amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {Object.keys(summary.income_by_category || {}).length === 0 && (
                      <p className="text-[#C5C6C7] text-sm">No income recorded</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Expenses by Category */}
              <Card className="bg-[#1F2833] border-white/5">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                    Expenses by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(summary.expense_by_category || {}).map(([cat, amount]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-[#C5C6C7] capitalize">{cat.replace('_', ' ')}</span>
                        <span className="text-red-400 font-mono">${amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {Object.keys(summary.expense_by_category || {}).length === 0 && (
                      <p className="text-[#C5C6C7] text-sm">No expenses recorded</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Monthly P&L */}
          <Card className="bg-[#1F2833] border-white/5">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#66FCF1]" />
                Monthly P&L ({new Date().getFullYear()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Month</TableHead>
                      <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Income</TableHead>
                      <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Expenses</TableHead>
                      <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.map((row) => (
                      <TableRow key={row.month} className="border-white/5 hover:bg-white/5">
                        <TableCell className="text-white">{row.month}</TableCell>
                        <TableCell className="text-green-400 font-mono text-right">${row.income.toLocaleString()}</TableCell>
                        <TableCell className="text-red-400 font-mono text-right">${row.expense.toLocaleString()}</TableCell>
                        <TableCell className={`font-mono text-right ${row.net >= 0 ? 'text-[#66FCF1]' : 'text-red-400'}`}>
                          ${row.net.toLocaleString()}
                        </TableCell>
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
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              Add {formData.entry_type === 'income' ? 'Income' : 'Expense'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Entry Type Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.entry_type === 'income' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, entry_type: 'income', category: '' })}
                className={formData.entry_type === 'income' 
                  ? 'bg-green-500 hover:bg-green-600 text-white flex-1' 
                  : 'border-white/10 text-[#C5C6C7] hover:bg-white/5 flex-1'}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Income
              </Button>
              <Button
                type="button"
                variant={formData.entry_type === 'expense' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, entry_type: 'expense', category: '' })}
                className={formData.entry_type === 'expense' 
                  ? 'bg-red-500 hover:bg-red-600 text-white flex-1' 
                  : 'border-white/10 text-[#C5C6C7] hover:bg-white/5 flex-1'}
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                Expense
              </Button>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="entry-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2833] border-white/10">
                  {currentCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-white hover:bg-white/5">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Category (if 'other' selected) */}
            {formData.category === 'other' && (
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Custom Category</Label>
                <Input
                  value={formData.custom_category}
                  onChange={(e) => setFormData({ ...formData, custom_category: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                  placeholder="Enter custom category name"
                />
              </div>
            )}

            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                  placeholder="0.00"
                  data-testid="entry-amount"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F2833] border-white/10">
                    {currencies.map((cur) => (
                      <SelectItem key={cur} value={cur} className="text-white hover:bg-white/5">{cur}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Treasury Account */}
            <div className="space-y-2">
              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                {formData.entry_type === 'income' ? 'Credit to Account *' : 'Deduct from Account *'}
              </Label>
              <Select
                value={formData.treasury_account_id}
                onValueChange={(value) => setFormData({ ...formData, treasury_account_id: value })}
              >
                <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="entry-treasury">
                  <SelectValue placeholder="Select treasury account" />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2833] border-white/10">
                  {treasuryAccounts.map((acc) => (
                    <SelectItem key={acc.account_id} value={acc.account_id} className="text-white hover:bg-white/5">
                      {acc.account_name} ({acc.balance?.toLocaleString()} {acc.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                rows={2}
                placeholder="Enter description..."
              />
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Reference / Invoice #</Label>
              <Input
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                placeholder="INV-001, REF-123, etc."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsDialogOpen(false); resetForm(); }}
                className="border-white/10 text-[#C5C6C7] hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className={formData.entry_type === 'income' 
                  ? 'bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-wider'
                  : 'bg-red-500 hover:bg-red-600 text-white font-bold uppercase tracking-wider'}
                data-testid="save-entry-btn"
              >
                Save {formData.entry_type === 'income' ? 'Income' : 'Expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Entries Table Component
function EntriesTable({ entries, loading, onDelete, isAdmin, formatDate, getCategoryLabel }) {
  if (loading) {
    return (
      <Card className="bg-[#1F2833] border-white/5">
        <CardContent className="p-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="bg-[#1F2833] border-white/5">
        <CardContent className="p-12 text-center">
          <Wallet className="w-12 h-12 text-[#C5C6C7] mx-auto mb-4" />
          <p className="text-[#C5C6C7]">No entries found</p>
          <p className="text-sm text-[#C5C6C7]/60 mt-2">Click "Add Entry" to record income or expenses</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1F2833] border-white/5">
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Date</TableHead>
                <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Type</TableHead>
                <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Category</TableHead>
                <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Description</TableHead>
                <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Account</TableHead>
                <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Amount</TableHead>
                {isAdmin && <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs w-16"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.entry_id} className="border-white/5 hover:bg-white/5">
                  <TableCell className="text-white text-sm">{formatDate(entry.date)}</TableCell>
                  <TableCell>
                    <Badge className={entry.entry_type === 'income' 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                      {entry.entry_type === 'income' ? (
                        <><ArrowDownRight className="w-3 h-3 mr-1" /> Income</>
                      ) : (
                        <><ArrowUpRight className="w-3 h-3 mr-1" /> Expense</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#C5C6C7] text-sm">
                    {getCategoryLabel(entry.category, entry.custom_category)}
                  </TableCell>
                  <TableCell className="text-white text-sm max-w-[200px] truncate">
                    {entry.description || '-'}
                  </TableCell>
                  <TableCell className="text-[#66FCF1] text-sm">
                    {entry.treasury_account_name}
                  </TableCell>
                  <TableCell className={`font-mono text-right ${entry.entry_type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {entry.entry_type === 'income' ? '+' : '-'}
                    {entry.amount?.toLocaleString()} {entry.currency}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(entry.entry_id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        data-testid={`delete-entry-${entry.entry_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
