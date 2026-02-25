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
import { toast } from 'sonner';
import {
  ArrowLeftRight,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  Image as ImageIcon,
  CreditCard,
  Store,
  Building2,
  Wallet,
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
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [psps, setPsps] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewTransaction, setViewTransaction] = useState(null);
  const [proofImage, setProofImage] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [clientBankAccounts, setClientBankAccounts] = useState([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState('new');
  const [formData, setFormData] = useState({
    client_id: '',
    transaction_type: 'deposit',
    amount: '',
    currency: 'USD',
    base_currency: 'USD',
    base_amount: '',
    destination_type: 'treasury',
    destination_account_id: '',
    psp_id: '',
    vendor_id: '',
    commission_paid_by: 'client',
    description: '',
    reference: '',
    // Client bank details (for withdrawal to bank)
    client_bank_name: '',
    client_bank_account_name: '',
    client_bank_account_number: '',
    client_bank_swift_iban: '',
    client_bank_currency: 'USD',
    // Client USDT details (for withdrawal to USDT)
    client_usdt_address: '',
    client_usdt_network: '',
  });

  const currencies = ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'INR', 'JPY', 'USDT'];
  
  const exchangeRates = {
    USD: 1.0,
    EUR: 1.08,
    GBP: 1.27,
    AED: 0.27,
    SAR: 0.27,
    INR: 0.012,
    JPY: 0.0067,
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
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

  const fetchClients = async () => {
    try {
      const response = await fetch(`${API_URL}/api/clients`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setClients(await response.json());
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
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

  const fetchPsps = async () => {
    try {
      const response = await fetch(`${API_URL}/api/psp`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setPsps(await response.json());
      }
    } catch (error) {
      console.error('Error fetching PSPs:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${API_URL}/api/vendors`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setVendors(await response.json());
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchClientBankAccounts = async (clientId) => {
    if (!clientId) {
      setClientBankAccounts([]);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/clients/${clientId}/bank-accounts`, { 
        headers: getAuthHeaders(), 
        credentials: 'include' 
      });
      if (response.ok) {
        setClientBankAccounts(await response.json());
      }
    } catch (error) {
      console.error('Error fetching client bank accounts:', error);
      setClientBankAccounts([]);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchClients();
    fetchTreasuryAccounts();
    fetchPsps();
    fetchVendors();
  }, [typeFilter, statusFilter]);

  // Fetch client bank accounts when client changes and destination is bank or vendor
  useEffect(() => {
    if (formData.client_id && (formData.destination_type === 'bank' || formData.destination_type === 'vendor')) {
      fetchClientBankAccounts(formData.client_id);
    }
  }, [formData.client_id, formData.destination_type]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('client_id', formData.client_id);
      formDataToSend.append('transaction_type', formData.transaction_type);
      formDataToSend.append('amount', formData.amount);
      formDataToSend.append('currency', 'USD');
      formDataToSend.append('base_currency', formData.base_currency);
      formDataToSend.append('destination_type', formData.destination_type);
      if (formData.base_currency !== 'USD' && formData.base_amount) {
        formDataToSend.append('base_amount', formData.base_amount);
      }
      if ((formData.destination_type === 'treasury' || formData.destination_type === 'usdt') && formData.destination_account_id) {
        formDataToSend.append('destination_account_id', formData.destination_account_id);
      }
      if (formData.destination_type === 'psp' && formData.psp_id) {
        formDataToSend.append('psp_id', formData.psp_id);
        formDataToSend.append('commission_paid_by', formData.commission_paid_by);
      }
      if (formData.destination_type === 'vendor' && formData.vendor_id) {
        formDataToSend.append('vendor_id', formData.vendor_id);
        // Also include client bank details for vendor withdrawals
        if (formData.transaction_type === 'withdrawal') {
          formDataToSend.append('client_bank_name', formData.client_bank_name);
          formDataToSend.append('client_bank_account_name', formData.client_bank_account_name);
          formDataToSend.append('client_bank_account_number', formData.client_bank_account_number);
          formDataToSend.append('client_bank_swift_iban', formData.client_bank_swift_iban);
          formDataToSend.append('client_bank_currency', formData.client_bank_currency);
        }
      }
      // Client bank details (for withdrawal to bank)
      if (formData.destination_type === 'bank') {
        formDataToSend.append('client_bank_name', formData.client_bank_name);
        formDataToSend.append('client_bank_account_name', formData.client_bank_account_name);
        formDataToSend.append('client_bank_account_number', formData.client_bank_account_number);
        formDataToSend.append('client_bank_swift_iban', formData.client_bank_swift_iban);
        formDataToSend.append('client_bank_currency', formData.client_bank_currency);
        // Flag to save bank details to client profile
        if (selectedBankAccount === 'new') {
          formDataToSend.append('save_bank_to_client', 'true');
        }
      }
      // Client USDT details (for withdrawal to USDT)
      if (formData.destination_type === 'usdt' && formData.transaction_type === 'withdrawal') {
        formDataToSend.append('client_usdt_address', formData.client_usdt_address);
        formDataToSend.append('client_usdt_network', formData.client_usdt_network);
      }
      if (formData.description) {
        formDataToSend.append('description', formData.description);
      }
      if (formData.reference) {
        formDataToSend.append('reference', formData.reference);
      }
      if (proofImage) {
        formDataToSend.append('proof_image', proofImage);
      }

      const response = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: formDataToSend,
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

  const resetForm = () => {
    setFormData({
      client_id: '',
      transaction_type: 'deposit',
      amount: '',
      currency: 'USD',
      base_currency: 'USD',
      base_amount: '',
      destination_type: 'treasury',
      destination_account_id: '',
      psp_id: '',
      vendor_id: '',
      commission_paid_by: 'client',
      description: '',
      reference: '',
      client_bank_name: '',
      client_bank_account_name: '',
      client_bank_account_number: '',
      client_bank_swift_iban: '',
      client_bank_currency: 'USD',
      client_usdt_address: '',
      client_usdt_network: '',
    });
    setProofImage(null);
    setProofPreview(null);
    setSelectedBankAccount('new');
    setClientBankAccounts([]);
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: 'status-approved',
      completed: 'status-approved',
      pending: 'status-pending',
      rejected: 'status-rejected',
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

  const getClientName = (clientId) => {
    const client = clients.find(c => c.client_id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : clientId;
  };

  const filteredTransactions = transactions.filter(tx => {
    const clientName = (tx.client_name || getClientName(tx.client_id)).toLowerCase();
    const ref = (tx.reference || '').toLowerCase();
    return clientName.includes(searchTerm.toLowerCase()) || ref.includes(searchTerm.toLowerCase());
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
          <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                Create Transaction
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Client *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="select-client">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F2833] border-white/10 max-h-60">
                    {clients.map((client) => (
                      <SelectItem key={client.client_id} value={client.client_id} className="text-white hover:bg-white/5">
                        {client.first_name} {client.last_name} - {client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Type *</Label>
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
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Payment Currency</Label>
                  <Select
                    value={formData.base_currency}
                    onValueChange={(value) => {
                      setFormData({ ...formData, base_currency: value });
                      // Auto-calculate USD if base currency changes
                      if (value !== 'USD' && formData.base_amount) {
                        const usdAmount = (parseFloat(formData.base_amount) * exchangeRates[value]).toFixed(2);
                        setFormData(prev => ({ ...prev, base_currency: value, amount: usdAmount }));
                      }
                    }}
                  >
                    <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="select-base-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2833] border-white/10">
                      {currencies.map((cur) => (
                        <SelectItem key={cur} value={cur} className="text-white hover:bg-white/5">
                          {cur}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {formData.base_currency !== 'USD' && (
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Amount in {formData.base_currency} *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.base_amount}
                    onChange={(e) => {
                      const baseAmt = e.target.value;
                      const usdAmount = baseAmt ? (parseFloat(baseAmt) * exchangeRates[formData.base_currency]).toFixed(2) : '';
                      setFormData({ ...formData, base_amount: baseAmt, amount: usdAmount });
                    }}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                    placeholder={`0.00 ${formData.base_currency}`}
                    data-testid="tx-base-amount"
                    required
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                  {formData.base_currency !== 'USD' ? 'Amount in USD (Auto-calculated)' : 'Amount in USD *'}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                  placeholder="0.00 USD"
                  data-testid="tx-amount"
                  readOnly={formData.base_currency !== 'USD'}
                  required
                />
                {formData.base_currency !== 'USD' && formData.base_amount && (
                  <p className="text-xs text-[#66FCF1]">
                    Rate: 1 {formData.base_currency} = {exchangeRates[formData.base_currency]} USD
                  </p>
                )}
              </div>
              
              {/* Destination Type Selection */}
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Destination Type *</Label>
                <Select
                  value={formData.destination_type}
                  onValueChange={(value) => setFormData({ ...formData, destination_type: value, destination_account_id: '', psp_id: '', vendor_id: '' })}
                >
                  <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="select-dest-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F2833] border-white/10">
                    <SelectItem value="treasury" className="text-white hover:bg-white/5">Treasury / Bank Account</SelectItem>
                    <SelectItem value="bank" className="text-white hover:bg-white/5">Client Bank (Withdrawal)</SelectItem>
                    <SelectItem value="usdt" className="text-white hover:bg-white/5">USDT</SelectItem>
                    <SelectItem value="psp" className="text-white hover:bg-white/5">Payment Service Provider (PSP)</SelectItem>
                    <SelectItem value="vendor" className="text-white hover:bg-white/5">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Treasury Destination (for deposits or non-bank transactions) */}
              {formData.destination_type === 'treasury' && (
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Destination (Bank/Treasury) *</Label>
                  <Select
                    value={formData.destination_account_id}
                    onValueChange={(value) => setFormData({ ...formData, destination_account_id: value })}
                  >
                    <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="select-destination">
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2833] border-white/10">
                      {treasuryAccounts.filter(a => a.account_type !== 'usdt').map((account) => (
                        <SelectItem key={account.account_id} value={account.account_id} className="text-white hover:bg-white/5">
                          {account.account_name} - {account.bank_name} ({account.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Client Bank Details (for withdrawal to bank) */}
              {formData.destination_type === 'bank' && (
                <div className="space-y-4 p-4 bg-[#0B0C10] rounded-sm border border-white/10">
                  <div className="flex items-center gap-2 text-[#66FCF1] mb-2">
                    <Building2 className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider font-bold">Client Bank Details</span>
                  </div>
                  
                  {/* Saved Bank Accounts Dropdown */}
                  {clientBankAccounts.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Saved Bank Accounts</Label>
                      <Select
                        value={selectedBankAccount}
                        onValueChange={(value) => {
                          setSelectedBankAccount(value);
                          if (value !== 'new') {
                            const bank = clientBankAccounts.find(b => b.bank_account_id === value);
                            if (bank) {
                              setFormData({
                                ...formData,
                                client_bank_name: bank.bank_name,
                                client_bank_account_name: bank.account_name,
                                client_bank_account_number: bank.account_number,
                                client_bank_swift_iban: bank.swift_iban || '',
                                client_bank_currency: bank.currency || 'USD',
                              });
                            }
                          } else {
                            setFormData({
                              ...formData,
                              client_bank_name: '',
                              client_bank_account_name: '',
                              client_bank_account_number: '',
                              client_bank_swift_iban: '',
                              client_bank_currency: 'USD',
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="bg-[#1F2833] border-white/10 text-white">
                          <SelectValue placeholder="Select saved bank or add new" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1F2833] border-white/10">
                          <SelectItem value="new" className="text-[#66FCF1] hover:bg-white/5">+ Add New Bank Account</SelectItem>
                          {clientBankAccounts.map((bank) => (
                            <SelectItem key={bank.bank_account_id} value={bank.bank_account_id} className="text-white hover:bg-white/5">
                              {bank.bank_name} - {bank.account_number} ({bank.currency})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Bank Name *</Label>
                      <Input
                        value={formData.client_bank_name}
                        onChange={(e) => setFormData({ ...formData, client_bank_name: e.target.value })}
                        className="bg-[#1F2833] border-white/10 text-white focus:border-[#66FCF1]"
                        placeholder="e.g., Chase Bank"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Account Name *</Label>
                      <Input
                        value={formData.client_bank_account_name}
                        onChange={(e) => setFormData({ ...formData, client_bank_account_name: e.target.value })}
                        className="bg-[#1F2833] border-white/10 text-white focus:border-[#66FCF1]"
                        placeholder="Account holder name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Account Number *</Label>
                      <Input
                        value={formData.client_bank_account_number}
                        onChange={(e) => setFormData({ ...formData, client_bank_account_number: e.target.value })}
                        className="bg-[#1F2833] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                        placeholder="Account number"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">SWIFT / IBAN</Label>
                      <Input
                        value={formData.client_bank_swift_iban}
                        onChange={(e) => setFormData({ ...formData, client_bank_swift_iban: e.target.value })}
                        className="bg-[#1F2833] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                        placeholder="SWIFT or IBAN code"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Currency *</Label>
                    <Select
                      value={formData.client_bank_currency}
                      onValueChange={(value) => setFormData({ ...formData, client_bank_currency: value })}
                    >
                      <SelectTrigger className="bg-[#1F2833] border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1F2833] border-white/10">
                        {currencies.map((cur) => (
                          <SelectItem key={cur} value={cur} className="text-white hover:bg-white/5">
                            {cur}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedBankAccount === 'new' && (
                    <p className="text-xs text-[#66FCF1]">
                      This bank account will be saved to the client's profile for future use.
                    </p>
                  )}
                </div>
              )}
              
              {/* USDT Destination */}
              {formData.destination_type === 'usdt' && (
                <div className="space-y-4">
                  {/* For deposits - select USDT treasury account */}
                  {formData.transaction_type === 'deposit' && (
                    <div className="space-y-2">
                      <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">USDT Treasury Account *</Label>
                      <Select
                        value={formData.destination_account_id}
                        onValueChange={(value) => setFormData({ ...formData, destination_account_id: value })}
                      >
                        <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="select-usdt-treasury">
                          <SelectValue placeholder="Select USDT wallet" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1F2833] border-white/10">
                          {treasuryAccounts.filter(a => a.account_type === 'usdt').map((account) => (
                            <SelectItem key={account.account_id} value={account.account_id} className="text-white hover:bg-white/5">
                              {account.account_name} ({account.usdt_network || 'USDT'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* For withdrawals - enter client USDT address */}
                  {formData.transaction_type === 'withdrawal' && (
                    <div className="space-y-4 p-4 bg-[#0B0C10] rounded-sm border border-white/10">
                      <div className="flex items-center gap-2 text-[#66FCF1] mb-2">
                        <Wallet className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wider font-bold">Client USDT Details</span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">USDT Address *</Label>
                        <Input
                          value={formData.client_usdt_address}
                          onChange={(e) => setFormData({ ...formData, client_usdt_address: e.target.value })}
                          className="bg-[#1F2833] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                          placeholder="Enter USDT wallet address"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Network *</Label>
                        <Select
                          value={formData.client_usdt_network}
                          onValueChange={(value) => setFormData({ ...formData, client_usdt_network: value })}
                        >
                          <SelectTrigger className="bg-[#1F2833] border-white/10 text-white">
                            <SelectValue placeholder="Select network" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1F2833] border-white/10">
                            <SelectItem value="TRC20" className="text-white hover:bg-white/5">TRC20 (Tron)</SelectItem>
                            <SelectItem value="ERC20" className="text-white hover:bg-white/5">ERC20 (Ethereum)</SelectItem>
                            <SelectItem value="BEP20" className="text-white hover:bg-white/5">BEP20 (BSC)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Vendor Destination */}
              {formData.destination_type === 'vendor' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Select Vendor *</Label>
                    <Select
                      value={formData.vendor_id}
                      onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                    >
                      <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="select-vendor">
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1F2833] border-white/10">
                        {vendors.filter(v => v.status === 'active').map((vendor) => (
                          <SelectItem key={vendor.vendor_id} value={vendor.vendor_id} className="text-white hover:bg-white/5">
                            {vendor.vendor_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* For withdrawals via vendor - enter client bank details */}
                  {formData.transaction_type === 'withdrawal' && (
                    <div className="space-y-4 p-4 bg-[#0B0C10] rounded-sm border border-white/10">
                      <div className="flex items-center gap-2 text-[#66FCF1] mb-2">
                        <Building2 className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wider font-bold">Client Bank Details (Destination)</span>
                      </div>
                      
                      {/* Select from saved client banks */}
                      {clientBankAccounts.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Select Saved Bank Account</Label>
                          <Select
                            onValueChange={(value) => {
                              if (value === 'new') {
                                setFormData({ 
                                  ...formData, 
                                  client_bank_name: '', 
                                  client_bank_account_name: '', 
                                  client_bank_account_number: '',
                                  client_bank_swift_iban: '',
                                  client_bank_currency: 'USD'
                                });
                              } else {
                                const bank = clientBankAccounts.find(b => b.bank_account_id === value);
                                if (bank) {
                                  setFormData({ 
                                    ...formData, 
                                    client_bank_name: bank.bank_name,
                                    client_bank_account_name: bank.account_name,
                                    client_bank_account_number: bank.account_number,
                                    client_bank_swift_iban: bank.swift_iban || '',
                                    client_bank_currency: bank.currency || 'USD'
                                  });
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="bg-[#1F2833] border-white/10 text-white">
                              <SelectValue placeholder="Select saved bank or enter new" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1F2833] border-white/10">
                              <SelectItem value="new" className="text-white hover:bg-white/5">+ Enter New Bank Details</SelectItem>
                              {clientBankAccounts.map((bank) => (
                                <SelectItem key={bank.bank_account_id} value={bank.bank_account_id} className="text-white hover:bg-white/5">
                                  {bank.bank_name} - {bank.account_number} ({bank.currency})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Bank Name *</Label>
                          <Input
                            value={formData.client_bank_name}
                            onChange={(e) => setFormData({ ...formData, client_bank_name: e.target.value })}
                            className="bg-[#1F2833] border-white/10 text-white focus:border-[#66FCF1]"
                            placeholder="Bank name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Account Name *</Label>
                          <Input
                            value={formData.client_bank_account_name}
                            onChange={(e) => setFormData({ ...formData, client_bank_account_name: e.target.value })}
                            className="bg-[#1F2833] border-white/10 text-white focus:border-[#66FCF1]"
                            placeholder="Account holder name"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Account Number *</Label>
                          <Input
                            value={formData.client_bank_account_number}
                            onChange={(e) => setFormData({ ...formData, client_bank_account_number: e.target.value })}
                            className="bg-[#1F2833] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                            placeholder="Account number / IBAN"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">SWIFT/BIC Code</Label>
                          <Input
                            value={formData.client_bank_swift_iban}
                            onChange={(e) => setFormData({ ...formData, client_bank_swift_iban: e.target.value })}
                            className="bg-[#1F2833] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                            placeholder="SWIFT code (optional)"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Currency *</Label>
                        <Select
                          value={formData.client_bank_currency}
                          onValueChange={(value) => setFormData({ ...formData, client_bank_currency: value })}
                        >
                          <SelectTrigger className="bg-[#1F2833] border-white/10 text-white">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1F2833] border-white/10">
                            <SelectItem value="USD" className="text-white hover:bg-white/5">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR" className="text-white hover:bg-white/5">EUR - Euro</SelectItem>
                            <SelectItem value="GBP" className="text-white hover:bg-white/5">GBP - British Pound</SelectItem>
                            <SelectItem value="AED" className="text-white hover:bg-white/5">AED - UAE Dirham</SelectItem>
                            <SelectItem value="INR" className="text-white hover:bg-white/5">INR - Indian Rupee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* PSP Destination */}
              {formData.destination_type === 'psp' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Select PSP *</Label>
                    <Select
                      value={formData.psp_id}
                      onValueChange={(value) => setFormData({ ...formData, psp_id: value })}
                    >
                      <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="select-psp">
                        <SelectValue placeholder="Select PSP" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1F2833] border-white/10">
                        {psps.filter(p => p.status === 'active').map((psp) => (
                          <SelectItem key={psp.psp_id} value={psp.psp_id} className="text-white hover:bg-white/5">
                            {psp.psp_name} ({psp.commission_rate}% commission, T+{psp.settlement_days})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Commission Paid By *</Label>
                    <Select
                      value={formData.commission_paid_by}
                      onValueChange={(value) => setFormData({ ...formData, commission_paid_by: value })}
                    >
                      <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="select-commission-paid-by">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1F2833] border-white/10">
                        <SelectItem value="client" className="text-white hover:bg-white/5">Client (deducted from deposit)</SelectItem>
                        <SelectItem value="broker" className="text-white hover:bg-white/5">Broker (absorbs commission)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Commission Preview */}
                  {formData.psp_id && formData.amount && (
                    <div className="p-3 bg-[#0B0C10] rounded-sm border border-white/10">
                      {(() => {
                        const selectedPsp = psps.find(p => p.psp_id === formData.psp_id);
                        if (!selectedPsp) return null;
                        const grossAmount = parseFloat(formData.amount) || 0;
                        const commissionRate = selectedPsp.commission_rate / 100;
                        const commissionAmount = (grossAmount * commissionRate).toFixed(2);
                        const netAmount = formData.commission_paid_by === 'client' 
                          ? (grossAmount - parseFloat(commissionAmount)).toFixed(2)
                          : grossAmount.toFixed(2);
                        return (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[#C5C6C7]">Gross Amount</span>
                              <span className="text-white font-mono">${grossAmount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#C5C6C7]">PSP Commission ({selectedPsp.commission_rate}%)</span>
                              <span className="text-red-400 font-mono">-${commissionAmount}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-white/10">
                              <span className="text-[#C5C6C7]">
                                {formData.commission_paid_by === 'client' ? 'Client Receives' : 'Client Receives (Broker pays commission)'}
                              </span>
                              <span className="text-green-400 font-mono">${netAmount}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-[#C5C6C7]">Expected Settlement</span>
                              <span className="text-[#66FCF1]">T+{selectedPsp.settlement_days} days</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
              
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
              
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Proof of Payment (Screenshot)</Label>
                <div className="border-2 border-dashed border-white/10 rounded-sm p-4 text-center hover:border-[#66FCF1]/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="proof-upload"
                    data-testid="proof-upload"
                  />
                  <label htmlFor="proof-upload" className="cursor-pointer">
                    {proofPreview ? (
                      <div className="space-y-2">
                        <img src={proofPreview} alt="Proof preview" className="max-h-32 mx-auto rounded" />
                        <p className="text-xs text-[#66FCF1]">Click to change</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-[#C5C6C7]" />
                        <p className="text-sm text-[#C5C6C7]">Click to upload proof of payment</p>
                        <p className="text-xs text-[#C5C6C7]/60">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                  </label>
                </div>
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
            placeholder="Search by client or reference..."
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
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Client</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Type</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Amount</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Destination</TableHead>
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-white">{tx.reference}</span>
                          {tx.proof_image && (
                            <span title="Client Proof">
                              <ImageIcon className="w-4 h-4 text-[#C5C6C7]" />
                            </span>
                          )}
                          {tx.accountant_proof_image && (
                            <span title="Accountant Approval Proof" className="flex items-center">
                              <ImageIcon className="w-4 h-4 text-[#66FCF1]" />
                            </span>
                          )}
                          {tx.vendor_proof_image && (
                            <span title="Vendor Proof" className="flex items-center">
                              <ImageIcon className="w-4 h-4 text-orange-400" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-white">{tx.client_name || getClientName(tx.client_id)}</TableCell>
                      <TableCell>{getTypeBadge(tx.transaction_type)}</TableCell>
                      <TableCell className={`font-mono font-medium ${['deposit', 'rebate'].includes(tx.transaction_type) ? 'text-green-400' : 'text-red-400'}`}>
                        {['deposit', 'rebate'].includes(tx.transaction_type) ? '+' : '-'}${tx.amount?.toLocaleString()} {tx.currency}
                      </TableCell>
                      <TableCell className="text-[#C5C6C7]">
                        {tx.destination_bank_name ? (
                          <span>{tx.destination_account_name}<br/><span className="text-xs">{tx.destination_bank_name}</span></span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setViewTransaction(tx)}
                          className="text-[#C5C6C7] hover:text-white hover:bg-white/5" 
                          data-testid={`tx-view-${tx.transaction_id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
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
                {getStatusBadge(viewTransaction.status)}
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
                  {viewTransaction.base_currency && viewTransaction.base_currency !== 'USD' && viewTransaction.base_amount && (
                    <p className="text-sm text-[#C5C6C7] font-mono mt-1">
                      {viewTransaction.base_amount?.toLocaleString()} {viewTransaction.base_currency}
                    </p>
                  )}
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
              {/* Broker Commission */}
              {viewTransaction.broker_commission_amount > 0 && (
                <div className="pt-4 border-t border-white/10" data-testid="broker-commission-detail">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-2">Broker Commission</p>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-[#0B0C10] rounded-sm border border-white/5">
                    <div>
                      <p className="text-xs text-[#C5C6C7]">Rate</p>
                      <p className="text-white font-mono">{viewTransaction.broker_commission_rate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#C5C6C7]">Amount (USD)</p>
                      <p className="text-yellow-400 font-mono">${viewTransaction.broker_commission_amount?.toLocaleString()}</p>
                    </div>
                    {viewTransaction.broker_commission_base_currency !== 'USD' && (
                      <div className="col-span-2">
                        <p className="text-xs text-[#C5C6C7]">Amount ({viewTransaction.broker_commission_base_currency})</p>
                        <p className="text-yellow-400 font-mono">{viewTransaction.broker_commission_base_amount?.toLocaleString()} {viewTransaction.broker_commission_base_currency}</p>
                      </div>
                    )}
                  </div>
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
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-2">Client Proof of Payment</p>
                  <img 
                    src={`data:image/png;base64,${viewTransaction.proof_image}`} 
                    alt="Client proof of payment" 
                    className="max-w-full rounded border border-white/10"
                  />
                </div>
              )}
              {/* Accountant Approval Proof - Thumbnail Preview */}
              {viewTransaction.accountant_proof_image && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-[#66FCF1] uppercase tracking-wider mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Accountant Approval Proof
                  </p>
                  <div className="relative group">
                    <img 
                      src={`data:image/png;base64,${viewTransaction.accountant_proof_image}`} 
                      alt="Accountant approval proof" 
                      className="w-full max-h-48 object-contain rounded border border-[#66FCF1]/30 bg-[#0B0C10] cursor-pointer hover:border-[#66FCF1]"
                      onClick={() => window.open(`data:image/png;base64,${viewTransaction.accountant_proof_image}`, '_blank')}
                      data-testid="accountant-proof-thumbnail"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                      <span className="text-white text-sm">Click to view full size</span>
                    </div>
                  </div>
                  {viewTransaction.proof_uploaded_at && (
                    <p className="text-xs text-[#C5C6C7] mt-2">
                      Uploaded: {formatDate(viewTransaction.proof_uploaded_at)} by {viewTransaction.proof_uploaded_by_name}
                    </p>
                  )}
                </div>
              )}
              {/* Vendor Proof - For Withdrawals */}
              {viewTransaction.vendor_proof_image && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Vendor Payment Proof
                  </p>
                  <div className="relative group">
                    <img 
                      src={`data:image/png;base64,${viewTransaction.vendor_proof_image}`} 
                      alt="Vendor payment proof" 
                      className="w-full max-h-48 object-contain rounded border border-orange-400/30 bg-[#0B0C10] cursor-pointer hover:border-orange-400"
                      onClick={() => window.open(`data:image/png;base64,${viewTransaction.vendor_proof_image}`, '_blank')}
                      data-testid="vendor-proof-thumbnail"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                      <span className="text-white text-sm">Click to view full size</span>
                    </div>
                  </div>
                  {viewTransaction.vendor_proof_uploaded_at && (
                    <p className="text-xs text-[#C5C6C7] mt-2">
                      Uploaded: {formatDate(viewTransaction.vendor_proof_uploaded_at)} by {viewTransaction.vendor_proof_uploaded_by_name}
                    </p>
                  )}
                </div>
              )}
              {viewTransaction.rejection_reason && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-red-400 uppercase tracking-wider mb-1">Rejection Reason</p>
                  <p className="text-white">{viewTransaction.rejection_reason}</p>
                </div>
              )}
              {viewTransaction.processed_at && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Processed</p>
                  <p className="text-white text-sm">{formatDate(viewTransaction.processed_at)} by {viewTransaction.processed_by_name}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
