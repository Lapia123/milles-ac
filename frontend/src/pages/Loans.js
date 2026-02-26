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
  Banknote,
  Plus,
  DollarSign,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Trash2,
  CreditCard,
  TrendingUp,
  PiggyBank,
  Receipt,
  X,
  Download,
  ArrowRightLeft,
  Users,
  BarChart3,
  History,
  Search,
  FileX,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const currencies = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR', 'JPY', 'USDT'];

const loanTypes = [
  { value: 'short_term', label: 'Short Term (< 1 year)' },
  { value: 'long_term', label: 'Long Term (> 1 year)' },
  { value: 'credit_line', label: 'Credit Line (Revolving)' },
];

const repaymentModes = [
  { value: 'lump_sum', label: 'Lump Sum (Single Payment)' },
  { value: 'emi', label: 'EMI (Monthly Installments)' },
  { value: 'custom', label: 'Custom Schedule' },
];

const installmentFrequencies = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

export default function Loans() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loanTransactions, setLoanTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState('dashboard');
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [isRepaymentDialogOpen, setIsRepaymentDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [summary, setSummary] = useState(null);
  const [vendorSearch, setVendorSearch] = useState('');
  
  // Filter
  const [statusFilter, setStatusFilter] = useState('');
  
  // Loan form
  const [loanForm, setLoanForm] = useState({
    vendor_id: '',
    borrower_name: '',
    amount: '',
    currency: 'USD',
    interest_rate: '0',
    loan_type: 'short_term',
    loan_date: new Date().toISOString().split('T')[0],
    due_date: '',
    repayment_mode: 'lump_sum',
    installment_amount: '',
    installment_frequency: 'monthly',
    num_installments: '',
    treasury_account_id: '',
    collateral: '',
    notes: '',
  });
  
  // Repayment form
  const [repaymentForm, setRepaymentForm] = useState({
    amount: '',
    currency: 'USD',
    treasury_account_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });
  
  // Swap form
  const [swapForm, setSwapForm] = useState({
    target_vendor_id: '',
    target_borrower_name: '',
    reason: '',
    adjust_terms: false,
    new_interest_rate: '',
    new_due_date: '',
  });

  const isAdmin = user?.role === 'admin';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchLoans = useCallback(async () => {
    try {
      let url = `${API_URL}/api/loans?limit=200`;
      if (statusFilter) url += `&status=${statusFilter}`;
      
      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setLoans(await response.json());
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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
      const response = await fetch(`${API_URL}/api/loans/reports/summary`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setSummary(await response.json());
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`${API_URL}/api/loans/dashboard`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setDashboard(await response.json());
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${API_URL}/api/loans/vendors`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setVendors(await response.json());
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchLoanTransactions = async (loanId = null) => {
    try {
      let url = `${API_URL}/api/loans/transactions?limit=100`;
      if (loanId) url += `&loan_id=${loanId}`;
      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setLoanTransactions(await response.json());
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchLoanDetail = async (loanId) => {
    try {
      const response = await fetch(`${API_URL}/api/loans/${loanId}`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setSelectedLoan(await response.json());
        setIsDetailDialogOpen(true);
      }
    } catch (error) {
      toast.error('Failed to load loan details');
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchTreasuryAccounts();
    fetchSummary();
    fetchDashboard();
    fetchVendors();
    fetchLoanTransactions();
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    
    if (!loanForm.borrower_name) {
      toast.error('Please enter borrower name');
      return;
    }
    if (!loanForm.amount || parseFloat(loanForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!loanForm.treasury_account_id) {
      toast.error('Please select source treasury account');
      return;
    }
    if (!loanForm.due_date) {
      toast.error('Please enter due date');
      return;
    }
    
    try {
      const payload = {
        ...loanForm,
        amount: parseFloat(loanForm.amount),
        interest_rate: parseFloat(loanForm.interest_rate) || 0,
        installment_amount: loanForm.installment_amount ? parseFloat(loanForm.installment_amount) : null,
        num_installments: loanForm.num_installments ? parseInt(loanForm.num_installments) : null,
        vendor_id: loanForm.vendor_id || null,
      };
      
      const response = await fetch(`${API_URL}/api/loans`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Loan created successfully');
        setIsLoanDialogOpen(false);
        resetLoanForm();
        fetchLoans();
        fetchSummary();
        fetchDashboard();
        fetchTreasuryAccounts();
        fetchLoanTransactions();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create loan');
      }
    } catch (error) {
      toast.error('Failed to create loan');
    }
  };

  const handleSwapLoan = async () => {
    if (!swapForm.target_borrower_name) {
      toast.error('Please enter new borrower name');
      return;
    }
    
    try {
      const payload = {
        target_vendor_id: swapForm.target_vendor_id || null,
        target_borrower_name: swapForm.target_borrower_name,
        reason: swapForm.reason,
        adjust_terms: swapForm.adjust_terms,
        new_interest_rate: swapForm.adjust_terms && swapForm.new_interest_rate ? parseFloat(swapForm.new_interest_rate) : null,
        new_due_date: swapForm.adjust_terms ? swapForm.new_due_date : null,
      };
      
      const response = await fetch(`${API_URL}/api/loans/${selectedLoan.loan_id}/swap`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success('Loan swapped successfully');
        setIsSwapDialogOpen(false);
        setSwapForm({ target_vendor_id: '', target_borrower_name: '', reason: '', adjust_terms: false, new_interest_rate: '', new_due_date: '' });
        fetchLoans();
        fetchDashboard();
        fetchLoanTransactions();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to swap loan');
      }
    } catch (error) {
      toast.error('Failed to swap loan');
    }
  };

  const handleWriteOff = async (loanId) => {
    if (!window.confirm('Are you sure you want to write off this loan as bad debt? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/loans/${loanId}/write-off?reason=Bad%20debt`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Loan written off successfully');
        fetchLoans();
        fetchDashboard();
        fetchLoanTransactions();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to write off loan');
      }
    } catch (error) {
      toast.error('Failed to write off loan');
    }
  };

  const handleRecordRepayment = async (e) => {
    e.preventDefault();
    
    if (!repaymentForm.amount || parseFloat(repaymentForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!repaymentForm.treasury_account_id) {
      toast.error('Please select treasury account');
      return;
    }
    
    try {
      const payload = {
        ...repaymentForm,
        amount: parseFloat(repaymentForm.amount),
      };
      
      const response = await fetch(`${API_URL}/api/loans/${selectedLoan.loan_id}/repayment`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Repayment recorded. Outstanding: ${result.new_outstanding.toLocaleString()} ${selectedLoan.currency}`);
        setIsRepaymentDialogOpen(false);
        resetRepaymentForm();
        fetchLoans();
        fetchSummary();
        fetchTreasuryAccounts();
        if (selectedLoan) fetchLoanDetail(selectedLoan.loan_id);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to record repayment');
      }
    } catch (error) {
      toast.error('Failed to record repayment');
    }
  };

  const handleDeleteLoan = async (loanId) => {
    if (!window.confirm('Are you sure you want to delete this loan? This will reverse the treasury disbursement.')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/loans/${loanId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      
      if (response.ok) {
        toast.success('Loan deleted');
        fetchLoans();
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

  const resetLoanForm = () => {
    setLoanForm({
      vendor_id: '',
      borrower_name: '',
      amount: '',
      currency: 'USD',
      interest_rate: '0',
      loan_type: 'short_term',
      loan_date: new Date().toISOString().split('T')[0],
      due_date: '',
      repayment_mode: 'lump_sum',
      installment_amount: '',
      installment_frequency: 'monthly',
      num_installments: '',
      treasury_account_id: '',
      collateral: '',
      notes: '',
    });
    setVendorSearch('');
  };

  const resetRepaymentForm = () => {
    setRepaymentForm({
      amount: '',
      currency: 'USD',
      treasury_account_id: '',
      payment_date: new Date().toISOString().split('T')[0],
      reference: '',
      notes: '',
    });
  };

  const openRepaymentDialog = (loan) => {
    setSelectedLoan(loan);
    setRepaymentForm({
      ...repaymentForm,
      currency: loan.currency,
    });
    setIsRepaymentDialogOpen(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (loan) => {
    const isOverdue = loan.is_overdue || (loan.status === 'active' && loan.due_date && new Date(loan.due_date) < new Date());
    
    if (isOverdue) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Overdue</Badge>;
    }
    
    switch (loan.status) {
      case 'active':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Active</Badge>;
      case 'partially_paid':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Partially Paid</Badge>;
      case 'fully_paid':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Fully Paid</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{loan.status}</Badge>;
    }
  };

  const filteredLoans = activeTab === 'all' ? loans : loans.filter(l => l.status === activeTab);

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/api/loans/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `loans_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success('Loans exported successfully');
      } else {
        toast.error('Export failed');
      }
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="loans-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
            Loan Management
          </h1>
          <p className="text-[#C5C6C7]">Track loans given to other companies</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="border-white/10 text-[#C5C6C7] hover:bg-white/5 font-bold uppercase tracking-wider rounded-sm"
            data-testid="export-loans-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => setIsLoanDialogOpen(true)}
            className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan"
            data-testid="add-loan-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Loan
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
        <TabsList className="bg-[#1F2833] border border-white/10 mb-4">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#66FCF1]/20 data-[state=active]:text-[#66FCF1]">
            <BarChart3 className="w-4 h-4 mr-2" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="borrowers" className="data-[state=active]:bg-[#66FCF1]/20 data-[state=active]:text-[#66FCF1]">
            <Users className="w-4 h-4 mr-2" /> Borrowers
          </TabsTrigger>
          <TabsTrigger value="loans" className="data-[state=active]:bg-[#66FCF1]/20 data-[state=active]:text-[#66FCF1]">
            <Banknote className="w-4 h-4 mr-2" /> All Loans
          </TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-[#66FCF1]/20 data-[state=active]:text-[#66FCF1]">
            <History className="w-4 h-4 mr-2" /> Transactions
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          {dashboard ? (
            <div className="space-y-6">
              {/* Portfolio Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-[#1F2833] border-white/5">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-1">Total Disbursed</p>
                        <p className="text-xl font-bold font-mono text-white">${dashboard.portfolio_overview.total_disbursed_usd?.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-blue-500/10 rounded-sm">
                        <Banknote className="w-5 h-5 text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-[#1F2833] border-white/5">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-1">Outstanding</p>
                        <p className="text-xl font-bold font-mono text-[#66FCF1]">${dashboard.portfolio_overview.total_outstanding_usd?.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-cyan-500/10 rounded-sm">
                        <PiggyBank className="w-5 h-5 text-[#66FCF1]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-[#1F2833] border-white/5">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-1">Total Repaid</p>
                        <p className="text-xl font-bold font-mono text-green-400">${dashboard.portfolio_overview.total_repaid_usd?.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-green-500/10 rounded-sm">
                        <DollarSign className="w-5 h-5 text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-[#1F2833] border-white/5">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-1">Collected This Month</p>
                        <p className="text-xl font-bold font-mono text-yellow-400">${dashboard.collection_this_month?.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-yellow-500/10 rounded-sm">
                        <TrendingUp className="w-5 h-5 text-yellow-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Aging Analysis */}
                <Card className="bg-[#1F2833] border-white/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#66FCF1]" /> Aging Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[#C5C6C7] text-sm">Current (Not Due)</span>
                        <span className="text-green-400 font-mono">${dashboard.aging_analysis.current?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#C5C6C7] text-sm">1-30 Days Overdue</span>
                        <span className="text-yellow-400 font-mono">${dashboard.aging_analysis.days_1_30?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#C5C6C7] text-sm">31-60 Days Overdue</span>
                        <span className="text-orange-400 font-mono">${dashboard.aging_analysis.days_31_60?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#C5C6C7] text-sm">61-90 Days Overdue</span>
                        <span className="text-red-400 font-mono">${dashboard.aging_analysis.days_61_90?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#C5C6C7] text-sm">90+ Days Overdue</span>
                        <span className="text-red-600 font-mono font-bold">${dashboard.aging_analysis.days_90_plus?.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Borrowers */}
                <Card className="bg-[#1F2833] border-white/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#66FCF1]" /> Top Borrowers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.top_borrowers?.map((b, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div>
                            <span className="text-white text-sm">{b.name}</span>
                            <span className="text-[#8B8D91] text-xs ml-2">({b.loan_count} loans)</span>
                          </div>
                          <span className="text-[#66FCF1] font-mono">${b.outstanding?.toLocaleString()}</span>
                        </div>
                      ))}
                      {(!dashboard.top_borrowers || dashboard.top_borrowers.length === 0) && (
                        <p className="text-[#8B8D91] text-sm text-center py-4">No borrowers yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Upcoming Dues */}
              <Card className="bg-[#1F2833] border-white/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" /> Upcoming Dues (Next 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard.upcoming_dues?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="text-[#C5C6C7] text-xs">Borrower</TableHead>
                          <TableHead className="text-[#C5C6C7] text-xs text-right">Outstanding</TableHead>
                          <TableHead className="text-[#C5C6C7] text-xs">Due Date</TableHead>
                          <TableHead className="text-[#C5C6C7] text-xs text-right">Days Left</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboard.upcoming_dues.map((d, i) => (
                          <TableRow key={i} className="border-white/5 hover:bg-white/5">
                            <TableCell className="text-white text-sm">{d.borrower}</TableCell>
                            <TableCell className="text-[#66FCF1] font-mono text-sm text-right">${d.outstanding?.toFixed(2)}</TableCell>
                            <TableCell className="text-white text-sm">{formatDate(d.due_date)}</TableCell>
                            <TableCell className="text-right">
                              <Badge className={d.days_until_due <= 7 ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}>
                                {d.days_until_due} days
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-[#8B8D91] text-sm text-center py-6">No upcoming dues in the next 30 days</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-[#1F2833] border-white/5">
              <CardContent className="p-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Borrowers Tab */}
        <TabsContent value="borrowers">
          <Card className="bg-[#1F2833] border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-[#66FCF1]" /> Borrower Companies (Vendors)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-[#C5C6C7] text-xs">Company</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs text-right">Total Loans</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs text-right">Disbursed</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs text-right">Outstanding</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs text-center">Active</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((v) => (
                      <TableRow key={v.vendor_id} className="border-white/5 hover:bg-white/5">
                        <TableCell>
                          <div className="text-white font-medium">{v.name}</div>
                          <div className="text-[10px] text-[#8B8D91]">{v.email}</div>
                        </TableCell>
                        <TableCell className="text-white font-mono text-right">{v.loan_stats.total_loans}</TableCell>
                        <TableCell className="text-white font-mono text-right">${v.loan_stats.total_disbursed_usd?.toLocaleString()}</TableCell>
                        <TableCell className="text-[#66FCF1] font-mono text-right font-semibold">${v.loan_stats.total_outstanding_usd?.toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={v.loan_stats.active_loans > 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}>
                            {v.loan_stats.active_loans}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={v.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                            {v.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {vendors.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-[#8B8D91] py-8">
                          No vendors found. Add vendors in the Vendors module.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Loans Tab */}
        <TabsContent value="loans">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Card className="bg-[#1F2833] border-white/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-1">Total Disbursed</p>
                      <p className="text-xl font-bold font-mono text-white">${summary.total_disbursed_usd?.toLocaleString()}</p>
                    </div>
                    <div className="p-2 bg-blue-500/10 rounded-sm">
                      <Banknote className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1F2833] border-white/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-1">Outstanding</p>
                      <p className="text-xl font-bold font-mono text-[#66FCF1]">${summary.total_outstanding_usd?.toLocaleString()}</p>
                    </div>
                    <div className="p-2 bg-cyan-500/10 rounded-sm">
                      <PiggyBank className="w-5 h-5 text-[#66FCF1]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1F2833] border-white/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-1">Total Repaid</p>
                      <p className="text-xl font-bold font-mono text-green-400">${summary.total_repaid_usd?.toLocaleString()}</p>
                    </div>
                    <div className="p-2 bg-green-500/10 rounded-sm">
                      <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1F2833] border-white/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-1">Interest Earned</p>
                      <p className="text-xl font-bold font-mono text-yellow-400">${summary.total_interest_earned_usd?.toLocaleString()}</p>
                    </div>
                    <div className="p-2 bg-yellow-500/10 rounded-sm">
                      <TrendingUp className="w-5 h-5 text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Status Summary */}
          {summary && (
            <div className="flex gap-4 flex-wrap mb-4">
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-3 py-1">
                Active: {summary.status_breakdown?.active || 0}
              </Badge>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-3 py-1">
                Partially Paid: {summary.status_breakdown?.partially_paid || 0}
              </Badge>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1">
                Fully Paid: {summary.status_breakdown?.fully_paid || 0}
              </Badge>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1">
                Overdue: {summary.status_breakdown?.overdue || 0}
              </Badge>
            </div>
          )}

          {/* Loans Table Filter Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-[#1F2833] border border-white/10">
              <TabsTrigger value="all" className="data-[state=active]:bg-[#66FCF1]/20 data-[state=active]:text-[#66FCF1]">
                All Loans ({loans.length})
              </TabsTrigger>
              <TabsTrigger value="active" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                Active
              </TabsTrigger>
              <TabsTrigger value="partially_paid" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
                Partially Paid
              </TabsTrigger>
              <TabsTrigger value="fully_paid" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                Fully Paid
              </TabsTrigger>
            </TabsList>

            {/* Loans Table */}
            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <Card className="bg-[#1F2833] border-white/5">
                  <CardContent className="p-12 flex justify-center">
                    <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
                  </CardContent>
                </Card>
              ) : filteredLoans.length === 0 ? (
                <Card className="bg-[#1F2833] border-white/5">
                  <CardContent className="p-12 text-center">
                    <Banknote className="w-12 h-12 text-[#C5C6C7] mx-auto mb-4" />
                    <p className="text-[#C5C6C7]">No loans found</p>
                    <p className="text-sm text-[#C5C6C7]/60 mt-2">Click "New Loan" to create one</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-[#1F2833] border-white/5">
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Borrower</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Principal</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Outstanding</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Due</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Status</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLoans.map((loan) => (
                            <TableRow key={loan.loan_id} className="border-white/5 hover:bg-white/5">
                              <TableCell>
                                <div className="text-white font-medium">{loan.borrower_name}</div>
                                <div className="text-[10px] text-[#8B8D91]">{loan.source_treasury_name || '—'}</div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="text-white font-mono text-sm">
                                  {loan.currency === 'USD' ? '$' : ''}{loan.amount?.toLocaleString()}{loan.currency !== 'USD' ? ` ${loan.currency}` : ''}
                                </div>
                                {loan.interest_rate > 0 && (
                                  <div className="text-[10px] text-yellow-400/80">@ {loan.interest_rate}% interest</div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-[#66FCF1] font-mono text-sm font-semibold">
                                  {loan.currency === 'USD' ? '$' : ''}{loan.outstanding_balance?.toLocaleString()}{loan.currency !== 'USD' ? ` ${loan.currency}` : ''}
                                </span>
                              </TableCell>
                              <TableCell className="text-white text-sm">{formatDate(loan.due_date)}</TableCell>
                              <TableCell>{getStatusBadge(loan)}</TableCell>
                              <TableCell>
                                <div className="flex gap-0.5 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => fetchLoanDetail(loan.loan_id)}
                                    className="text-[#66FCF1] hover:text-[#66FCF1] hover:bg-[#66FCF1]/10 h-7 w-7 p-0"
                                    title="View Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                  {loan.status !== 'fully_paid' && loan.status !== 'written_off' && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openRepaymentDialog(loan)}
                                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10 h-7 w-7 p-0"
                                        title="Record Repayment"
                                      >
                                        <CreditCard className="w-3.5 h-3.5" />
                                      </Button>
                                      {isAdmin && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => { setSelectedLoan(loan); setIsSwapDialogOpen(true); }}
                                          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-7 w-7 p-0"
                                          title="Swap/Transfer Loan"
                                        >
                                          <ArrowRightLeft className="w-3.5 h-3.5" />
                                        </Button>
                                      )}
                                    </>
                                  )}
                                  {isAdmin && loan.repayment_count === 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteLoan(loan.loan_id)}
                                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                  {isAdmin && loan.status !== 'fully_paid' && loan.status !== 'written_off' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleWriteOff(loan.loan_id)}
                                      className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 h-7 w-7 p-0"
                                      title="Write Off"
                                    >
                                      <FileX className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <Card className="bg-[#1F2833] border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-[#66FCF1]" /> Loan Transactions Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-[#C5C6C7] text-xs">Date</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">Type</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">Description</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs text-right">Amount</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loanTransactions.map((tx) => (
                      <TableRow key={tx.transaction_id} className="border-white/5 hover:bg-white/5">
                        <TableCell className="text-white text-sm">{formatDate(tx.created_at)}</TableCell>
                        <TableCell>
                          <Badge className={
                            tx.transaction_type === 'disbursement' ? 'bg-blue-500/20 text-blue-400' :
                            tx.transaction_type === 'repayment' ? 'bg-green-500/20 text-green-400' :
                            tx.transaction_type === 'swap_out' || tx.transaction_type === 'swap_in' ? 'bg-purple-500/20 text-purple-400' :
                            tx.transaction_type === 'write_off' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }>
                            {tx.transaction_type?.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[#C5C6C7] text-sm max-w-[300px] truncate">{tx.description}</TableCell>
                        <TableCell className="text-white font-mono text-sm text-right">
                          {tx.currency === 'USD' ? '$' : ''}{tx.amount?.toLocaleString()}{tx.currency !== 'USD' ? ` ${tx.currency}` : ''}
                        </TableCell>
                        <TableCell className="text-[#8B8D91] text-sm">{tx.created_by_name}</TableCell>
                      </TableRow>
                    ))}
                    {loanTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-[#8B8D91] py-8">
                          No transactions yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Loan Dialog */}
      <Dialog open={isLoanDialogOpen} onOpenChange={(open) => { setIsLoanDialogOpen(open); if (!open) resetLoanForm(); }}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}>
              <Banknote className="w-6 h-6 text-[#66FCF1]" />
              New Loan
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLoan} className="space-y-4">
            {/* Vendor/Borrower Selection */}
            <div className="space-y-2">
              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-3 h-3" /> Borrower Company *
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8D91]" />
                <Input
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] pl-9"
                  placeholder="Search vendor or enter new name..."
                  data-testid="loan-borrower-search"
                />
              </div>
              {vendorSearch && (
                <div className="bg-[#0B0C10] border border-white/10 rounded-md max-h-32 overflow-y-auto">
                  <div 
                    className="px-3 py-2 cursor-pointer hover:bg-[#66FCF1]/10 text-[#66FCF1] flex items-center gap-2 border-b border-white/10 text-sm"
                    onClick={() => { setLoanForm({ ...loanForm, borrower_name: vendorSearch, vendor_id: '' }); }}
                  >
                    <Plus className="w-3 h-3" /> Use "{vendorSearch}" as new borrower
                  </div>
                  {vendors.filter(v => v.name.toLowerCase().includes(vendorSearch.toLowerCase())).map((v) => (
                    <div 
                      key={v.vendor_id}
                      className={`px-3 py-2 cursor-pointer hover:bg-white/5 text-white text-sm ${loanForm.vendor_id === v.vendor_id ? 'bg-[#66FCF1]/10' : ''}`}
                      onClick={() => { 
                        setLoanForm({ ...loanForm, borrower_name: v.name, vendor_id: v.vendor_id }); 
                        setVendorSearch(v.name);
                      }}
                    >
                      {v.name}
                      {v.loan_stats.active_loans > 0 && (
                        <span className="text-[#8B8D91] text-xs ml-2">({v.loan_stats.active_loans} active loans)</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {loanForm.borrower_name && (
                <div className="flex items-center gap-2 text-xs text-[#66FCF1]">
                  <CheckCircle2 className="w-3 h-3" />
                  Selected: {loanForm.borrower_name}
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setLoanForm({ ...loanForm, borrower_name: '', vendor_id: '' }); setVendorSearch(''); }} className="h-5 px-1 text-[#8B8D91]">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Loan Type */}
            <div className="space-y-2">
              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Loan Type</Label>
              <Select value={loanForm.loan_type} onValueChange={(value) => setLoanForm({ ...loanForm, loan_type: value })}>
                <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2833] border-white/10">
                  {loanTypes.map((lt) => (
                    <SelectItem key={lt.value} value={lt.value} className="text-white hover:bg-white/5">{lt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={loanForm.amount}
                  onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                  placeholder="0.00"
                  data-testid="loan-amount"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Currency</Label>
                <Select
                  value={loanForm.currency}
                  onValueChange={(value) => setLoanForm({ ...loanForm, currency: value })}
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

            {/* Interest Rate */}
            <div className="space-y-2">
              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Annual Interest Rate (%) - Simple Interest</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={loanForm.interest_rate}
                onChange={(e) => setLoanForm({ ...loanForm, interest_rate: e.target.value })}
                className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                placeholder="0"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Loan Date *</Label>
                <Input
                  type="date"
                  value={loanForm.loan_date}
                  onChange={(e) => setLoanForm({ ...loanForm, loan_date: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Due Date *</Label>
                <Input
                  type="date"
                  value={loanForm.due_date}
                  onChange={(e) => setLoanForm({ ...loanForm, due_date: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                />
              </div>
            </div>

            {/* Repayment Mode */}
            <div className="space-y-2">
              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Repayment Mode</Label>
              <Select
                value={loanForm.repayment_mode}
                onValueChange={(value) => setLoanForm({ ...loanForm, repayment_mode: value })}
              >
                <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2833] border-white/10">
                  {repaymentModes.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value} className="text-white hover:bg-white/5">{mode.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Installment Details */}
            {loanForm.repayment_mode === 'installments' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Installment Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={loanForm.installment_amount}
                    onChange={(e) => setLoanForm({ ...loanForm, installment_amount: e.target.value })}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Frequency</Label>
                  <Select
                    value={loanForm.installment_frequency}
                    onValueChange={(value) => setLoanForm({ ...loanForm, installment_frequency: value })}
                  >
                    <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2833] border-white/10">
                      {installmentFrequencies.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value} className="text-white hover:bg-white/5">{freq.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Treasury Account */}
            <div className="space-y-2">
              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Disburse From Treasury *</Label>
              <Select
                value={loanForm.treasury_account_id}
                onValueChange={(value) => setLoanForm({ ...loanForm, treasury_account_id: value })}
              >
                <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="loan-treasury">
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

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Notes</Label>
              <Textarea
                value={loanForm.notes}
                onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value })}
                className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                rows={2}
                placeholder="Additional notes..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsLoanDialogOpen(false); resetLoanForm(); }}
                className="border-white/10 text-[#C5C6C7] hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider"
                data-testid="create-loan-btn"
              >
                Create Loan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Repayment Dialog */}
      <Dialog open={isRepaymentDialogOpen} onOpenChange={(open) => { setIsRepaymentDialogOpen(open); if (!open) resetRepaymentForm(); }}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}>
              <CreditCard className="w-6 h-6 text-green-400" />
              Record Repayment
            </DialogTitle>
          </DialogHeader>
          
          {selectedLoan && (
            <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/10 mb-4">
              <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-2">Loan Details</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#C5C6C7]">Borrower:</span>
                  <span className="text-white">{selectedLoan.borrower_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C5C6C7]">Outstanding:</span>
                  <span className="text-[#66FCF1] font-mono">{selectedLoan.outstanding_balance?.toLocaleString()} {selectedLoan.currency}</span>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleRecordRepayment} className="space-y-4">
            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={repaymentForm.amount}
                  onChange={(e) => setRepaymentForm({ ...repaymentForm, amount: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                  placeholder="0.00"
                  data-testid="repayment-amount"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Currency</Label>
                <Select
                  value={repaymentForm.currency}
                  onValueChange={(value) => setRepaymentForm({ ...repaymentForm, currency: value })}
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
              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Credit to Treasury *</Label>
              <Select
                value={repaymentForm.treasury_account_id}
                onValueChange={(value) => setRepaymentForm({ ...repaymentForm, treasury_account_id: value })}
              >
                <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="repayment-treasury">
                  <SelectValue placeholder="Select treasury account" />
                </SelectTrigger>
                <SelectContent className="bg-[#1F2833] border-white/10">
                  {treasuryAccounts.map((acc) => (
                    <SelectItem key={acc.account_id} value={acc.account_id} className="text-white hover:bg-white/5">
                      {acc.account_name} ({acc.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Payment Date</Label>
              <Input
                type="date"
                value={repaymentForm.payment_date}
                onChange={(e) => setRepaymentForm({ ...repaymentForm, payment_date: e.target.value })}
                className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
              />
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Reference</Label>
              <Input
                value={repaymentForm.reference}
                onChange={(e) => setRepaymentForm({ ...repaymentForm, reference: e.target.value })}
                className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                placeholder="Payment reference..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsRepaymentDialogOpen(false); resetRepaymentForm(); }}
                className="border-white/10 text-[#C5C6C7] hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-wider"
                data-testid="record-repayment-btn"
              >
                Record Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Loan Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              Loan Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedLoan && (
            <div className="space-y-6">
              {/* Loan Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Borrower</p>
                  <p className="text-white font-medium">{selectedLoan.borrower_name}</p>
                </div>
                <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Status</p>
                  {getStatusBadge(selectedLoan)}
                </div>
                <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Loan Amount</p>
                  <p className="text-white font-mono">{selectedLoan.amount?.toLocaleString()} {selectedLoan.currency}</p>
                </div>
                <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Interest Rate</p>
                  <p className="text-white font-mono">{selectedLoan.interest_rate}%</p>
                </div>
                <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Total Interest</p>
                  <p className="text-yellow-400 font-mono">{selectedLoan.total_interest?.toLocaleString()} {selectedLoan.currency}</p>
                </div>
                <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Outstanding</p>
                  <p className="text-[#66FCF1] font-mono">{selectedLoan.outstanding_balance?.toLocaleString()} {selectedLoan.currency}</p>
                </div>
                <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Loan Date</p>
                  <p className="text-white">{formatDate(selectedLoan.loan_date)}</p>
                </div>
                <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Due Date</p>
                  <p className="text-white">{formatDate(selectedLoan.due_date)}</p>
                </div>
              </div>

              {/* Repayment History */}
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#66FCF1]" />
                  Repayment History ({selectedLoan.repayments?.length || 0})
                </h3>
                {selectedLoan.repayments?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Date</TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Amount</TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Treasury</TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedLoan.repayments.map((rep) => (
                        <TableRow key={rep.repayment_id} className="border-white/5 hover:bg-white/5">
                          <TableCell className="text-white text-sm">{formatDate(rep.payment_date)}</TableCell>
                          <TableCell className="text-green-400 font-mono text-right">+{rep.amount?.toLocaleString()} {rep.currency}</TableCell>
                          <TableCell className="text-[#C5C6C7] text-sm">{rep.treasury_account_name}</TableCell>
                          <TableCell className="text-[#C5C6C7] text-sm">{rep.reference || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-[#C5C6C7] text-sm">No repayments recorded yet</p>
                )}
              </div>

              {/* Action Button */}
              {selectedLoan.status !== 'fully_paid' && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => { setIsDetailDialogOpen(false); openRepaymentDialog(selectedLoan); }}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-wider"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Record Repayment
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
