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
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Reconciliation() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  
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
    } finally {
      setLoading(false);
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
      console.error('Error:', error);
    }
  };

  const fetchBankBatches = async () => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/batches?type=bank`, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (response.ok) {
        setBankBatches(await response.json());
      }
    } catch (error) {
      console.error('Error:', error);
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
      console.error('Error:', error);
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
      console.error('Error:', error);
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
      console.error('Error:', error);
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
      console.error('Error:', error);
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
      console.error('Error:', error);
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
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchTreasuryAccounts();
    fetchBankBatches();
    fetchPspRecon();
    fetchClientRecon();
    fetchExchangerRecon();
  }, [fetchSummary]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!selectedAccount) {
      toast.error('Please select a treasury account first');
      return;
    }
    
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'matched':
      case 'ok':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Matched</Badge>;
      case 'discrepancy':
      case 'variance':
      case 'attention':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Discrepancy</Badge>;
      case 'unmatched':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Unmatched</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="reconciliation-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
            Reconciliation
          </h1>
          <p className="text-[#C5C6C7]">Match and verify transactions across all accounts</p>
        </div>
        <Button
          onClick={() => { fetchSummary(); fetchBankBatches(); fetchPspRecon(); fetchClientRecon(); fetchExchangerRecon(); }}
          variant="outline"
          className="border-slate-200 text-[#C5C6C7] hover:bg-white/5"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className={`bg-white border-slate-200 ${summary.bank.status === 'attention' ? 'border-l-4 border-l-yellow-500' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Building2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[#C5C6C7] uppercase">Bank</p>
                    <p className="text-xl font-bold text-white">{summary.bank.unmatched_entries}</p>
                    <p className="text-xs text-[#C5C6C7]">Unmatched</p>
                  </div>
                </div>
                {summary.bank.status === 'attention' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-white border-slate-200 ${summary.psp.status === 'attention' ? 'border-l-4 border-l-yellow-500' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[#C5C6C7] uppercase">PSP</p>
                    <p className="text-xl font-bold text-white">{formatCurrency(summary.psp.total_variance)}</p>
                    <p className="text-xs text-[#C5C6C7]">Variance</p>
                  </div>
                </div>
                {summary.psp.status === 'attention' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-white border-slate-200 ${summary.clients.status === 'attention' ? 'border-l-4 border-l-yellow-500' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[#C5C6C7] uppercase">Clients</p>
                    <p className="text-xl font-bold text-white">{summary.clients.clients_with_discrepancy}</p>
                    <p className="text-xs text-[#C5C6C7]">Discrepancies</p>
                  </div>
                </div>
                {summary.clients.status === 'attention' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-white border-slate-200 ${summary.vendors.status === 'attention' ? 'border-l-4 border-l-yellow-500' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Store className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-[#C5C6C7] uppercase">Exchangers</p>
                    <p className="text-xl font-bold text-white">{summary.vendors.vendors_with_discrepancy}</p>
                    <p className="text-xs text-[#C5C6C7]">Discrepancies</p>
                  </div>
                </div>
                {summary.vendors.status === 'attention' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-50 border border-slate-200">
          <TabsTrigger value="summary" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
            Summary
          </TabsTrigger>
          <TabsTrigger value="bank" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
            Bank
          </TabsTrigger>
          <TabsTrigger value="psp" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
            PSP
          </TabsTrigger>
          <TabsTrigger value="clients" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
            Clients
          </TabsTrigger>
          <TabsTrigger value="vendors" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
            Exchangers
          </TabsTrigger>
        </TabsList>

        {/* Bank Reconciliation Tab */}
        <TabsContent value="bank" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Upload Section */}
            <Card className="bg-white border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#66FCF1]" />
                  Upload Bank Statement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase">Treasury Account</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-white">
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {treasuryAccounts.map((acc) => (
                        <SelectItem key={acc.account_id} value={acc.account_id} className="text-white hover:bg-white/5">
                          {acc.account_name} - {acc.bank_name} ({acc.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase">Statement File (CSV/Excel)</Label>
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={uploading || !selectedAccount}
                    className="bg-slate-50 border-slate-200 text-white file:bg-[#66FCF1] file:text-[#0B0C10] file:border-0 file:rounded file:px-3 file:py-1 file:mr-3 file:font-bold"
                    data-testid="bank-statement-upload"
                  />
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
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#66FCF1]" />
                  Recent Uploads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {bankBatches.length === 0 ? (
                    <p className="text-[#C5C6C7] text-center py-4">No uploads yet</p>
                  ) : (
                    <div className="space-y-2">
                      {bankBatches.map((batch) => (
                        <div
                          key={batch.batch_id}
                          className="p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-[#66FCF1]/30"
                          onClick={() => { setSelectedBatch(batch); fetchBatchDetails(batch.batch_id); }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-white font-medium text-sm">{batch.filename}</span>
                            <span className="text-xs text-[#C5C6C7]">{formatDate(batch.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-green-400">{batch.matched} matched</span>
                            <span className="text-red-400">{batch.unmatched} unmatched</span>
                            <span className="text-yellow-400">{batch.discrepancies} discrepancy</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Batch Details Dialog */}
          <Dialog open={!!batchDetails} onOpenChange={() => setBatchDetails(null)}>
            <DialogContent className="bg-white border-slate-200 text-white max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                  Reconciliation Details - {batchDetails?.batch?.filename}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="text-[#C5C6C7] text-xs">Row</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">Amount</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">Date</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">Reference</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">Status</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">Variance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchDetails?.entries?.map((entry) => (
                      <TableRow key={entry.entry_id} className="border-slate-200 hover:bg-white/5">
                        <TableCell className="text-white">{entry.row_number}</TableCell>
                        <TableCell className="text-white font-mono">{formatCurrency(entry.parsed_amount)}</TableCell>
                        <TableCell className="text-[#C5C6C7]">{entry.parsed_date || '-'}</TableCell>
                        <TableCell className="text-[#C5C6C7] font-mono text-xs">{entry.parsed_reference || '-'}</TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        <TableCell className={entry.variance ? (entry.variance > 0 ? 'text-green-400' : 'text-red-400') : 'text-[#C5C6C7]'}>
                          {entry.variance ? formatCurrency(entry.variance) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* PSP Reconciliation Tab */}
        <TabsContent value="psp" className="mt-4">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#66FCF1]" />
                PSP Settlement Reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200">
                    <TableHead className="text-[#C5C6C7] text-xs">PSP</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Transactions</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Expected</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Actual</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Variance</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Status</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pspRecon.map((psp) => (
                    <TableRow key={psp.psp_id} className="border-slate-200 hover:bg-white/5">
                      <TableCell className="text-white font-medium">{psp.psp_name}</TableCell>
                      <TableCell className="text-white">{psp.total_transactions}</TableCell>
                      <TableCell className="text-white font-mono">{formatCurrency(psp.expected_amount)}</TableCell>
                      <TableCell className="text-white font-mono">{formatCurrency(psp.actual_amount)}</TableCell>
                      <TableCell className={`font-mono ${psp.total_variance !== 0 ? (psp.total_variance > 0 ? 'text-green-400' : 'text-red-400') : 'text-[#C5C6C7]'}`}>
                        {formatCurrency(psp.total_variance)}
                      </TableCell>
                      <TableCell>
                        {psp.transactions_with_variance > 0 ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            {psp.transactions_with_variance} variance
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setSelectedPsp(psp); fetchPspDetails(psp.psp_id); }}
                          className="text-[#66FCF1] hover:bg-[#66FCF1]/10"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* PSP Details Dialog */}
          <Dialog open={!!selectedPsp && pspDetails.length > 0} onOpenChange={() => { setSelectedPsp(null); setPspDetails([]); }}>
            <DialogContent className="bg-white border-slate-200 text-white max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                  {selectedPsp?.psp_name} - Settlement Details
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="text-[#C5C6C7] text-xs">Reference</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">Gross</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">Deductions</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">Expected</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">Actual</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">Variance</TableHead>
                      <TableHead className="text-[#C5C6C7] text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pspDetails.map((tx) => (
                      <TableRow key={tx.transaction_id} className="border-slate-200 hover:bg-white/5">
                        <TableCell className="text-white font-mono text-xs">{tx.reference}</TableCell>
                        <TableCell className="text-white font-mono">{formatCurrency(tx.gross_amount)}</TableCell>
                        <TableCell className="text-red-400 font-mono text-xs">
                          -{formatCurrency(tx.commission + tx.chargeback + tx.extra_charges)}
                        </TableCell>
                        <TableCell className="text-white font-mono">{formatCurrency(tx.expected_net)}</TableCell>
                        <TableCell className="text-[#66FCF1] font-mono">{formatCurrency(tx.actual_received)}</TableCell>
                        <TableCell className={`font-mono ${tx.variance !== 0 ? (tx.variance > 0 ? 'text-green-400' : 'text-red-400') : 'text-[#C5C6C7]'}`}>
                          {formatCurrency(tx.variance)}
                        </TableCell>
                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Client Reconciliation Tab */}
        <TabsContent value="clients" className="mt-4">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#66FCF1]" />
                Client Account Reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200">
                    <TableHead className="text-[#C5C6C7] text-xs">Client</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Transactions</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Recorded Balance</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Calculated Balance</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Variance</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Status</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientRecon.map((client) => (
                    <TableRow key={client.client_id} className="border-slate-200 hover:bg-white/5">
                      <TableCell className="text-white font-medium">{client.client_name}</TableCell>
                      <TableCell className="text-white">{client.transaction_count}</TableCell>
                      <TableCell className="text-white font-mono">{formatCurrency(client.recorded_balance)}</TableCell>
                      <TableCell className="text-[#66FCF1] font-mono">{formatCurrency(client.calculated_balance)}</TableCell>
                      <TableCell className={`font-mono ${client.variance !== 0 ? (client.variance > 0 ? 'text-green-400' : 'text-red-400') : 'text-[#C5C6C7]'}`}>
                        {formatCurrency(client.variance)}
                      </TableCell>
                      <TableCell>{getStatusBadge(client.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setSelectedClient(client); fetchClientDetails(client.client_id); }}
                          className="text-[#66FCF1] hover:bg-[#66FCF1]/10"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Client Details Dialog */}
          <Dialog open={!!clientDetails} onOpenChange={() => setClientDetails(null)}>
            <DialogContent className="bg-white border-slate-200 text-white max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                  {clientDetails?.client?.name} - Transaction History
                </DialogTitle>
              </DialogHeader>
              {clientDetails && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-xs text-[#C5C6C7] uppercase">Recorded Balance</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(clientDetails.client.recorded_balance)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#C5C6C7] uppercase">Calculated Balance</p>
                      <p className="text-xl font-bold text-[#66FCF1]">{formatCurrency(clientDetails.client.calculated_balance)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#C5C6C7] uppercase">Variance</p>
                      <p className={`text-xl font-bold ${clientDetails.client.variance !== 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {formatCurrency(clientDetails.client.variance)}
                      </p>
                    </div>
                  </div>
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-[#C5C6C7] text-xs">Date</TableHead>
                          <TableHead className="text-[#C5C6C7] text-xs">Type</TableHead>
                          <TableHead className="text-[#C5C6C7] text-xs">Amount</TableHead>
                          <TableHead className="text-[#C5C6C7] text-xs">Running Balance</TableHead>
                          <TableHead className="text-[#C5C6C7] text-xs">Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clientDetails.transactions?.map((tx, idx) => (
                          <TableRow key={idx} className="border-slate-200 hover:bg-white/5">
                            <TableCell className="text-[#C5C6C7] text-xs">{formatDate(tx.date)}</TableCell>
                            <TableCell>
                              <Badge className={tx.type === 'deposit' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                                {tx.type}
                              </Badge>
                            </TableCell>
                            <TableCell className={`font-mono ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                              {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </TableCell>
                            <TableCell className="text-white font-mono">{formatCurrency(tx.running_balance)}</TableCell>
                            <TableCell className="text-[#C5C6C7] font-mono text-xs">{tx.reference || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Exchanger Reconciliation Tab */}
        <TabsContent value="vendors" className="mt-4">
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-[#66FCF1]" />
                Exchanger Commission Reconciliation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200">
                    <TableHead className="text-[#C5C6C7] text-xs">Exchanger</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Rate</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Volume</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Expected Comm.</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Paid</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Pending</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Variance</TableHead>
                    <TableHead className="text-[#C5C6C7] text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorRecon.map((vendor) => (
                    <TableRow key={vendor.vendor_id} className="border-slate-200 hover:bg-white/5">
                      <TableCell className="text-white font-medium">{vendor.vendor_name}</TableCell>
                      <TableCell className="text-white">{vendor.commission_rate}%</TableCell>
                      <TableCell className="text-white font-mono">{formatCurrency(vendor.total_volume)}</TableCell>
                      <TableCell className="text-[#66FCF1] font-mono">{formatCurrency(vendor.expected_commission)}</TableCell>
                      <TableCell className="text-green-400 font-mono">{formatCurrency(vendor.paid_commission)}</TableCell>
                      <TableCell className="text-yellow-400 font-mono">{formatCurrency(vendor.pending_commission)}</TableCell>
                      <TableCell className={`font-mono ${vendor.variance !== 0 ? (vendor.variance > 0 ? 'text-green-400' : 'text-red-400') : 'text-[#C5C6C7]'}`}>
                        {formatCurrency(vendor.variance)}
                      </TableCell>
                      <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {summary && (
              <>
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-400" />
                      Bank Reconciliation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7]">Recent Batches</span>
                        <span className="text-white font-bold">{summary.bank.recent_batches}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7]">Unmatched Entries</span>
                        <span className={`font-bold ${summary.bank.unmatched_entries > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {summary.bank.unmatched_entries}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7]">Discrepancies</span>
                        <span className={`font-bold ${summary.bank.discrepancies > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {summary.bank.discrepancies}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-purple-400" />
                      PSP Reconciliation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7]">Total PSPs</span>
                        <span className="text-white font-bold">{summary.psp.total_psps}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7]">PSPs with Variance</span>
                        <span className={`font-bold ${summary.psp.psps_with_variance > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {summary.psp.psps_with_variance}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7]">Total Variance</span>
                        <span className={`font-bold ${summary.psp.total_variance !== 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {formatCurrency(summary.psp.total_variance)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-400" />
                      Client Reconciliation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7]">Total Clients</span>
                        <span className="text-white font-bold">{summary.clients.total_clients}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7]">With Discrepancy</span>
                        <span className={`font-bold ${summary.clients.clients_with_discrepancy > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {summary.clients.clients_with_discrepancy}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7]">Total Variance</span>
                        <span className={`font-bold ${summary.clients.total_variance > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {formatCurrency(summary.clients.total_variance)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Store className="w-5 h-5 text-orange-400" />
                      Exchanger Reconciliation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7]">Total Exchangers</span>
                        <span className="text-white font-bold">{summary.vendors.total_vendors}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7]">With Discrepancy</span>
                        <span className={`font-bold ${summary.vendors.vendors_with_discrepancy > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {summary.vendors.vendors_with_discrepancy}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7]">Total Variance</span>
                        <span className={`font-bold ${summary.vendors.total_variance > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                          {formatCurrency(summary.vendors.total_variance)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
