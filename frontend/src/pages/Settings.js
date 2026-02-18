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
import { Switch } from '../components/ui/switch';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Users,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  UserCog,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'sub_admin', label: 'Sub-Admin' },
];

export default function Settings() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'sub_admin',
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`, { headers: getAuthHeaders(), credentials: 'include' });
      if (response.ok) {
        setUsers(await response.json());
      } else if (response.status === 403) {
        toast.error('Admin access required');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = selectedUser
        ? `${API_URL}/api/users/${selectedUser.user_id}`
        : `${API_URL}/api/users`;
      const method = selectedUser ? 'PUT' : 'POST';

      const body = selectedUser
        ? { name: formData.name, role: formData.role, is_active: formData.is_active }
        : formData;

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(selectedUser ? 'User updated' : 'User created');
        setIsDialogOpen(false);
        resetForm();
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Operation failed');
      }
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (response.ok) {
        toast.success('User deleted');
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Delete failed');
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const handleEdit = (userItem) => {
    setSelectedUser(userItem);
    setFormData({
      email: userItem.email,
      password: '',
      name: userItem.name,
      role: userItem.role,
      is_active: userItem.is_active,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedUser(null);
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'sub_admin',
    });
  };

  const getRoleBadge = (role) => {
    const isAdmin = role === 'admin';
    return (
      <Badge className={`${isAdmin ? 'bg-[#66FCF1]/20 text-[#66FCF1] border border-[#66FCF1]/30' : 'bg-white/10 text-[#C5C6C7] border border-white/10'} text-xs uppercase`}>
        {role === 'admin' ? 'Admin' : 'Sub-Admin'}
      </Badge>
    );
  };

  const isCurrentUserAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6 animate-fade-in" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
          Settings
        </h1>
        <p className="text-[#C5C6C7]">System settings and user management</p>
      </div>

      {/* Current User Info */}
      <Card className="bg-[#1F2833] border-white/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <UserCog className="w-5 h-5 text-[#66FCF1]" />
            Your Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#66FCF1]/10 rounded-full flex items-center justify-center">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full" />
              ) : (
                <span className="text-[#66FCF1] font-bold text-xl">{user?.name?.charAt(0) || 'U'}</span>
              )}
            </div>
            <div>
              <p className="text-xl text-white font-medium">{user?.name}</p>
              <p className="text-[#C5C6C7] font-mono">{user?.email}</p>
              <div className="mt-2">
                {getRoleBadge(user?.role)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Management - Admin Only */}
      {isCurrentUserAdmin ? (
        <Card className="bg-[#1F2833] border-white/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#66FCF1]" />
                User Management
              </CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm text-sm"
                    data-testid="add-user-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1F2833] border-white/10 text-white max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold uppercase tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                      {selectedUser ? 'Edit User' : 'Add New User'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                        data-testid="user-name-input"
                        required
                      />
                    </div>
                    {!selectedUser && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Email</Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1] font-mono"
                            data-testid="user-email-input"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Password</Label>
                          <Input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="bg-[#0B0C10] border-white/10 text-white focus:border-[#66FCF1]"
                            data-testid="user-password-input"
                            required
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-2">
                      <Label className="text-[#C5C6C7] text-xs uppercase tracking-wider">Role</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) => setFormData({ ...formData, role: value })}
                      >
                        <SelectTrigger className="bg-[#0B0C10] border-white/10 text-white" data-testid="user-role-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1F2833] border-white/10">
                          {roleOptions.map((role) => (
                            <SelectItem key={role.value} value={role.value} className="text-white hover:bg-white/5">
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedUser && (
                      <div className="flex items-center justify-between p-3 bg-[#0B0C10] rounded-sm border border-white/5">
                        <Label className="text-[#C5C6C7]">Active</Label>
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                          data-testid="user-active-switch"
                        />
                      </div>
                    )}
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
                        data-testid="save-user-btn"
                      >
                        {selectedUser ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">User</TableHead>
                    <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Email</TableHead>
                    <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Role</TableHead>
                    <TableHead className="text-[#C5C6C7] font-bold uppercase tracking-wider text-xs">Status</TableHead>
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
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-[#C5C6C7]">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((userItem) => (
                      <TableRow key={userItem.user_id} className="border-white/5 hover:bg-white/5">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#66FCF1]/10 rounded-full flex items-center justify-center">
                              {userItem.picture ? (
                                <img src={userItem.picture} alt={userItem.name} className="w-10 h-10 rounded-full" />
                              ) : (
                                <span className="text-[#66FCF1] font-bold text-sm">{userItem.name?.charAt(0) || 'U'}</span>
                              )}
                            </div>
                            <div>
                              <p className="text-white font-medium">{userItem.name}</p>
                              <p className="text-xs text-[#C5C6C7] font-mono">{userItem.user_id}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-mono">{userItem.email}</TableCell>
                        <TableCell>{getRoleBadge(userItem.role)}</TableCell>
                        <TableCell>
                          <Badge className={`${userItem.is_active !== false ? 'status-approved' : 'status-rejected'} text-xs uppercase`}>
                            {userItem.is_active !== false ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-[#C5C6C7] hover:text-white hover:bg-white/5" data-testid={`user-actions-${userItem.user_id}`}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1F2833] border-white/10">
                              <DropdownMenuItem onClick={() => handleEdit(userItem)} className="text-white hover:bg-white/5 cursor-pointer">
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              {userItem.user_id !== user?.user_id && (
                                <DropdownMenuItem onClick={() => handleDelete(userItem.user_id)} className="text-red-400 hover:bg-white/5 cursor-pointer">
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              )}
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
      ) : (
        <Card className="bg-[#1F2833] border-white/5">
          <CardContent className="p-8 text-center">
            <Shield className="w-12 h-12 text-[#C5C6C7] mx-auto mb-4" />
            <p className="text-[#C5C6C7]">Admin access required to manage users</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
