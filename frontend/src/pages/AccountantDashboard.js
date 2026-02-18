import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AccountantDashboard() {
  const { user } = useAuth();
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchPendingTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/transactions/pending`, { 
        headers: getAuthHeaders(), 
        credentials: 'include' 
      });
      if (response.ok) {
        setPendingTransactions(await response.json());
      }
    } catch (error) {
      console.error('Error fetching pending transactions:', error);
      toast.error('Failed to load pending transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingTransactions();
  }, []);

  const handleApprove = async (transactionId) => {
    setProcessingId(transactionId);
    try {
      const response = await fetch(`${API_URL}/api/transactions/${transactionId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Transaction approved');
        fetchPendingTransactions();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Approval failed');
      }
    } catch (error) {
      toast.error('Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (transactionId) => {
    setProcessingId(transactionId);
    try {
      const response = await fetch(`${API_URL}/api/transactions/${transactionId}/reject?reason=${encodeURIComponent(rejectReason)}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        toast.success('Transaction rejected');
        setShowRejectDialog(null);
        setRejectReason('');
        fetchPendingTransactions();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Rejection failed');
      }
    } catch (error) {
      toast.error('Rejection failed');
    } finally {
      setProcessingId(null);
    }
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
    <div className="space-y-6 animate-fade-in" data-testid="accountant-dashboard">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
          Pending Approvals
        </h1>
        <p className="text-[#C5C6C7]">Review and approve/reject transactions</p>
      </div>

      {/* Stats */}
      <Card className="bg-[#1F2833] border-white/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Pending Transactions</p>
              <p className="text-4xl font-bold font-mono text-yellow-400">{pendingTransactions.length}</p>
            </div>
            <div className="p-4 bg-yellow-500/10 rounded-sm">
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Transactions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pendingTransactions.length === 0 ? (
          <Card className="bg-[#1F2833] border-white/5">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <p className="text-white text-lg">All caught up!</p>
              <p className="text-[#C5C6C7] mt-2">No pending transactions to review</p>
            </CardContent>
          </Card>
        ) : (
          pendingTransactions.map((tx) => (
            <Card key={tx.transaction_id} className="bg-[#1F2833] border-white/5">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Transaction Info */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Reference</p>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-mono">{tx.reference}</p>
                        {tx.proof_image && <ImageIcon className="w-4 h-4 text-[#66FCF1]" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Client</p>
                      <p className="text-white">{tx.client_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Type</p>
                      {getTypeBadge(tx.transaction_type)}
                    </div>
                    <div>
                      <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Amount</p>
                      <p className={`font-mono text-lg font-bold ${['deposit', 'rebate'].includes(tx.transaction_type) ? 'text-green-400' : 'text-red-400'}`}>
                        {['deposit', 'rebate'].includes(tx.transaction_type) ? '+' : '-'}${tx.amount?.toLocaleString()} {tx.currency}
                      </p>
                    </div>
                  </div>

                  {/* Destination & Date */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Destination</p>
                      <p className="text-white">{tx.destination_account_name || 'N/A'}</p>
                      <p className="text-xs text-[#C5C6C7]">{tx.destination_bank_name || ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Created</p>
                      <p className="text-white text-sm">{formatDate(tx.created_at)}</p>
                      <p className="text-xs text-[#C5C6C7]">by {tx.created_by_name || 'System'}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewTransaction(tx)}
                      className="text-[#C5C6C7] hover:text-white hover:bg-white/5"
                      data-testid={`view-tx-${tx.transaction_id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleApprove(tx.transaction_id)}
                      disabled={processingId === tx.transaction_id}
                      className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                      data-testid={`approve-tx-${tx.transaction_id}`}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => setShowRejectDialog(tx.transaction_id)}
                      disabled={processingId === tx.transaction_id}
                      className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                      data-testid={`reject-tx-${tx.transaction_id}`}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Reference</p>
                  <p className="text-white font-mono text-lg">{viewTransaction.reference}</p>
                </div>
                <Badge className="status-pending text-xs uppercase">Pending</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Client</p>
                  <p className="text-white">{viewTransaction.client_name}</p>
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
              {viewTransaction.destination_account_name && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Destination</p>
                  <p className="text-white">{viewTransaction.destination_account_name}</p>
                  <p className="text-sm text-[#C5C6C7]">{viewTransaction.destination_bank_name}</p>
                </div>
              )}
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
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    handleApprove(viewTransaction.transaction_id);
                    setViewTransaction(null);
                  }}
                  className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    setShowRejectDialog(viewTransaction.transaction_id);
                    setViewTransaction(null);
                  }}
                  className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!showRejectDialog} onOpenChange={() => { setShowRejectDialog(null); setRejectReason(''); }}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}>
              <AlertCircle className="w-6 h-6 text-red-400" />
              Reject Transaction
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[#C5C6C7]">Please provide a reason for rejecting this transaction:</p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
              rows={3}
              data-testid="reject-reason"
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowRejectDialog(null); setRejectReason(''); }}
                className="flex-1 border-white/10 text-[#C5C6C7] hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleReject(showRejectDialog)}
                disabled={processingId === showRejectDialog}
                className="flex-1 bg-red-500 text-white hover:bg-red-600"
                data-testid="confirm-reject-btn"
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
