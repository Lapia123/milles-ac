import { useEffect, useState } from 'react';
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
  CreditCard,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Percent,
  Calendar,
  Building2,
  Receipt,
  Wallet,
  Timer,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function PSPs() {
  const { user } = useAuth();
  const [psps, setPsps] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPsp, setSelectedPsp] = useState(null);
  const [viewPsp, setViewPsp] = useState(null);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [settlementDestination, setSettlementDestination] = useState('');
  const [formData, setFormData] = useState({
    psp_name: '',
    commission_rate: '',
    reserve_fund_rate: '0',
    holding_days: '0',
    settlement_days: '1',
    settlement_destination_id: '',
    min_settlement_amount: '0',
    gateway_fee: '0',
    refund_fee: '0',
    monthly_minimum_fee: '0',
    description: '',
    status: 'active',
  });

  // State for recording charges on transactions
  const [chargesDialogOpen, setChargesDialogOpen] = useState(false);
  const [chargesForm, setChargesForm] = useState({
    reserve_fund_amount: '0',
    extra_charges: '0',
    charges_description: '',
  });
  
  // State for recording payment received
  const [recordPaymentDialogOpen, setRecordPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    actual_amount_received: '',
    destination_account_id: '',
  });

  const isAdmin = user?.role === 'admin';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchPsps = async () => {
    try {
      const response = await fetch(`${API_URL}/api/psp-summary`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setPsps(await response.json());
      }
    } catch (error) {
      console.error('Error fetching PSPs:', error);
      toast.error('Failed to load PSPs');
    } finally {
      setLoading(false);
    }
  };

  const fetchTreasuryAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/treasury`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setTreasuryAccounts(await response.json());
      }
    } catch (error) {
      console.error('Error fetching treasury accounts:', error);
    }
  };

  const fetchPendingTransactions = async (pspId) => {
    try {
      const response = await fetch(`${API_URL}/api/psp/${pspId}/pending-transactions`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setPendingTransactions(await response.json());
      }
    } catch (error) {
      console.error('Error fetching pending transactions:', error);
    }
  };

  const fetchSettlements = async (pspId) => {
    try {
      const response = await fetch(`${API_URL}/api/psp/${pspId}/settlements`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setSettlements(await response.json());
      }
    } catch (error) {
      console.error('Error fetching settlements:', error);
    }
  };

  useEffect(() => {
    fetchPsps();
    fetchTreasuryAccounts();
  }, []);

  useEffect(() => {
    if (viewPsp) {
      fetchPendingTransactions(viewPsp.psp_id);
      fetchSettlements(viewPsp.psp_id);
    }
  }, [viewPsp]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = selectedPsp
        ? `${API_URL}/api/psp/${selectedPsp.psp_id}`
        : `${API_URL}/api/psp`;
      const method = selectedPsp ? 'PUT' : 'POST';

      const payload = {
        psp_name: formData.psp_name,
        commission_rate: parseFloat(formData.commission_rate),
        reserve_fund_rate: parseFloat(formData.reserve_fund_rate) || 0,
        holding_days: parseInt(formData.holding_days) || 0,
        settlement_days: parseInt(formData.settlement_days),
        settlement_destination_id: formData.settlement_destination_id,
        min_settlement_amount: parseFloat(formData.min_settlement_amount) || 0,
        gateway_fee: parseFloat(formData.gateway_fee) || 0,
        refund_fee: parseFloat(formData.refund_fee) || 0,
        monthly_minimum_fee: parseFloat(formData.monthly_minimum_fee) || 0,
        description: formData.description || null,
      };

      if (selectedPsp) {
        payload.status = formData.status;
      }

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(selectedPsp ? 'PSP updated' : 'PSP created');
        setIsDialogOpen(false);
        resetForm();
        fetchPsps();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  // Handle recording charges on a transaction
  const handleRecordCharges = async (e) => {
    e.preventDefault();
    if (!selectedTransaction) return;
    
    try {
      const response = await fetch(`${API_URL}/api/psp/transactions/${selectedTransaction.transaction_id}/charges`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          chargeback_amount: parseFloat(chargesForm.chargeback_amount) || 0,
          extra_charges: parseFloat(chargesForm.extra_charges) || 0,
          charges_description: chargesForm.charges_description || null,
        }),
      });

      if (response.ok) {
        toast.success('Charges recorded successfully');
        setChargesDialogOpen(false);
        setChargesForm({ chargeback_amount: '0', extra_charges: '0', charges_description: '' });
        if (viewPsp) fetchPendingTransactions(viewPsp.psp_id);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to record charges');
      }
    } catch (error) {
      toast.error('Failed to record charges');
    }
  };

  const openChargesDialog = (transaction) => {
    setSelectedTransaction(transaction);
    setChargesForm({
      chargeback_amount: (transaction.psp_chargeback_amount || 0).toString(),
      extra_charges: (transaction.psp_extra_charges || 0).toString(),
      charges_description: transaction.psp_charges_description || '',
    });
    setChargesDialogOpen(true);
  };

  const handleDelete = async (pspId) => {
    if (!window.confirm('Are you sure you want to delete this PSP?')) return;
    try {
      const response = await fetch(`${API_URL}/api/psp/${pspId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        toast.success('PSP deleted');
        fetchPsps();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Delete failed');
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleEdit = (psp) => {
    setSelectedPsp(psp);
    setFormData({
      psp_name: psp.psp_name,
      commission_rate: psp.commission_rate.toString(),
      chargeback_rate: (psp.chargeback_rate || 0).toString(),
      holding_days: (psp.holding_days || 0).toString(),
      settlement_days: psp.settlement_days.toString(),
      settlement_destination_id: psp.settlement_destination_id,
      min_settlement_amount: (psp.min_settlement_amount || 0).toString(),
      description: psp.description || '',
      status: psp.status,
    });
    setIsDialogOpen(true);
  };

  // Handle recording payment received from PSP
  const handleRecordPayment = async () => {
    if (!selectedTransaction) return;
    
    try {
      const psp = psps.find(p => p.psp_id === selectedTransaction.psp_id);
      const destId = paymentForm.destination_account_id || psp?.settlement_destination_id;
      
      let url = `${API_URL}/api/psp/transactions/${selectedTransaction.transaction_id}/record-payment`;
      const params = new URLSearchParams();
      if (destId) params.append('destination_account_id', destId);
      if (paymentForm.actual_amount_received) params.append('actual_amount_received', paymentForm.actual_amount_received);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      
      if (response.ok) {
        toast.success('Payment recorded successfully! Treasury updated.');
        setRecordPaymentDialogOpen(false);
        setSelectedTransaction(null);
        setPaymentForm({ actual_amount_received: '', destination_account_id: '' });
        if (viewPsp) {
          fetchPendingTransactions(viewPsp.psp_id);
          fetchSettlements(viewPsp.psp_id);
        }
        fetchPsps();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Recording payment failed');
      }
    } catch (error) {
      toast.error('Recording payment failed');
    }
  };
  
  // Open record payment dialog
  const openRecordPaymentDialog = (tx) => {
    setSelectedTransaction(tx);
    const netAmount = (tx.amount || 0) - (tx.psp_commission_amount || 0) - (tx.psp_chargeback_amount || 0) - (tx.psp_extra_charges || 0);
    setPaymentForm({
      actual_amount_received: netAmount.toString(),
      destination_account_id: '',
    });
    setRecordPaymentDialogOpen(true);
  };

  const handleSettleTransaction = async () => {
    if (!selectedTransaction) return;
    
    try {
      const psp = psps.find(p => p.psp_id === selectedTransaction.psp_id);
      const destId = settlementDestination || psp?.settlement_destination_id;
      
      const response = await fetch(
        `${API_URL}/api/psp/transactions/${selectedTransaction.transaction_id}/settle${destId ? `?destination_account_id=${destId}` : ''}`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
        }
      );
      
      if (response.ok) {
        toast.success('Transaction settled successfully');
        setSettleDialogOpen(false);
        setSelectedTransaction(null);
        setSettlementDestination('');
        if (viewPsp) {
          fetchPendingTransactions(viewPsp.psp_id);
        }
        fetchPsps();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Settlement failed');
      }
    } catch (error) {
      toast.error('Settlement failed');
    }
  };

  const resetForm = () => {
    setSelectedPsp(null);
    setFormData({
      psp_name: '',
      commission_rate: '',
      chargeback_rate: '0',
      holding_days: '0',
      settlement_days: '1',
      settlement_destination_id: '',
      min_settlement_amount: '0',
      description: '',
      status: 'active',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'status-approved',
      inactive: 'status-rejected',
    };
    return <Badge className={`${styles[status] || 'status-pending'} text-xs uppercase`}>{status}</Badge>;
  };

  const isOverdue = (expectedDate) => {
    if (!expectedDate) return false;
    const exp = new Date(expectedDate);
    return exp < new Date();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalPendingAmount = psps.reduce((sum, psp) => sum + (psp.pending_amount || 0), 0);
  const totalOverdue = psps.reduce((sum, psp) => sum + (psp.overdue_count || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="psp-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
            Payment Service Providers
          </h1>
          <p className="text-[#C5C6C7]">Manage PSPs, commissions, and settlements</p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan"
                data-testid="add-psp-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add PSP
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                  {selectedPsp ? 'Edit PSP' : 'Add Payment Service Provider'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">PSP Name *</Label>
                  <Input
                    value={formData.psp_name}
                    onChange={(e) => setFormData({ ...formData, psp_name: e.target.value })}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                    placeholder="e.g., Stripe, PayPal"
                    data-testid="psp-name"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Commission Rate (%) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.commission_rate}
                      onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                      className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                      placeholder="2.5"
                      data-testid="psp-commission"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Chargeback % *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.chargeback_rate}
                      onChange={(e) => setFormData({ ...formData, chargeback_rate: e.target.value })}
                      className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                      placeholder="0"
                      data-testid="psp-chargeback"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Holding Days</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.holding_days}
                      onChange={(e) => setFormData({ ...formData, holding_days: e.target.value })}
                      className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                      placeholder="0"
                      data-testid="psp-holding-days"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Settlement Days *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.settlement_days}
                      onChange={(e) => setFormData({ ...formData, settlement_days: e.target.value })}
                      className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                      placeholder="T+1"
                      data-testid="psp-settlement-days"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Settlement Destination *</Label>
                  <Select
                    value={formData.settlement_destination_id}
                    onValueChange={(value) => setFormData({ ...formData, settlement_destination_id: value })}
                  >
                    <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="psp-destination">
                      <SelectValue placeholder="Select treasury account" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2833] border-white/10">
                      {treasuryAccounts.map((account) => (
                        <SelectItem key={account.account_id} value={account.account_id} className="text-white hover:bg-white/5">
                          {account.account_name} - {account.bank_name} ({account.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Min Settlement Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.min_settlement_amount}
                    onChange={(e) => setFormData({ ...formData, min_settlement_amount: e.target.value })}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                    placeholder="0"
                    data-testid="psp-min-amount"
                  />
                </div>
                
                {selectedPsp && (
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="psp-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1F2833] border-white/10">
                        <SelectItem value="active" className="text-white hover:bg-white/5">Active</SelectItem>
                        <SelectItem value="inactive" className="text-white hover:bg-white/5">Inactive</SelectItem>
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
                    data-testid="psp-description"
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
                    data-testid="save-psp-btn"
                  >
                    {selectedPsp ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#1F2833] border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Total PSPs</p>
                <p className="text-3xl font-bold font-mono text-white">{psps.length}</p>
              </div>
              <div className="p-3 bg-[#66FCF1]/10 rounded-sm">
                <CreditCard className="w-6 h-6 text-[#66FCF1]" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1F2833] border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Pending Settlement</p>
                <p className="text-3xl font-bold font-mono text-white">${totalPendingAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-sm">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`bg-[#1F2833] border-white/5 ${totalOverdue > 0 ? 'border-red-500/30' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Overdue Settlements</p>
                <p className={`text-3xl font-bold font-mono ${totalOverdue > 0 ? 'text-red-400' : 'text-white'}`}>{totalOverdue}</p>
              </div>
              <div className={`p-3 rounded-sm ${totalOverdue > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                {totalOverdue > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PSPs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : psps.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <CreditCard className="w-12 h-12 text-[#C5C6C7] mx-auto mb-4" />
            <p className="text-[#C5C6C7]">No PSPs found</p>
            {isAdmin && <p className="text-sm text-[#C5C6C7]/60 mt-2">Click "Add PSP" to create one</p>}
          </div>
        ) : (
          psps.map((psp) => (
            <Card 
              key={psp.psp_id} 
              className={`bg-[#1F2833] border-white/5 card-hover cursor-pointer ${psp.overdue_count > 0 ? 'border-l-2 border-l-red-500' : ''}`}
              onClick={() => setViewPsp(psp)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-sm ${psp.overdue_count > 0 ? 'bg-red-500/10' : 'bg-[#66FCF1]/10'}`}>
                      <CreditCard className={`w-5 h-5 ${psp.overdue_count > 0 ? 'text-red-500' : 'text-[#66FCF1]'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">{psp.psp_name}</CardTitle>
                      <p className="text-xs text-[#C5C6C7]">{psp.description || 'No description'}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="text-[#C5C6C7] hover:text-white hover:bg-white/5" data-testid={`psp-actions-${psp.psp_id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1F2833] border-white/10">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewPsp(psp); }} className="text-white hover:bg-white/5 cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(psp); }} className="text-white hover:bg-white/5 cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(psp.psp_id); }} className="text-red-400 hover:bg-white/5 cursor-pointer">
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
                    <span className="text-[#C5C6C7] text-sm flex items-center gap-1">
                      <Percent className="w-3 h-3" /> Commission
                    </span>
                    <span className="text-white font-mono">{psp.commission_rate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#C5C6C7] text-sm flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Chargeback
                    </span>
                    <span className="text-white font-mono">{psp.chargeback_rate || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#C5C6C7] text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Holding
                    </span>
                    <span className="text-white font-mono">{psp.holding_days || 0} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#C5C6C7] text-sm flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Settlement
                    </span>
                    <span className="text-white font-mono">T+{psp.settlement_days}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#C5C6C7] text-sm">Pending</span>
                    <span className="text-yellow-400 font-mono">${(psp.pending_amount || 0).toLocaleString()}</span>
                  </div>
                  {psp.overdue_count > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-red-400 text-sm flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Overdue
                      </span>
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{psp.overdue_count} transactions</Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[#C5C6C7] text-sm">Status</span>
                    {getStatusBadge(psp.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View PSP Details Dialog */}
      <Dialog open={!!viewPsp} onOpenChange={() => { setViewPsp(null); setPendingTransactions([]); setSettlements([]); }}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-3" style={{ fontFamily: 'Barlow Condensed' }}>
              <CreditCard className="w-6 h-6 text-[#66FCF1]" />
              {viewPsp?.psp_name}
            </DialogTitle>
          </DialogHeader>
          {viewPsp && (
            <div className="space-y-4">
              {/* PSP Info */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-[#0B0C10] rounded-sm">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Commission Rate</p>
                  <p className="text-xl font-mono text-white">{viewPsp.commission_rate}%</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Chargeback Rate</p>
                  <p className="text-xl font-mono text-white">{viewPsp.chargeback_rate || 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Holding Time</p>
                  <p className="text-xl font-mono text-white">{viewPsp.holding_days || 0} days</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Settlement Time</p>
                  <p className="text-xl font-mono text-white">T+{viewPsp.settlement_days}</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Pending Amount</p>
                  <p className="text-xl font-mono text-yellow-400">${(viewPsp.pending_amount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Settlement To</p>
                  <p className="text-sm text-white">{viewPsp.settlement_destination_name}</p>
                  <p className="text-xs text-[#C5C6C7]">{viewPsp.settlement_destination_bank}</p>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="bg-[#0B0C10] border border-white/10">
                  <TabsTrigger value="pending" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
                    Pending Settlements ({pendingTransactions.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
                    Settlement History
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="pending" className="mt-4">
                  <ScrollArea className="h-[350px]">
                    {pendingTransactions.length === 0 ? (
                      <div className="text-center py-8 text-[#C5C6C7]">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                        No pending settlements
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Reference</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Gross</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Deductions</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Net</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Holding</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Release Date</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Status</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingTransactions.map((tx) => {
                            const overdue = isOverdue(tx.psp_expected_settlement_date);
                            const holdingReleaseOverdue = isOverdue(tx.psp_holding_release_date);
                            const netAmount = (tx.amount || 0) - (tx.psp_commission_amount || 0) - (tx.psp_chargeback_amount || 0) - (tx.psp_extra_charges || 0);
                            const totalDeductions = (tx.psp_commission_amount || 0) + (tx.psp_chargeback_amount || 0) + (tx.psp_extra_charges || 0);
                            const holdingDays = tx.psp_holding_days || viewPsp?.holding_days || 0;
                            const isReleased = tx.psp_holding_release_date && new Date(tx.psp_holding_release_date) <= new Date();
                            return (
                              <TableRow key={tx.transaction_id} className={`border-white/5 hover:bg-white/5 ${overdue ? 'bg-red-500/5' : ''}`}>
                                <TableCell>
                                  <div>
                                    <span className="font-mono text-white text-xs">{tx.reference}</span>
                                    <p className="text-[10px] text-[#C5C6C7]">{tx.client_name}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-white">${tx.amount?.toLocaleString()}</TableCell>
                                <TableCell>
                                  <div className="text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-[#C5C6C7]">Comm:</span>
                                      <span className="font-mono text-yellow-400">-${(tx.psp_commission_amount || 0).toLocaleString()}</span>
                                    </div>
                                    {tx.psp_chargeback_amount > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-[#C5C6C7]">CB:</span>
                                        <span className="font-mono text-red-400">-${tx.psp_chargeback_amount.toLocaleString()}</span>
                                      </div>
                                    )}
                                    {tx.psp_extra_charges > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-[#C5C6C7]">Extra:</span>
                                        <span className="font-mono text-red-400">-${tx.psp_extra_charges.toLocaleString()}</span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-[#66FCF1] font-bold">${netAmount.toLocaleString()}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Timer className="w-3 h-3 text-[#C5C6C7]" />
                                    <span className="text-white font-mono text-xs">{holdingDays} days</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {tx.psp_holding_release_date ? (
                                    <span className={`flex items-center gap-1 text-xs ${isReleased ? 'text-green-400' : 'text-[#C5C6C7]'}`}>
                                      {isReleased ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                      {formatDate(tx.psp_holding_release_date)}
                                    </span>
                                  ) : (
                                    <span className="text-[#C5C6C7] text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {tx.settlement_status === 'awaiting' ? (
                                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Awaiting</Badge>
                                  ) : isReleased ? (
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Ready</Badge>
                                  ) : (
                                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Holding</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openChargesDialog(tx)}
                                      className="text-[#C5C6C7] hover:text-white hover:bg-white/10 px-2"
                                      title="Record Charges (Chargeback/Extra)"
                                    >
                                      <Receipt className="w-3 h-3" />
                                    </Button>
                                    {isAdmin && (
                                      <Button
                                        size="sm"
                                        onClick={() => openRecordPaymentDialog(tx)}
                                        className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 px-2"
                                        data-testid={`record-payment-${tx.transaction_id}`}
                                        title="Record Payment Received"
                                      >
                                        <Wallet className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="history" className="mt-4">
                  <ScrollArea className="h-[300px]">
                    {settlements.length === 0 ? (
                      <div className="text-center py-8 text-[#C5C6C7]">
                        No settlement history
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Settlement ID</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Gross</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Commission</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Chargeback</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Extra</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Net</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settlements.map((settlement) => (
                            <TableRow key={settlement.settlement_id} className="border-white/5 hover:bg-white/5">
                              <TableCell className="font-mono text-white text-xs">{settlement.settlement_id}</TableCell>
                              <TableCell className="font-mono text-white">${settlement.gross_amount?.toLocaleString()}</TableCell>
                              <TableCell className="font-mono text-yellow-400">-${(settlement.commission_amount || 0).toLocaleString()}</TableCell>
                              <TableCell className="font-mono text-red-400">
                                {settlement.chargeback_amount ? `-$${settlement.chargeback_amount.toLocaleString()}` : '-'}
                              </TableCell>
                              <TableCell className="font-mono text-red-400">
                                {settlement.extra_charges ? `-$${settlement.extra_charges.toLocaleString()}` : '-'}
                              </TableCell>
                              <TableCell className="font-mono text-[#66FCF1] font-bold">${settlement.net_amount?.toLocaleString()}</TableCell>
                              <TableCell>{getStatusBadge(settlement.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settle Transaction Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={() => { setSettleDialogOpen(false); setSelectedTransaction(null); setSettlementDestination(''); }}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              Confirm Settlement
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0B0C10] rounded-sm space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#C5C6C7]">Reference</span>
                  <span className="text-white font-mono">{selectedTransaction.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C5C6C7]">Client</span>
                  <span className="text-white">{selectedTransaction.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C5C6C7]">Gross Amount</span>
                  <span className="text-white font-mono">${selectedTransaction.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C5C6C7]">Commission ({selectedTransaction.psp_commission_paid_by === 'client' ? 'Client pays' : 'Broker pays'})</span>
                  <span className="text-red-400 font-mono">-${selectedTransaction.psp_commission_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10">
                  <span className="text-[#C5C6C7] font-medium">Net to Settle</span>
                  <span className="text-green-400 font-mono text-lg">${selectedTransaction.psp_net_amount?.toLocaleString()}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Settlement Destination</Label>
                <Select
                  value={settlementDestination || (psps.find(p => p.psp_id === selectedTransaction.psp_id)?.settlement_destination_id || '')}
                  onValueChange={setSettlementDestination}
                >
                  <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white">
                    <SelectValue placeholder="Select treasury account" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F2833] border-white/10">
                    {treasuryAccounts.map((account) => (
                      <SelectItem key={account.account_id} value={account.account_id} className="text-white hover:bg-white/5">
                        {account.account_name} - {account.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setSettleDialogOpen(false); setSelectedTransaction(null); setSettlementDestination(''); }}
                  className="border-white/10 text-[#C5C6C7] hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSettleTransaction}
                  className="bg-green-500 text-white hover:bg-green-600 font-bold uppercase tracking-wider"
                  data-testid="confirm-settle-btn"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Settlement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Charges Dialog */}
      <Dialog open={chargesDialogOpen} onOpenChange={(open) => { if (!open) { setChargesDialogOpen(false); setSelectedTransaction(null); } }}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              Record Charges
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <form onSubmit={handleRecordCharges} className="space-y-4">
              <div className="p-3 bg-[#0B0C10] rounded-lg">
                <p className="text-sm text-[#C5C6C7]">Transaction: <span className="text-white font-mono">{selectedTransaction.transaction_id}</span></p>
                <p className="text-sm text-[#C5C6C7]">Amount: <span className="text-white font-mono">${selectedTransaction.amount?.toLocaleString()}</span></p>
                <p className="text-sm text-[#C5C6C7]">Commission: <span className="text-yellow-400 font-mono">-${(selectedTransaction.psp_commission_amount || 0).toLocaleString()}</span></p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Chargeback Amount (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={chargesForm.chargeback_amount}
                  onChange={(e) => setChargesForm({ ...chargesForm, chargeback_amount: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white font-mono"
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Extra Charges (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={chargesForm.extra_charges}
                  onChange={(e) => setChargesForm({ ...chargesForm, extra_charges: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white font-mono"
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Description</Label>
                <Input
                  value={chargesForm.charges_description}
                  onChange={(e) => setChargesForm({ ...chargesForm, charges_description: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white"
                  placeholder="Reason for charges..."
                />
              </div>
              
              {/* Settlement Preview */}
              <div className="p-3 bg-[#0B0C10] rounded-lg border border-white/10">
                <p className="text-xs text-[#C5C6C7] uppercase mb-2">Settlement Preview</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#C5C6C7]">Gross Amount</span>
                    <span className="text-white font-mono">${(selectedTransaction.amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#C5C6C7]">Commission</span>
                    <span className="text-red-400 font-mono">-${(selectedTransaction.psp_commission_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#C5C6C7]">Chargeback</span>
                    <span className="text-red-400 font-mono">-${parseFloat(chargesForm.chargeback_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#C5C6C7]">Extra Charges</span>
                    <span className="text-red-400 font-mono">-${parseFloat(chargesForm.extra_charges || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10">
                    <span className="text-white font-bold">Net Settlement</span>
                    <span className="text-[#66FCF1] font-mono font-bold">
                      ${((selectedTransaction.amount || 0) - (selectedTransaction.psp_commission_amount || 0) - parseFloat(chargesForm.chargeback_amount || 0) - parseFloat(chargesForm.extra_charges || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setChargesDialogOpen(false)} className="border-white/10 text-[#C5C6C7]">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#66FCF1] hover:bg-[#66FCF1]/90 text-[#0B0C10] font-bold uppercase">
                  Save Charges
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Payment Received Dialog */}
      <Dialog open={recordPaymentDialogOpen} onOpenChange={(open) => { if (!open) { setRecordPaymentDialogOpen(false); setSelectedTransaction(null); } }}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}>
              <Wallet className="w-5 h-5 text-green-400" />
              Record Payment Received
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              {/* Transaction Summary */}
              <div className="p-4 bg-[#0B0C10] rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#C5C6C7]">Reference</span>
                  <span className="text-white font-mono">{selectedTransaction.reference}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#C5C6C7]">Client</span>
                  <span className="text-white">{selectedTransaction.client_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#C5C6C7]">PSP</span>
                  <span className="text-white">{selectedTransaction.psp_name}</span>
                </div>
                <div className="border-t border-white/10 pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#C5C6C7]">Gross Amount</span>
                    <span className="text-white font-mono">${(selectedTransaction.amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#C5C6C7]">Commission</span>
                    <span className="text-yellow-400 font-mono">-${(selectedTransaction.psp_commission_amount || 0).toLocaleString()}</span>
                  </div>
                  {selectedTransaction.psp_chargeback_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#C5C6C7]">Chargeback</span>
                      <span className="text-red-400 font-mono">-${selectedTransaction.psp_chargeback_amount.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedTransaction.psp_extra_charges > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#C5C6C7]">Extra Charges</span>
                      <span className="text-red-400 font-mono">-${selectedTransaction.psp_extra_charges.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-white/10 mt-2">
                    <span className="text-white font-bold">Expected Net</span>
                    <span className="text-[#66FCF1] font-mono font-bold">
                      ${((selectedTransaction.amount || 0) - (selectedTransaction.psp_commission_amount || 0) - (selectedTransaction.psp_chargeback_amount || 0) - (selectedTransaction.psp_extra_charges || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Holding Info */}
              {selectedTransaction.psp_holding_days > 0 && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-400 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>Holding Period: {selectedTransaction.psp_holding_days} days</span>
                  </div>
                  {selectedTransaction.psp_holding_release_date && (
                    <p className="text-xs text-[#C5C6C7] mt-1 ml-6">
                      Release Date: {formatDate(selectedTransaction.psp_holding_release_date)}
                    </p>
                  )}
                </div>
              )}

              {/* Actual Amount Received */}
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Actual Amount Received (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.actual_amount_received}
                  onChange={(e) => setPaymentForm({ ...paymentForm, actual_amount_received: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white font-mono text-lg"
                  placeholder="Enter actual amount received"
                  data-testid="actual-amount-received"
                />
                <p className="text-xs text-[#C5C6C7]">Leave as-is if the amount matches the expected net settlement</p>
              </div>

              {/* Settlement Destination */}
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Credit to Treasury Account</Label>
                <Select
                  value={paymentForm.destination_account_id || (psps.find(p => p.psp_id === selectedTransaction.psp_id)?.settlement_destination_id || '')}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, destination_account_id: value })}
                >
                  <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white">
                    <SelectValue placeholder="Select treasury account" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F2833] border-white/10">
                    {treasuryAccounts.map((account) => (
                      <SelectItem key={account.account_id} value={account.account_id} className="text-white hover:bg-white/5">
                        {account.account_name} - {account.bank_name} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Variance Warning */}
              {paymentForm.actual_amount_received && parseFloat(paymentForm.actual_amount_received) !== ((selectedTransaction.amount || 0) - (selectedTransaction.psp_commission_amount || 0) - (selectedTransaction.psp_chargeback_amount || 0) - (selectedTransaction.psp_extra_charges || 0)) && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      Variance: ${(parseFloat(paymentForm.actual_amount_received) - ((selectedTransaction.amount || 0) - (selectedTransaction.psp_commission_amount || 0) - (selectedTransaction.psp_chargeback_amount || 0) - (selectedTransaction.psp_extra_charges || 0))).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setRecordPaymentDialogOpen(false); setSelectedTransaction(null); }}
                  className="border-white/10 text-[#C5C6C7] hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordPayment}
                  className="bg-green-500 text-white hover:bg-green-600 font-bold uppercase tracking-wider"
                  data-testid="confirm-record-payment-btn"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
