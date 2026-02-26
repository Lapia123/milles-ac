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
  ArrowUpDown,
  ShieldCheck,
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
    ...(isAccountantOrAdmin ? [{ to: '/debts', icon: Receipt, label: 'O/S Accounts' }] : []),
    { to: '/psp', icon: CreditCard, label: 'PSP' },
    ...(isAdmin ? [{ to: '/vendors', icon: Store, label: 'Vendors' }] : []),
    { to: '/reconciliation', icon: ArrowUpDown, label: 'Reconciliation' },
    ...(isAdmin ? [{ to: '/audit', icon: ShieldCheck, label: 'Audit' }] : []),
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
            ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-l-2 border-transparent'
        }`
      }
      data-testid={`nav-${label.toLowerCase().replace(' ', '-')}`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-sm transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold uppercase tracking-tight text-slate-800" style={{ fontFamily: 'Barlow Condensed' }}>
                Miles Capitals
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-500 hover:text-slate-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border border-blue-200">
                <AvatarImage src={user?.picture} />
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center justify-between h-full px-4 md:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-700"
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  data-testid="user-menu-btn"
                >
                  <Avatar className="w-8 h-8 border border-blue-200">
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm">{user?.name}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-white border-slate-200 text-slate-800"
              >
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-slate-200" />
                <DropdownMenuItem
                  onClick={() => navigate('/settings')}
                  className="cursor-pointer hover:bg-slate-100 focus:bg-slate-100"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 hover:bg-slate-100 focus:bg-slate-100"
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
