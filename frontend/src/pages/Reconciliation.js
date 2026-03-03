import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Textarea } from '../components/ui/textarea';
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
  DialogFooter,
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
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Link2,
  Building2,
  CreditCard,
  Users,
  Store,
  RefreshCw,
  Download,
  ArrowUpDown,
  Calendar,
  Flag,
  Check,
  X,
  Clock,
  History,
  FileText,
  DollarSign,
  AlertCircle,
  Trash2,
  Edit,
  Plus,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Reconciliation() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Daily reconciliation state
  const [dailyData, setDailyData] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  
  // Bank reconciliation state
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [uploading, setUploading] = useState(false);
  const [bankBatches, setBankBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState(null);
  
  // PSP reconciliation state
  const [pspRecon, setPspRecon] = useState([]);
  const [selectedPsp, setSelectedPsp] = useState(null);
  const [pspDetails, setPspDetails] = useState([]);
  
  // Client reconciliation state
  const [clientRecon, setClientRecon] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  
  // Exchanger reconciliation state
  const [vendorRecon, setExchangerRecon] = useState([]);
  
  // History state
  const [history, setHistory] = useState([]);
  const [flaggedItems, setFlaggedItems] = useState([]);
  
  // Dialog states
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [adjustmentData, setAdjustmentData] = useState({ amount: '', reason: '', treasury_account_id: '' });
  const [reconcileNotes, setReconcileNotes] = useState('');

  const isAdmin = user?.role === 'admin';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/summary`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        setSummary(await response.json());
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, []);

  const fetchDailyData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/daily`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        setDailyData(await response.json());
      }
    } catch (error) {
      console.error('Error fetching daily data:', error);
    }
  }, []);

  const fetchTreasuryAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/treasury`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        setTreasuryAccounts(await response.json());
      }
    } catch (error) {
      console.error('Error fetching treasury accounts:', error);
    }
  };

  const fetchBankBatches = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/batches`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        setBankBatches(await response.json());
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchBatchDetails = async (batchId) => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/batch/${batchId}`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        setBatchDetails(await response.json());
      }
    } catch (error) {
      console.error('Error fetching batch details:', error);
    }
  };

  const fetchPspRecon = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/psp`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        setPspRecon(await response.json());
      }
    } catch (error) {
      console.error('Error fetching PSP reconciliation:', error);
    }
  };

  const fetchPspDetails = async (pspId) => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/psp/${pspId}/details`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        setPspDetails(await response.json());
      }
    } catch (error) {
      console.error('Error fetching PSP details:', error);
    }
  };

  const fetchClientRecon = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/clients`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        setClientRecon(await response.json());
      }
    } catch (error) {
      console.error('Error fetching client reconciliation:', error);
    }
  };

  const fetchClientDetails = async (clientId) => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/client/${clientId}/details`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        setClientDetails(await response.json());
      }
    } catch (error) {
      console.error('Error fetching client details:', error);
    }
  };

  const fetchExchangerRecon = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/vendors`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        setExchangerRecon(await response.json());
      }
    } catch (error) {
      console.error('Error fetching exchanger reconciliation:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/history?limit=50`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        setHistory(await response.json());
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const fetchFlaggedItems = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/flagged`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        setFlaggedItems(await response.json());
      }
    } catch (error) {
      console.error('Error fetching flagged items:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchSummary(),
        fetchDailyData(),
        fetchTreasuryAccounts(),
        fetchBankBatches(),
        fetchPspRecon(),
        fetchClientRecon(),
        fetchExchangerRecon(),
        fetchHistory(),
        fetchFlaggedItems(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchSummary, fetchDailyData]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAccount) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('account_id', selectedAccount);
    
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/bank/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(`Processed ${result.total_rows} rows: ${result.matched} matched, ${result.unmatched} unmatched`);
        fetchBankBatches();
        fetchSummary();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Upload failed');
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Quick reconcile single item
  const handleQuickReconcile = async (item) => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/quick-reconcile?reference_id=${item.id}&item_type=${item.type}&notes=${encodeURIComponent(reconcileNotes)}`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (response.ok) {
        toast.success('Item reconciled');
        fetchDailyData();
        fetchSummary();
        fetchHistory();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to reconcile');
      }
    } catch (error) {
      toast.error('Failed to reconcile');
    }
  };

  // Bulk reconcile selected items
  const handleBulkReconcile = async () => {
    if (selectedItems.length === 0) {
      toast.error('No items selected');
      return;
    }
    
    try {
      const items = selectedItems.map(id => {
        const item = dailyData?.items?.find(i => i.id === id);
        return { reference_id: id, item_type: item?.type || 'unknown' };
      });
      
      const response = await fetch(`${API_URL}/api/reconciliation/bulk-reconcile?notes=${encodeURIComponent(reconcileNotes)}`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(items),
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setSelectedItems([]);
        setReconcileNotes('');
        fetchDailyData();
        fetchSummary();
        fetchHistory();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to reconcile');
      }
    } catch (error) {
      toast.error('Failed to reconcile');
    }
  };

  // Flag for review
  const handleFlag = async () => {
    if (!selectedItemForAction || !flagReason) return;
    
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/flag?reference_id=${selectedItemForAction.id}&item_type=${selectedItemForAction.type}&reason=${encodeURIComponent(flagReason)}`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (response.ok) {
        toast.success('Item flagged for review');
        setFlagDialogOpen(false);
        setFlagReason('');
        setSelectedItemForAction(null);
        fetchDailyData();
        fetchFlaggedItems();
        fetchHistory();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to flag item');
      }
    } catch (error) {
      toast.error('Failed to flag item');
    }
  };

  // Create adjustment
  const handleCreateAdjustment = async () => {
    if (!selectedItemForAction || !adjustmentData.amount || !adjustmentData.reason) return;
    
    try {
      const params = new URLSearchParams({
        reference_id: selectedItemForAction.id,
        item_type: selectedItemForAction.type,
        adjustment_amount: adjustmentData.amount,
        currency: selectedItemForAction.currency || 'USD',
        reason: adjustmentData.reason,
      });
      if (adjustmentData.treasury_account_id) {
        params.append('treasury_account_id', adjustmentData.treasury_account_id);
      }
      
      const response = await fetch(`${API_URL}/api/reconciliation/adjustment?${params}`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (response.ok) {
        toast.success('Adjustment created');
        setAdjustmentDialogOpen(false);
        setAdjustmentData({ amount: '', reason: '', treasury_account_id: '' });
        setSelectedItemForAction(null);
        fetchDailyData();
        fetchSummary();
        fetchHistory();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create adjustment');
      }
    } catch (error) {
      toast.error('Failed to create adjustment');
    }
  };

  // Export unmatched
  const handleExportUnmatched = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/export-unmatched`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `unmatched_items_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        toast.success(`Exported ${data.total_count} items`);
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'reconciled':
      case 'matched':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Reconciled</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'flagged':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><Flag className="w-3 h-3 mr-1" />Flagged</Badge>;
      case 'unmatched':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Unmatched</Badge>;
      case 'discrepancy':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Discrepancy</Badge>;
      default:
        return <Badge className="bg-slate-200 text-slate-600">{status}</Badge>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const selectAllPending = () => {
    const pendingIds = dailyData?.items?.filter(i => i.status === 'pending').map(i => i.id) || [];
    setSelectedItems(pendingIds);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Reconciliation</h1>
          <p className="text-slate-500 mt-1">Match and verify transactions across all accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportUnmatched} className="border-slate-200 text-slate-600">
            <Download className="w-4 h-4 mr-2" /> Export Unmatched
          </Button>
          <Button variant="outline" onClick={() => { fetchSummary(); fetchDailyData(); }} className="border-slate-200 text-slate-600">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className={`bg-white border-l-4 ${summary.bank.status === 'attention' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Bank</p>
                  <p className="text-2xl font-bold text-slate-800">{summary.bank.unmatched_entries}</p>
                  <p className="text-xs text-slate-500">Unmatched</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className={`bg-white border-l-4 ${summary.psp.status === 'attention' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">PSP</p>
                  <p className="text-2xl font-bold text-slate-800">${Math.abs(summary.psp.total_variance).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Variance</p>
                </div>
                <CreditCard className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className={`bg-white border-l-4 ${summary.clients.status === 'attention' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Clients</p>
                  <p className="text-2xl font-bold text-slate-800">{summary.clients.clients_with_discrepancy}</p>
                  <p className="text-xs text-slate-500">Discrepancies</p>
                </div>
                <Users className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card className={`bg-white border-l-4 ${summary.vendors.status === 'attention' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Exchangers</p>
                  <p className="text-2xl font-bold text-slate-800">{summary.vendors.vendors_with_discrepancy}</p>
                  <p className="text-xs text-slate-500">Discrepancies</p>
                </div>
                <Store className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-50 border border-slate-200 flex-wrap">
          <TabsTrigger value="daily" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
            <Calendar className="w-4 h-4 mr-1" /> Daily
          </TabsTrigger>
          <TabsTrigger value="bank" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
            <Building2 className="w-4 h-4 mr-1" /> Bank
          </TabsTrigger>
          <TabsTrigger value="psp" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
            <CreditCard className="w-4 h-4 mr-1" /> PSP
          </TabsTrigger>
          <TabsTrigger value="clients" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
            <Users className="w-4 h-4 mr-1" /> Clients
          </TabsTrigger>
          <TabsTrigger value="exchangers" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
            <Store className="w-4 h-4 mr-1" /> Exchangers
          </TabsTrigger>
          <TabsTrigger value="flagged" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
            <Flag className="w-4 h-4 mr-1" /> Flagged ({flaggedItems.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
            <History className="w-4 h-4 mr-1" /> History
          </TabsTrigger>
        </TabsList>

        {/* Daily Reconciliation Tab */}
        <TabsContent value="daily" className="mt-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#66FCF1]" />
                  Today's Reconciliation
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllPending} className="text-slate-600">
                    Select All Pending
                  </Button>
                  {selectedItems.length > 0 && (
                    <Button onClick={handleBulkReconcile} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <Check className="w-4 h-4 mr-1" /> Reconcile Selected ({selectedItems.length})
                    </Button>
                  )}
                </div>
              </div>
              {dailyData?.stats && (
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-slate-800">{dailyData.stats.total}</p>
                    <p className="text-xs text-slate-500">Total Items</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{dailyData.stats.reconciled}</p>
                    <p className="text-xs text-green-600">Reconciled</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{dailyData.stats.pending}</p>
                    <p className="text-xs text-yellow-600">Pending</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{dailyData.stats.flagged}</p>
                    <p className="text-xs text-red-600">Flagged</p>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {selectedItems.length > 0 && (
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <Label className="text-xs text-slate-500 uppercase">Notes for Reconciliation (Optional)</Label>
                  <Textarea 
                    value={reconcileNotes}
                    onChange={(e) => setReconcileNotes(e.target.value)}
                    placeholder="Add any notes about this reconciliation..."
                    className="mt-1 bg-white border-slate-200"
                  />
                </div>
              )}
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="text-slate-500 text-xs uppercase">Date</TableHead>
                      <TableHead className="text-slate-500 text-xs uppercase">Type</TableHead>
                      <TableHead className="text-slate-500 text-xs uppercase">Description</TableHead>
                      <TableHead className="text-slate-500 text-xs uppercase">Reference</TableHead>
                      <TableHead className="text-slate-500 text-xs uppercase text-right">Amount</TableHead>
                      <TableHead className="text-slate-500 text-xs uppercase">Status</TableHead>
                      <TableHead className="text-slate-500 text-xs uppercase w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyData?.items?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                          <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                          <p>No transactions today</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      dailyData?.items?.map((item) => (
                        <TableRow key={item.id} className={`border-slate-200 hover:bg-slate-50 ${item.status === 'reconciled' ? 'opacity-60' : ''}`}>
                          <TableCell>
                            {item.status !== 'reconciled' && (
                              <Checkbox
                                checked={selectedItems.includes(item.id)}
                                onCheckedChange={() => toggleItemSelection(item.id)}
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-slate-800 text-sm">{formatDate(item.date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {item.type?.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-800 text-sm max-w-[200px] truncate">{item.description}</TableCell>
                          <TableCell className="text-slate-500 text-xs font-mono">{item.reference || '-'}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            <span className={item.category === 'income' || item.category === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                              {item.amount?.toLocaleString()} {item.currency}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(item.status)}</TableCell>
                          <TableCell>
                            {item.status !== 'reconciled' && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQuickReconcile(item)}
                                  className="text-green-600 hover:bg-green-50 h-7 px-2"
                                  title="Quick Reconcile"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setSelectedItemForAction(item); setFlagDialogOpen(true); }}
                                  className="text-red-500 hover:bg-red-50 h-7 px-2"
                                  title="Flag for Review"
                                >
                                  <Flag className="w-3.5 h-3.5" />
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setSelectedItemForAction(item); setAdjustmentDialogOpen(true); }}
                                    className="text-blue-600 hover:bg-blue-50 h-7 px-2"
                                    title="Create Adjustment"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Reconciliation Tab */}
        <TabsContent value="bank" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Upload Section */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#66FCF1]" />
                  Upload Bank Statement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase">Treasury Account</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-800">
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {treasuryAccounts.map((acc) => (
                        <SelectItem key={acc.account_id} value={acc.account_id} className="text-slate-800 hover:bg-slate-50">
                          {acc.account_name} - {acc.bank_name} ({acc.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 text-xs uppercase">Statement File (CSV/Excel/PDF)</Label>
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf"
                    onChange={handleFileUpload}
                    disabled={uploading || !selectedAccount}
                    className="bg-slate-50 border-slate-200 text-slate-800 file:bg-[#66FCF1] file:text-[#0B0C10] file:border-0 file:rounded file:px-3 file:py-1 file:mr-3 file:font-bold"
                    data-testid="bank-statement-upload"
                  />
                  <p className="text-xs text-slate-500">Supported: CSV, Excel (.xlsx, .xls), PDF</p>
                </div>
                {uploading && (
                  <div className="flex items-center gap-2 text-[#66FCF1]">
                    <div className="w-4 h-4 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Batches */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#66FCF1]" />
                  Recent Uploads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {bankBatches.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No uploads yet</p>
                  ) : (
                    <div className="space-y-2">
                      {bankBatches.map((batch) => (
                        <div
                          key={batch.batch_id}
                          className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => { setSelectedBatch(batch); fetchBatchDetails(batch.batch_id); }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-800 text-sm">{batch.account_name}</p>
                              <p className="text-xs text-slate-500">{batch.filename}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-500">{formatDate(batch.created_at)}</p>
                              <div className="flex gap-1 mt-1">
                                <Badge className="bg-green-500/20 text-green-600 text-[10px]">{batch.matched} matched</Badge>
                                <Badge className="bg-red-500/20 text-red-600 text-[10px]">{batch.unmatched} unmatched</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Batch Details */}
          {batchDetails && (
            <Card className="bg-white border-slate-200 mt-4">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800">
                  Batch Details: {selectedBatch?.filename}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200">
                        <TableHead className="text-slate-500 text-xs">Date</TableHead>
                        <TableHead className="text-slate-500 text-xs">Reference</TableHead>
                        <TableHead className="text-slate-500 text-xs">Description</TableHead>
                        <TableHead className="text-slate-500 text-xs text-right">Amount</TableHead>
                        <TableHead className="text-slate-500 text-xs">Status</TableHead>
                        <TableHead className="text-slate-500 text-xs">Matched To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchDetails.entries?.map((entry) => (
                        <TableRow key={entry.entry_id} className="border-slate-200">
                          <TableCell className="text-slate-800 text-sm">{entry.date || '-'}</TableCell>
                          <TableCell className="text-slate-500 text-xs font-mono">{entry.reference || '-'}</TableCell>
                          <TableCell className="text-slate-800 text-sm max-w-[200px] truncate">{entry.description || '-'}</TableCell>
                          <TableCell className="text-right font-mono text-sm text-slate-800">{entry.amount?.toLocaleString()}</TableCell>
                          <TableCell>{getStatusBadge(entry.status)}</TableCell>
                          <TableCell className="text-slate-500 text-xs">{entry.matched_transaction_id || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PSP Tab */}
        <TabsContent value="psp" className="mt-4">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#66FCF1]" />
                PSP Reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="text-slate-500 text-xs">PSP Name</TableHead>
                      <TableHead className="text-slate-500 text-xs text-right">Expected</TableHead>
                      <TableHead className="text-slate-500 text-xs text-right">Actual</TableHead>
                      <TableHead className="text-slate-500 text-xs text-right">Variance</TableHead>
                      <TableHead className="text-slate-500 text-xs">Status</TableHead>
                      <TableHead className="text-slate-500 text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pspRecon.map((psp) => (
                      <TableRow key={psp.psp_id} className="border-slate-200 hover:bg-slate-50">
                        <TableCell className="text-slate-800 font-medium">{psp.psp_name}</TableCell>
                        <TableCell className="text-right font-mono text-slate-800">${psp.expected_amount?.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-slate-800">${psp.actual_amount?.toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-mono ${psp.total_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${psp.total_variance?.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(Math.abs(psp.total_variance) < 1 ? 'matched' : 'discrepancy')}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedPsp(psp); fetchPspDetails(psp.psp_id); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="mt-4">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#66FCF1]" />
                Client Reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="text-slate-500 text-xs">Client</TableHead>
                      <TableHead className="text-slate-500 text-xs text-right">Calculated</TableHead>
                      <TableHead className="text-slate-500 text-xs text-right">Recorded</TableHead>
                      <TableHead className="text-slate-500 text-xs text-right">Variance</TableHead>
                      <TableHead className="text-slate-500 text-xs">Status</TableHead>
                      <TableHead className="text-slate-500 text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientRecon.map((client) => (
                      <TableRow key={client.client_id} className="border-slate-200 hover:bg-slate-50">
                        <TableCell className="text-slate-800 font-medium">{client.client_name}</TableCell>
                        <TableCell className="text-right font-mono text-slate-800">${client.calculated_balance?.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-slate-800">${client.recorded_balance?.toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-mono ${client.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${client.variance?.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(client.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedClient(client); fetchClientDetails(client.client_id); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exchangers Tab */}
        <TabsContent value="exchangers" className="mt-4">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <Store className="w-5 h-5 text-[#66FCF1]" />
                Exchanger Reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="text-slate-500 text-xs">Exchanger</TableHead>
                      <TableHead className="text-slate-500 text-xs text-right">Volume</TableHead>
                      <TableHead className="text-slate-500 text-xs text-right">Expected Commission</TableHead>
                      <TableHead className="text-slate-500 text-xs text-right">Paid</TableHead>
                      <TableHead className="text-slate-500 text-xs text-right">Variance</TableHead>
                      <TableHead className="text-slate-500 text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorRecon.map((vendor) => (
                      <TableRow key={vendor.vendor_id} className="border-slate-200 hover:bg-slate-50">
                        <TableCell className="text-slate-800 font-medium">{vendor.vendor_name}</TableCell>
                        <TableCell className="text-right font-mono text-slate-800">${vendor.total_volume?.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-blue-600">${vendor.expected_commission?.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">${vendor.paid_commission?.toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-mono ${vendor.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${vendor.variance?.toLocaleString()}
                        </TableCell>
                        <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flagged Tab */}
        <TabsContent value="flagged" className="mt-4">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-500" />
                Flagged Items for Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              {flaggedItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p>No flagged items</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200">
                        <TableHead className="text-slate-500 text-xs">Reference</TableHead>
                        <TableHead className="text-slate-500 text-xs">Type</TableHead>
                        <TableHead className="text-slate-500 text-xs">Reason</TableHead>
                        <TableHead className="text-slate-500 text-xs">Flagged By</TableHead>
                        <TableHead className="text-slate-500 text-xs">Date</TableHead>
                        <TableHead className="text-slate-500 text-xs">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flaggedItems.map((item) => (
                        <TableRow key={item.item_id} className="border-slate-200 hover:bg-slate-50">
                          <TableCell className="text-slate-800 font-mono text-sm">{item.reference_id}</TableCell>
                          <TableCell><Badge variant="outline">{item.item_type}</Badge></TableCell>
                          <TableCell className="text-slate-800 max-w-[200px] truncate">{item.flag_reason}</TableCell>
                          <TableCell className="text-slate-500 text-sm">{item.flagged_by_name}</TableCell>
                          <TableCell className="text-slate-500 text-sm">{formatDate(item.flagged_at)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQuickReconcile(item)}
                                className="text-green-600 hover:bg-green-50"
                                title="Resolve & Reconcile"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setSelectedItemForAction(item); setAdjustmentDialogOpen(true); }}
                                  className="text-blue-600 hover:bg-blue-50"
                                  title="Create Adjustment"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
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

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-[#66FCF1]" />
                Reconciliation Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="text-slate-500 text-xs">Date/Time</TableHead>
                      <TableHead className="text-slate-500 text-xs">Action</TableHead>
                      <TableHead className="text-slate-500 text-xs">Reference</TableHead>
                      <TableHead className="text-slate-500 text-xs">Type</TableHead>
                      <TableHead className="text-slate-500 text-xs">Performed By</TableHead>
                      <TableHead className="text-slate-500 text-xs">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((entry) => (
                      <TableRow key={entry.history_id} className="border-slate-200 hover:bg-slate-50">
                        <TableCell className="text-slate-800 text-sm">{formatDate(entry.created_at)}</TableCell>
                        <TableCell>
                          <Badge className={
                            entry.action === 'reconciled' ? 'bg-green-500/20 text-green-600' :
                            entry.action === 'flagged' ? 'bg-red-500/20 text-red-600' :
                            entry.action === 'adjustment_created' ? 'bg-blue-500/20 text-blue-600' :
                            'bg-slate-200 text-slate-600'
                          }>
                            {entry.action?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 font-mono text-xs">{entry.reference_id?.substring(0, 20)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{entry.item_type}</Badge></TableCell>
                        <TableCell className="text-slate-800 text-sm">{entry.performed_by_name}</TableCell>
                        <TableCell className="text-slate-500 text-sm max-w-[200px] truncate">{entry.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Flag for Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-600">Item Reference</Label>
              <p className="text-slate-800 font-mono text-sm mt-1">{selectedItemForAction?.id}</p>
            </div>
            <div>
              <Label className="text-slate-600">Reason for Flagging *</Label>
              <Textarea
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="Describe why this item needs review..."
                className="mt-1 border-slate-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleFlag} className="bg-red-600 hover:bg-red-700 text-white" disabled={!flagReason}>
              <Flag className="w-4 h-4 mr-2" /> Flag Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjustment Dialog */}
      <Dialog open={adjustmentDialogOpen} onOpenChange={setAdjustmentDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Create Adjustment Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-600">Item Reference</Label>
              <p className="text-slate-800 font-mono text-sm mt-1">{selectedItemForAction?.id}</p>
            </div>
            <div>
              <Label className="text-slate-600">Adjustment Amount *</Label>
              <Input
                type="number"
                step="0.01"
                value={adjustmentData.amount}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, amount: e.target.value })}
                placeholder="Enter amount (positive or negative)"
                className="mt-1 border-slate-200"
              />
              <p className="text-xs text-slate-500 mt-1">Use negative for debits, positive for credits</p>
            </div>
            <div>
              <Label className="text-slate-600">Treasury Account (Optional)</Label>
              <Select value={adjustmentData.treasury_account_id} onValueChange={(v) => setAdjustmentData({ ...adjustmentData, treasury_account_id: v })}>
                <SelectTrigger className="mt-1 border-slate-200">
                  <SelectValue placeholder="Select account to adjust..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {treasuryAccounts.map((acc) => (
                    <SelectItem key={acc.account_id} value={acc.account_id}>
                      {acc.account_name} ({acc.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-600">Reason *</Label>
              <Textarea
                value={adjustmentData.reason}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                placeholder="Explain the reason for this adjustment..."
                className="mt-1 border-slate-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAdjustment} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!adjustmentData.amount || !adjustmentData.reason}>
              <Plus className="w-4 h-4 mr-2" /> Create Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
