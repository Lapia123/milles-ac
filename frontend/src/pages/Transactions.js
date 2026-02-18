import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
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
import { toast } from 'sonner';
import {
  ArrowLeftRight,
  Plus,
  Search,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const transactionTypes = [
  { value: 'deposit', label: 'Deposit' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'commission', label: 'Commission' },
  { value: 'rebate', label: 'Rebate' },
  { value: 'adjustment', label: 'Adjustment' },
];

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
];

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewTransaction, setViewTransaction] = useState(null);
  const [formData, setFormData] = useState({
    account_id: '',
    transaction_type: 'deposit',
    amount: '',
    currency: 'USD',
    description: '',
    reference: '',
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchTransactions = async () => {
    try {
      let url = `${API_URL}/api/transactions?limit=500`;
      if (typeFilter && typeFilter !== 'all') url += `&transaction_type=${typeFilter}`;
      if (statusFilter && statusFilter !== 'all') url += `&status=${statusFilter}`;

      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setTransactions(await response.json());
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/trading-accounts`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setAccounts(await response.json());
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
  }, [typeFilter, statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (response.ok) {
        toast.success('Transaction created');
        setIsDialogOpen(false);
        resetForm();
        fetchTransactions();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleStatusUpdate = async (transactionId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Transaction ${newStatus}`);
        fetchTransactions();
      } else {
        toast.error('Update failed');
      }
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const resetForm = () => {
    setFormData({
      account_id: '',
      transaction_type: 'deposit',
      amount: '',
      currency: 'USD',
      description: '',
      reference: '',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'status-approved',
      pending: 'status-pending',
      cancelled: 'status-rejected',
      failed: 'status-rejected',
    };
    return <Badge className={`${styles[status] || 'status-pending'} text-xs uppercase`}>{status}</Badge>;
  };

  const getTypeBadge = (type) => {
    const isIncoming = ['deposit', 'rebate'].includes(type);
    return (
      <div className={`flex items-center gap-1 ${isIncoming ? 'text-green-400' : 'text-red-400'}`}>
        {isIncoming ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
        <span className="capitalize font-medium">{type}</span>
      </div>
    );
  };

  const getAccountNumber = (accountId) => {
    const account = accounts.find(a => a.account_id === accountId);
    return account?.account_number || accountId;
  };

  const filteredTransactions = transactions.filter(tx => {
    const accountNum = getAccountNumber(tx.account_id).toLowerCase();
    const ref = (tx.reference || '').toLowerCase();
    return accountNum.includes(searchTerm.toLowerCase()) || ref.includes(searchTerm.toLowerCase());
  });

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

  return (
    <div className="space-y-6 animate-fade-in" data-testid="transactions-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
            Transactions
          </h1>
          <p className="text-[#C5C6C7]">Transaction ledger and financial operations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button
              className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan"
              data-testid="add-transaction-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                Create Transaction
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Trading Account</Label>
                <Select
                  value={formData.account_id}
                  onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                >
                  <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="select-tx-account">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F2833] border-white/10">
                    {accounts.map((account) => (
                      <SelectItem key={account.account_id} value={account.account_id} className="text-white hover:bg-white/5">
                        {account.account_number} (${account.balance?.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Type</Label>
                  <Select
                    value={formData.transaction_type}
                    onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                  >
                    <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="select-tx-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2833] border-white/10">
                      {transactionTypes.map((type) => (
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
                    <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="select-tx-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2833] border-white/10">
                      <SelectItem value="USD" className="text-white hover:bg-white/5">USD</SelectItem>
                      <SelectItem value="EUR" className="text-white hover:bg-white/5">EUR</SelectItem>
                      <SelectItem value="GBP" className="text-white hover:bg-white/5">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                  placeholder="0.00"
                  data-testid="tx-amount"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Reference (Optional)</Label>
                <Input
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                  placeholder="Auto-generated if empty"
                  data-testid="tx-reference"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                  rows={2}
                  data-testid="tx-description"
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
                  data-testid="save-tx-btn"
                >
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C5C6C7]" />
          <Input
            placeholder="Search by reference or account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#1F2833] border-white/10 text-white placeholder:text-white/30 focus:border-[#66FCF1]"
            data-testid="search-transactions"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-[#1F2833] border-white/10 text-white" data-testid="filter-tx-type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="bg-[#1F2833] border-white/10">
            <SelectItem value="all" className="text-white hover:bg-white/5">All Types</SelectItem>
            {transactionTypes.map((type) => (
              <SelectItem key={type.value} value={type.value} className="text-white hover:bg-white/5">
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-[#1F2833] border-white/10 text-white" data-testid="filter-tx-status">
            <Filter className="w-4 h-4 mr-2 text-[#C5C6C7]" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1F2833] border-white/10">
            <SelectItem value="all" className="text-white hover:bg-white/5">All Status</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/5">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-[#1F2833] border-white/5">
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Reference</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Account</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Type</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Amount</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Date</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Status</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[#C5C6C7]">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.transaction_id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-mono text-white">{tx.reference}</TableCell>
                      <TableCell className="font-mono text-[#66FCF1]">{getAccountNumber(tx.account_id)}</TableCell>
                      <TableCell>{getTypeBadge(tx.transaction_type)}</TableCell>
                      <TableCell className={`font-mono font-medium ${['deposit', 'rebate'].includes(tx.transaction_type) ? 'text-green-400' : 'text-red-400'}`}>
                        {['deposit', 'rebate'].includes(tx.transaction_type) ? '+' : '-'}${tx.amount?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-[#C5C6C7] text-sm">{formatDate(tx.created_at)}</TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-[#C5C6C7] hover:text-white hover:bg-white/5" data-testid={`tx-actions-${tx.transaction_id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#1F2833] border-white/10">
                            <DropdownMenuItem onClick={() => setViewTransaction(tx)} className="text-white hover:bg-white/5 cursor-pointer">
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {tx.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => handleStatusUpdate(tx.transaction_id, 'completed')} className="text-green-400 hover:bg-white/5 cursor-pointer">
                                  <CheckCircle className="w-4 h-4 mr-2" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusUpdate(tx.transaction_id, 'cancelled')} className="text-red-400 hover:bg-white/5 cursor-pointer">
                                  <XCircle className="w-4 h-4 mr-2" /> Cancel
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* View Transaction Dialog */}
      <Dialog open={!!viewTransaction} onOpenChange={() => setViewTransaction(null)}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          {viewTransaction && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Reference</p>
                  <p className="text-white font-mono text-lg">{viewTransaction.reference}</p>
                </div>
                {getStatusBadge(viewTransaction.status)}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Account</p>
                  <p className="text-[#66FCF1] font-mono">{getAccountNumber(viewTransaction.account_id)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Type</p>
                  {getTypeBadge(viewTransaction.transaction_type)}
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Amount</p>
                  <p className={`font-mono text-xl ${['deposit', 'rebate'].includes(viewTransaction.transaction_type) ? 'text-green-400' : 'text-red-400'}`}>
                    {['deposit', 'rebate'].includes(viewTransaction.transaction_type) ? '+' : '-'}${viewTransaction.amount?.toLocaleString()} {viewTransaction.currency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Created</p>
                  <p className="text-white text-sm">{formatDate(viewTransaction.created_at)}</p>
                </div>
              </div>
              {viewTransaction.description && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Description</p>
                  <p className="text-white">{viewTransaction.description}</p>
                </div>
              )}
              {viewTransaction.processed_at && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Processed</p>
                  <p className="text-white text-sm">{formatDate(viewTransaction.processed_at)}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
