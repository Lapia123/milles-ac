import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
  Calculator,
  Wallet,
  Store,
  Building2,
  Banknote,
  Upload,
  CreditCard,
  Filter,
  AlertTriangle,
  DollarSign,
  HandCoins,
  ReceiptText,
  Landmark,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Math Captcha Component
const MathCaptcha = ({ onVerified, onCancel, actionType }) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const generateCaptcha = useCallback(() => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setNum1(n1);
    setNum2(n2);
    setAnswer('');
    setError('');
  }, []);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const correctAnswer = num1 + num2;
    if (parseInt(answer) === correctAnswer) {
      onVerified();
    } else {
      setError('Incorrect answer. Please try again.');
      generateCaptcha();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[#66FCF1]">
        <Calculator className="w-5 h-5" />
        <span className="text-sm uppercase tracking-wider">Security Verification</span>
      </div>
      <div className="p-4 bg-slate-50 rounded-sm border border-slate-200">
        <p className="text-[#C5C6C7] text-sm mb-3">
          Please solve this math problem to {actionType === 'approve' ? 'approve' : 'reject'}:
        </p>
        <div className="flex items-center justify-center gap-4 text-3xl font-mono text-white">
          <span>{num1}</span>
          <span className="text-[#66FCF1]">+</span>
          <span>{num2}</span>
          <span className="text-[#C5C6C7]">=</span>
          <span className="text-[#66FCF1]">?</span>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Your Answer</Label>
          <Input
            type="number"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="bg-slate-50 border-slate-200 text-white focus:border-[#66FCF1] font-mono text-xl text-center"
            placeholder="Enter the sum"
            autoFocus
            data-testid="captcha-answer"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 border-slate-200 text-[#C5C6C7] hover:bg-white/5">Cancel</Button>
          <Button type="submit" className={`flex-1 ${actionType === 'approve' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'}`} data-testid="captcha-submit">
            Verify & {actionType === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default function AccountantDashboard() {
  const { user } = useAuth();
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [pendingIE, setPendingIE] = useState([]);
  const [pendingLoans, setPendingLoans] = useState([]);
  const [pendingRepayments, setPendingRepayments] = useState([]);
  const [pendingPSPSettlements, setPendingPSPSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewTransaction, setViewTransaction] = useState(null);
  const [viewSettlement, setViewSettlement] = useState(null);
  const [viewItem, setViewItem] = useState(null); // Generic view for IE/Loan/Repayment/PSP
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(null);
  const [showSettlementRejectDialog, setShowSettlementRejectDialog] = useState(null);
  const [showGenericRejectDialog, setShowGenericRejectDialog] = useState(null); // { type, id }
  const [processingId, setProcessingId] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions');
  const [uploadingProof, setUploadingProof] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [destFilter, setDestFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('');
  const [clientTags, setClientTags] = useState([]);
  
  // Withdrawal approval dialog
  const [showApprovalDialog, setShowApprovalDialog] = useState(null);
  const [approvalSourceAccount, setApprovalSourceAccount] = useState('');
  const [approvalProof, setApprovalProof] = useState(null);
  const [approvalProofPreview, setApprovalProofPreview] = useState(null);
  const [bankReceiptDate, setBankReceiptDate] = useState('');
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [psps, setPsps] = useState([]);
  
  // Captcha states
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaAction, setCaptchaAction] = useState(null);
  
  // Generic approval dialog (for IE, Loan, Repayment, PSP Settlement, Vendor Settlement)
  const [showGenericApprovalDialog, setShowGenericApprovalDialog] = useState(null); // { type, id, item }
  const [genericApprovalDate, setGenericApprovalDate] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchTreasuryAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/treasury?page_size=200`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const d = await response.json();
        setTreasuryAccounts(d.items || d);
      }
    } catch (error) {
      console.error('Error fetching treasury accounts:', error);
    }
  };

  const fetchPsps = async () => {
    try {
      const response = await fetch(`${API_URL}/api/psp`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const d = await response.json();
        setPsps(Array.isArray(d) ? d : d.items || []);
      }
    } catch (error) {
      console.error('Error fetching PSPs:', error);
    }
  };

  const fetchPendingTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/transactions/pending`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) setPendingTransactions(await response.json());
    } catch (error) {
      console.error('Error fetching pending transactions:', error);
    }
  };

  const fetchPendingSettlements = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settlements/pending`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) setPendingSettlements(await response.json());
    } catch (error) {
      console.error('Error fetching pending settlements:', error);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const response = await fetch(`${API_URL}/api/pending-approvals/all`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setPendingIE(data.income_expenses || []);
        setPendingLoans(data.loans || []);
        setPendingRepayments(data.loan_repayments || []);
        setPendingPSPSettlements(data.psp_settlements || []);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    }
  };

  const fetchClientTags = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tags/clients`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) setClientTags(await response.json());
    } catch (error) {
      console.error('Error fetching client tags:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPendingTransactions(), fetchPendingSettlements(), fetchPendingApprovals(), fetchTreasuryAccounts(), fetchPsps(), fetchClientTags()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useAutoRefresh(() => {
    fetchPendingTransactions();
    fetchPendingSettlements();
    fetchPendingApprovals();
  }, 15000);

  // ---- Transaction Approve/Reject (existing logic) ----
  const initiateApprove = (transactionId, isSettlement = false) => {
    if (isSettlement) {
      // Vendor settlements also go through the date approval dialog
      const s = pendingSettlements.find(st => st.settlement_id === transactionId);
      setShowGenericApprovalDialog({ type: 'vendor_settlement', id: transactionId, item: s || null });
      setGenericApprovalDate(getItemOriginalDate('vendor_settlement', s));
      return;
    }
    const tx = pendingTransactions.find(t => t.transaction_id === transactionId);
    if (tx && (tx.transaction_type === 'withdrawal' || tx.transaction_type === 'deposit')) {
      setShowApprovalDialog(tx);
      setBankReceiptDate(tx.transaction_date || new Date().toISOString().split('T')[0]);
      return;
    }
    setCaptchaAction({ type: 'approve', transactionId, isSettlement });
    setShowCaptcha(true);
  };

  const initiateReject = (transactionId, isSettlement = false) => {
    setCaptchaAction({ type: 'reject', transactionId, isSettlement });
    if (isSettlement) {
      setShowSettlementRejectDialog(transactionId);
    } else {
      setShowRejectDialog(transactionId);
    }
  };

  const handleApprovalProofChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setApprovalProof(file);
      const reader = new FileReader();
      reader.onloadend = () => setApprovalProofPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleTransactionApproval = () => {
    const isWithdrawal = showApprovalDialog.transaction_type === 'withdrawal';
    if (isWithdrawal && !approvalSourceAccount) { toast.error('Please select a source treasury/USDT account'); return; }
    if (!approvalProof) { toast.error('Please upload proof of payment screenshot'); return; }
    setCaptchaAction({ type: 'approve', transactionId: showApprovalDialog.transaction_id, isSettlement: false, sourceAccount: isWithdrawal ? approvalSourceAccount : null, proofFile: approvalProof, bankReceiptDate: bankReceiptDate || null });
    setShowApprovalDialog(null);
    setShowCaptcha(true);
  };

  const handleCaptchaVerified = async () => {
    if (!captchaAction) return;
    setShowCaptcha(false);
    if (captchaAction.type === 'approve') {
      if (captchaAction.isSettlement) await executeApproveSettlement(captchaAction.transactionId, captchaAction.approvalDate);
      else if (captchaAction.genericType) await executeGenericApprove(captchaAction.genericType, captchaAction.genericId, captchaAction.approvalDate);
      else await executeApprove(captchaAction.transactionId, captchaAction.sourceAccount, captchaAction.proofFile, captchaAction.bankReceiptDate);
    } else if (captchaAction.type === 'reject') {
      if (captchaAction.isSettlement) await executeRejectSettlement(captchaAction.transactionId);
      else if (captchaAction.genericType) await executeGenericReject(captchaAction.genericType, captchaAction.genericId);
      else await executeReject(captchaAction.transactionId);
    }
    setApprovalSourceAccount('');
    setApprovalProof(null);
    setApprovalProofPreview(null);
    setCaptchaAction(null);
  };

  const executeApprove = async (transactionId, sourceAccount = null, proofFile = null, receiptDate = null) => {
    setProcessingId(transactionId);
    try {
      if (proofFile) {
        const formData = new FormData();
        formData.append('proof_image', proofFile);
        const uploadResponse = await fetch(`${API_URL}/api/transactions/${transactionId}/upload-proof`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, credentials: 'include', body: formData,
        });
        if (!uploadResponse.ok) { const error = await uploadResponse.json(); toast.error(error.detail || 'Failed to upload proof'); return; }
      }
      const params = new URLSearchParams();
      if (sourceAccount) params.append('source_account_id', sourceAccount);
      if (receiptDate) params.append('bank_receipt_date', receiptDate);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${API_URL}/api/transactions/${transactionId}/approve${queryStr}`, { method: 'POST', headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) { toast.success('Transaction approved'); fetchPendingTransactions(); }
      else { const error = await response.json(); toast.error(error.detail || 'Approval failed'); }
    } catch { toast.error('Approval failed'); }
    finally { setProcessingId(null); }
  };

  const handleRejectWithCaptcha = () => { setShowRejectDialog(null); setShowCaptcha(true); };
  const handleSettlementRejectWithCaptcha = () => { setShowSettlementRejectDialog(null); setShowCaptcha(true); };

  const executeReject = async (transactionId) => {
    setProcessingId(transactionId);
    try {
      const response = await fetch(`${API_URL}/api/transactions/${transactionId}/reject?reason=${encodeURIComponent(rejectReason)}`, { method: 'POST', headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) { toast.success('Transaction rejected'); setRejectReason(''); fetchPendingTransactions(); }
      else { const error = await response.json(); toast.error(error.detail || 'Rejection failed'); }
    } catch { toast.error('Rejection failed'); }
    finally { setProcessingId(null); }
  };

  const executeApproveSettlement = async (settlementId, approvalDate = null) => {
    setProcessingId(settlementId);
    try {
      const params = new URLSearchParams();
      if (approvalDate) params.append('approval_date', approvalDate);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${API_URL}/api/settlements/${settlementId}/approve${queryStr}`, { method: 'POST', headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) { toast.success('Settlement approved'); fetchPendingSettlements(); }
      else { const error = await response.json(); toast.error(error.detail || 'Settlement approval failed'); }
    } catch { toast.error('Settlement approval failed'); }
    finally { setProcessingId(null); }
  };

  const executeRejectSettlement = async (settlementId) => {
    setProcessingId(settlementId);
    try {
      const response = await fetch(`${API_URL}/api/settlements/${settlementId}/reject?reason=${encodeURIComponent(rejectReason)}`, { method: 'POST', headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) { toast.success('Settlement rejected'); setRejectReason(''); fetchPendingSettlements(); }
      else { const error = await response.json(); toast.error(error.detail || 'Settlement rejection failed'); }
    } catch { toast.error('Settlement rejection failed'); }
    finally { setProcessingId(null); }
  };

  // ---- Generic Approve/Reject for IE, Loans, Repayments, PSP Settlements ----
  const getItemOriginalDate = (type, item) => {
    if (!item) return new Date().toISOString().split('T')[0];
    let raw = null;
    if (type === 'ie') raw = item.date || item.created_at;
    else if (type === 'loan') raw = item.loan_date || item.created_at;
    else if (type === 'repayment') raw = item.payment_date || item.created_at;
    else if (type === 'psp_settlement') raw = item.settlement_date || item.created_at;
    else if (type === 'vendor_settlement') raw = item.created_at;
    if (!raw) return new Date().toISOString().split('T')[0];
    return raw.split('T')[0];
  };

  const initiateGenericApprove = (type, id, item = null) => {
    setShowGenericApprovalDialog({ type, id, item });
    setGenericApprovalDate(getItemOriginalDate(type, item));
  };

  const handleGenericApprovalConfirm = () => {
    if (!showGenericApprovalDialog) return;
    const { type, id } = showGenericApprovalDialog;
    const approvalDate = genericApprovalDate || null;
    if (type === 'vendor_settlement') {
      setCaptchaAction({ type: 'approve', transactionId: id, isSettlement: true, approvalDate });
    } else {
      setCaptchaAction({ type: 'approve', genericType: type, genericId: id, approvalDate });
    }
    setShowGenericApprovalDialog(null);
    setShowCaptcha(true);
  };

  const initiateGenericReject = (type, id) => {
    setCaptchaAction({ type: 'reject', genericType: type, genericId: id });
    setShowGenericRejectDialog({ type, id });
  };

  const handleGenericRejectWithCaptcha = () => {
    setShowGenericRejectDialog(null);
    setShowCaptcha(true);
  };

  const executeGenericApprove = async (type, id, approvalDate = null) => {
    setProcessingId(id);
    const urlMap = {
      ie: `/api/income-expenses/${id}/approve`,
      loan: `/api/loans/${id}/approve-disbursement`,
      repayment: `/api/loan-repayments/${id}/approve`,
      psp_settlement: `/api/psp-settlements/${id}/approve`,
    };
    try {
      const params = new URLSearchParams();
      if (approvalDate) params.append('approval_date', approvalDate);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${API_URL}${urlMap[type]}${queryStr}`, { method: 'POST', headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        toast.success('Approved successfully');
        fetchPendingApprovals();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Approval failed');
      }
    } catch { toast.error('Approval failed'); }
    finally { setProcessingId(null); }
  };

  const executeGenericReject = async (type, id) => {
    setProcessingId(id);
    const urlMap = {
      ie: `/api/income-expenses/${id}/reject`,
      loan: `/api/loans/${id}/reject-disbursement`,
      repayment: `/api/loan-repayments/${id}/reject`,
      psp_settlement: `/api/psp-settlements/${id}/reject`,
    };
    try {
      const response = await fetch(`${API_URL}${urlMap[type]}?reason=${encodeURIComponent(rejectReason)}`, { method: 'POST', headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        toast.success('Rejected successfully');
        setRejectReason('');
        fetchPendingApprovals();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Rejection failed');
      }
    } catch { toast.error('Rejection failed'); }
    finally { setProcessingId(null); }
  };

  const handleProofUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingProof) return;
    const reader = new FileReader();
    reader.onloadend = () => setProofPreview(reader.result);
    reader.readAsDataURL(file);
    setProcessingId(uploadingProof.transaction_id);
    try {
      const formData = new FormData();
      formData.append('proof_image', file);
      const response = await fetch(`${API_URL}/api/transactions/${uploadingProof.transaction_id}/upload-proof`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }, credentials: 'include', body: formData,
      });
      if (response.ok) { toast.success('Proof of payment uploaded'); setUploadingProof(null); setProofPreview(null); fetchPendingTransactions(); }
      else { const error = await response.json(); toast.error(error.detail || 'Upload failed'); }
    } catch { toast.error('Upload failed'); }
    finally { setProcessingId(null); }
  };

  const getTypeBadge = (type) => {
    const isIncoming = ['deposit', 'rebate', 'income'].includes(type);
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
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    if (amount == null) return '-';
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const filteredTransactions = pendingTransactions.filter(tx => {
    if (typeFilter !== 'all' && tx.transaction_type !== typeFilter) return false;
    if (destFilter !== 'all' && tx.destination_type !== destFilter) return false;
    if (clientFilter && !tx.client_name?.toLowerCase().includes(clientFilter.toLowerCase())) return false;
    return true;
  });

  const totalPendingCount = filteredTransactions.length + pendingSettlements.length + pendingIE.length + pendingLoans.length + pendingRepayments.length + pendingPSPSettlements.length;

  // ============ RENDER ============
  return (
    <div className="space-y-6 animate-fade-in" data-testid="accountant-dashboard">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>Pending Approvals</h1>
        <p className="text-[#C5C6C7]">Review and approve/reject all financial operations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Transactions', count: filteredTransactions.length, icon: Clock, color: 'yellow', tab: 'transactions' },
          { label: 'Vendor Settlements', count: pendingSettlements.length, icon: Store, color: 'purple', tab: 'settlements' },
          { label: 'Income/Expenses', count: pendingIE.length, icon: ReceiptText, color: 'blue', tab: 'ie' },
          { label: 'Loan Disbursements', count: pendingLoans.length, icon: HandCoins, color: 'orange', tab: 'loans' },
          { label: 'Loan Repayments', count: pendingRepayments.length, icon: DollarSign, color: 'emerald', tab: 'repayments' },
          { label: 'PSP Settlements', count: pendingPSPSettlements.length, icon: Landmark, color: 'pink', tab: 'psp_settlements' },
        ].map(({ label, count, icon: Icon, color, tab }) => (
          <Card key={tab} className={`bg-white border-slate-200 cursor-pointer hover:border-${color}-400/50 transition-colors ${activeTab === tab ? `border-${color}-400` : ''}`} onClick={() => setActiveTab(tab)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-1">{label}</p>
                  <p className={`text-2xl font-bold font-mono text-${color}-400`}>{count}</p>
                </div>
                <Icon className={`w-5 h-5 text-${color}-400 opacity-50`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters (for Transactions tab) */}
      {activeTab === 'transactions' && (
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#66FCF1]" />
                <span className="text-[#C5C6C7] text-sm uppercase tracking-wider">Filters</span>
              </div>
              <div className="flex-1 flex flex-wrap gap-4">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px] bg-slate-50 border-slate-200 text-white"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="all" className="text-white hover:bg-white/5">All Types</SelectItem>
                    <SelectItem value="deposit" className="text-white hover:bg-white/5">Deposit</SelectItem>
                    <SelectItem value="withdrawal" className="text-white hover:bg-white/5">Withdrawal</SelectItem>
                    <SelectItem value="transfer" className="text-white hover:bg-white/5">Transfer</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={destFilter} onValueChange={setDestFilter}>
                  <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200 text-white"><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="all" className="text-white hover:bg-white/5">All Destinations</SelectItem>
                    <SelectItem value="treasury" className="text-white hover:bg-white/5">Treasury</SelectItem>
                    <SelectItem value="bank" className="text-white hover:bg-white/5">Client Bank</SelectItem>
                    <SelectItem value="usdt" className="text-white hover:bg-white/5">USDT</SelectItem>
                    <SelectItem value="psp" className="text-white hover:bg-white/5">PSP</SelectItem>
                    <SelectItem value="vendor" className="text-white hover:bg-white/5">Exchanger</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} placeholder="Search client..." className="w-[200px] bg-slate-50 border-slate-200 text-white focus:border-[#66FCF1]" />
                {(typeFilter !== 'all' || destFilter !== 'all' || clientFilter) && (
                  <Button variant="ghost" size="sm" onClick={() => { setTypeFilter('all'); setDestFilter('all'); setClientFilter(''); }} className="text-[#66FCF1] hover:bg-[#66FCF1]/10">Clear Filters</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-50 border border-slate-200 mb-4 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="transactions" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10] text-xs">Transactions ({filteredTransactions.length})</TabsTrigger>
          <TabsTrigger value="settlements" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10] text-xs">Vendor Settl. ({pendingSettlements.length})</TabsTrigger>
          <TabsTrigger value="ie" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10] text-xs">Income/Exp ({pendingIE.length})</TabsTrigger>
          <TabsTrigger value="loans" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10] text-xs">Loans ({pendingLoans.length})</TabsTrigger>
          <TabsTrigger value="repayments" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10] text-xs">Repayments ({pendingRepayments.length})</TabsTrigger>
          <TabsTrigger value="psp_settlements" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10] text-xs">PSP Settl. ({pendingPSPSettlements.length})</TabsTrigger>
        </TabsList>

        {/* ===== Transactions Tab ===== */}
        <TabsContent value="transactions">
          <PendingList loading={loading} items={filteredTransactions} emptyMsg="No pending transactions to review">
            {filteredTransactions.map((tx) => {
              const hasProperDest = tx.destination_account_name || tx.vendor_name || tx.psp_name || (tx.destination_type === 'bank' && tx.client_bank_name) || (tx.destination_type === 'usdt' && tx.client_usdt_address);
              return (
                <Card key={tx.transaction_id} className={`border-slate-200 ${!hasProperDest ? 'bg-red-500/5 border-red-500/30' : 'bg-white'}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-[120px] flex-1">
                        <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Reference</p>
                        <p className="text-white font-mono text-xs truncate">{tx.reference}</p>
                        {tx.crm_reference && <p className="text-purple-400 font-mono text-[10px] truncate">CRM: {tx.crm_reference}</p>}
                      </div>
                      <div className="min-w-[100px]">
                        <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Client</p>
                        <p className="text-white text-sm truncate">{tx.client_name}</p>
                      </div>
                      <div className="min-w-[80px]">
                        <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Type</p>
                        {getTypeBadge(tx.transaction_type)}
                      </div>
                      <div className="min-w-[100px]">
                        <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Amount</p>
                        <p className={`font-mono text-sm font-bold ${['deposit', 'rebate'].includes(tx.transaction_type) ? 'text-green-400' : 'text-red-400'}`}>
                          {['deposit', 'rebate'].includes(tx.transaction_type) ? '+' : '-'}${tx.amount?.toLocaleString()} {tx.currency || 'USD'}
                        </p>
                      </div>
                      <div className="min-w-[120px]">
                        <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Destination</p>
                        {hasProperDest ? (
                          <p className="text-white text-xs truncate">{tx.destination_account_name || tx.vendor_name || tx.psp_name || tx.client_bank_name || 'USDT'}</p>
                        ) : (
                          <div className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-red-400" /><p className="text-red-400 text-xs">No Destination</p></div>
                        )}
                      </div>
                      <div className="min-w-[80px]">
                        <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Tags</p>
                        <div className="flex flex-wrap gap-0.5">
                          {(tx.client_tags || []).length > 0 ? tx.client_tags.map((tag) => {
                            const tagObj = clientTags.find(t => t.name === tag);
                            return <span key={tag} className="px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white whitespace-nowrap" style={{ backgroundColor: tagObj?.color || '#64748B' }}>{tag}</span>;
                          }) : <span className="text-[10px] text-[#C5C6C7]">-</span>}
                        </div>
                      </div>
                      <ApproveRejectButtons approveId={tx.transaction_id} onApprove={() => initiateApprove(tx.transaction_id)} onReject={() => initiateReject(tx.transaction_id)} onView={() => setViewTransaction(tx)} processing={processingId} disabled={!hasProperDest} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </PendingList>
        </TabsContent>

        {/* ===== Vendor Settlements Tab ===== */}
        <TabsContent value="settlements">
          <PendingList loading={loading} items={pendingSettlements} emptyMsg="No pending vendor settlements">
            {pendingSettlements.map((s) => (
              <Card key={s.settlement_id} className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[150px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Exchanger</p>
                      <div className="flex items-center gap-2"><Store className="w-4 h-4 text-[#66FCF1]" /><p className="text-white">{s.vendor_name}</p></div>
                    </div>
                    <div className="min-w-[100px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Gross</p>
                      <p className="font-mono text-sm font-bold text-white">{s.gross_amount?.toLocaleString()} {s.source_currency || 'USD'}</p>
                    </div>
                    <div className="min-w-[100px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Settlement</p>
                      <p className="font-mono text-sm font-bold text-green-400">{s.settlement_amount?.toLocaleString()} {s.destination_currency || 'USD'}</p>
                    </div>
                    <div className="min-w-[80px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Txns</p>
                      <p className="text-white text-sm">{s.transaction_count}</p>
                    </div>
                    <ApproveRejectButtons approveId={s.settlement_id} onApprove={() => initiateApprove(s.settlement_id, true)} onReject={() => initiateReject(s.settlement_id, true)} onView={() => setViewSettlement(s)} processing={processingId} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </PendingList>
        </TabsContent>

        {/* ===== Income/Expenses Tab ===== */}
        <TabsContent value="ie">
          <PendingList loading={loading} items={pendingIE} emptyMsg="No pending income/expense entries">
            {pendingIE.map((ie) => (
              <Card key={ie.entry_id} className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[120px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Description</p>
                      <p className="text-white text-sm truncate">{ie.description || ie.category || ie.ie_category_name || '-'}</p>
                      {ie.vendor_name && <p className="text-[10px] text-[#C5C6C7]">Exchanger: {ie.vendor_name}</p>}
                      {ie.client_name && <p className="text-[10px] text-[#C5C6C7]">Client: {ie.client_name}</p>}
                    </div>
                    <div className="min-w-[80px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Type</p>
                      {getTypeBadge(ie.entry_type)}
                    </div>
                    <div className="min-w-[120px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Amount</p>
                      <p className={`font-mono text-sm font-bold ${ie.entry_type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                        {ie.entry_type === 'income' ? '+' : '-'}{formatCurrency(ie.amount, ie.currency)}
                      </p>
                      {ie.base_currency && ie.base_currency !== ie.currency && ie.base_amount && (
                        <p className="text-[10px] text-[#C5C6C7]">{ie.base_amount?.toLocaleString()} {ie.base_currency}</p>
                      )}
                    </div>
                    <div className="min-w-[100px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Treasury</p>
                      <p className="text-white text-xs truncate">{ie.treasury_account_name || '-'}</p>
                    </div>
                    <div className="min-w-[80px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Date</p>
                      <p className="text-white text-xs">{ie.date || formatDate(ie.created_at)}</p>
                    </div>
                    <ApproveRejectButtons approveId={ie.entry_id} onApprove={() => initiateGenericApprove('ie', ie.entry_id, ie)} onReject={() => initiateGenericReject('ie', ie.entry_id)} onView={() => setViewItem({ ...ie, _viewType: 'ie' })} processing={processingId} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </PendingList>
        </TabsContent>

        {/* ===== Loan Disbursements Tab ===== */}
        <TabsContent value="loans">
          <PendingList loading={loading} items={pendingLoans} emptyMsg="No pending loan disbursements">
            {pendingLoans.map((loan) => (
              <Card key={loan.loan_id} className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[120px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Borrower</p>
                      <p className="text-white text-sm font-medium">{loan.borrower_name}</p>
                      {loan.vendor_name && <p className="text-[10px] text-[#C5C6C7]">Exchanger: {loan.vendor_name}</p>}
                    </div>
                    <div className="min-w-[120px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Amount</p>
                      <p className="font-mono text-sm font-bold text-red-400">-{formatCurrency(loan.amount, loan.currency)}</p>
                    </div>
                    <div className="min-w-[80px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Interest</p>
                      <p className="text-white text-xs">{loan.interest_rate}%</p>
                    </div>
                    <div className="min-w-[100px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Source</p>
                      <p className="text-white text-xs truncate">{loan.source_vendor_name || 'Treasury'}</p>
                    </div>
                    <div className="min-w-[80px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Due Date</p>
                      <p className="text-white text-xs">{loan.due_date?.split('T')[0]}</p>
                    </div>
                    <ApproveRejectButtons approveId={loan.loan_id} onApprove={() => initiateGenericApprove('loan', loan.loan_id, loan)} onReject={() => initiateGenericReject('loan', loan.loan_id)} onView={() => setViewItem({ ...loan, _viewType: 'loan' })} processing={processingId} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </PendingList>
        </TabsContent>

        {/* ===== Loan Repayments Tab ===== */}
        <TabsContent value="repayments">
          <PendingList loading={loading} items={pendingRepayments} emptyMsg="No pending loan repayments">
            {pendingRepayments.map((rep) => (
              <Card key={rep.repayment_id} className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[120px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Borrower</p>
                      <p className="text-white text-sm font-medium">{rep.borrower_name || '-'}</p>
                      <p className="text-[10px] text-[#C5C6C7] font-mono">{rep.loan_id}</p>
                    </div>
                    <div className="min-w-[120px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Amount</p>
                      <p className="font-mono text-sm font-bold text-green-400">+{formatCurrency(rep.amount, rep.currency)}</p>
                      {rep.currency !== rep.loan_currency && (
                        <p className="text-[10px] text-[#C5C6C7]">{formatCurrency(rep.amount_in_loan_currency, rep.loan_currency)}</p>
                      )}
                    </div>
                    <div className="min-w-[80px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Payment Date</p>
                      <p className="text-white text-xs">{rep.payment_date}</p>
                    </div>
                    <div className="min-w-[80px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Reference</p>
                      <p className="text-white text-xs truncate">{rep.reference || '-'}</p>
                    </div>
                    <ApproveRejectButtons approveId={rep.repayment_id} onApprove={() => initiateGenericApprove('repayment', rep.repayment_id, rep)} onReject={() => initiateGenericReject('repayment', rep.repayment_id)} onView={() => setViewItem({ ...rep, _viewType: 'repayment' })} processing={processingId} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </PendingList>
        </TabsContent>

        {/* ===== PSP Settlements Tab ===== */}
        <TabsContent value="psp_settlements">
          <PendingList loading={loading} items={pendingPSPSettlements} emptyMsg="No pending PSP settlements">
            {pendingPSPSettlements.map((stl) => (
              <Card key={stl.settlement_id} className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[120px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">PSP</p>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-purple-400" />
                        <p className="text-white text-sm">{stl.psp_name}</p>
                      </div>
                      <Badge className="mt-1 bg-slate-100 text-[#C5C6C7] text-[10px]">{stl.settlement_type || 'standard'}</Badge>
                    </div>
                    <div className="min-w-[100px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Gross</p>
                      <p className="font-mono text-sm text-white">${stl.gross_amount?.toLocaleString()}</p>
                    </div>
                    <div className="min-w-[100px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Net Amount</p>
                      <p className="font-mono text-sm font-bold text-green-400">${stl.net_amount?.toLocaleString()}</p>
                    </div>
                    <div className="min-w-[80px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Txns</p>
                      <p className="text-white text-sm">{stl.transaction_count}</p>
                    </div>
                    <div className="min-w-[120px]">
                      <p className="text-[10px] text-[#C5C6C7] uppercase tracking-wider mb-0.5">Destination</p>
                      <p className="text-white text-xs truncate">{stl.settlement_destination_name || '-'}</p>
                    </div>
                    <ApproveRejectButtons approveId={stl.settlement_id} onApprove={() => initiateGenericApprove('psp_settlement', stl.settlement_id, stl)} onReject={() => initiateGenericReject('psp_settlement', stl.settlement_id)} onView={() => setViewItem({ ...stl, _viewType: 'psp_settlement' })} processing={processingId} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </PendingList>
        </TabsContent>
      </Tabs>

      {/* View Transaction Dialog */}
      <Dialog open={!!viewTransaction} onOpenChange={() => setViewTransaction(null)}>
        <DialogContent className="bg-white border-slate-200 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>Transaction Details</DialogTitle>
          </DialogHeader>
          {viewTransaction && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Reference</p>
                  <p className="text-white font-mono text-lg">{viewTransaction.reference}</p>
                  {viewTransaction.crm_reference && <p className="text-purple-400 font-mono text-sm mt-1">CRM: {viewTransaction.crm_reference}</p>}
                </div>
                <Badge className="status-pending text-xs uppercase">Pending</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Client</p><p className="text-white">{viewTransaction.client_name}</p></div>
                <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Type</p>{getTypeBadge(viewTransaction.transaction_type)}</div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Amount (USD)</p>
                  <p className={`font-mono text-xl ${['deposit', 'rebate'].includes(viewTransaction.transaction_type) ? 'text-green-400' : 'text-red-400'}`}>
                    {['deposit', 'rebate'].includes(viewTransaction.transaction_type) ? '+' : '-'}${viewTransaction.amount?.toLocaleString()} USD
                  </p>
                </div>
                <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Created</p><p className="text-white text-sm">{formatDate(viewTransaction.transaction_date || viewTransaction.created_at)}</p></div>
              </div>
              {viewTransaction.destination_account_name && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Destination</p>
                  <p className="text-white">{viewTransaction.destination_account_name}</p>
                  <p className="text-sm text-[#C5C6C7]">{viewTransaction.destination_bank_name}</p>
                </div>
              )}
              {viewTransaction.description && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Description</p>
                  <p className="text-white">{viewTransaction.description}</p>
                </div>
              )}
              {viewTransaction.proof_image && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-2">Proof of Payment</p>
                  <img src={viewTransaction.proof_image?.startsWith('http') ? viewTransaction.proof_image : `data:image/png;base64,${viewTransaction.proof_image}`} alt="Proof" className="max-w-full rounded border border-slate-200" />
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button onClick={() => { setViewTransaction(null); initiateApprove(viewTransaction.transaction_id); }} className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"><CheckCircle className="w-4 h-4 mr-2" />Approve</Button>
                <Button onClick={() => { setViewTransaction(null); initiateReject(viewTransaction.transaction_id); }} className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"><XCircle className="w-4 h-4 mr-2" />Reject</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Settlement Dialog */}
      <Dialog open={!!viewSettlement} onOpenChange={() => setViewSettlement(null)}>
        <DialogContent className="bg-white border-slate-200 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}><Wallet className="w-6 h-6 text-[#66FCF1]" />Settlement Details</DialogTitle>
          </DialogHeader>
          {viewSettlement && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Exchanger</p><p className="text-white">{viewSettlement.vendor_name}</p></div>
                <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Type</p><Badge className="bg-purple-500/20 text-purple-400">{viewSettlement.settlement_type}</Badge></div>
                <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Gross</p><p className="text-white font-mono">{viewSettlement.gross_amount?.toLocaleString()} {viewSettlement.source_currency || 'USD'}</p></div>
                <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Settlement</p><p className="text-green-400 font-mono">{viewSettlement.settlement_amount?.toLocaleString()} {viewSettlement.destination_currency || 'USD'}</p></div>
                <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Destination</p><p className="text-white">{viewSettlement.settlement_destination_name}</p></div>
                <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Created</p><p className="text-white text-sm">{formatDate(viewSettlement.created_at)}</p></div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={() => { setViewSettlement(null); initiateApprove(viewSettlement.settlement_id, true); }} className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"><CheckCircle className="w-4 h-4 mr-2" />Approve</Button>
                <Button onClick={() => { setViewSettlement(null); initiateReject(viewSettlement.settlement_id, true); }} className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"><XCircle className="w-4 h-4 mr-2" />Reject</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generic View Item Dialog (IE / Loan / Repayment / PSP Settlement) */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="bg-white border-slate-200 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              {viewItem?._viewType === 'ie' ? 'Income/Expense Details' : viewItem?._viewType === 'loan' ? 'Loan Details' : viewItem?._viewType === 'repayment' ? 'Repayment Details' : 'PSP Settlement Details'}
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <GenericDetailView item={viewItem} formatCurrency={formatCurrency} formatDate={formatDate} getTypeBadge={getTypeBadge} />
              <div className="flex gap-2 pt-4">
                <Button onClick={() => {
                  const type = viewItem._viewType;
                  const id = type === 'ie' ? viewItem.entry_id : type === 'loan' ? viewItem.loan_id : type === 'repayment' ? viewItem.repayment_id : viewItem.settlement_id;
                  setViewItem(null);
                  initiateGenericApprove(type, id, viewItem);
                }} className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"><CheckCircle className="w-4 h-4 mr-2" />Approve</Button>
                <Button onClick={() => {
                  const type = viewItem._viewType;
                  const id = type === 'ie' ? viewItem.entry_id : type === 'loan' ? viewItem.loan_id : type === 'repayment' ? viewItem.repayment_id : viewItem.settlement_id;
                  setViewItem(null);
                  initiateGenericReject(type, id);
                }} className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"><XCircle className="w-4 h-4 mr-2" />Reject</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generic Approval Dialog with Date (for IE, Loan, Repayment, PSP Settlement, Vendor Settlement) */}
      <Dialog open={!!showGenericApprovalDialog} onOpenChange={() => { setShowGenericApprovalDialog(null); setGenericApprovalDate(''); }}>
        <DialogContent className="bg-white border-slate-200 text-white max-w-md" data-testid="generic-approval-dialog">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}>
              <CheckCircle className="w-6 h-6 text-green-400" />
              Approve {showGenericApprovalDialog?.type === 'ie' ? 'Income/Expense' : showGenericApprovalDialog?.type === 'loan' ? 'Loan Disbursement' : showGenericApprovalDialog?.type === 'repayment' ? 'Loan Repayment' : showGenericApprovalDialog?.type === 'psp_settlement' ? 'PSP Settlement' : 'Vendor Settlement'}
            </DialogTitle>
          </DialogHeader>
          {showGenericApprovalDialog && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-sm">
                {showGenericApprovalDialog.type === 'ie' && showGenericApprovalDialog.item && (
                  <>
                    <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">{showGenericApprovalDialog.item.entry_type}</p>
                    <p className="text-white text-sm">{showGenericApprovalDialog.item.description || showGenericApprovalDialog.item.category || '-'}</p>
                    <p className={`font-mono text-lg font-bold mt-1 ${showGenericApprovalDialog.item.entry_type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(showGenericApprovalDialog.item.amount, showGenericApprovalDialog.item.currency)}
                    </p>
                  </>
                )}
                {showGenericApprovalDialog.type === 'loan' && showGenericApprovalDialog.item && (
                  <>
                    <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Loan Disbursement</p>
                    <p className="text-white text-sm">Borrower: {showGenericApprovalDialog.item.borrower_name}</p>
                    <p className="font-mono text-lg font-bold text-red-400 mt-1">-{formatCurrency(showGenericApprovalDialog.item.amount, showGenericApprovalDialog.item.currency)}</p>
                  </>
                )}
                {showGenericApprovalDialog.type === 'repayment' && showGenericApprovalDialog.item && (
                  <>
                    <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Loan Repayment</p>
                    <p className="text-white text-sm">From: {showGenericApprovalDialog.item.borrower_name || '-'}</p>
                    <p className="font-mono text-lg font-bold text-green-400 mt-1">+{formatCurrency(showGenericApprovalDialog.item.amount, showGenericApprovalDialog.item.currency)}</p>
                  </>
                )}
                {showGenericApprovalDialog.type === 'psp_settlement' && showGenericApprovalDialog.item && (
                  <>
                    <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">PSP Settlement</p>
                    <p className="text-white text-sm">{showGenericApprovalDialog.item.psp_name}</p>
                    <p className="font-mono text-lg font-bold text-green-400 mt-1">${showGenericApprovalDialog.item.net_amount?.toLocaleString()}</p>
                  </>
                )}
                {showGenericApprovalDialog.type === 'vendor_settlement' && showGenericApprovalDialog.item && (
                  <>
                    <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Vendor Settlement</p>
                    <p className="text-white text-sm">{showGenericApprovalDialog.item.vendor_name}</p>
                    <p className="font-mono text-lg font-bold text-green-400 mt-1">{showGenericApprovalDialog.item.settlement_amount?.toLocaleString()} {showGenericApprovalDialog.item.destination_currency || 'USD'}</p>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 text-xs uppercase tracking-wider">Date (Actual transaction/settlement date)</Label>
                <Input
                  type="date"
                  value={genericApprovalDate}
                  onChange={e => setGenericApprovalDate(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-800"
                  data-testid="generic-approval-date"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setShowGenericApprovalDialog(null); setGenericApprovalDate(''); }} className="flex-1 border-slate-200 text-[#C5C6C7] hover:bg-white/5">Cancel</Button>
                <Button onClick={handleGenericApprovalConfirm} className="flex-1 bg-green-500 text-white hover:bg-green-600" data-testid="confirm-generic-approval">
                  <CheckCircle className="w-4 h-4 mr-2" />Continue to Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Captcha Dialog */}
      <Dialog open={showCaptcha} onOpenChange={(open) => { if (!open) { setShowCaptcha(false); setCaptchaAction(null); } }}>
        <DialogContent className="bg-white border-slate-200 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}><Calculator className="w-6 h-6 text-[#66FCF1]" />Verification Required</DialogTitle>
          </DialogHeader>
          <MathCaptcha actionType={captchaAction?.type} onVerified={handleCaptchaVerified} onCancel={() => { setShowCaptcha(false); setCaptchaAction(null); }} />
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog (Transactions) */}
      <Dialog open={!!showRejectDialog} onOpenChange={() => { setShowRejectDialog(null); setRejectReason(''); }}>
        <DialogContent className="bg-white border-slate-200 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}><AlertCircle className="w-6 h-6 text-red-400" />Reject Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-[#C5C6C7]">Please provide a reason for rejecting this transaction:</p>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Enter rejection reason..." className="bg-slate-50 border-slate-200 text-white focus:border-[#66FCF1]" rows={3} data-testid="reject-reason" />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setShowRejectDialog(null); setRejectReason(''); }} className="flex-1 border-slate-200 text-[#C5C6C7] hover:bg-white/5">Cancel</Button>
              <Button onClick={handleRejectWithCaptcha} className="flex-1 bg-red-500 text-white hover:bg-red-600" data-testid="continue-reject-btn">Continue</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settlement Reject Reason Dialog */}
      <Dialog open={!!showSettlementRejectDialog} onOpenChange={() => { setShowSettlementRejectDialog(null); setRejectReason(''); }}>
        <DialogContent className="bg-white border-slate-200 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}><AlertCircle className="w-6 h-6 text-red-400" />Reject Settlement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-[#C5C6C7]">Please provide a reason for rejecting this settlement:</p>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Enter rejection reason..." className="bg-slate-50 border-slate-200 text-white focus:border-[#66FCF1]" rows={3} data-testid="settlement-reject-reason" />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setShowSettlementRejectDialog(null); setRejectReason(''); }} className="flex-1 border-slate-200 text-[#C5C6C7] hover:bg-white/5">Cancel</Button>
              <Button onClick={handleSettlementRejectWithCaptcha} className="flex-1 bg-red-500 text-white hover:bg-red-600" data-testid="continue-settlement-reject-btn">Continue</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generic Reject Reason Dialog (IE / Loans / Repayments / PSP Settlements) */}
      <Dialog open={!!showGenericRejectDialog} onOpenChange={() => { setShowGenericRejectDialog(null); setRejectReason(''); }}>
        <DialogContent className="bg-white border-slate-200 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}><AlertCircle className="w-6 h-6 text-red-400" />Reject Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-[#C5C6C7]">Please provide a reason for rejection:</p>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Enter rejection reason..." className="bg-slate-50 border-slate-200 text-white focus:border-[#66FCF1]" rows={3} data-testid="generic-reject-reason" />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setShowGenericRejectDialog(null); setRejectReason(''); }} className="flex-1 border-slate-200 text-[#C5C6C7] hover:bg-white/5">Cancel</Button>
              <Button onClick={handleGenericRejectWithCaptcha} className="flex-1 bg-red-500 text-white hover:bg-red-600" data-testid="continue-generic-reject-btn">Continue</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Proof Dialog for Withdrawals */}
      <Dialog open={!!uploadingProof} onOpenChange={() => { setUploadingProof(null); setProofPreview(null); }}>
        <DialogContent className="bg-white border-slate-200 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}><Upload className="w-6 h-6 text-[#66FCF1]" />Upload Proof of Payment</DialogTitle></DialogHeader>
          {uploadingProof && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-sm">
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Transaction</p>
                <p className="text-white font-mono">{uploadingProof.reference}</p>
                <p className="text-sm text-[#C5C6C7] mt-2">Withdrawal of <span className="text-red-400 font-mono">${uploadingProof.amount?.toLocaleString()}</span></p>
              </div>
              {proofPreview ? (
                <div className="relative">
                  <img src={proofPreview} alt="Proof preview" className="w-full h-48 object-contain bg-slate-50 rounded-sm" />
                  <Button variant="ghost" size="sm" onClick={() => setProofPreview(null)} className="absolute top-2 right-2 bg-red-500/80 text-white hover:bg-red-500">Remove</Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-white/20 rounded-sm p-8 text-center">
                  <Upload className="w-8 h-8 text-[#C5C6C7] mx-auto mb-2" />
                  <p className="text-[#C5C6C7] mb-2">Upload screenshot of completed payment</p>
                  <Input type="file" accept="image/*" onChange={handleProofUpload} className="hidden" id="proof-upload-input" />
                  <Label htmlFor="proof-upload-input" className="cursor-pointer inline-block px-4 py-2 bg-[#66FCF1] text-[#0B0C10] font-bold uppercase text-sm rounded-sm hover:bg-[#45A29E]">Choose File</Label>
                </div>
              )}
              <Button variant="outline" onClick={() => { setUploadingProof(null); setProofPreview(null); }} className="w-full border-slate-200 text-[#C5C6C7] hover:bg-white/5">Cancel</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction Approval Dialog - For Deposits and Withdrawals with Screenshot */}
      <Dialog open={!!showApprovalDialog} onOpenChange={() => { setShowApprovalDialog(null); setApprovalSourceAccount(''); setApprovalProof(null); setApprovalProofPreview(null); setBankReceiptDate(''); }}>
        <DialogContent className="bg-white border-slate-200 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}>
              <CheckCircle className="w-6 h-6 text-green-400" />Approve {showApprovalDialog?.transaction_type === 'withdrawal' ? 'Withdrawal' : 'Deposit'}
            </DialogTitle>
          </DialogHeader>
          {showApprovalDialog && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-sm">
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Transaction</p>
                <p className="text-white font-mono">{showApprovalDialog.reference}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[#C5C6C7]">Amount:</span>
                  <span className={`font-mono text-lg font-bold ${showApprovalDialog.transaction_type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                    {showApprovalDialog.transaction_type === 'deposit' ? '+' : '-'}${showApprovalDialog.amount?.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2"><span className="text-[#C5C6C7] text-sm">Client: </span><span className="text-white">{showApprovalDialog.client_name}</span></div>
              </div>
              {showApprovalDialog.transaction_type === 'withdrawal' && (
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Source Account (Where funds come from) *</Label>
                  <Select value={approvalSourceAccount} onValueChange={setApprovalSourceAccount}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-white" data-testid="approval-source-account"><SelectValue placeholder="Select treasury, USDT or PSP account" /></SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 max-h-[250px]">
                      {treasuryAccounts.map((account) => (
                        <SelectItem key={account.account_id} value={account.account_id} className="text-white hover:bg-white/5">
                          <div className="flex items-center gap-2">
                            {account.account_type === 'usdt' ? <Wallet className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                            <span>{account.account_name}</span>
                            <span className="text-[#C5C6C7] text-xs">({account.currency})</span>
                            <span className="text-[#66FCF1] font-mono text-xs">{account.balance?.toLocaleString()}</span>
                          </div>
                        </SelectItem>
                      ))}
                      {psps.filter(p => p.status === 'active').map((psp) => (
                        <SelectItem key={`psp_${psp.psp_id}`} value={`psp_${psp.psp_id}`} className="text-white hover:bg-white/5">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-3 h-3 text-purple-400" />
                            <span>{psp.psp_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-slate-600 text-xs uppercase tracking-wider">Bank Receipt Date (Actual payment date)</Label>
                <Input type="date" value={bankReceiptDate} onChange={e => setBankReceiptDate(e.target.value)} className="bg-slate-50 border-slate-200 text-slate-800" data-testid="bank-receipt-date" />
              </div>
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Proof of {showApprovalDialog.transaction_type === 'deposit' ? 'Deposit' : 'Payment'} (Screenshot) *</Label>
                {approvalProofPreview ? (
                  <div className="relative">
                    <img src={approvalProofPreview} alt="Proof preview" className="w-full h-40 object-contain bg-slate-50 rounded-sm" />
                    <Button variant="ghost" size="sm" onClick={() => { setApprovalProof(null); setApprovalProofPreview(null); }} className="absolute top-2 right-2 bg-red-500/80 text-white hover:bg-red-500">Remove</Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-white/20 rounded-sm p-6 text-center">
                    <Upload className="w-6 h-6 text-[#C5C6C7] mx-auto mb-2" />
                    <Input type="file" accept="image/*" onChange={handleApprovalProofChange} className="hidden" id="approval-proof-input" />
                    <Label htmlFor="approval-proof-input" className="cursor-pointer inline-block px-4 py-2 bg-[#66FCF1] text-[#0B0C10] font-bold uppercase text-sm rounded-sm hover:bg-[#45A29E]">Choose File</Label>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setShowApprovalDialog(null); setApprovalSourceAccount(''); setApprovalProof(null); setApprovalProofPreview(null); setBankReceiptDate(''); }} className="flex-1 border-slate-200 text-[#C5C6C7] hover:bg-white/5">Cancel</Button>
                <Button onClick={handleTransactionApproval} disabled={(showApprovalDialog.transaction_type === 'withdrawal' && !approvalSourceAccount) || !approvalProof} className="flex-1 bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed" data-testid="confirm-transaction-approval">
                  <CheckCircle className="w-4 h-4 mr-2" />Continue to Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Helper Components ----

function PendingList({ loading, items, emptyMsg, children }) {
  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" /></div>;
  if (!items || items.length === 0) return (
    <Card className="bg-white border-slate-200"><CardContent className="p-12 text-center"><CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" /><p className="text-white text-lg">All caught up!</p><p className="text-[#C5C6C7] mt-2">{emptyMsg}</p></CardContent></Card>
  );
  return <div className="space-y-3">{children}</div>;
}

function ApproveRejectButtons({ approveId, onApprove, onReject, onView, processing, disabled = false }) {
  return (
    <div className="flex items-center gap-1.5 ml-auto">
      <Button variant="ghost" size="sm" onClick={onView} className="text-[#C5C6C7] hover:text-white hover:bg-white/5 h-8 w-8 p-0" data-testid={`view-${approveId}`}><Eye className="w-4 h-4" /></Button>
      <Button size="sm" onClick={onApprove} disabled={processing === approveId || disabled} className={`h-8 text-xs px-3 ${disabled ? 'bg-slate-500/20 text-slate-500 cursor-not-allowed' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'}`} data-testid={`approve-${approveId}`}>
        <CheckCircle className="w-3.5 h-3.5 mr-1" />Approve
      </Button>
      <Button size="sm" onClick={onReject} disabled={processing === approveId} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 h-8 text-xs px-3" data-testid={`reject-${approveId}`}>
        <XCircle className="w-3.5 h-3.5 mr-1" />Reject
      </Button>
    </div>
  );
}

function GenericDetailView({ item, formatCurrency, formatDate, getTypeBadge }) {
  if (item._viewType === 'ie') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge className={item.entry_type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>{item.entry_type}</Badge>
        <Badge className="bg-yellow-500/20 text-yellow-400 text-xs uppercase">Pending</Badge>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Description</p><p className="text-white">{item.description || item.category || item.ie_category_name || '-'}</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Amount</p><p className={`font-mono text-xl ${item.entry_type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(item.amount, item.currency)}</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Treasury</p><p className="text-white">{item.treasury_account_name || '-'}</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Date</p><p className="text-white">{item.date || formatDate(item.created_at)}</p></div>
        {item.vendor_name && <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Exchanger</p><p className="text-white">{item.vendor_name}</p></div>}
        {item.client_name && <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Client</p><p className="text-white">{item.client_name}</p></div>}
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Created By</p><p className="text-white">{item.created_by_name}</p></div>
        {item.reference && <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Reference</p><p className="text-white font-mono text-sm">{item.reference}</p></div>}
      </div>
    </div>
  );
  if (item._viewType === 'loan') return (
    <div className="space-y-4">
      <Badge className="bg-yellow-500/20 text-yellow-400 text-xs uppercase">Pending Approval</Badge>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Borrower</p><p className="text-white text-lg">{item.borrower_name}</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Amount</p><p className="font-mono text-xl text-red-400">-{formatCurrency(item.amount, item.currency)}</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Interest Rate</p><p className="text-white">{item.interest_rate}%</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Loan Type</p><p className="text-white capitalize">{item.loan_type?.replace('_', ' ')}</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Loan Date</p><p className="text-white">{item.loan_date?.split('T')[0]}</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Due Date</p><p className="text-white">{item.due_date?.split('T')[0]}</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Source</p><p className="text-white">{item.source_vendor_name || 'Treasury'}</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Created By</p><p className="text-white">{item.created_by_name}</p></div>
      </div>
      {item.notes && <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Notes</p><p className="text-white">{item.notes}</p></div>}
    </div>
  );
  if (item._viewType === 'repayment') return (
    <div className="space-y-4">
      <Badge className="bg-yellow-500/20 text-yellow-400 text-xs uppercase">Pending Approval</Badge>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Borrower</p><p className="text-white text-lg">{item.borrower_name}</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Repayment Amount</p><p className="font-mono text-xl text-green-400">+{formatCurrency(item.amount, item.currency)}</p></div>
        {item.currency !== item.loan_currency && (
          <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">In Loan Currency</p><p className="text-white font-mono">{formatCurrency(item.amount_in_loan_currency, item.loan_currency)}</p></div>
        )}
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Payment Date</p><p className="text-white">{item.payment_date}</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Loan ID</p><p className="text-white font-mono text-xs">{item.loan_id}</p></div>
        {item.reference && <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Reference</p><p className="text-white">{item.reference}</p></div>}
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Created By</p><p className="text-white">{item.created_by_name}</p></div>
      </div>
      {item.notes && <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Notes</p><p className="text-white">{item.notes}</p></div>}
    </div>
  );
  if (item._viewType === 'psp_settlement') return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-purple-400" /><span className="text-white text-lg">{item.psp_name}</span></div>
        <Badge className="bg-yellow-500/20 text-yellow-400 text-xs uppercase">Pending</Badge>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Type</p><Badge className="bg-purple-500/20 text-purple-400">{item.settlement_type || 'standard'}</Badge></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Transactions</p><p className="text-white font-mono">{item.transaction_count}</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Gross Amount</p><p className="text-white font-mono text-xl">${item.gross_amount?.toLocaleString()}</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Net Amount</p><p className="text-green-400 font-mono text-xl">${item.net_amount?.toLocaleString()}</p></div>
        {item.commission_amount > 0 && <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Commission</p><p className="text-red-400 font-mono">-${item.commission_amount?.toLocaleString()}</p></div>}
        {item.reserve_fund_amount > 0 && <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Reserve Fund</p><p className="text-red-400 font-mono">-${item.reserve_fund_amount?.toLocaleString()}</p></div>}
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Destination</p><p className="text-white">{item.settlement_destination_name}</p></div>
        <div><p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Created By</p><p className="text-white">{item.created_by_name}</p><p className="text-xs text-[#C5C6C7]">{formatDate(item.created_at)}</p></div>
      </div>
    </div>
  );
  return null;
}
