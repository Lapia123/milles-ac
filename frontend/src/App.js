import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Transactions from "./pages/Transactions";
import Treasury from "./pages/Treasury";
import PSPs from "./pages/PSPs";
import Vendors from "./pages/Vendors";
import VendorDashboard from "./pages/VendorDashboard";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import AccountantDashboard from "./pages/AccountantDashboard";
import IncomeExpenses from "./pages/IncomeExpenses";
import Loans from "./pages/Loans";
import Debts from "./pages/Debts";
import Reconciliation from "./pages/Reconciliation";
import AuditCompliance from "./pages/AuditCompliance";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex items-center justify-center">
        <div className="text-[#66FCF1] text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
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
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="treasury" element={<Treasury />} />
        <Route path="psp" element={<PSPs />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="vendor-portal" element={<VendorDashboard />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reconciliation" element={<Reconciliation />} />
        <Route path="settings" element={<Settings />} />
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
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#1F2833',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
