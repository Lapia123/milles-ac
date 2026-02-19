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
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Filter,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [viewClient, setViewClient] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    country: '',
    mt5_number: '',
    crm_customer_id: '',
    notes: '',
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchClients = async () => {
    try {
      let url = `${API_URL}/api/clients`;
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setClients(await response.json());
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [searchTerm, statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = selectedClient
        ? `${API_URL}/api/clients/${selectedClient.client_id}`
        : `${API_URL}/api/clients`;
      const method = selectedClient ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(selectedClient ? 'Client updated' : 'Client created');
        setIsDialogOpen(false);
        resetForm();
        fetchClients();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;
    try {
      const response = await fetch(`${API_URL}/api/clients/${clientId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        toast.success('Client deleted');
        fetchClients();
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleEdit = (client) => {
    setSelectedClient(client);
    setFormData({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone || '',
      country: client.country || '',
      mt5_number: client.mt5_number || '',
      crm_customer_id: client.crm_customer_id || '',
      notes: client.notes || '',
      kyc_status: client.kyc_status,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedClient(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      country: '',
      mt5_number: '',
      crm_customer_id: '',
      notes: '',
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: 'status-approved',
      pending: 'status-pending',
      rejected: 'status-rejected',
      suspended: 'status-suspended',
    };
    return <Badge className={`${styles[status] || 'status-pending'} text-xs uppercase`}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="clients-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
            Clients
          </h1>
          <p className="text-[#C5C6C7]">Manage client accounts and KYC status</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button
              className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan"
              data-testid="add-client-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                {selectedClient ? 'Edit Client' : 'Add New Client'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">First Name</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                    data-testid="client-first-name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Last Name</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                    data-testid="client-last-name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                  data-testid="client-email"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                    data-testid="client-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Country</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                    data-testid="client-country"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">MT5 Number</Label>
                  <Input
                    value={formData.mt5_number}
                    onChange={(e) => setFormData({ ...formData, mt5_number: e.target.value })}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                    placeholder="e.g., 12345678"
                    data-testid="client-mt5"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">CRM Customer ID</Label>
                  <Input
                    value={formData.crm_customer_id}
                    onChange={(e) => setFormData({ ...formData, crm_customer_id: e.target.value })}
                    className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                    placeholder="e.g., CRM-001"
                    data-testid="client-crm-id"
                  />
                </div>
              </div>
              {selectedClient && (
                <div className="space-y-2">
                  <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">KYC Status</Label>
                  <Select
                    value={formData.kyc_status}
                    onValueChange={(value) => setFormData({ ...formData, kyc_status: value })}
                  >
                    <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="client-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1F2833] border-white/10">
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/5">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                  rows={3}
                  data-testid="client-notes"
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
                  data-testid="save-client-btn"
                >
                  {selectedClient ? 'Update' : 'Create'}
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
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#1F2833] border-white/10 text-white placeholder:text-white/30 focus:border-[#66FCF1]"
            data-testid="search-clients"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-[#1F2833] border-white/10 text-white" data-testid="filter-status">
            <Filter className="w-4 h-4 mr-2 text-[#C5C6C7]" />
            <SelectValue placeholder="Filter by status" />
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
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Client</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Contact</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Country</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">KYC Status</TableHead>
                  <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="w-6 h-6 border-2 border-[#66FCF1] border-t-transparent rounded-full animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-[#C5C6C7]">
                      No clients found
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.client_id} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#66FCF1]/10 rounded-full flex items-center justify-center">
                            <span className="text-[#66FCF1] font-bold text-sm">
                              {client.first_name?.charAt(0)}{client.last_name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{client.first_name} {client.last_name}</p>
                            <p className="text-xs text-[#C5C6C7] font-mono">{client.client_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-white font-mono text-sm">{client.email}</p>
                        <p className="text-xs text-[#C5C6C7] font-mono">{client.phone || '-'}</p>
                      </TableCell>
                      <TableCell className="text-white">{client.country || '-'}</TableCell>
                      <TableCell>{getStatusBadge(client.kyc_status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-[#C5C6C7] hover:text-white hover:bg-white/5" data-testid={`client-actions-${client.client_id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#1F2833] border-white/10">
                            <DropdownMenuItem onClick={() => setViewClient(client)} className="text-white hover:bg-white/5 cursor-pointer">
                              <Eye className="w-4 h-4 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(client)} className="text-white hover:bg-white/5 cursor-pointer">
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(client.client_id)} className="text-red-400 hover:bg-white/5 cursor-pointer">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* View Client Dialog */}
      <Dialog open={!!viewClient} onOpenChange={() => setViewClient(null)}>
        <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              Client Details
            </DialogTitle>
          </DialogHeader>
          {viewClient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#66FCF1]/10 rounded-full flex items-center justify-center">
                  <span className="text-[#66FCF1] font-bold text-xl">
                    {viewClient.first_name?.charAt(0)}{viewClient.last_name?.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl text-white font-medium">{viewClient.first_name} {viewClient.last_name}</h3>
                  <p className="text-[#C5C6C7] font-mono text-sm">{viewClient.client_id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Email</p>
                  <p className="text-white font-mono">{viewClient.email}</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Phone</p>
                  <p className="text-white font-mono">{viewClient.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Country</p>
                  <p className="text-white">{viewClient.country || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">KYC Status</p>
                  {getStatusBadge(viewClient.kyc_status)}
                </div>
              </div>
              {viewClient.notes && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-[#C5C6C7] uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-white">{viewClient.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
