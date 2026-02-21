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
  Store,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Percent,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Building2,
  Banknote,
  Wallet,
  Receipt,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Vendors() {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [viewVendor, setViewVendor] = useState(null);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [settlementType, setSettlementType] = useState('bank');
  const [settlementDestination, setSettlementDestination] = useState('');
  const [settlementCommission, setSettlementCommission] = useState('');
  const [settlementCharges, setSettlementCharges] = useState('');
  const [settlementChargesDescription, setSettlementChargesDescription] = useState('');
  const [settlementAmountInDestCurrency, setSettlementAmountInDestCurrency] = useState('');
  const [formData, setFormData] = useState({
    vendor_name: '',
    email: '',
    password: '',
    deposit_commission: '',
    withdrawal_commission: '',
    description: '',
    status: 'active',
  });

  const isAdmin = user?.role === 'admin';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${API_URL}/api/vendors`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setVendors(await response.json());
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to load vendors');
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

  const fetchVendorTransactions = async (vendorId) => {
    try {
      const response = await fetch(`${API_URL}/api/vendors/${vendorId}/transactions`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setPendingTransactions(await response.json());
      }
    } catch (error) {
      console.error('Error fetching vendor transactions:', error);
    }
  };

  const fetchVendorSettlements = async (vendorId) => {
    try {
      const response = await fetch(`${API_URL}/api/vendors/${vendorId}/settlements`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setSettlements(await response.json());
      }
    } catch (error) {
      console.error('Error fetching vendor settlements:', error);
    }
  };

  const fetchVendorDetails = async (vendorId) => {
    try {
      const response = await fetch(`${API_URL}/api/vendors/${vendorId}`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        const vendorData = await response.json();
        setViewVendor(vendorData);
      }
    } catch (error) {
      console.error('Error fetching vendor details:', error);
    }
  };

  const openVendorView = (vendor) => {
    setViewVendor(vendor); // Set initial data
    fetchVendorDetails(vendor.vendor_id); // Fetch full details including settlement_by_currency
  };

  useEffect(() => {
    fetchVendors();
    fetchTreasuryAccounts();
  }, []);

  useEffect(() => {
    if (viewVendor) {
      fetchVendorTransactions(viewVendor.vendor_id);
      fetchVendorSettlements(viewVendor.vendor_id);
    }
  }, [viewVendor?.vendor_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = selectedVendor
        ? `${API_URL}/api/vendors/${selectedVendor.vendor_id}`
        : `${API_URL}/api/vendors`;
      const method = selectedVendor ? 'PUT' : 'POST';

      const payload = {
        vendor_name: formData.vendor_name,
        deposit_commission: parseFloat(formData.deposit_commission) || 0,
        withdrawal_commission: parseFloat(formData.withdrawal_commission) || 0,
        description: formData.description || null,
      };

      if (!selectedVendor) {
        payload.email = formData.email;
        payload.password = formData.password;
      } else {
        payload.status = formData.status;
      }

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(selectedVendor ? 'Vendor updated' : 'Vendor created');
        setIsDialogOpen(false);
        resetForm();
        fetchVendors();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (vendorId) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      const response = await fetch(`${API_URL}/api/vendors/${vendorId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        toast.success('Vendor deleted');
        fetchVendors();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Delete failed');
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleEdit = (vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      vendor_name: vendor.vendor_name,
      email: vendor.email,
      password: '',
      deposit_commission: vendor.deposit_commission?.toString() || '',
      withdrawal_commission: vendor.withdrawal_commission?.toString() || '',
      description: vendor.description || '',
      status: vendor.status,
    });
    setIsDialogOpen(true);
  };

  const handleSettleVendor = async () => {
    if (!viewVendor || !settlementDestination) {
      toast.error('Please select a settlement destination');
      return;
    }
    
    // Get destination account to check currency
    const destAccount = treasuryAccounts.find(a => a.account_id === settlementDestination);
    if (destAccount && destAccount.currency !== 'USD' && !settlementAmountInDestCurrency) {
      toast.error(`Please enter the settlement amount in ${destAccount.currency}`);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/vendors/${viewVendor.vendor_id}/settle`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          settlement_type: settlementType,
          destination_account_id: settlementDestination,
          commission_amount: parseFloat(settlementCommission) || 0,
          charges_amount: parseFloat(settlementCharges) || 0,
          charges_description: settlementChargesDescription || null,
          source_currency: 'USD',
          destination_currency: destAccount?.currency || 'USD',
          settlement_amount_in_dest_currency: settlementAmountInDestCurrency ? parseFloat(settlementAmountInDestCurrency) : null
        }),
      });
      
      if (response.ok) {
        toast.success('Settlement submitted for approval');
        setSettleDialogOpen(false);
        setSettlementType('bank');
        setSettlementDestination('');
        setSettlementCommission('');
        setSettlementCharges('');
        setSettlementChargesDescription('');
        setSettlementAmountInDestCurrency('');
        fetchVendorTransactions(viewVendor.vendor_id);
        fetchVendorSettlements(viewVendor.vendor_id);
        fetchVendors();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Settlement failed');
      }
    } catch (error) {
      toast.error('Settlement failed');
    }
  };

  const resetForm = () => {
    setSelectedVendor(null);
    setFormData({
      vendor_name: '',
      email: '',
      password: '',
      deposit_commission: '',
      withdrawal_commission: '',
      description: '',
      status: 'active',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'status-approved',
      inactive: 'status-rejected',
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
    });
  };

  const totalPendingAmount = vendors.reduce((sum, v) => sum + (v.pending_amount || 0), 0);
  const pendingApproved = pendingTransactions.filter(t => t.status === 'approved' && !t.settled);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="vendors-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
            Vendors
          </h1>
          <p className="text-[#C5C6C7]">Manage vendors, commissions, and settlements</p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan"
                data-testid="add-vendor-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                  {selectedVendor ? 'Edit Vendor' : 'Add New Vendor'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Vendor Name *</Label>
                  <Input
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                    placeholder="e.g., MoneyExchange Pro"
                    data-testid="vendor-name"
                    required
                  />
                </div>
                
                {!selectedVendor && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Email (Login) *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                        placeholder="vendor@example.com"
                        data-testid="vendor-email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Password *</Label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                        placeholder="Min 6 characters"
                        data-testid="vendor-password"
                        required
                      />
                    </div>
                  </>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Deposit Commission (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.deposit_commission}
                      onChange={(e) => setFormData({ ...formData, deposit_commission: e.target.value })}
                      className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                      placeholder="1.5"
                      data-testid="vendor-deposit-commission"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Withdrawal Commission (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.withdrawal_commission}
                      onChange={(e) => setFormData({ ...formData, withdrawal_commission: e.target.value })}
                      className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                      placeholder="2.0"
                      data-testid="vendor-withdrawal-commission"
                    />
                  </div>
                </div>
                
                {selectedVendor && (
                  <div className="space-y-2">
                    <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="vendor-status">
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
                    data-testid="vendor-description"
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
                    data-testid="save-vendor-btn"
                  >
                    {selectedVendor ? 'Update' : 'Create'}
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
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Total Vendors</p>
                <p className="text-3xl font-bold font-mono text-white">{vendors.length}</p>
              </div>
              <div className="p-3 bg-[#66FCF1]/10 rounded-sm">
                <Store className="w-6 h-6 text-[#66FCF1]" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1F2833] border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Net Settlement</p>
                <p className="text-3xl font-bold font-mono text-[#66FCF1]">${totalPendingAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-sm">
                <DollarSign className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1F2833] border-white/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Active Vendors</p>
                <p className="text-3xl font-bold font-mono text-white">{vendors.filter(v => v.status === 'active').length}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-sm">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Store className="w-12 h-12 text-[#C5C6C7] mx-auto mb-4" />
            <p className="text-[#C5C6C7]">No vendors found</p>
            {isAdmin && <p className="text-sm text-[#C5C6C7]/60 mt-2">Click "Add Vendor" to create one</p>}
          </div>
        ) : (
          vendors.map((vendor) => (
            <Card 
              key={vendor.vendor_id} 
              className="bg-[#1F2833] border-white/5 card-hover cursor-pointer"
              onClick={() => openVendorView(vendor)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#66FCF1]/10 rounded-sm">
                      <Store className="w-5 h-5 text-[#66FCF1]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">{vendor.vendor_name}</CardTitle>
                      <p className="text-xs text-[#C5C6C7]">{vendor.email}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="text-[#C5C6C7] hover:text-white hover:bg-white/5" data-testid={`vendor-actions-${vendor.vendor_id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1F2833] border-white/10">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openVendorView(vendor); }} className="text-white hover:bg-white/5 cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(vendor); }} className="text-white hover:bg-white/5 cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(vendor.vendor_id); }} className="text-red-400 hover:bg-white/5 cursor-pointer">
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
                      <ArrowDownRight className="w-3 h-3 text-green-400" /> Deposit
                    </span>
                    <span className="text-white font-mono">{vendor.deposit_commission}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#C5C6C7] text-sm flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-red-400" /> Withdrawal
                    </span>
                    <span className="text-white font-mono">{vendor.withdrawal_commission}%</span>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[#C5C6C7] text-xs uppercase tracking-wider">Net Settlement</span>
                    {vendor.settlement_by_currency && vendor.settlement_by_currency.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {vendor.settlement_by_currency.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <Badge className={`text-xs ${
                              item.currency === 'USD' ? 'bg-green-500/20 text-green-400' :
                              item.currency === 'EUR' ? 'bg-blue-500/20 text-blue-400' :
                              item.currency === 'AED' ? 'bg-purple-500/20 text-purple-400' :
                              item.currency === 'GBP' ? 'bg-yellow-500/20 text-yellow-400' :
                              item.currency === 'INR' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {item.currency}
                            </Badge>
                            <span className="text-[#66FCF1] font-mono">
                              {item.amount?.toLocaleString()}
                              {item.currency !== 'USD' && (
                                <span className="text-[#C5C6C7] text-xs ml-1">(${item.usd_equivalent?.toLocaleString()})</span>
                              )}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-1 border-t border-white/10">
                          <span className="text-[#C5C6C7] text-xs">Total USD</span>
                          <span className="text-[#66FCF1] font-mono font-bold">${(vendor.pending_amount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[#C5C6C7] text-sm mt-1">No pending settlement</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="text-[#C5C6C7] text-sm">Status</span>
                    {getStatusBadge(vendor.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* View Vendor Details Dialog */}
      <Dialog open={!!viewVendor} onOpenChange={() => { setViewVendor(null); setPendingTransactions([]); setSettlements([]); }}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-3" style={{ fontFamily: 'Barlow Condensed' }}>
              <Store className="w-6 h-6 text-[#66FCF1]" />
              {viewVendor?.vendor_name}
            </DialogTitle>
          </DialogHeader>
          {viewVendor && (
            <div className="space-y-4">
              {/* Vendor Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-[#0B0C10] rounded-sm">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Deposit Commission</p>
                  <p className="text-xl font-mono text-white">{viewVendor.deposit_commission}%</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Withdrawal Commission</p>
                  <p className="text-xl font-mono text-white">{viewVendor.withdrawal_commission}%</p>
                </div>
              </div>
              
              {/* Settlement Balance by Currency */}
              <div className="p-4 bg-[#0B0C10] rounded-sm border-l-4 border-l-[#66FCF1]">
                <p className="text-xs text-[#66FCF1] uppercase tracking-wider mb-3">Settlement Balance by Currency (Deposits - Withdrawals - Commission)</p>
                {viewVendor.settlement_by_currency && viewVendor.settlement_by_currency.length > 0 ? (
                  <div className="space-y-3">
                    {viewVendor.settlement_by_currency.map((item, idx) => (
                      <div key={idx} className="space-y-1">
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
                            <span className="text-xs text-[#C5C6C7]">({item.transaction_count} txns)</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-bold font-mono ${item.usd_equivalent >= 0 ? 'text-[#66FCF1]' : 'text-red-400'}`}>
                              {item.amount?.toLocaleString()}
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
                    <div className="border-t border-white/10 pt-2 mt-2">
                      <div className="flex justify-between mb-1">
                        <span className="text-[#C5C6C7] text-sm">Total Commission Earned:</span>
                        <span className="text-sm font-bold font-mono text-yellow-400">
                          ${viewVendor.settlement_by_currency.reduce((sum, item) => sum + (item.commission_earned_usd || 0), 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7] text-sm">Net Settlement (USD):</span>
                        <span className={`text-lg font-bold font-mono ${viewVendor.settlement_by_currency.reduce((sum, item) => sum + (item.usd_equivalent || 0), 0) >= 0 ? 'text-white' : 'text-red-400'}`}>
                          ${viewVendor.settlement_by_currency.reduce((sum, item) => sum + (item.usd_equivalent || 0), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[#C5C6C7]">No pending settlement</p>
                )}
              </div>

              {/* Settle Button */}
              {isAdmin && pendingTransactions.filter(t => (t.status === 'approved' || t.status === 'completed') && !t.settled).length > 0 && (
                <Button
                  onClick={() => setSettleDialogOpen(true)}
                  className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                  data-testid="settle-vendor-btn"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Settle Vendor Balance (${viewVendor?.settlement_by_currency?.reduce((sum, item) => sum + (item.usd_equivalent || 0), 0).toLocaleString() || '0'})
                </Button>
              )}

              {/* Tabs */}
              <Tabs defaultValue="transactions" className="w-full">
                <TabsList className="bg-[#0B0C10] border border-white/10">
                  <TabsTrigger value="transactions" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
                    Transactions ({pendingTransactions.length})
                  </TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-[#66FCF1] data-[state=active]:text-[#0B0C10]">
                    Settlement History
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="transactions" className="mt-4">
                  <ScrollArea className="h-[250px]">
                    {pendingTransactions.length === 0 ? (
                      <div className="text-center py-8 text-[#C5C6C7]">
                        No transactions
                      </div>
                    ) : (
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
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Settled</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingTransactions.map((tx) => {
                            const displayCurrency = tx.base_currency || tx.currency || 'USD';
                            const displayAmount = tx.base_amount || tx.amount;
                            return (
                            <TableRow key={tx.transaction_id} className="border-white/5 hover:bg-white/5">
                              <TableCell className="font-mono text-white">{tx.reference}</TableCell>
                              <TableCell>
                                <span className={`flex items-center gap-1 ${tx.transaction_type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                                  {tx.transaction_type === 'deposit' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                  {tx.transaction_type}
                                </span>
                              </TableCell>
                              <TableCell className="text-white">{tx.client_name}</TableCell>
                              <TableCell className="font-mono text-white">
                                {displayAmount?.toLocaleString()}
                                {tx.base_currency && tx.base_currency !== tx.currency && (
                                  <span className="text-xs text-[#C5C6C7] block">(${tx.amount?.toLocaleString()} USD)</span>
                                )}
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
                              <TableCell>
                                {tx.settled ? (
                                  <Badge className="bg-green-500/20 text-green-400">Yes</Badge>
                                ) : (
                                  <Badge className="bg-yellow-500/20 text-yellow-400">No</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          )})}
                        </TableBody>
                      </Table>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="history" className="mt-4">
                  <ScrollArea className="h-[250px]">
                    {settlements.length === 0 ? (
                      <div className="text-center py-8 text-[#C5C6C7]">
                        No settlement history
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">ID</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Type</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Gross</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Deductions</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Settled</TableHead>
                            <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settlements.map((settlement) => (
                            <TableRow key={settlement.settlement_id} className="border-white/5 hover:bg-white/5">
                              <TableCell className="font-mono text-white text-xs">{settlement.settlement_id}</TableCell>
                              <TableCell>
                                <Badge className={settlement.settlement_type === 'bank' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}>
                                  {settlement.settlement_type}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-white">${settlement.gross_amount?.toLocaleString()}</TableCell>
                              <TableCell className="font-mono text-red-400">
                                <div className="text-xs">
                                  <div>Comm: -${settlement.commission_amount?.toLocaleString()}</div>
                                  {settlement.charges_amount > 0 && (
                                    <div>Charges: -${settlement.charges_amount?.toLocaleString()}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-green-400">
                                {settlement.destination_currency && settlement.destination_currency !== 'USD' ? (
                                  <span>{settlement.destination_currency} {settlement.settlement_amount?.toLocaleString()}</span>
                                ) : (
                                  <span>${settlement.settlement_amount?.toLocaleString()}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-[#C5C6C7]">{formatDate(settlement.settled_at)}</TableCell>
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

      {/* Settle Vendor Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={() => { 
        setSettleDialogOpen(false); 
        setSettlementType('bank'); 
        setSettlementDestination(''); 
        setSettlementCommission('');
        setSettlementCharges('');
        setSettlementChargesDescription('');
        setSettlementAmountInDestCurrency('');
      }}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              Settle Vendor Balance
            </DialogTitle>
          </DialogHeader>
          {viewVendor && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0B0C10] rounded-sm space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#C5C6C7]">Vendor</span>
                  <span className="text-white">{viewVendor.vendor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C5C6C7]">Transactions to Settle</span>
                  <span className="text-white">{pendingTransactions.filter(t => (t.status === 'approved' || t.status === 'completed') && !t.settled).length}</span>
                </div>
                
                {/* Show breakdown by currency */}
                {viewVendor?.settlement_by_currency?.map((item, idx) => (
                  <div key={idx} className="border-t border-white/10 pt-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <Badge className={`text-xs ${
                        item.currency === 'USD' ? 'bg-green-500/20 text-green-400' :
                        item.currency === 'EUR' ? 'bg-blue-500/20 text-blue-400' :
                        item.currency === 'AED' ? 'bg-purple-500/20 text-purple-400' :
                        item.currency === 'GBP' ? 'bg-yellow-500/20 text-yellow-400' :
                        item.currency === 'INR' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {item.currency}
                      </Badge>
                      <span className="text-white font-mono">
                        {item.amount?.toLocaleString()} {item.currency}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#C5C6C7]">Commission</span>
                      <span className="text-yellow-400">-{item.commission_earned_base?.toLocaleString()} {item.currency}</span>
                    </div>
                    {item.currency !== 'USD' && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[#C5C6C7]">USD Equivalent</span>
                        <span className="text-[#C5C6C7]">${item.usd_equivalent?.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="flex justify-between border-t border-white/10 pt-2">
                  <span className="text-[#66FCF1] font-semibold">Total Net (USD)</span>
                  <span className="text-[#66FCF1] font-mono font-bold">${viewVendor?.settlement_by_currency?.reduce((sum, item) => sum + (item.usd_equivalent || 0), 0).toLocaleString() || '0'}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Settlement Type *</Label>
                <Select value={settlementType} onValueChange={setSettlementType}>
                  <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1F2833] border-white/10">
                    <SelectItem value="bank" className="text-white hover:bg-white/5">
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Bank Transfer
                      </span>
                    </SelectItem>
                    <SelectItem value="cash" className="text-white hover:bg-white/5">
                      <span className="flex items-center gap-2">
                        <Banknote className="w-4 h-4" /> Cash
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Settlement Destination *</Label>
                <Select
                  value={settlementDestination}
                  onValueChange={setSettlementDestination}
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
              
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Additional Charges (Optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settlementCharges}
                  onChange={(e) => setSettlementCharges(e.target.value)}
                  className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                  placeholder="0.00"
                  data-testid="settlement-charges"
                />
              </div>
              
              {settlementCharges && parseFloat(settlementCharges) > 0 && (
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Charges Description</Label>
                  <Input
                    value={settlementChargesDescription}
                    onChange={(e) => setSettlementChargesDescription(e.target.value)}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                    placeholder="e.g., Bank transfer fee, Processing fee"
                    data-testid="settlement-charges-desc"
                  />
                </div>
              )}
              
              {/* Multi-Currency Settlement */}
              {settlementDestination && (() => {
                const destAccount = treasuryAccounts.find(a => a.account_id === settlementDestination);
                const netSettlementUSD = viewVendor?.settlement_by_currency?.reduce((sum, item) => sum + (item.usd_equivalent || 0), 0) || 0;
                const additionalChargesUSD = parseFloat(settlementCharges) || 0;
                const finalAmountUSD = netSettlementUSD - additionalChargesUSD;
                
                // Get base currency info (assume first currency for now)
                const baseCurrencyData = viewVendor?.settlement_by_currency?.[0];
                const baseCurrency = baseCurrencyData?.currency || 'USD';
                const netSettlementBase = baseCurrencyData?.amount || 0;
                const commissionBase = baseCurrencyData?.commission_earned_base || 0;
                
                // Calculate charges in base currency using exchange rate
                const exchangeRate = baseCurrency !== 'USD' && netSettlementBase !== 0 && netSettlementUSD !== 0 
                  ? netSettlementBase / netSettlementUSD 
                  : 1;
                const additionalChargesBase = additionalChargesUSD * exchangeRate;
                const finalAmountBase = netSettlementBase - additionalChargesBase;
                
                return (
                  <div className="p-3 bg-[#0B0C10] rounded-sm border border-white/10 space-y-3">
                    <p className="text-xs text-[#66FCF1] uppercase tracking-wider flex items-center gap-1">
                      <Receipt className="w-3 h-3" /> Settlement Preview
                    </p>
                    <div className="space-y-2 text-sm">
                      {/* Base Currency Section */}
                      {baseCurrency !== 'USD' && (
                        <>
                          <div className="flex justify-between items-center">
                            <Badge className="bg-purple-500/20 text-purple-400">{baseCurrency}</Badge>
                            <span className="text-white font-mono">{netSettlementBase.toLocaleString()} {baseCurrency}</span>
                          </div>
                          {additionalChargesUSD > 0 && (
                            <div className="flex justify-between">
                              <span className="text-[#C5C6C7]">Additional Charges</span>
                              <span className="text-red-400 font-mono">-{additionalChargesBase.toFixed(2)} {baseCurrency}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-b border-white/10 pb-2">
                            <span className="text-[#66FCF1] font-semibold">Final ({baseCurrency})</span>
                            <span className="text-[#66FCF1] font-mono font-bold">{finalAmountBase.toFixed(2)} {baseCurrency}</span>
                          </div>
                        </>
                      )}
                      
                      {/* USD Section */}
                      <div className="flex justify-between">
                        <span className="text-[#C5C6C7]">Net Settlement (USD)</span>
                        <span className="text-white font-mono">${netSettlementUSD.toLocaleString()}</span>
                      </div>
                      {additionalChargesUSD > 0 && (
                        <div className="flex justify-between">
                          <span className="text-[#C5C6C7]">Additional Charges (USD)</span>
                          <span className="text-red-400 font-mono">-${additionalChargesUSD.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-white/10">
                        <span className="text-[#66FCF1] font-semibold">Final Amount (USD)</span>
                        <span className="text-[#66FCF1] font-mono font-bold">${finalAmountUSD.toFixed(2)}</span>
                      </div>
                      
                      {destAccount && destAccount.currency !== 'USD' && (
                        <div className="pt-3 border-t border-white/10 space-y-2">
                          <p className="text-xs text-yellow-400">Destination account: {destAccount.currency}</p>
                          <div className="space-y-1">
                            <Label className="text-[#C5C6C7] text-xs">Final Settlement Amount in {destAccount.currency} *</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={settlementAmountInDestCurrency}
                              onChange={(e) => setSettlementAmountInDestCurrency(e.target.value)}
                              className="bg-[#1F2833] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                              placeholder={`Enter final amount in ${destAccount.currency}`}
                              data-testid="settlement-dest-amount"
                            />
                          </div>
                          {settlementAmountInDestCurrency && (
                            <div className="flex justify-between pt-2">
                              <span className="text-[#C5C6C7]">Amount to Transfer</span>
                              <span className="text-green-400 font-mono text-lg">{destAccount.currency} {parseFloat(settlementAmountInDestCurrency).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { 
                    setSettleDialogOpen(false); 
                    setSettlementType('bank'); 
                    setSettlementDestination(''); 
                    setSettlementCommission('');
                    setSettlementCharges('');
                    setSettlementChargesDescription('');
                    setSettlementAmountInDestCurrency('');
                  }}
                  className="border-white/10 text-[#C5C6C7] hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSettleVendor}
                  className="bg-green-500 text-white hover:bg-green-600 font-bold uppercase tracking-wider"
                  data-testid="confirm-settle-vendor-btn"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Settlement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
