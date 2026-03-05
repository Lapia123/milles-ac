import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '../components/ui/tabs';
import { Calendar } from '../components/ui/calendar';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  CalendarDays, Building2, CreditCard, Store, Upload, FileSpreadsheet,
  CheckCircle2, AlertTriangle, Clock, History, Link2, Flag, Check, X,
  ChevronLeft, Loader2, FileText, Download, Eye,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Reconciliation() {
  const { user, getAuthHeaders } = useAuth();
  const [selectedDate, setSelectedDate] = useState(null);
  const [datesWithTx, setDatesWithTx] = useState([]);
  const [reconStatus, setReconStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedType, setSelectedType] = useState(null); // treasury, psp, exchanger
  
  // Account selection
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [psps, setPsps] = useState([]);
  const [exchangers, setExchangers] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  
  // Transaction history for selected account/date
  const [accountHistory, setAccountHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Statement upload
  const [uploading, setUploading] = useState(false);
  const [statementFile, setStatementFile] = useState(null);
  const [parsedEntries, setParsedEntries] = useState([]);
  const [showParsed, setShowParsed] = useState(false);
  
  // Matching
  const [selectedSystemTx, setSelectedSystemTx] = useState(null);
  const [selectedStatementEntry, setSelectedStatementEntry] = useState(null);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [flaggedEntries, setFlaggedEntries] = useState([]);
  const [flagDialog, setFlagDialog] = useState({ open: false, entry: null, reason: '' });
  
  // Approval
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // History
  const [reconHistory, setReconHistory] = useState([]);
  const [historyDialog, setHistoryDialog] = useState({ open: false, item: null });
  
  // Daily summary
  const [dailySummary, setDailySummary] = useState(null);

  // Fetch dates with transactions
  const fetchDatesWithTransactions = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/dates-with-transactions`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setDatesWithTx(data.dates || []);
        setReconStatus(data.status || {});
      }
    } catch (error) {
      console.error('Error fetching dates:', error);
    }
  }, [getAuthHeaders]);

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const [treasuryRes, pspRes, exchangerRes] = await Promise.all([
        fetch(`${API_URL}/api/treasury`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/psps`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/vendors?page_size=100`, { headers: getAuthHeaders() })
      ]);
      
      if (treasuryRes.ok) setTreasuryAccounts(await treasuryRes.json());
      if (pspRes.ok) setPsps(await pspRes.json());
      if (exchangerRes.ok) {
        const data = await exchangerRes.json();
        setExchangers(data.items || data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  }, [getAuthHeaders]);

  // Fetch daily summary
  const fetchDailySummary = useCallback(async (date) => {
    if (!date) return;
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await fetch(`${API_URL}/api/reconciliation/daily-summary?date=${dateStr}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        setDailySummary(await response.json());
      }
    } catch (error) {
      console.error('Error fetching daily summary:', error);
    }
  }, [getAuthHeaders]);

  // Fetch account history for selected date
  const fetchAccountHistory = useCallback(async () => {
    if (!selectedDate || !selectedType || !selectedAccount) return;
    
    setHistoryLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await fetch(
        `${API_URL}/api/reconciliation/account-history?type=${selectedType}&account_id=${selectedAccount}&date=${dateStr}`,
        { headers: getAuthHeaders() }
      );
      if (response.ok) {
        setAccountHistory(await response.json());
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load account history');
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedDate, selectedType, selectedAccount, getAuthHeaders]);

  // Fetch reconciliation history
  const fetchReconHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/calendar-history?limit=50`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        setReconHistory(await response.json());
      }
    } catch (error) {
      console.error('Error fetching recon history:', error);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchDatesWithTransactions(), fetchAccounts(), fetchReconHistory()]);
      setLoading(false);
    };
    init();
  }, [fetchDatesWithTransactions, fetchAccounts, fetchReconHistory]);

  useEffect(() => {
    if (selectedAccount) {
      fetchAccountHistory();
    }
  }, [selectedAccount, fetchAccountHistory]);

  useEffect(() => {
    if (selectedDate) {
      fetchDailySummary(selectedDate);
    }
  }, [selectedDate, fetchDailySummary]);

  // Handle statement upload
  const handleStatementUpload = async () => {
    if (!statementFile || !selectedAccount || !selectedDate) {
      toast.error('Please select a file, account, and date');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', statementFile);
    formData.append('account_type', selectedType);
    formData.append('account_id', selectedAccount);
    formData.append('date', selectedDate.toISOString().split('T')[0]);

    try {
      const response = await fetch(`${API_URL}/api/reconciliation/upload-statement`, {
        method: 'POST',
        headers: { 'Authorization': getAuthHeaders()['Authorization'] },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setParsedEntries(data.entries || []);
        setShowParsed(true);
        toast.success(`Parsed ${data.entries?.length || 0} entries from statement`);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to parse statement');
      }
    } catch (error) {
      toast.error('Failed to upload statement');
    } finally {
      setUploading(false);
      setStatementFile(null);
    }
  };

  // Match entry
  const handleMatch = () => {
    if (!selectedSystemTx || !selectedStatementEntry) {
      toast.error('Select both a system transaction and statement entry to match');
      return;
    }

    const pair = {
      system_tx: selectedSystemTx,
      statement_entry: selectedStatementEntry,
      matched_at: new Date().toISOString(),
      matched_by: user?.name
    };

    setMatchedPairs([...matchedPairs, pair]);
    
    // Remove from available lists
    setAccountHistory(accountHistory.filter(tx => tx.transaction_id !== selectedSystemTx.transaction_id));
    setParsedEntries(parsedEntries.filter(e => e.id !== selectedStatementEntry.id));
    
    setSelectedSystemTx(null);
    setSelectedStatementEntry(null);
    toast.success('Entries matched successfully');
  };

  // Flag entry
  const handleFlag = () => {
    if (!flagDialog.entry || !flagDialog.reason) {
      toast.error('Please provide a reason for flagging');
      return;
    }

    const flagged = {
      entry: flagDialog.entry,
      reason: flagDialog.reason,
      flagged_at: new Date().toISOString(),
      flagged_by: user?.name
    };

    setFlaggedEntries([...flaggedEntries, flagged]);
    
    // Remove from parsed entries
    setParsedEntries(parsedEntries.filter(e => e.id !== flagDialog.entry.id));
    
    setFlagDialog({ open: false, entry: null, reason: '' });
    toast.success('Entry flagged');
  };

  // Submit reconciliation
  const handleSubmitReconciliation = async () => {
    if (matchedPairs.length === 0 && flaggedEntries.length === 0) {
      toast.error('No matched or flagged entries to submit');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/reconciliation/submit`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate?.toISOString().split('T')[0],
          account_type: selectedType,
          account_id: selectedAccount,
          matched_pairs: matchedPairs,
          flagged_entries: flaggedEntries,
          remarks: remarks,
          unmatched_system: accountHistory.length,
          unmatched_statement: parsedEntries.length
        })
      });

      if (response.ok) {
        toast.success('Reconciliation submitted successfully');
        // Reset state
        setMatchedPairs([]);
        setFlaggedEntries([]);
        setParsedEntries([]);
        setShowParsed(false);
        setRemarks('');
        fetchDatesWithTransactions();
        fetchReconHistory();
        fetchDailySummary(selectedDate);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to submit reconciliation');
      }
    } catch (error) {
      toast.error('Failed to submit reconciliation');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric' 
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return `${currency} ${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Get account name by ID
  const getAccountName = (type, id) => {
    if (type === 'treasury') {
      return treasuryAccounts.find(a => a.account_id === id)?.account_name || id;
    } else if (type === 'psp') {
      return psps.find(p => p.psp_id === id)?.name || id;
    } else if (type === 'exchanger') {
      return exchangers.find(e => e.vendor_id === id)?.vendor_name || id;
    }
    return id;
  };

  // Check if date has transactions
  const hasTransactions = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return datesWithTx.includes(dateStr);
  };

  // Get date status
  const getDateStatus = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return reconStatus[dateStr];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reconciliation</h1>
          <p className="text-slate-500 mt-1">Match and reconcile transactions</p>
        </div>
        <Button variant="outline" onClick={() => setActiveTab('history')} data-testid="history-btn">
          <History className="w-4 h-4 mr-2" /> History
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="w-4 h-4" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="reconcile" className="gap-2" disabled={!selectedDate}>
            <Link2 className="w-4 h-4" /> Reconcile
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" /> History
          </TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Select Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    if (date) setActiveTab('reconcile');
                  }}
                  modifiers={{
                    hasTransactions: (date) => hasTransactions(date),
                    reconciled: (date) => getDateStatus(date) === 'completed',
                    pending: (date) => getDateStatus(date) === 'pending',
                    flagged: (date) => getDateStatus(date) === 'flagged',
                  }}
                  modifiersStyles={{
                    hasTransactions: { fontWeight: 'bold', color: '#1e40af' },
                    reconciled: { backgroundColor: '#dcfce7', color: '#166534' },
                    pending: { backgroundColor: '#fef9c3', color: '#854d0e' },
                    flagged: { backgroundColor: '#fee2e2', color: '#991b1b' },
                  }}
                  className="rounded-md border"
                />
                <div className="flex gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-600"></div>
                    <span>Has Transactions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-200"></div>
                    <span>Reconciled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-yellow-200"></div>
                    <span>Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-200"></div>
                    <span>Flagged</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate ? `Summary: ${formatDate(selectedDate)}` : 'Daily Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailySummary ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{dailySummary.reconciled || 0}</div>
                        <div className="text-xs text-green-700">Reconciled</div>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-yellow-600">{dailySummary.pending || 0}</div>
                        <div className="text-xs text-yellow-700">Pending</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-red-600">{dailySummary.flagged || 0}</div>
                        <div className="text-xs text-red-700">Flagged</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{dailySummary.total || 0}</div>
                        <div className="text-xs text-blue-700">Total</div>
                      </div>
                    </div>
                    {dailySummary.total > 0 && (
                      <div className="pt-2">
                        <div className="text-xs text-slate-500 mb-1">Progress</div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${(dailySummary.reconciled / dailySummary.total) * 100}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 text-right">
                          {Math.round((dailySummary.reconciled / dailySummary.total) * 100)}% Complete
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Select a date to view summary</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reconcile Tab */}
        <TabsContent value="reconcile">
          {selectedDate && (
            <div className="space-y-6">
              {/* Back button and date info */}
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('calendar')}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back to Calendar
                </Button>
                <Badge variant="outline" className="text-base px-3 py-1">
                  <CalendarDays className="w-4 h-4 mr-2" />
                  {formatDate(selectedDate)}
                </Badge>
              </div>

              {/* Account Type Selection */}
              {!selectedType ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card 
                    className="cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => setSelectedType('treasury')}
                    data-testid="select-treasury"
                  >
                    <CardContent className="pt-6 text-center">
                      <Building2 className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                      <h3 className="font-semibold text-lg">Treasury</h3>
                      <p className="text-sm text-slate-500 mt-1">Bank accounts & cash</p>
                    </CardContent>
                  </Card>
                  <Card 
                    className="cursor-pointer hover:border-purple-500 transition-colors"
                    onClick={() => setSelectedType('psp')}
                    data-testid="select-psp"
                  >
                    <CardContent className="pt-6 text-center">
                      <CreditCard className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                      <h3 className="font-semibold text-lg">PSP</h3>
                      <p className="text-sm text-slate-500 mt-1">Payment processors</p>
                    </CardContent>
                  </Card>
                  <Card 
                    className="cursor-pointer hover:border-orange-500 transition-colors"
                    onClick={() => setSelectedType('exchanger')}
                    data-testid="select-exchanger"
                  >
                    <CardContent className="pt-6 text-center">
                      <Store className="w-12 h-12 mx-auto mb-3 text-orange-600" />
                      <h3 className="font-semibold text-lg">Exchanger</h3>
                      <p className="text-sm text-slate-500 mt-1">Vendor accounts</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <>
                  {/* Account Selection */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {selectedType === 'treasury' && <Building2 className="w-5 h-5 text-blue-600" />}
                          {selectedType === 'psp' && <CreditCard className="w-5 h-5 text-purple-600" />}
                          {selectedType === 'exchanger' && <Store className="w-5 h-5 text-orange-600" />}
                          Select {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Account
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedType(null); setSelectedAccount(''); }}>
                          Change Type
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger className="w-full max-w-md" data-testid="account-select">
                          <SelectValue placeholder={`Select ${selectedType} account...`} />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedType === 'treasury' && treasuryAccounts.map(acc => (
                            <SelectItem key={acc.account_id} value={acc.account_id}>
                              {acc.account_name} ({acc.currency})
                            </SelectItem>
                          ))}
                          {selectedType === 'psp' && psps.map(psp => (
                            <SelectItem key={psp.psp_id} value={psp.psp_id}>
                              {psp.name}
                            </SelectItem>
                          ))}
                          {selectedType === 'exchanger' && exchangers.map(ex => (
                            <SelectItem key={ex.vendor_id} value={ex.vendor_id}>
                              {ex.vendor_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  {selectedAccount && (
                    <>
                      {/* Statement Upload */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Upload className="w-5 h-5" /> Upload Statement
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                              <Label>Statement File (XLSX, PDF, CSV)</Label>
                              <Input
                                type="file"
                                accept=".xlsx,.xls,.pdf,.csv"
                                onChange={(e) => setStatementFile(e.target.files?.[0])}
                                className="mt-1"
                                data-testid="statement-file-input"
                              />
                            </div>
                            <Button 
                              onClick={handleStatementUpload} 
                              disabled={!statementFile || uploading}
                              data-testid="upload-statement-btn"
                            >
                              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                              {uploading ? 'Parsing...' : 'Upload & Parse'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Matching Interface */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* System Transactions */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center justify-between">
                              <span>System Transactions ({accountHistory.length})</span>
                              {historyLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[300px]">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-8"></TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Reference</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {accountHistory.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                                        No transactions found
                                      </TableCell>
                                    </TableRow>
                                  ) : accountHistory.map(tx => (
                                    <TableRow 
                                      key={tx.transaction_id}
                                      className={`cursor-pointer ${selectedSystemTx?.transaction_id === tx.transaction_id ? 'bg-blue-50' : ''}`}
                                      onClick={() => setSelectedSystemTx(tx)}
                                    >
                                      <TableCell>
                                        <Checkbox 
                                          checked={selectedSystemTx?.transaction_id === tx.transaction_id}
                                          onCheckedChange={() => setSelectedSystemTx(tx)}
                                        />
                                      </TableCell>
                                      <TableCell className="text-xs">{formatDate(tx.created_at)}</TableCell>
                                      <TableCell className="font-mono text-xs">{tx.reference || tx.transaction_id}</TableCell>
                                      <TableCell className={`text-right font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(tx.amount, tx.currency)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </ScrollArea>
                          </CardContent>
                        </Card>

                        {/* Statement Entries */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              Statement Entries ({parsedEntries.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[300px]">
                              {!showParsed ? (
                                <div className="text-center py-12 text-slate-400">
                                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                  <p>Upload a statement to see entries</p>
                                </div>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-8"></TableHead>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Description</TableHead>
                                      <TableHead className="text-right">Amount</TableHead>
                                      <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {parsedEntries.length === 0 ? (
                                      <TableRow>
                                        <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                                          All entries processed
                                        </TableCell>
                                      </TableRow>
                                    ) : parsedEntries.map(entry => (
                                      <TableRow 
                                        key={entry.id}
                                        className={`cursor-pointer ${selectedStatementEntry?.id === entry.id ? 'bg-green-50' : ''}`}
                                        onClick={() => setSelectedStatementEntry(entry)}
                                      >
                                        <TableCell>
                                          <Checkbox 
                                            checked={selectedStatementEntry?.id === entry.id}
                                            onCheckedChange={() => setSelectedStatementEntry(entry)}
                                          />
                                        </TableCell>
                                        <TableCell className="text-xs">{formatDate(entry.date)}</TableCell>
                                        <TableCell className="text-xs max-w-[150px] truncate" title={entry.description}>
                                          {entry.description}
                                        </TableCell>
                                        <TableCell className={`text-right font-medium ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {formatCurrency(entry.amount)}
                                        </TableCell>
                                        <TableCell>
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className="h-7 w-7 text-red-500"
                                            onClick={(e) => { e.stopPropagation(); setFlagDialog({ open: true, entry, reason: '' }); }}
                                          >
                                            <Flag className="w-3 h-3" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Match Button */}
                      <div className="flex justify-center">
                        <Button 
                          size="lg"
                          onClick={handleMatch}
                          disabled={!selectedSystemTx || !selectedStatementEntry}
                          className="gap-2"
                          data-testid="match-btn"
                        >
                          <Link2 className="w-5 h-5" />
                          Match Selected Entries
                        </Button>
                      </div>

                      {/* Matched & Flagged Summary */}
                      {(matchedPairs.length > 0 || flaggedEntries.length > 0) && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Reconciliation Summary</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {matchedPairs.length > 0 && (
                              <div>
                                <h4 className="font-medium text-green-700 flex items-center gap-2 mb-2">
                                  <CheckCircle2 className="w-4 h-4" /> Matched ({matchedPairs.length})
                                </h4>
                                <div className="bg-green-50 rounded-lg p-3 space-y-2 max-h-40 overflow-auto">
                                  {matchedPairs.map((pair, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                      <span>{pair.system_tx.reference} ↔ {pair.statement_entry.description?.substring(0, 30)}</span>
                                      <span className="font-medium">{formatCurrency(pair.system_tx.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {flaggedEntries.length > 0 && (
                              <div>
                                <h4 className="font-medium text-red-700 flex items-center gap-2 mb-2">
                                  <AlertTriangle className="w-4 h-4" /> Flagged ({flaggedEntries.length})
                                </h4>
                                <div className="bg-red-50 rounded-lg p-3 space-y-2 max-h-40 overflow-auto">
                                  {flaggedEntries.map((item, i) => (
                                    <div key={i} className="text-sm">
                                      <span className="font-medium">{item.entry.description?.substring(0, 40)}</span>
                                      <span className="text-red-600 ml-2">- {item.reason}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Remarks */}
                            <div>
                              <Label>Remarks</Label>
                              <Textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Add any notes or remarks for this reconciliation..."
                                className="mt-1"
                                data-testid="remarks-input"
                              />
                            </div>

                            {/* Submit Button */}
                            <Button 
                              className="w-full"
                              onClick={handleSubmitReconciliation}
                              disabled={submitting}
                              data-testid="submit-recon-btn"
                            >
                              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                              Submit Reconciliation
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5" /> Reconciliation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-center">Matched</TableHead>
                      <TableHead className="text-center">Flagged</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-slate-400 py-12">
                          No reconciliation history yet
                        </TableCell>
                      </TableRow>
                    ) : reconHistory.map(item => (
                      <TableRow key={item.recon_id}>
                        <TableCell>{formatDate(item.date)}</TableCell>
                        <TableCell className="capitalize">{item.account_type}</TableCell>
                        <TableCell>{getAccountName(item.account_type, item.account_id)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {item.matched_count || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            {item.flagged_count || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            item.status === 'completed' ? 'bg-green-100 text-green-700' :
                            item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{item.created_by_name}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setHistoryDialog({ open: true, item })}
                          >
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
      </Tabs>

      {/* Flag Dialog */}
      <Dialog open={flagDialog.open} onOpenChange={(open) => setFlagDialog({ ...flagDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Flag className="w-5 h-5" /> Flag Entry
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {flagDialog.entry && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm"><strong>Date:</strong> {formatDate(flagDialog.entry.date)}</p>
                <p className="text-sm"><strong>Description:</strong> {flagDialog.entry.description}</p>
                <p className="text-sm"><strong>Amount:</strong> {formatCurrency(flagDialog.entry.amount)}</p>
              </div>
            )}
            <div>
              <Label>Reason for Flagging *</Label>
              <Textarea
                value={flagDialog.reason}
                onChange={(e) => setFlagDialog({ ...flagDialog, reason: e.target.value })}
                placeholder="Describe why this entry is being flagged..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialog({ open: false, entry: null, reason: '' })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleFlag} disabled={!flagDialog.reason}>
              <Flag className="w-4 h-4 mr-2" /> Flag Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Detail Dialog */}
      <Dialog open={historyDialog.open} onOpenChange={(open) => setHistoryDialog({ ...historyDialog, open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reconciliation Details</DialogTitle>
          </DialogHeader>
          {historyDialog.item && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Date:</strong> {formatDate(historyDialog.item.date)}</div>
                <div><strong>Type:</strong> {historyDialog.item.account_type}</div>
                <div><strong>Account:</strong> {getAccountName(historyDialog.item.account_type, historyDialog.item.account_id)}</div>
                <div><strong>Status:</strong> {historyDialog.item.status}</div>
                <div><strong>Matched:</strong> {historyDialog.item.matched_count || 0}</div>
                <div><strong>Flagged:</strong> {historyDialog.item.flagged_count || 0}</div>
                <div className="col-span-2"><strong>By:</strong> {historyDialog.item.created_by_name} on {formatDate(historyDialog.item.created_at)}</div>
              </div>
              {historyDialog.item.remarks && (
                <div>
                  <strong>Remarks:</strong>
                  <p className="mt-1 text-sm bg-slate-50 p-3 rounded">{historyDialog.item.remarks}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
