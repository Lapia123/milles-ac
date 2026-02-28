import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Transactions from "./pages/Transactions";
import Treasury from "./pages/Treasury";
import LPAccounts from "./pages/LPAccounts";
import PSPs from "./pages/PSPs";
import Vendors from "./pages/Vendors";
import VendorDashboard from "./pages/VendorDashboard";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import RolesPermissions from "./pages/RolesPermissions";
import AccountantDashboard from "./pages/AccountantDashboard";
import IncomeExpenses from "./pages/IncomeExpenses";
import Loans from "./pages/Loans";
import Debts from "./pages/Debts";
import Reconciliation from "./pages/Reconciliation";
import AuditCompliance from "./pages/AuditCompliance";
import LogsManagement from "./pages/Logs";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();
  const isDark = theme === 'dark';

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0B0C10]' : 'bg-[#F8FAFC]'}`}>
        <div className={`text-lg ${isDark ? 'text-[#66FCF1]' : 'text-blue-600'}`}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect exchangers away from admin routes
  if (user.role === 'vendor' && location.pathname === '/dashboard') {
    return <Navigate to="/vendor-portal" replace />;
  }

  // Redirect sub-admins away from dashboard
  if (user.role === 'sub_admin' && location.pathname === '/dashboard') {
    return <Navigate to="/clients" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate page based on role
    if (user.role === 'vendor') {
      return <Navigate to="/vendor-portal" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Smart redirect component based on user role
const RoleBasedRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'vendor') return <Navigate to="/vendor-portal" replace />;
  if (user?.role === 'sub_admin') return <Navigate to="/clients" replace />;
  return <Navigate to="/dashboard" replace />;
};

function AppRouter() {
  const location = useLocation();

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleBasedRedirect />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="treasury" element={<Treasury />} />
        <Route path="lp-accounts" element={
            <ProtectedRoute allowedRoles={['admin', 'accountant']}>
              <LPAccounts />
            </ProtectedRoute>
          } />
        <Route path="psp" element={<PSPs />} />
        <Route path="vendors" element={
            <ProtectedRoute allowedRoles={['admin', 'accountant']}>
              <Vendors />
            </ProtectedRoute>
          } />
        <Route path="vendor-portal" element={<VendorDashboard />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reconciliation" element={<Reconciliation />} />
        <Route path="settings" element={<Settings />} />
        <Route 
          path="roles" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <RolesPermissions />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="accountant" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'accountant']}>
              <AccountantDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/income-expenses" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'accountant']}>
              <IncomeExpenses />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/loans" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'accountant']}>
              <Loans />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/debts" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'accountant']}>
              <Debts />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/audit" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AuditCompliance />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/logs" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <LogsManagement />
            </ProtectedRoute>
          } 
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <Toaster 
      position="top-right"
      toastOptions={{
        style: {
          background: isDark ? '#1F2833' : '#FFFFFF',
          color: isDark ? '#fff' : '#1E293B',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E2E8F0',
        },
      }}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
          <ThemedToaster />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
