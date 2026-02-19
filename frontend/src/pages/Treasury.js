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
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  Landmark,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Building2,
  DollarSign,
  History,
  Download,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ArrowLeftRight,
  Calculator,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const accountTypes = [
  { value: 'bank', label: 'Bank Account' },
  { value: 'crypto_wallet', label: 'Crypto Wallet' },
  { value: 'payment_gateway', label: 'Payment Gateway' },
  { value: 'usdt', label: 'USDT Wallet' },
];

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function Treasury() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [viewAccount, setViewAccount] = useState(null);
  const [historyAccount, setHistoryAccount] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    transactionType: '',
  });
  
  // Transfer state
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    source_account_id: '',
    destination_account_id: '',
    amount: '',
    exchange_rate: '1',
    notes: '',
  });
  const [transferProcessing, setTransferProcessing] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaNumbers, setCaptchaNumbers] = useState({ n1: 0, n2: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  
  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'bank',
    bank_name: '',
    account_number: '',
    routing_number: '',
    swift_code: '',
    currency: 'USD',
    description: '',
    status: 'active',
    // USDT specific fields
    usdt_address: '',
    usdt_network: '',
    usdt_notes: '',
  });

  const isAdmin = user?.role === 'admin';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/treasury`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setAccounts(await response.json());
      }
    } catch (error) {
      console.error('Error fetching treasury accounts:', error);
      toast.error('Failed to load treasury accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountHistory = async (accountId) => {
    setHistoryLoading(true);
    try {
      let url = `${API_URL}/api/treasury/${accountId}/history?limit=100`;
      if (historyFilters.startDate) {
        url += `&start_date=${historyFilters.startDate}`;
      }
      if (historyFilters.endDate) {
        url += `&end_date=${historyFilters.endDate}`;
      }
      if (historyFilters.transactionType) {
        url += `&transaction_type=${historyFilters.transactionType}`;
      }
      
      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setHistoryData(await response.json());
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const downloadStatement = () => {
    if (!historyAccount || historyData.length === 0) return;
    
    // Generate CSV content
    const headers = ['Date', 'Type', 'Reference', 'Amount', 'Currency'];
    const rows = historyData.map(tx => [
      new Date(tx.created_at).toLocaleDateString(),
      tx.transaction_type || 'N/A',
      tx.reference || 'N/A',
      tx.amount?.toLocaleString() || '0',
      historyAccount.currency || 'USD'
    ]);
    
    const csvContent = [
      `Treasury Account Statement - ${historyAccount.account_name}`,
      `Currency: ${historyAccount.currency}`,
      `Balance: ${historyAccount.balance?.toLocaleString()}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      '',
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement_${historyAccount.account_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Statement downloaded');
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (historyAccount) {
      fetchAccountHistory(historyAccount.account_id);
    }
  }, [historyAccount, historyFilters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = selectedAccount
        ? `${API_URL}/api/treasury/${selectedAccount.account_id}`
        : `${API_URL}/api/treasury`;
      const method = selectedAccount ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(selectedAccount ? 'Account updated' : 'Account created');
        setIsDialogOpen(false);
        resetForm();
        fetchAccounts();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      const response = await fetch(`${API_URL}/api/treasury/${accountId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        toast.success('Account deleted');
        fetchAccounts();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Delete failed');
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleEdit = (account) => {
    setSelectedAccount(account);
    setFormData({
      account_name: account.account_name,
      account_type: account.account_type,
      bank_name: account.bank_name || '',
      account_number: account.account_number || '',
      routing_number: account.routing_number || '',
      swift_code: account.swift_code || '',
      currency: account.currency,
      description: account.description || '',
      status: account.status,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedAccount(null);
    setFormData({
      account_name: '',
      account_type: 'bank',
      bank_name: '',
      account_number: '',
      routing_number: '',
      swift_code: '',
      currency: 'USD',
      description: '',
      status: 'active',
      usdt_address: '',
      usdt_network: '',
      usdt_notes: '',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'status-approved',
      inactive: 'status-rejected',
    };
    return <Badge className={`${styles[status] || 'status-pending'} text-xs uppercase`}>{status}</Badge>;
  };

  const getTypeBadge = (type) => {
    const labels = {
      bank: 'Bank',
      crypto_wallet: 'Crypto',
      usdt: 'USDT',
      payment_gateway: 'Gateway',
    };
    return (
      <Badge variant="outline" className="border-[#66FCF1]/30 text-[#66FCF1] text-xs uppercase">
        {labels[type] || type}
      </Badge>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalBalanceUSD = accounts.reduce((sum, acc) => sum + (acc.balance_usd || acc.balance || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="treasury-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
            Treasury
          </h1>
          <p className="text-[#C5C6C7]">Manage bank accounts and treasury</p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan"
                data-testid="add-treasury-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                  {selectedAccount ? 'Edit Account' : 'Add Treasury Account'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Account Name *</Label>
                  <Input
                    value={formData.account_name}
                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                    placeholder="e.g., Main Operating Account"
                    data-testid="treasury-name"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Type</Label>
                    <Select
                      value={formData.account_type}
                      onValueChange={(value) => setFormData({ ...formData, account_type: value })}
                    >
                      <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="treasury-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1F2833] border-white/10">
                        {accountTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-white hover:bg-white/5">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="treasury-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2833] border-white/10">
                      <SelectItem value="USD" className="text-white hover:bg-white/5">USD</SelectItem>
                      <SelectItem value="EUR" className="text-white hover:bg-white/5">EUR</SelectItem>
                      <SelectItem value="GBP" className="text-white hover:bg-white/5">GBP</SelectItem>
                      <SelectItem value="AED" className="text-white hover:bg-white/5">AED</SelectItem>
                      <SelectItem value="SAR" className="text-white hover:bg-white/5">SAR</SelectItem>
                      <SelectItem value="INR" className="text-white hover:bg-white/5">INR</SelectItem>
                      <SelectItem value="JPY" className="text-white hover:bg-white/5">JPY</SelectItem>
                      {formData.account_type === 'usdt' && (
                        <SelectItem value="USDT" className="text-white hover:bg-white/5">USDT</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Bank-specific fields */}
              {formData.account_type !== 'usdt' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Bank Name</Label>
                    <Input
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                      placeholder="e.g., Chase Bank"
                      data-testid="treasury-bank"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Account Number</Label>
                      <Input
                        value={formData.account_number}
                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                        className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                        placeholder="****1234"
                        data-testid="treasury-account-number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Routing Number</Label>
                      <Input
                        value={formData.routing_number}
                        onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
                        className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                        placeholder="Optional"
                        data-testid="treasury-routing"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">SWIFT Code</Label>
                    <Input
                      value={formData.swift_code}
                      onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                      className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                      placeholder="Optional"
                      data-testid="treasury-swift"
                    />
                  </div>
                </>
              )}
              
              {/* USDT-specific fields */}
              {formData.account_type === 'usdt' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">USDT Wallet Address *</Label>
                    <Input
                      value={formData.usdt_address}
                      onChange={(e) => setFormData({ ...formData, usdt_address: e.target.value })}
                      className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                      placeholder="Enter USDT wallet address"
                      data-testid="treasury-usdt-address"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Network *</Label>
                    <Select
                      value={formData.usdt_network}
                      onValueChange={(value) => setFormData({ ...formData, usdt_network: value })}
                    >
                      <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="treasury-usdt-network">
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1F2833] border-white/10">
                        <SelectItem value="TRC20" className="text-white hover:bg-white/5">TRC20 (Tron)</SelectItem>
                        <SelectItem value="ERC20" className="text-white hover:bg-white/5">ERC20 (Ethereum)</SelectItem>
                        <SelectItem value="BEP20" className="text-white hover:bg-white/5">BEP20 (BSC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Private Notes/Labels</Label>
                    <Textarea
                      value={formData.usdt_notes}
                      onChange={(e) => setFormData({ ...formData, usdt_notes: e.target.value })}
                      className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                      placeholder="Internal notes for this wallet..."
                      rows={2}
                      data-testid="treasury-usdt-notes"
                    />
                  </div>
                </>
              )}
                
                {selectedAccount && (
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="treasury-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1F2833] border-white/10">
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-white/5">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                    rows={2}
                    data-testid="treasury-description"
                  />
                </div>
                
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
                    className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider"
                    data-testid="save-treasury-btn"
                  >
                    {selectedAccount ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Card */}
      <Card className="bg-[#1F2833] border-white/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Total Treasury Balance (USD Equivalent)</p>
              <p className="text-4xl font-bold font-mono text-white">${totalBalanceUSD.toLocaleString()}</p>
              <p className="text-xs text-[#C5C6C7] mt-1">Converted from all currencies to USD</p>
            </div>
            <div className="p-4 bg-[#66FCF1]/10 rounded-sm">
              <DollarSign className="w-8 h-8 text-[#66FCF1]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Landmark className="w-12 h-12 text-[#C5C6C7] mx-auto mb-4" />
            <p className="text-[#C5C6C7]">No treasury accounts found</p>
            {isAdmin && <p className="text-sm text-[#C5C6C7]/60 mt-2">Click "Add Account" to create one</p>}
          </div>
        ) : (
          accounts.map((account) => (
            <Card key={account.account_id} className="bg-[#1F2833] border-white/5 card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#66FCF1]/10 rounded-sm">
                      <Building2 className="w-5 h-5 text-[#66FCF1]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">{account.account_name}</CardTitle>
                      <p className="text-xs text-[#C5C6C7]">{account.bank_name || 'N/A'}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-[#C5C6C7] hover:text-white hover:bg-white/5" data-testid={`treasury-actions-${account.account_id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1F2833] border-white/10">
                        <DropdownMenuItem onClick={() => setViewAccount(account)} className="text-white hover:bg-white/5 cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setHistoryAccount(account)} className="text-white hover:bg-white/5 cursor-pointer">
                          <History className="w-4 h-4 mr-2" /> History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(account)} className="text-white hover:bg-white/5 cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(account.account_id)} className="text-red-400 hover:bg-white/5 cursor-pointer">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#C5C6C7] text-sm">Balance ({account.currency})</span>
                    <span className="text-xl font-mono font-bold text-white">
                      {account.currency === 'USD' ? '$' : ''}{(account.balance || 0).toLocaleString()} {account.currency !== 'USD' ? account.currency : ''}
                    </span>
                  </div>
                  {account.currency !== 'USD' && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5C6C7] text-sm">USD Equivalent</span>
                      <span className="text-lg font-mono text-[#66FCF1]">${(account.balance_usd || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[#C5C6C7] text-sm">Type</span>
                    {getTypeBadge(account.account_type)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#C5C6C7] text-sm">Status</span>
                    {getStatusBadge(account.status)}
                  </div>
                  {account.account_number && (
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-xs text-[#C5C6C7]">Account: <span className="font-mono text-white">{account.account_number}</span></p>
                    </div>
                  )}
                  <Button
                    onClick={() => setHistoryAccount(account)}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 border-[#66FCF1]/30 text-[#66FCF1] hover:bg-[#66FCF1]/10"
                    data-testid={`view-history-${account.account_id}`}
                  >
                    <History className="w-3 h-3 mr-2" />
                    View History
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Account Dialog */}
      <Dialog open={!!viewAccount} onOpenChange={() => setViewAccount(null)}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              Account Details
            </DialogTitle>
          </DialogHeader>
          {viewAccount && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#66FCF1]/10 rounded-sm">
                  <Building2 className="w-8 h-8 text-[#66FCF1]" />
                </div>
                <div>
                  <h3 className="text-xl text-white font-medium">{viewAccount.account_name}</h3>
                  <p className="text-[#C5C6C7]">{viewAccount.bank_name || 'N/A'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Balance</p>
                  <p className="text-2xl font-mono font-bold text-white">${(viewAccount.balance || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Currency</p>
                  <p className="text-white font-mono">{viewAccount.currency}</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Type</p>
                  {getTypeBadge(viewAccount.account_type)}
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Status</p>
                  {getStatusBadge(viewAccount.status)}
                </div>
                {viewAccount.account_number && (
                  <div>
                    <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Account Number</p>
                    <p className="text-white font-mono">{viewAccount.account_number}</p>
                  </div>
                )}
                {viewAccount.routing_number && (
                  <div>
                    <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Routing Number</p>
                    <p className="text-white font-mono">{viewAccount.routing_number}</p>
                  </div>
                )}
                {viewAccount.swift_code && (
                  <div className="col-span-2">
                    <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">SWIFT Code</p>
                    <p className="text-white font-mono">{viewAccount.swift_code}</p>
                  </div>
                )}
              </div>
              {viewAccount.description && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Description</p>
                  <p className="text-white">{viewAccount.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={!!historyAccount} onOpenChange={() => { 
        setHistoryAccount(null); 
        setHistoryData([]);
        setHistoryFilters({ startDate: '', endDate: '', transactionType: '' });
      }}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}>
              <History className="w-6 h-6 text-[#66FCF1]" />
              Transaction History
            </DialogTitle>
          </DialogHeader>
          {historyAccount && (
            <div className="space-y-4">
              {/* Account Info */}
              <div className="flex items-center justify-between p-4 bg-[#0B0C10] rounded-sm">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-[#66FCF1]" />
                  <div>
                    <p className="text-white font-medium">{historyAccount.account_name}</p>
                    <p className="text-xs text-[#C5C6C7]">{historyAccount.bank_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider">Balance</p>
                  <p className="text-xl font-mono font-bold text-white">
                    {historyAccount.currency === 'USD' ? '$' : ''}{(historyAccount.balance || 0).toLocaleString()} {historyAccount.currency !== 'USD' ? historyAccount.currency : ''}
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-end gap-4 p-4 bg-[#0B0C10] rounded-sm">
                <div className="flex-1 min-w-[150px] space-y-1">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Start Date</Label>
                  <Input
                    type="date"
                    value={historyFilters.startDate}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, startDate: e.target.value })}
                    className="bg-[#1F2833] border-white/10 text-white focus:border-[#66FCF1]"
                    data-testid="history-start-date"
                  />
                </div>
                <div className="flex-1 min-w-[150px] space-y-1">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">End Date</Label>
                  <Input
                    type="date"
                    value={historyFilters.endDate}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, endDate: e.target.value })}
                    className="bg-[#1F2833] border-white/10 text-white focus:border-[#66FCF1]"
                    data-testid="history-end-date"
                  />
                </div>
                <div className="flex-1 min-w-[150px] space-y-1">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Type</Label>
                  <Select
                    value={historyFilters.transactionType}
                    onValueChange={(value) => setHistoryFilters({ ...historyFilters, transactionType: value === 'all' ? '' : value })}
                  >
                    <SelectTrigger className="bg-[#1F2833] border-white/10 text-white" data-testid="history-type-filter">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2833] border-white/10">
                      <SelectItem value="all" className="text-white hover:bg-white/5">All Types</SelectItem>
                      <SelectItem value="deposit" className="text-white hover:bg-white/5">Deposit</SelectItem>
                      <SelectItem value="withdrawal" className="text-white hover:bg-white/5">Withdrawal</SelectItem>
                      <SelectItem value="settlement_in" className="text-white hover:bg-white/5">Settlement In</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={downloadStatement}
                  disabled={historyData.length === 0}
                  className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider"
                  data-testid="download-statement-btn"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Statement
                </Button>
              </div>

              {/* Transaction Table */}
              <ScrollArea className="h-[350px]">
                {historyLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-[#C5C6C7] mx-auto mb-4" />
                    <p className="text-[#C5C6C7]">No transaction history found</p>
                    <p className="text-sm text-[#C5C6C7]/60 mt-2">Transactions will appear here once approved</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Date</TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Type</TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Reference</TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyData.map((tx, idx) => {
                        const isIncoming = tx.amount > 0 || tx.transaction_type === 'deposit' || tx.transaction_type === 'settlement_in';
                        return (
                          <TableRow key={tx.treasury_transaction_id || idx} className="border-white/5 hover:bg-white/5">
                            <TableCell className="text-white text-sm">{formatDate(tx.created_at)}</TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-1 ${isIncoming ? 'text-green-400' : 'text-red-400'}`}>
                                {isIncoming ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                <span className="capitalize text-sm">{tx.transaction_type || 'N/A'}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-white text-sm max-w-[200px] truncate">{tx.reference || '-'}</TableCell>
                            <TableCell className={`font-mono text-right ${isIncoming ? 'text-green-400' : 'text-red-400'}`}>
                              {isIncoming ? '+' : ''}{Math.abs(tx.amount || 0).toLocaleString()} {historyAccount.currency}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
