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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  Building2,
  FileText,
  Printer,
  Receipt,
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
  const [settlements, setSettlements] = useState([]);
  const [statementData, setStatementData] = useState(null);
  const [statementOpen, setStatementOpen] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [ieEntries, setIeEntries] = useState([]);
  const [activeVendorTab, setActiveVendorTab] = useState('transactions');
  const [ieActionDialog, setIeActionDialog] = useState({ open: false, entry: null, type: '' });
  const [ieCaptcha, setIeCaptcha] = useState({ num1: 0, num2: 0 });
  const [ieCaptchaAnswer, setIeCaptchaAnswer] = useState('');
  const [ieProofImage, setIeProofImage] = useState(null);
  const [ieProofPreview, setIeProofPreview] = useState(null);
  const [ieRejectionReason, setIeRejectionReason] = useState('');

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

  const fetchSettlements = async () => {
    if (!vendorInfo) return;
    try {
      const response = await fetch(`${API_URL}/api/vendors/${vendorInfo.vendor_id}/settlements`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (response.ok) {
        setSettlements(await response.json());
      }
    } catch (error) {
      console.error('Error fetching settlements:', error);
    }
  };

  const fetchIeEntries = async () => {
    try {
      const response = await fetch(`${API_URL}/api/vendor/income-expenses`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (response.ok) {
        setIeEntries(await response.json());
      }
    } catch (error) {
      console.error('Error fetching IE entries:', error);
    }
  };

  const openStatement = async (settlementId) => {
    setStatementLoading(true);
    setStatementOpen(true);
    try {
      const response = await fetch(`${API_URL}/api/settlements/${settlementId}/statement`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setStatementData(await response.json());
      } else {
        toast.error('Failed to load statement');
      }
    } catch (error) {
      toast.error('Error loading statement');
    } finally {
      setStatementLoading(false);
    }
  };

  const printStatement = () => {
    const el = document.getElementById('vendor-settlement-statement');
    if (!el) return;
    const win = window.open('', '_blank');
    win.document.write(`<html><head><title>Settlement Statement</title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Inter', Arial, sans-serif; color: #1a1a1a; padding: 40px; }
      table { width: 100%; border-collapse: collapse; margin: 16px 0; }
      th { background: #0B3D91; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px; text-align: left; }
      td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #e5e5e5; }
      tr:nth-child(even) td { background: #f9f9f9; }
      .mono { font-family: 'Courier New', monospace; }
    </style></head><body>`);
    win.document.write(el.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };

  const fmtCurrency = (amount, currency) => {
    if (!currency || currency === 'USD') return `$${(amount || 0).toLocaleString()}`;
    return `${currency} ${(amount || 0).toLocaleString()}`;
  };

  useEffect(() => {
    fetchVendorInfo();
  }, []);

  useEffect(() => {
    if (vendorInfo) {
      fetchTransactions();
      fetchSettlements();
      fetchIeEntries();
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
        // Must upload proof for ALL transaction approvals
        if (!proofImage) {
          toast.error('Please upload proof screenshot before approving');
          return;
        }
        
        // Upload proof first using vendor-specific endpoint
        const formData = new FormData();
        formData.append('proof_image', proofImage);
        
        const token = localStorage.getItem('auth_token');
        const uploadResponse = await fetch(`${API_URL}/api/vendor/transactions/${selectedTransaction.transaction_id}/upload-proof`, {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          let errorMessage = 'Failed to upload proof';
          try {
            const error = await uploadResponse.json();
            errorMessage = error.detail || errorMessage;
          } catch (e) {
            errorMessage = `Upload failed with status ${uploadResponse.status}`;
          }
          toast.error(errorMessage);
          return;
        }
        
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

      if (response && response.ok) {
        toast.success(`Transaction ${actionType === 'complete' ? 'completed' : actionType + 'd'} successfully`);
        setActionDialogOpen(false);
        fetchTransactions();
        fetchVendorInfo();
      } else if (response) {
        let errorMessage = 'Action failed';
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch (e) {
          errorMessage = `Failed with status ${response.status}`;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Action error:', error);
      toast.error(error.message || 'Action failed - please try again');
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
  const pendingIeCount = ieEntries.filter(e => e.status === 'pending_vendor').length;
  const pendingDeposits = transactions.filter(t => t.status === 'pending' && t.transaction_type === 'deposit');
  const pendingWithdrawals = transactions.filter(t => t.status === 'pending' && t.transaction_type === 'withdrawal');
  const approvedWithdrawals = transactions.filter(t => t.status === 'approved' && t.transaction_type === 'withdrawal');

  const handleIeApprove = async (entryId) => {
    try {
      const response = await fetch(`${API_URL}/api/income-expenses/${entryId}/vendor-approve`, {
        method: 'POST', headers: getAuthHeaders(), credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`Entry approved! Commission: ${data.vendor_commission_rate?.toFixed(2)}% = $${data.vendor_commission_amount?.toFixed(2)}`);
        fetchIeEntries();
        setIeActionDialog({ open: false, entry: null, type: '' });
        resetIeActionState();
      } else {
        const err = await response.json();
        toast.error(err.detail || 'Approval failed');
      }
    } catch { toast.error('Approval failed'); }
  };

  const handleIeReject = async (entryId) => {
    try {
      const response = await fetch(`${API_URL}/api/income-expenses/${entryId}/vendor-reject?reason=${encodeURIComponent(ieRejectionReason)}`, {
        method: 'POST', headers: getAuthHeaders(), credentials: 'include',
      });
      if (response.ok) {
        toast.success('Entry rejected');
        fetchIeEntries();
        setIeActionDialog({ open: false, entry: null, type: '' });
        resetIeActionState();
      } else { toast.error('Rejection failed'); }
    } catch { toast.error('Rejection failed'); }
  };

  const handleIeUploadProof = async (entryId, file) => {
    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('proof_image', file);
      const response = await fetch(`${API_URL}/api/income-expenses/${entryId}/vendor-upload-proof`, {
        method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include', body: formData,
      });
      if (response.ok) {
        toast.success('Proof uploaded');
        fetchIeEntries();
      } else { toast.error('Upload failed'); }
    } catch { toast.error('Upload failed'); }
  };

  const openIeAction = (entry, type) => {
    setIeActionDialog({ open: true, entry, type });
    setIeCaptcha({ num1: Math.floor(Math.random() * 20) + 1, num2: Math.floor(Math.random() * 20) + 1 });
    setIeCaptchaAnswer('');
    setIeProofImage(null);
    setIeProofPreview(null);
    setIeRejectionReason('');
  };

  const resetIeActionState = () => {
    setIeCaptchaAnswer('');
    setIeProofImage(null);
    setIeProofPreview(null);
    setIeRejectionReason('');
  };

  const executeIeAction = async () => {
    if (parseInt(ieCaptchaAnswer) !== ieCaptcha.num1 + ieCaptcha.num2) {
      toast.error('Incorrect captcha answer');
      return;
    }
    if (ieActionDialog.type === 'approve') {
      // Upload proof first
      if (!ieProofImage) {
        toast.error('Please upload proof screenshot before approving');
        return;
      }
      await handleIeUploadProof(ieActionDialog.entry.entry_id, ieProofImage);
      // Then approve
      await handleIeApprove(ieActionDialog.entry.entry_id);
    } else {
      await handleIeReject(ieActionDialog.entry.entry_id);
    }
  };

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

      {/* Summary Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Settlement Balance - Highlighted */}
        <Card className="bg-[#1F2833] border-white/5 border-l-4 border-l-[#66FCF1] lg:col-span-2">
          <CardContent className="p-6">
            <p className="text-xs text-[#66FCF1] uppercase tracking-wider mb-3">Settlement Balance (Deposits - Withdrawals - Commission)</p>
            {vendorInfo?.settlement_by_currency && vendorInfo.settlement_by_currency.length > 0 ? (
              <div className="space-y-3">
                {vendorInfo.settlement_by_currency.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
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
                      </div>
                      <div className="text-right">
                        <span className={`text-2xl font-bold font-mono ${item.amount >= 0 ? 'text-[#66FCF1]' : 'text-red-400'}`}>
                          {item.amount >= 0 ? '+' : ''}{item.amount?.toLocaleString()}
                        </span>
                        {item.currency !== 'USD' && (
                          <span className="text-xs text-[#C5C6C7] block">≈ ${item.usd_equivalent?.toLocaleString()} USD</span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-[#C5C6C7] pl-2">
                      <span className="text-green-400">+{item.deposit_amount?.toLocaleString()} deposits ({item.deposit_count})</span>
                      <span className="text-red-400">-{item.withdrawal_amount?.toLocaleString()} withdrawals ({item.withdrawal_count})</span>
                    </div>
                    {(item.commission_earned_base > 0 || item.commission_earned_usd > 0) && (
                      <div className="text-xs text-yellow-400 pl-2">
                        Commission earned: {item.commission_earned_base?.toLocaleString()} {item.currency}
                        {item.currency !== 'USD' && item.commission_earned_usd > 0 && (
                          <span className="text-[#C5C6C7]"> (${item.commission_earned_usd?.toLocaleString()} USD)</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div className="border-t border-white/10 pt-3 mt-3 flex justify-between items-center">
                  <span className="text-[#C5C6C7] text-sm">Total USD Equivalent:</span>
                  <span className={`text-2xl font-bold font-mono ${vendorInfo.settlement_by_currency.reduce((sum, item) => sum + (item.usd_equivalent || 0), 0) >= 0 ? 'text-white' : 'text-red-400'}`}>
                    ${vendorInfo.settlement_by_currency.reduce((sum, item) => sum + (item.usd_equivalent || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-3xl font-bold font-mono text-[#C5C6C7]">No pending settlement</p>
            )}
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

      {/* Summary Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <Card className="bg-[#1F2833] border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Pending Withdrawals</p>
                <p className="text-3xl font-bold font-mono text-red-400">{pendingWithdrawals.length}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-sm">
                <ArrowUpRight className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

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
        
        <Card className="bg-[#1F2833] border-white/5 border-l-2 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">Total Commission Earned</p>
                <p className="text-2xl font-bold font-mono text-yellow-400">
                  ${vendorInfo?.settlement_by_currency?.reduce((sum, item) => sum + (item.commission_earned_usd || 0), 0).toLocaleString() || '0'}
                </p>
                <p className="text-xs text-[#C5C6C7] mt-1">
                  Rates: {vendorInfo?.deposit_commission || 0}% In / {vendorInfo?.withdrawal_commission || 0}% Out
                </p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-sm">
                <DollarSign className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content: Transactions, Income/Expenses, Settlements */}
      <Tabs value={activeVendorTab} onValueChange={setActiveVendorTab}>
        <TabsList className="bg-[#1F2833] border border-white/10">
          <TabsTrigger value="transactions" className="data-[state=active]:bg-[#66FCF1]/20 data-[state=active]:text-[#66FCF1]">
            Transactions {pendingCount > 0 && <Badge className="ml-1 bg-yellow-500/30 text-yellow-400 text-[10px]">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="income-expenses" className="data-[state=active]:bg-[#66FCF1]/20 data-[state=active]:text-[#66FCF1]">
            Income/Expenses {pendingIeCount > 0 && <Badge className="ml-1 bg-amber-500/30 text-amber-400 text-[10px]">{pendingIeCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="settlements" className="data-[state=active]:bg-[#66FCF1]/20 data-[state=active]:text-[#66FCF1]">
            Settlement History
          </TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="mt-4">
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
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Commission</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Status</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Date</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-[#C5C6C7]">
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
                      <TableCell>
                        {tx.vendor_commission_base_amount ? (
                          <div className="font-mono text-yellow-400">
                            <span>{tx.vendor_commission_base_amount?.toLocaleString()} {tx.vendor_commission_base_currency || displayCurrency}</span>
                            {tx.vendor_commission_base_currency !== 'USD' && tx.vendor_commission_amount && (
                              <span className="text-[#C5C6C7] text-xs block">(${tx.vendor_commission_amount?.toLocaleString()})</span>
                            )}
                          </div>
                        ) : tx.vendor_commission_amount ? (
                          <span className="font-mono text-yellow-400">${tx.vendor_commission_amount?.toLocaleString()}</span>
                        ) : (
                          <span className="text-[#C5C6C7] text-xs">-</span>
                        )}
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
        </TabsContent>

        {/* Income/Expenses Tab */}
        <TabsContent value="income-expenses" className="mt-4">
          <Card className="bg-[#1F2833] border-white/5" data-testid="vendor-ie-entries">
            <CardHeader>
              <CardTitle className="text-xl text-white uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                Income & Expense Entries
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ieEntries.length === 0 ? (
                <div className="text-center py-10 text-[#C5C6C7]">
                  <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No income/expense entries assigned to you</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Date</TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Type</TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Category</TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Description</TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Bank Account</TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Amount</TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Status</TableHead>
                        <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ieEntries.map((entry) => {
                        const isIncome = entry.entry_type === 'income';
                        return (
                          <TableRow key={entry.entry_id} className={`border-white/5 hover:bg-white/5 border-l-4 ${isIncome ? 'border-l-green-500' : 'border-l-red-500'}`}>
                            <TableCell className="text-white text-sm">{entry.date ? new Date(entry.date).toLocaleDateString() : '-'}</TableCell>
                            <TableCell>
                              <Badge className={isIncome ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                                {isIncome ? 'Income' : 'Expense'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[#C5C6C7] text-sm capitalize">{entry.category?.replace('_', ' ')}</TableCell>
                            <TableCell className="text-white text-sm max-w-[200px] truncate">{entry.description || '-'}</TableCell>
                            <TableCell className="text-[#C5C6C7] text-sm">
                              {entry.vendor_bank_account_number ? (
                                <div className="text-[10px] space-y-0.5">
                                  <p>A/C: {entry.vendor_bank_account_number}</p>
                                  {entry.vendor_bank_ifsc && <p>IFSC: {entry.vendor_bank_ifsc}</p>}
                                  {entry.vendor_bank_branch && <p>Branch: {entry.vendor_bank_branch}</p>}
                                  {entry.vendor_bank_account_name && <p>Name: {entry.vendor_bank_account_name}</p>}
                                </div>
                              ) : entry.vendor_bank_account || '-'}
                            </TableCell>
                            <TableCell className={`font-mono text-right ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                              {isIncome ? '+' : '-'}{entry.amount?.toLocaleString()} {entry.currency}
                            </TableCell>
                            <TableCell>
                              {entry.status === 'pending_vendor' && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]"><Clock className="w-2.5 h-2.5 mr-1" />Pending</Badge>}
                              {entry.status === 'completed' && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]"><CheckCircle2 className="w-2.5 h-2.5 mr-1" />Approved</Badge>}
                              {entry.status === 'rejected' && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]"><XCircle className="w-2.5 h-2.5 mr-1" />Rejected</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.status === 'pending_vendor' && (
                                <div className="flex gap-1 justify-end">
                                  <Button size="sm" onClick={() => openIeAction(entry, 'approve')} className="bg-green-500/10 text-green-400 hover:bg-green-500/20 h-7 px-2 text-xs" data-testid={`ie-approve-${entry.entry_id}`}>
                                    <CheckCircle2 className="w-3 h-3 mr-1" />Approve
                                  </Button>
                                  <Button size="sm" onClick={() => openIeAction(entry, 'reject')} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 h-7 px-2 text-xs" data-testid={`ie-reject-${entry.entry_id}`}>
                                    <XCircle className="w-3 h-3 mr-1" />Reject
                                  </Button>
                                </div>
                              )}
                              {entry.status === 'completed' && entry.vendor_commission_amount > 0 && (
                                <span className="text-[10px] text-[#66FCF1]">Commission: ${entry.vendor_commission_amount?.toFixed(2)}</span>
                              )}
                              {entry.vendor_proof_image && <Badge className="bg-blue-500/10 text-blue-400 text-[10px] ml-1"><ImageIcon className="w-2.5 h-2.5 mr-1" />Proof</Badge>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settlements Tab */}
        <TabsContent value="settlements" className="mt-4">
      {/* Settlement History */}
      <Card className="bg-[#1F2833] border-white/5" data-testid="vendor-settlement-history">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-white uppercase tracking-tight flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}>
              <Receipt className="w-5 h-5 text-[#66FCF1]" />
              Settlement History
            </CardTitle>
            <Badge className="bg-[#66FCF1]/10 text-[#66FCF1] border-[#66FCF1]/20">{settlements.length} settlements</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {settlements.length === 0 ? (
            <div className="text-center py-10 text-[#C5C6C7]">
              <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No settlements yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">ID</TableHead>
                    <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Type</TableHead>
                    <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Gross</TableHead>
                    <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Deductions</TableHead>
                    <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Net Settled</TableHead>
                    <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Status</TableHead>
                    <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Date</TableHead>
                    <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Statement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.map((s) => (
                    <TableRow key={s.settlement_id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-mono text-white text-xs">{s.settlement_id}</TableCell>
                      <TableCell>
                        <Badge className={s.settlement_type === 'bank' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}>
                          {s.settlement_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-white">
                        {s.source_currency && s.source_currency !== 'USD'
                          ? `${s.source_currency} ${s.gross_amount?.toLocaleString()}`
                          : `$${s.gross_amount?.toLocaleString()}`}
                      </TableCell>
                      <TableCell className="font-mono text-red-400">
                        <div className="text-xs">
                          <div>Comm: -{s.source_currency && s.source_currency !== 'USD' ? `${s.source_currency} ` : '$'}{s.commission_amount?.toLocaleString()}</div>
                          {s.charges_amount > 0 && (
                            <div>Charges: -{s.source_currency && s.source_currency !== 'USD' ? `${s.source_currency} ` : '$'}{s.charges_amount?.toLocaleString()}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-green-400 font-bold">
                        {s.destination_currency && s.destination_currency !== 'USD'
                          ? `${s.destination_currency} ${s.settlement_amount?.toLocaleString()}`
                          : `$${s.settlement_amount?.toLocaleString()}`}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          s.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          s.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#C5C6C7] text-xs">{formatDate(s.settled_at || s.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openStatement(s.settlement_id)}
                          className="text-[#66FCF1] hover:bg-[#66FCF1]/10 h-7 px-2"
                          data-testid={`vendor-statement-${s.settlement_id}`}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          <span className="text-xs">View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

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
              {/* Client Bank Details for Withdrawals */}
              {viewTransaction.transaction_type === 'withdrawal' && viewTransaction.client_bank_name && (
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-[#66FCF1]" />
                    <p className="text-xs text-[#66FCF1] uppercase tracking-wider font-bold">Client Bank Details (Send To)</p>
                  </div>
                  <div className="bg-[#0B0C10] p-4 rounded-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#C5C6C7] text-sm">Bank Name:</span>
                      <span className="text-white font-medium">{viewTransaction.client_bank_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#C5C6C7] text-sm">Account Name:</span>
                      <span className="text-white font-medium">{viewTransaction.client_bank_account_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#C5C6C7] text-sm">Account Number:</span>
                      <span className="text-white font-mono">{viewTransaction.client_bank_account_number}</span>
                    </div>
                    {viewTransaction.client_bank_swift_iban && (
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7] text-sm">SWIFT/BIC:</span>
                        <span className="text-white font-mono">{viewTransaction.client_bank_swift_iban}</span>
                      </div>
                    )}
                    {viewTransaction.client_bank_currency && (
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7] text-sm">Currency:</span>
                        <Badge className={`${
                          viewTransaction.client_bank_currency === 'USD' ? 'bg-green-500/20 text-green-400' :
                          viewTransaction.client_bank_currency === 'EUR' ? 'bg-blue-500/20 text-blue-400' :
                          viewTransaction.client_bank_currency === 'AED' ? 'bg-purple-500/20 text-purple-400' :
                          viewTransaction.client_bank_currency === 'GBP' ? 'bg-yellow-500/20 text-yellow-400' :
                          viewTransaction.client_bank_currency === 'INR' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {viewTransaction.client_bank_currency}
                        </Badge>
                      </div>
                    )}
                  </div>
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

              {/* Screenshot upload for withdrawal approval or complete */}
              {(actionType === 'complete' || (actionType === 'approve' && selectedTransaction.transaction_type === 'withdrawal')) && (
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                    Upload Proof of Payment {actionType === 'approve' ? '(Required for Withdrawal)' : ''} *
                  </Label>
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

      {/* Settlement Statement Dialog */}
      <Dialog open={statementOpen} onOpenChange={setStatementOpen}>
        <DialogContent className="max-w-3xl bg-white text-[#1a1a1a] border-0 p-0 max-h-[90vh] overflow-hidden">
          {statementLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-8 h-8 border-2 border-[#0B3D91] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : statementData ? (() => {
            const s = statementData.settlement;
            const txs = statementData.transactions;
            const v = statementData.vendor;
            const cur = s.source_currency || 'USD';
            const dCur = s.destination_currency || cur;
            const deposits = txs.filter(t => t.transaction_type === 'deposit');
            const withdrawals = txs.filter(t => t.transaction_type === 'withdrawal');
            return (
              <>
                <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-gray-200">
                  <h2 className="font-bold text-[#0B3D91] text-lg">Settlement Statement</h2>
                  <Button variant="outline" size="sm" onClick={printStatement} className="text-[#0B3D91] border-[#0B3D91] hover:bg-[#0B3D91]/10" data-testid="vendor-print-statement-btn">
                    <Printer className="w-4 h-4 mr-1" /> Print
                  </Button>
                </div>
                <ScrollArea className="max-h-[calc(90vh-60px)]">
                  <div id="vendor-settlement-statement" className="px-8 py-6">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #0B3D91', paddingBottom: '16px', marginBottom: '20px' }}>
                      <div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#0B3D91' }}>MILES CAPITALS</div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>Foreign Exchange Brokerage</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0B3D91' }}>STATEMENT OF SETTLEMENT</div>
                        <div style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>{s.settlement_id}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '40px', marginBottom: '20px' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '6px' }}>Vendor</h4>
                        <p style={{ fontSize: '13px', fontWeight: 600 }}>{v.vendor_name || s.vendor_name}</p>
                        {v.contact_person && <p style={{ fontSize: '12px', color: '#555' }}>{v.contact_person}</p>}
                        {v.email && <p style={{ fontSize: '12px', color: '#555' }}>{v.email}</p>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '6px' }}>Settlement Details</h4>
                        <p style={{ fontSize: '12px' }}>
                          <strong>Type:</strong> {s.settlement_type?.toUpperCase()}<br />
                          <strong>Destination:</strong> {s.settlement_destination_name}<br />
                          <strong>Status:</strong> <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: 600, background: s.status === 'approved' ? '#d1fae5' : '#fef3c7', color: s.status === 'approved' ? '#065f46' : '#92400e' }}>{s.status?.toUpperCase()}</span><br />
                          <strong>Date:</strong> {s.settled_at ? new Date(s.settled_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Pending'}
                        </p>
                      </div>
                    </div>
                    <h4 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '8px' }}>Included Transactions ({txs.length})</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', margin: '0 0 16px 0' }}>
                      <thead>
                        <tr>
                          <th style={{ background: '#0B3D91', color: '#fff', fontSize: '10px', textTransform: 'uppercase', padding: '8px 12px', textAlign: 'left' }}>Reference</th>
                          <th style={{ background: '#0B3D91', color: '#fff', fontSize: '10px', textTransform: 'uppercase', padding: '8px 12px', textAlign: 'left' }}>Type</th>
                          <th style={{ background: '#0B3D91', color: '#fff', fontSize: '10px', textTransform: 'uppercase', padding: '8px 12px', textAlign: 'left' }}>Client</th>
                          <th style={{ background: '#0B3D91', color: '#fff', fontSize: '10px', textTransform: 'uppercase', padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txs.map((tx, idx) => (
                          <tr key={tx.transaction_id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                            <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5', fontFamily: 'monospace' }}>{tx.reference || tx.transaction_id}</td>
                            <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5', textTransform: 'capitalize' }}>{tx.transaction_type}</td>
                            <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5' }}>{tx.client_name || '-'}</td>
                            <td style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #e5e5e5', textAlign: 'right', fontFamily: 'monospace', color: tx.transaction_type === 'deposit' ? '#16a34a' : '#dc2626' }}>
                              {tx.transaction_type === 'deposit' ? '+' : '-'}{tx.base_currency && tx.base_currency === cur ? fmtCurrency(tx.base_amount, cur) : fmtCurrency(tx.amount, tx.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ background: '#f0f4fa', border: '1px solid #d0d8e8', borderRadius: '4px', padding: '16px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
                        <span>Gross Amount ({deposits.length} deposits, {withdrawals.length} withdrawals)</span>
                        <span style={{ fontFamily: 'monospace' }}>{fmtCurrency(s.gross_amount, cur)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#dc2626' }}>
                        <span>Commission</span>
                        <span style={{ fontFamily: 'monospace' }}>-{fmtCurrency(s.commission_amount, cur)}</span>
                      </div>
                      {s.charges_amount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#dc2626' }}>
                          <span>Additional Charges {s.charges_description ? `(${s.charges_description})` : ''}</span>
                          <span style={{ fontFamily: 'monospace' }}>-{fmtCurrency(s.charges_amount, cur)}</span>
                        </div>
                      )}
                      {cur !== dCur && s.exchange_rate !== 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px', color: '#555' }}>
                          <span>Exchange Rate ({cur} to {dCur})</span>
                          <span style={{ fontFamily: 'monospace' }}>{s.exchange_rate}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0B3D91', marginTop: '8px', paddingTop: '8px', fontWeight: 700, fontSize: '15px', color: '#0B3D91' }}>
                        <span>Net Settlement</span>
                        <span style={{ fontFamily: 'monospace' }}>{fmtCurrency(s.settlement_amount, dCur)}</span>
                      </div>
                    </div>
                    {s.approved_by_name && (
                      <div style={{ marginTop: '24px', fontSize: '12px', color: '#555' }}>
                        <strong>Approved by:</strong> {s.approved_by_name} on {s.approved_at ? new Date(s.approved_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                    )}
                    <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #ddd', fontSize: '10px', color: '#888', textAlign: 'center' }}>
                      This is a system-generated statement from Miles Capitals Back Office. Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
                    </div>
                  </div>
                </ScrollArea>
              </>
            );
          })() : (
            <div className="py-10 text-center text-gray-400">No data available</div>
          )}
        </DialogContent>
      </Dialog>

      {/* IE Action Dialog (Approve/Reject with Captcha) */}
      <Dialog open={ieActionDialog.open} onOpenChange={(open) => { if (!open) { setIeActionDialog({ open: false, entry: null, type: '' }); resetIeActionState(); } }}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              {ieActionDialog.type === 'approve' ? 'Approve' : 'Reject'} Entry
            </DialogTitle>
          </DialogHeader>
          {ieActionDialog.entry && (
            <div className="space-y-4">
              {/* Entry Details */}
              <div className={`p-3 rounded border ${ieActionDialog.entry.entry_type === 'income' ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className="flex justify-between items-center">
                  <Badge className={ieActionDialog.entry.entry_type === 'income' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}>
                    {ieActionDialog.entry.entry_type === 'income' ? 'Income' : 'Expense'}
                  </Badge>
                  <span className={`font-mono text-lg font-bold ${ieActionDialog.entry.entry_type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {ieActionDialog.entry.amount?.toLocaleString()} {ieActionDialog.entry.currency}
                  </span>
                </div>
                <p className="text-sm text-[#C5C6C7] mt-2 capitalize">{ieActionDialog.entry.category?.replace('_', ' ')}</p>
                {ieActionDialog.entry.description && <p className="text-xs text-[#8B8D91] mt-1">{ieActionDialog.entry.description}</p>}
                {ieActionDialog.entry.vendor_bank_account_number && (
                  <div className="mt-2 text-[10px] text-[#8B8D91] space-y-0.5">
                    {ieActionDialog.entry.vendor_bank_account_name && <p>Name: {ieActionDialog.entry.vendor_bank_account_name}</p>}
                    <p>A/C: {ieActionDialog.entry.vendor_bank_account_number}</p>
                    {ieActionDialog.entry.vendor_bank_ifsc && <p>IFSC: {ieActionDialog.entry.vendor_bank_ifsc}</p>}
                    {ieActionDialog.entry.vendor_bank_branch && <p>Branch: {ieActionDialog.entry.vendor_bank_branch}</p>}
                  </div>
                )}
                {vendorInfo && (
                  <div className="mt-2 pt-2 border-t border-white/10 text-xs text-[#66FCF1]">
                    Commission: {ieActionDialog.entry.entry_type === 'income'
                      ? `${vendorInfo.deposit_commission || 0}% (Money In rate)`
                      : `${vendorInfo.withdrawal_commission || 0}% (Money Out rate)`
                    } = {((ieActionDialog.entry.amount || 0) * (ieActionDialog.entry.entry_type === 'income' ? (vendorInfo.deposit_commission || 0) : (vendorInfo.withdrawal_commission || 0)) / 100).toFixed(2)} {ieActionDialog.entry.currency}
                  </div>
                )}
              </div>

              {/* Proof Upload (approve only) */}
              {ieActionDialog.type === 'approve' && (
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Upload Proof Screenshot *</Label>
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setIeProofImage(file);
                      setIeProofPreview(URL.createObjectURL(file));
                    }
                  }} className="block w-full text-xs text-[#C5C6C7] file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[#66FCF1]/10 file:text-[#66FCF1] file:text-xs hover:file:bg-[#66FCF1]/20" data-testid="ie-proof-upload" />
                  {ieProofPreview && (
                    <img src={ieProofPreview} alt="Proof" className="w-full max-h-32 object-contain rounded border border-white/10 mt-1" />
                  )}
                </div>
              )}

              {/* Rejection Reason (reject only) */}
              {ieActionDialog.type === 'reject' && (
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Rejection Reason</Label>
                  <Textarea value={ieRejectionReason} onChange={(e) => setIeRejectionReason(e.target.value)} className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]" rows={2} placeholder="Enter reason..." data-testid="ie-rejection-reason" />
                </div>
              )}

              {/* Math Captcha */}
              <div className="space-y-2 p-3 bg-[#0B0C10] border border-white/10 rounded">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Verification: What is {ieCaptcha.num1} + {ieCaptcha.num2}?</Label>
                <Input type="number" value={ieCaptchaAnswer} onChange={(e) => setIeCaptchaAnswer(e.target.value)} className="bg-[#1F2833] border-white/10 text-white focus:border-[#66FCF1] font-mono text-center text-lg" placeholder="?" data-testid="ie-captcha-answer" />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setIeActionDialog({ open: false, entry: null, type: '' }); resetIeActionState(); }} className="border-white/10 text-[#C5C6C7] hover:bg-white/5">Cancel</Button>
                <Button onClick={executeIeAction}
                  className={ieActionDialog.type === 'approve' ? 'bg-green-500 hover:bg-green-600 text-white font-bold' : 'bg-red-500 hover:bg-red-600 text-white font-bold'}
                  data-testid="ie-confirm-action">
                  {ieActionDialog.type === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
