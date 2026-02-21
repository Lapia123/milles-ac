import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  TrendingUp,
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  Landmark,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  Store,
  Wallet,
  Banknote,
  Receipt,
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isAccountantOrAdmin = user?.role === 'admin' || user?.role === 'accountant';
  const isVendor = user?.role === 'vendor';
  const isAdmin = user?.role === 'admin';

  // Vendor-specific navigation
  const vendorNavItems = [
    { to: '/vendor-portal', icon: Store, label: 'My Portal' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  // Admin/Sub-admin navigation
  const adminNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/clients', icon: Users, label: 'Clients' },
    { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    { to: '/treasury', icon: Landmark, label: 'Treasury' },
    ...(isAccountantOrAdmin ? [{ to: '/income-expenses', icon: Wallet, label: 'Income & Expenses' }] : []),
    ...(isAccountantOrAdmin ? [{ to: '/loans', icon: Banknote, label: 'Loans' }] : []),
    ...(isAccountantOrAdmin ? [{ to: '/debts', icon: Receipt, label: 'Debts' }] : []),
    { to: '/psp', icon: CreditCard, label: 'PSP' },
    ...(isAdmin ? [{ to: '/vendors', icon: Store, label: 'Vendors' }] : []),
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    ...(isAccountantOrAdmin ? [{ to: '/accountant', icon: ClipboardCheck, label: 'Approvals' }] : []),
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const navItems = isVendor ? vendorNavItems : adminNavItems;

  const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 text-sm font-medium uppercase tracking-wider transition-all duration-200 ${
          isActive
            ? 'bg-[#66FCF1]/10 text-[#66FCF1] border-l-2 border-[#66FCF1]'
            : 'text-[#C5C6C7] hover:text-white hover:bg-white/5 border-l-2 border-transparent'
        }`
      }
      data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-[#0F172A] flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1E293B] border-r border-white/5 transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#3B82F6] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
                Miles Capitals
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-[#94A3B8] hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border border-[#3B82F6]/30">
                <AvatarImage src={user?.picture} />
                <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6]">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-[#94A3B8] truncate capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-16 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center justify-between h-full px-4 md:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-[#94A3B8] hover:text-white"
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-[#94A3B8] hover:text-white hover:bg-white/5"
                  data-testid="user-menu-btn"
                >
                  <Avatar className="w-8 h-8 border border-[#3B82F6]/30">
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className="bg-[#3B82F6]/20 text-[#3B82F6] text-xs">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm">{user?.name}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-[#1E293B] border-white/10 text-white"
              >
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-[#94A3B8]">{user?.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => navigate('/settings')}
                  className="cursor-pointer hover:bg-white/5 focus:bg-white/5"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-400 hover:bg-white/5 focus:bg-white/5"
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
