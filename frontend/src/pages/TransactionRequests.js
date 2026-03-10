import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  Plus, FileText, Clock, CheckCircle, ArrowDownRight, ArrowUpRight,
  Eye, Edit, Trash2, Send, Loader2, Upload, Image as ImageIcon,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function TransactionRequests() {
  const { user, getAuthHeaders } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ transaction_type: 'withdrawal', client_id: '', amount: '', currency: 'USD', base_currency: 'USD', base_amount: '', exchange_rate: '', destination_type: 'bank', destination_account_id: '', psp_id: '', vendor_id: '', reference: '', crm_reference: '', description: '', client_bank_name: '', client_bank_account_name: '', client_bank_account_number: '', client_bank_swift_iban: '', client_bank_currency: '', client_usdt_address: '', client_usdt_network: '' });
  const [proofImage, setProofImage] = useState(null);
  
  // Process dialog
  const [processDialog, setProcessDialog] = useState(null);
  const [captcha, setCaptcha] = useState({ a: 0, b: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // View dialog
  const [viewReq, setViewReq] = useState(null);
  
  // Data
  const [clients, setClients] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [psps, setPsps] = useState([]);
  const [vendors, setVendors] = useState([]);

  const authHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return { 'Authorization': `Bearer ${token}` };
  }, []);

  const fetchRequests = useCallback(async (pg) => {
    try {
      const p = pg || page;
      const params = new URLSearchParams({ page: p, page_size: 20 });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('transaction_type', typeFilter);
      const res = await fetch(`${API_URL}/api/transaction-requests?${params}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.items || []);
        setTotalPages(data.total_pages || 1);
        setTotal(data.total || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter, typeFilter, authHeaders]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, tRes, pRes, vRes] = await Promise.all([
          fetch(`${API_URL}/api/clients`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/treasury`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/psp`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/vendors?page_size=100`, { headers: authHeaders() }),
        ]);
        if (cRes.ok) { const d = await cRes.json(); setClients(Array.isArray(d) ? d : d.items || []); }
        if (tRes.ok) setTreasuryAccounts(await tRes.json());
        if (pRes.ok) setPsps(await pRes.json());
        if (vRes.ok) { const d = await vRes.json(); setVendors(d.items || d || []); }
      } catch (e) { console.error(e); }
    };
    fetchData();
  }, [authHeaders]);

  const handleCreate = async () => {
    if (!form.client_id || !form.amount) { toast.error('Client and Amount are required'); return; }
    setCreating(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (proofImage) fd.append('proof_image', proofImage);
      const headers = authHeaders();
      delete headers['Content-Type'];
      const res = await fetch(`${API_URL}/api/transaction-requests`, { method: 'POST', headers, body: fd });
      if (res.ok) {
        toast.success('Request created');
        setCreateOpen(false);
        setForm({ transaction_type: 'withdrawal', client_id: '', amount: '', currency: 'USD', base_currency: 'USD', base_amount: '', exchange_rate: '', destination_type: 'bank', destination_account_id: '', psp_id: '', vendor_id: '', reference: '', crm_reference: '', description: '', client_bank_name: '', client_bank_account_name: '', client_bank_account_number: '', client_bank_swift_iban: '', client_bank_currency: '', client_usdt_address: '', client_usdt_network: '' });
        setProofImage(null);
        fetchRequests();
      } else { const e = await res.json(); toast.error(e.detail || 'Failed'); }
    } catch { toast.error('Failed'); }
    finally { setCreating(false); }
  };

  const openProcess = (req) => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptcha({ a, b });
    setCaptchaAnswer('');
    setProcessDialog(req);
  };

  const handleProcess = async () => {
    if (parseInt(captchaAnswer) !== captcha.a + captcha.b) { toast.error('Wrong captcha'); return; }
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/transaction-requests/${processDialog.request_id}/process`, {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ captcha_answer: captcha.a + captcha.b, captcha_expected: captcha.a + captcha.b })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Processed! Transaction ${data.transaction_id} created`);
        setProcessDialog(null);
        fetchRequests();
      } else { const e = await res.json(); toast.error(e.detail || 'Failed'); }
    } catch { toast.error('Failed'); }
    finally { setProcessing(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this request?')) return;
    try {
      const res = await fetch(`${API_URL}/api/transaction-requests/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) { toast.success('Deleted'); fetchRequests(); }
      else { const e = await res.json(); toast.error(e.detail || 'Failed'); }
    } catch { toast.error('Failed'); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div className="space-y-6 animate-fade-in" data-testid="tx-requests-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-slate-800" style={{ fontFamily: 'Barlow Condensed' }}>Transaction Requests</h1>
          <p className="text-slate-500">Create and manage transaction requests</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 text-white hover:bg-blue-700" data-testid="create-request-btn">
          <Plus className="w-4 h-4 mr-2" /> New Request
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-yellow-50 border-yellow-200"><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-yellow-600 uppercase">Pending</p><p className="text-3xl font-bold text-yellow-700">{requests.filter(r => r.status === 'pending').length}</p></div>
          <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
        </CardContent></Card>
        <Card className="bg-green-50 border-green-200"><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-green-600 uppercase">Processed</p><p className="text-3xl font-bold text-green-700">{requests.filter(r => r.status === 'processed').length}</p></div>
          <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
        </CardContent></Card>
        <Card className="bg-blue-50 border-blue-200"><CardContent className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-blue-600 uppercase">Total</p><p className="text-3xl font-bold text-blue-700">{total}</p></div>
          <FileText className="w-8 h-8 text-blue-500 opacity-50" />
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end">
        <div className="min-w-[120px]">
          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">Status</label>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-slate-800">
            <option value="all">All</option><option value="pending">Pending</option><option value="processed">Processed</option>
          </select>
        </div>
        <div className="min-w-[120px]">
          <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1 block">Type</label>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-slate-800">
            <option value="all">All</option><option value="deposit">Deposit</option><option value="withdrawal">Withdrawal</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead className="text-slate-500 text-xs font-bold uppercase">ID</TableHead>
                  <TableHead className="text-slate-500 text-xs font-bold uppercase">Type</TableHead>
                  <TableHead className="text-slate-500 text-xs font-bold uppercase">Client</TableHead>
                  <TableHead className="text-slate-500 text-xs font-bold uppercase">Amount</TableHead>
                  <TableHead className="text-slate-500 text-xs font-bold uppercase">CRM Ref</TableHead>
                  <TableHead className="text-slate-500 text-xs font-bold uppercase">Destination</TableHead>
                  <TableHead className="text-slate-500 text-xs font-bold uppercase">Status</TableHead>
                  <TableHead className="text-slate-500 text-xs font-bold uppercase">Created</TableHead>
                  <TableHead className="text-slate-500 text-xs font-bold uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : requests.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-400">No requests found</TableCell></TableRow>
                ) : requests.map(req => (
                  <TableRow key={req.request_id} className="border-slate-200 hover:bg-slate-50">
                    <TableCell className="font-mono text-xs text-slate-700">{req.request_id?.slice(-10).toUpperCase()}</TableCell>
                    <TableCell>
                      <Badge className={req.transaction_type === 'deposit' ? 'bg-green-100 text-green-700 text-xs' : 'bg-red-100 text-red-700 text-xs'}>
                        {req.transaction_type === 'deposit' ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
                        {req.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-800 text-sm">{req.client_name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      <span className={req.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                        ${req.amount?.toLocaleString()}
                      </span>
                      {req.base_currency && req.base_currency !== 'USD' && req.base_amount && (
                        <span className="text-xs text-slate-400 block">{req.base_amount?.toLocaleString()} {req.base_currency}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-purple-600">{req.crm_reference || '-'}</TableCell>
                    <TableCell className="text-sm text-slate-600">{req.destination_type}{req.vendor_id ? ` (${vendors.find(v => v.vendor_id === req.vendor_id)?.vendor_name || ''})` : ''}</TableCell>
                    <TableCell>
                      <Badge className={req.status === 'pending' ? 'bg-yellow-100 text-yellow-700 text-xs' : 'bg-green-100 text-green-700 text-xs'}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(req.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewReq(req)}><Eye className="w-3.5 h-3.5" /></Button>
                        {req.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-green-600 hover:bg-green-50 text-xs" onClick={() => openProcess(req)} data-testid={`process-${req.request_id}`}>
                              <Send className="w-3.5 h-3.5 mr-1" /> Process
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(req.request_id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </>
                        )}
                        {req.status === 'processed' && req.transaction_id && (
                          <Badge className="bg-blue-100 text-blue-700 text-[10px]">TX: {req.transaction_id?.slice(-8)}</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-slate-400">Page {page} of {totalPages} ({total} total)</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(page - 1); fetchRequests(page - 1); }} className="h-7 px-2 text-xs">Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { setPage(page + 1); fetchRequests(page + 1); }} className="h-7 px-2 text-xs">Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase" style={{ fontFamily: 'Barlow Condensed' }}>New Transaction Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 uppercase">Type *</Label>
                <Select value={form.transaction_type} onValueChange={v => setForm({ ...form, transaction_type: v })}>
                  <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="deposit">Deposit</SelectItem><SelectItem value="withdrawal">Withdrawal</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500 uppercase">Client *</Label>
                <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
                  <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.client_id} value={c.client_id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs text-slate-500 uppercase">Amount (USD) *</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="bg-slate-50" /></div>
              <div><Label className="text-xs text-slate-500 uppercase">Payment Currency</Label><Input value={form.base_currency} onChange={e => setForm({ ...form, base_currency: e.target.value })} className="bg-slate-50" /></div>
              <div><Label className="text-xs text-slate-500 uppercase">Base Amount</Label><Input type="number" value={form.base_amount} onChange={e => setForm({ ...form, base_amount: e.target.value })} className="bg-slate-50" /></div>
            </div>

            {form.transaction_type === 'deposit' && (
              <div>
                <Label className="text-xs text-slate-500 uppercase">Destination Type</Label>
                <Select value={form.destination_type} onValueChange={v => setForm({ ...form, destination_type: v })}>
                  <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank</SelectItem><SelectItem value="psp">PSP</SelectItem><SelectItem value="vendor">Exchanger</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.transaction_type === 'deposit' && form.destination_type === 'psp' && (
              <div><Label className="text-xs text-slate-500 uppercase">PSP</Label>
                <Select value={form.psp_id} onValueChange={v => setForm({ ...form, psp_id: v })}>
                  <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select PSP" /></SelectTrigger>
                  <SelectContent>{psps.map(p => <SelectItem key={p.psp_id} value={p.psp_id}>{p.psp_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {(form.destination_type === 'vendor' || (form.transaction_type === 'withdrawal' && form.destination_type === 'vendor')) && (
              <div><Label className="text-xs text-slate-500 uppercase">Exchanger</Label>
                <Select value={form.vendor_id} onValueChange={v => setForm({ ...form, vendor_id: v })}>
                  <SelectTrigger className="bg-slate-50"><SelectValue placeholder="Select exchanger" /></SelectTrigger>
                  <SelectContent>{vendors.map(v => <SelectItem key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {form.transaction_type === 'withdrawal' && (
              <>
                <div>
                  <Label className="text-xs text-slate-500 uppercase">Destination Type</Label>
                  <Select value={form.destination_type} onValueChange={v => setForm({ ...form, destination_type: v })}>
                    <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="bank">Bank</SelectItem><SelectItem value="usdt">USDT</SelectItem></SelectContent>
                  </Select>
                </div>
                {form.destination_type === 'bank' && (
                  <div className="space-y-2 p-3 bg-slate-50 rounded border">
                    <p className="text-xs text-slate-500 uppercase font-bold">Bank Details</p>
                    <Input placeholder="Bank Name" value={form.client_bank_name} onChange={e => setForm({ ...form, client_bank_name: e.target.value })} className="bg-white" />
                    <Input placeholder="Account Holder Name" value={form.client_bank_account_name} onChange={e => setForm({ ...form, client_bank_account_name: e.target.value })} className="bg-white" />
                    <Input placeholder="Account Number" value={form.client_bank_account_number} onChange={e => setForm({ ...form, client_bank_account_number: e.target.value })} className="bg-white" />
                    <Input placeholder="SWIFT / IBAN" value={form.client_bank_swift_iban} onChange={e => setForm({ ...form, client_bank_swift_iban: e.target.value })} className="bg-white" />
                    <Input placeholder="Currency (e.g. INR)" value={form.client_bank_currency} onChange={e => setForm({ ...form, client_bank_currency: e.target.value })} className="bg-white" />
                  </div>
                )}
                {form.destination_type === 'usdt' && (
                  <div className="space-y-2 p-3 bg-slate-50 rounded border">
                    <p className="text-xs text-slate-500 uppercase font-bold">USDT Details</p>
                    <Input placeholder="Wallet Address" value={form.client_usdt_address} onChange={e => setForm({ ...form, client_usdt_address: e.target.value })} className="bg-white" />
                    <Select value={form.client_usdt_network} onValueChange={v => setForm({ ...form, client_usdt_network: v })}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Select Network" /></SelectTrigger>
                      <SelectContent><SelectItem value="TRC20">TRC20</SelectItem><SelectItem value="ERC20">ERC20</SelectItem><SelectItem value="BEP20">BEP20</SelectItem></SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-slate-500 uppercase">Reference</Label><Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="bg-slate-50 font-mono" placeholder="Optional" /></div>
              <div><Label className="text-xs text-slate-500 uppercase">CRM Reference</Label><Input value={form.crm_reference} onChange={e => setForm({ ...form, crm_reference: e.target.value })} className="bg-slate-50 font-mono" placeholder="Unique" /></div>
            </div>
            <div><Label className="text-xs text-slate-500 uppercase">Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-slate-50" rows={2} /></div>
            <div>
              <Label className="text-xs text-slate-500 uppercase">Proof of Payment</Label>
              <Input type="file" accept="image/*,.pdf" onChange={e => setProofImage(e.target.files[0])} className="bg-slate-50" />
            </div>
            <Button onClick={handleCreate} disabled={creating} className="w-full bg-blue-600 text-white hover:bg-blue-700">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />} Create Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Process Dialog (with Captcha) */}
      <Dialog open={!!processDialog} onOpenChange={() => setProcessDialog(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase" style={{ fontFamily: 'Barlow Condensed' }}>Process Request</DialogTitle></DialogHeader>
          {processDialog && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded space-y-2">
                <div className="flex justify-between"><span className="text-slate-500">Type</span><Badge className={processDialog.transaction_type === 'deposit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{processDialog.transaction_type}</Badge></div>
                <div className="flex justify-between"><span className="text-slate-500">Client</span><span>{processDialog.client_name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-mono font-bold">${processDialog.amount?.toLocaleString()}</span></div>
                {processDialog.crm_reference && <div className="flex justify-between"><span className="text-slate-500">CRM Ref</span><span className="font-mono text-purple-600">{processDialog.crm_reference}</span></div>}
              </div>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-medium text-yellow-800 mb-2">Verify: What is {captcha.a} + {captcha.b}?</p>
                <Input type="number" value={captchaAnswer} onChange={e => setCaptchaAnswer(e.target.value)} placeholder="Enter answer" className="bg-white" autoFocus data-testid="process-captcha" />
              </div>
              <p className="text-xs text-slate-500">This will create a real transaction in the main Transactions page with "Pending" status.</p>
              <Button onClick={handleProcess} disabled={processing || !captchaAnswer} className="w-full bg-green-600 text-white hover:bg-green-700">
                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Process & Create Transaction
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewReq} onOpenChange={() => setViewReq(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-800 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase" style={{ fontFamily: 'Barlow Condensed' }}>Request Details</DialogTitle></DialogHeader>
          {viewReq && (
            <div className="space-y-3 text-sm">
              {[
                ['Request ID', viewReq.request_id],
                ['Type', viewReq.transaction_type],
                ['Client', viewReq.client_name],
                ['Amount', `$${viewReq.amount?.toLocaleString()} USD`],
                viewReq.base_amount && ['Base Amount', `${viewReq.base_amount?.toLocaleString()} ${viewReq.base_currency}`],
                ['Destination', viewReq.destination_type],
                viewReq.crm_reference && ['CRM Ref', viewReq.crm_reference],
                viewReq.reference && ['Reference', viewReq.reference],
                viewReq.description && ['Description', viewReq.description],
                ['Status', viewReq.status],
                ['Created', formatDate(viewReq.created_at)],
                ['Created By', viewReq.created_by_name],
                viewReq.processed_at && ['Processed', formatDate(viewReq.processed_at)],
                viewReq.transaction_id && ['Transaction ID', viewReq.transaction_id],
              ].filter(Boolean).map(([k, v], i) => (
                <div key={i} className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-slate-800 font-medium text-right">{v}</span>
                </div>
              ))}
              {viewReq.proof_image && <div className="text-center"><Badge className="bg-blue-100 text-blue-700"><ImageIcon className="w-3 h-3 mr-1" /> Proof Attached</Badge></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
