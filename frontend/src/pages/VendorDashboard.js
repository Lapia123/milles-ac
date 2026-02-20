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
} from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  Store,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Upload,
  Image as ImageIcon,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function VendorDashboard() {
  const { user } = useAuth();
  const [vendorInfo, setVendorInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [captchaQuestion, setCaptchaQuestion] = useState({ num1: 0, num2: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaQuestion({ num1, num2 });
    setCaptchaAnswer('');
  };

  const fetchVendorInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/vendor/me`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setVendorInfo(data);
        setTransactions(data.pending_transactions || []);
      }
    } catch (error) {
      console.error('Error fetching vendor info:', error);
      toast.error('Failed to load vendor info');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!vendorInfo) return;
    try {
      const response = await fetch(`${API_URL}/api/vendors/${vendorInfo.vendor_id}/transactions`, { 
        headers: getAuthHeaders(), 
        credentials: 'include' 
      });
      if (response.ok) {
        setTransactions(await response.json());
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  useEffect(() => {
    fetchVendorInfo();
  }, []);

  useEffect(() => {
    if (vendorInfo) {
      fetchTransactions();
    }
  }, [vendorInfo]);

  const handleAction = (tx, action) => {
    setSelectedTransaction(tx);
    setActionType(action);
    generateCaptcha();
    setProofImage(null);
    setProofPreview(null);
    setRejectionReason('');
    setActionDialogOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const executeAction = async () => {
    // Verify captcha
    const expectedAnswer = captchaQuestion.num1 + captchaQuestion.num2;
    if (parseInt(captchaAnswer) !== expectedAnswer) {
      toast.error('Incorrect captcha answer');
      generateCaptcha();
      return;
    }

    try {
      let response;
      
      if (actionType === 'approve') {
        response = await fetch(`${API_URL}/api/vendor/transactions/${selectedTransaction.transaction_id}/approve`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
        });
      } else if (actionType === 'reject') {
        response = await fetch(`${API_URL}/api/vendor/transactions/${selectedTransaction.transaction_id}/reject?reason=${encodeURIComponent(rejectionReason)}`, {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
        });
      } else if (actionType === 'complete') {
        // For withdrawals - must upload proof
        if (!proofImage) {
          toast.error('Please upload proof of payment screenshot');
          return;
        }
        
        const formData = new FormData();
        formData.append('proof_image', proofImage);
        
        response = await fetch(`${API_URL}/api/vendor/transactions/${selectedTransaction.transaction_id}/complete`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
          },
          credentials: 'include',
          body: formData,
        });
      }

      if (response.ok) {
        toast.success(`Transaction ${actionType === 'complete' ? 'completed' : actionType + 'd'} successfully`);
        setActionDialogOpen(false);
        fetchTransactions();
        fetchVendorInfo();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Action failed');
      }
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'status-pending',
      approved: 'status-approved',
      completed: 'status-approved',
      rejected: 'status-rejected',
    };
    return <Badge className={`${styles[status] || 'status-pending'} text-xs uppercase`}>{status}</Badge>;
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

  const pendingCount = transactions.filter(t => t.status === 'pending').length;
  const pendingDeposits = transactions.filter(t => t.status === 'pending' && t.transaction_type === 'deposit');
  const pendingWithdrawals = transactions.filter(t => t.status === 'pending' && t.transaction_type === 'withdrawal');
  const approvedWithdrawals = transactions.filter(t => t.status === 'approved' && t.transaction_type === 'withdrawal');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="vendor-dashboard">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
            Vendor Portal
          </h1>
          <p className="text-[#C5C6C7]">Welcome, {vendorInfo?.vendor_name}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#1F2833] rounded-sm border border-white/10">
          <Store className="w-5 h-5 text-[#66FCF1]" />
          <span className="text-white font-medium">{vendorInfo?.vendor_name}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Settlement Balance - Highlighted */}
        <Card className="bg-[#1F2833] border-white/5 border-l-4 border-l-[#66FCF1] md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-[#66FCF1] uppercase tracking-wider mb-2">Settlement Balance</p>
                {vendorInfo?.settlement_by_currency && vendorInfo.settlement_by_currency.length > 0 ? (
                  <div className="space-y-2">
                    {vendorInfo.settlement_by_currency.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={`${
                            item.currency === 'USD' ? 'bg-green-500/20 text-green-400' :
                            item.currency === 'EUR' ? 'bg-blue-500/20 text-blue-400' :
                            item.currency === 'AED' ? 'bg-purple-500/20 text-purple-400' :
                            item.currency === 'GBP' ? 'bg-yellow-500/20 text-yellow-400' :
                            item.currency === 'INR' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {item.currency}
                          </Badge>
                          <span className="text-xs text-[#C5C6C7]">({item.transaction_count} txns)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold font-mono text-[#66FCF1]">
                            {item.amount?.toLocaleString()}
                          </span>
                          {item.currency !== 'USD' && (
                            <span className="text-xs text-[#C5C6C7] block">≈ ${item.usd_equivalent?.toLocaleString()} USD</span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                      <span className="text-[#C5C6C7] text-sm">Total USD Equivalent:</span>
                      <span className="text-xl font-bold font-mono text-white">
                        ${vendorInfo.settlement_by_currency.reduce((sum, item) => sum + (item.usd_equivalent || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-2xl font-bold font-mono text-[#66FCF1]">$0</p>
                )}
              </div>
              <div className="p-3 bg-[#66FCF1]/10 rounded-sm">
                <DollarSign className="w-6 h-6 text-[#66FCF1]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1F2833] border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Pending Actions</p>
                <p className="text-3xl font-bold font-mono text-white">{pendingCount}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-sm">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1F2833] border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Pending Deposits</p>
                <p className="text-3xl font-bold font-mono text-green-400">{pendingDeposits.length}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-sm">
                <ArrowDownRight className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`bg-[#1F2833] border-white/5 ${approvedWithdrawals.length > 0 ? 'border-l-2 border-l-orange-500' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Awaiting Proof</p>
                <p className="text-3xl font-bold font-mono text-orange-400">{approvedWithdrawals.length}</p>
                <p className="text-xs text-orange-400 mt-1">Withdrawals to complete</p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-sm">
                <Upload className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Volume & Commission Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#1F2833] border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Total Volume</p>
                <p className="text-2xl font-bold font-mono text-white">
                  ${vendorInfo?.total_volume?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1F2833] border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Total Commission Earned</p>
                <p className="text-2xl font-bold font-mono text-green-400">
                  ${vendorInfo?.total_commission?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1F2833] border-white/5">
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-xs text-[#C5C6C7] uppercase tracking-wider">Commission Rates</p>
              <div className="flex justify-between text-sm">
                <span className="text-[#C5C6C7]">Deposit:</span>
                <span className="text-white font-mono">{vendorInfo?.deposit_commission || 0}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#C5C6C7]">Withdrawal:</span>
                <span className="text-white font-mono">{vendorInfo?.withdrawal_commission || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="bg-[#1F2833] border-white/5">
        <CardHeader>
          <CardTitle className="text-xl text-white uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
            Assigned Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Reference</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Type</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Client</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Amount</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Currency</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Status</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Date</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-[#C5C6C7]">
                      No transactions assigned to you
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => {
                    // Use base currency/amount if available, otherwise use converted values
                    const displayCurrency = tx.base_currency || tx.currency || 'USD';
                    const displayAmount = tx.base_amount || tx.amount;
                    
                    return (
                    <TableRow key={tx.transaction_id} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-white">{tx.reference}</span>
                          {tx.proof_image && <ImageIcon className="w-4 h-4 text-[#66FCF1]" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 ${tx.transaction_type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.transaction_type === 'deposit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          <span className="capitalize">{tx.transaction_type}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-white">{tx.client_name}</TableCell>
                      <TableCell className={`font-mono font-medium ${tx.transaction_type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.transaction_type === 'deposit' ? '+' : '-'}{displayAmount?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${
                          displayCurrency === 'USD' ? 'bg-green-500/20 text-green-400' :
                          displayCurrency === 'EUR' ? 'bg-blue-500/20 text-blue-400' :
                          displayCurrency === 'AED' ? 'bg-purple-500/20 text-purple-400' :
                          displayCurrency === 'GBP' ? 'bg-yellow-500/20 text-yellow-400' :
                          displayCurrency === 'INR' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {displayCurrency}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-[#C5C6C7] text-sm">{formatDate(tx.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setViewTransaction(tx)}
                            className="text-[#C5C6C7] hover:text-white hover:bg-white/5"
                            data-testid={`view-tx-${tx.transaction_id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {tx.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleAction(tx, 'approve')}
                                className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                data-testid={`approve-tx-${tx.transaction_id}`}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleAction(tx, 'reject')}
                                className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                data-testid={`reject-tx-${tx.transaction_id}`}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          
                          {tx.status === 'approved' && tx.transaction_type === 'withdrawal' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleAction(tx, 'complete')}
                              className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                              data-testid={`complete-tx-${tx.transaction_id}`}
                            >
                              <Upload className="w-4 h-4 mr-1" /> Complete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )})
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* View Transaction Dialog */}
      <Dialog open={!!viewTransaction} onOpenChange={() => setViewTransaction(null)}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              Transaction Details
            </DialogTitle>
          </DialogHeader>
          {viewTransaction && (
            <div className="space-y-4">
              {(() => {
                const displayCurrency = viewTransaction.base_currency || viewTransaction.currency || 'USD';
                const displayAmount = viewTransaction.base_amount || viewTransaction.amount;
                return (
              <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Reference</p>
                  <p className="text-white font-mono text-lg">{viewTransaction.reference}</p>
                </div>
                {getStatusBadge(viewTransaction.status)}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Client</p>
                  <p className="text-white">{viewTransaction.client_name}</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Type</p>
                  <span className={`flex items-center gap-1 ${viewTransaction.transaction_type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                    {viewTransaction.transaction_type === 'deposit' ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    <span className="capitalize">{viewTransaction.transaction_type}</span>
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Amount</p>
                  <p className={`font-mono text-xl ${viewTransaction.transaction_type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                    {viewTransaction.transaction_type === 'deposit' ? '+' : '-'}{displayAmount?.toLocaleString()} {displayCurrency}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Currency</p>
                  <Badge className={`${
                    displayCurrency === 'USD' ? 'bg-green-500/20 text-green-400' :
                    displayCurrency === 'EUR' ? 'bg-blue-500/20 text-blue-400' :
                    displayCurrency === 'AED' ? 'bg-purple-500/20 text-purple-400' :
                    displayCurrency === 'GBP' ? 'bg-yellow-500/20 text-yellow-400' :
                    displayCurrency === 'INR' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {displayCurrency}
                  </Badge>
                </div>
                {viewTransaction.base_currency && viewTransaction.base_currency !== viewTransaction.currency && (
                  <div className="col-span-2">
                    <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">USD Equivalent</p>
                    <p className="text-white font-mono">${viewTransaction.amount?.toLocaleString()} USD</p>
                  </div>
                )}
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
              {viewTransaction.proof_image && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-2">Proof of Payment</p>
                  <img 
                    src={`data:image/png;base64,${viewTransaction.proof_image}`} 
                    alt="Proof of payment" 
                    className="max-w-full rounded border border-white/10"
                  />
                </div>
              )}
              {viewTransaction.vendor_proof_image && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-2">Vendor Proof (Withdrawal)</p>
                  <img 
                    src={`data:image/png;base64,${viewTransaction.vendor_proof_image}`} 
                    alt="Vendor proof" 
                    className="max-w-full rounded border border-white/10"
                  />
                </div>
              )}
              </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog (Approve/Reject/Complete) */}
      <Dialog open={actionDialogOpen} onOpenChange={() => { setActionDialogOpen(false); setSelectedTransaction(null); }}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              {actionType === 'approve' && 'Approve Transaction'}
              {actionType === 'reject' && 'Reject Transaction'}
              {actionType === 'complete' && 'Complete Withdrawal'}
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              {(() => {
                const displayCurrency = selectedTransaction.base_currency || selectedTransaction.currency || 'USD';
                const displayAmount = selectedTransaction.base_amount || selectedTransaction.amount;
                return (
              <>
              <div className="p-4 bg-[#0B0C10] rounded-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#C5C6C7]">Reference</span>
                  <span className="text-white font-mono">{selectedTransaction.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C5C6C7]">Client</span>
                  <span className="text-white">{selectedTransaction.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C5C6C7]">Type</span>
                  <span className={selectedTransaction.transaction_type === 'deposit' ? 'text-green-400' : 'text-red-400'}>
                    {selectedTransaction.transaction_type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C5C6C7]">Amount</span>
                  <span className="text-white font-mono">{displayAmount?.toLocaleString()} {displayCurrency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C5C6C7]">Currency</span>
                  <Badge className={`${
                    displayCurrency === 'USD' ? 'bg-green-500/20 text-green-400' :
                    displayCurrency === 'EUR' ? 'bg-blue-500/20 text-blue-400' :
                    displayCurrency === 'AED' ? 'bg-purple-500/20 text-purple-400' :
                    displayCurrency === 'GBP' ? 'bg-yellow-500/20 text-yellow-400' :
                    displayCurrency === 'INR' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {displayCurrency}
                  </Badge>
                </div>
                {selectedTransaction.base_currency && selectedTransaction.base_currency !== selectedTransaction.currency && (
                  <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                    <span className="text-[#C5C6C7]">USD Equivalent</span>
                    <span className="text-[#66FCF1] font-mono">${selectedTransaction.amount?.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {actionType === 'reject' && (
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Rejection Reason</Label>
                  <Input
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                    placeholder="Enter reason for rejection"
                    data-testid="rejection-reason"
                  />
                </div>
              )}

              {actionType === 'complete' && (
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Upload Proof of Payment *</Label>
                  <div className="border-2 border-dashed border-white/10 rounded-sm p-4 text-center hover:border-[#66FCF1]/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="vendor-proof-upload"
                      data-testid="vendor-proof-upload"
                    />
                    <label htmlFor="vendor-proof-upload" className="cursor-pointer">
                      {proofPreview ? (
                        <div className="space-y-2">
                          <img src={proofPreview} alt="Proof preview" className="max-h-32 mx-auto rounded" />
                          <p className="text-xs text-[#66FCF1]">Click to change</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-[#C5C6C7]" />
                          <p className="text-sm text-[#C5C6C7]">Click to upload proof screenshot</p>
                          <p className="text-xs text-[#C5C6C7]/60">PNG, JPG up to 5MB</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Captcha */}
              <div className="p-4 bg-[#0B0C10] rounded-sm border border-white/10">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider mb-2 block">
                  Security Verification
                </Label>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-mono text-[#66FCF1]">
                    {captchaQuestion.num1} + {captchaQuestion.num2} = ?
                  </span>
                  <Input
                    type="number"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    className="w-24 bg-[#1F2833] border-white/10 text-white focus:border-[#66FCF1] font-mono text-center"
                    placeholder="?"
                    data-testid="captcha-answer"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setActionDialogOpen(false); setSelectedTransaction(null); }}
                  className="border-white/10 text-[#C5C6C7] hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={executeAction}
                  className={`font-bold uppercase tracking-wider ${
                    actionType === 'approve' ? 'bg-green-500 hover:bg-green-600' :
                    actionType === 'reject' ? 'bg-red-500 hover:bg-red-600' :
                    'bg-orange-500 hover:bg-orange-600'
                  } text-white`}
                  data-testid="confirm-action-btn"
                >
                  {actionType === 'approve' && <><CheckCircle2 className="w-4 h-4 mr-2" /> Approve</>}
                  {actionType === 'reject' && <><XCircle className="w-4 h-4 mr-2" /> Reject</>}
                  {actionType === 'complete' && <><Upload className="w-4 h-4 mr-2" /> Complete</>}
                </Button>
              </div>
              </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
