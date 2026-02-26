import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { TrendingUp, Mail, Lock, Chrome } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userData = await login(email, password);
      toast.success('Login successful');
      // Redirect based on role
      if (userData?.role === 'vendor') {
        navigate('/exchanger-portal');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
        style={{ 
          backgroundImage: 'url(https://images.pexels.com/photos/30766684/pexels-photo-30766684.png?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)'
        }}
      >
        <div className="absolute inset-0 bg-blue-900/80 backdrop-blur-sm" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-center">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-12 h-12 text-white" />
            <span className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
              Miles Capitals
            </span>
          </div>
          <h1 className="text-5xl font-bold uppercase tracking-tight text-white mb-4" style={{ fontFamily: 'Barlow Condensed' }}>
            Back-Office Portal
          </h1>
          <p className="text-blue-100 text-lg max-w-md">
            Comprehensive account management system for FX brokerage operations
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <TrendingUp className="w-10 h-10 text-blue-600" />
            <span className="text-3xl font-bold uppercase tracking-tight text-slate-800" style={{ fontFamily: 'Barlow Condensed' }}>
              Miles Capitals
            </span>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm">
            <h2 className="text-3xl font-bold uppercase tracking-tight text-slate-800 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>
              Sign In
            </h2>
            <p className="text-slate-500 mb-8">
              Access your back-office dashboard
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-600 text-xs uppercase tracking-wider">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@fxbroker.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 font-mono"
                    data-testid="login-email-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-600 text-xs uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                    data-testid="login-password-input"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 font-bold uppercase tracking-wider rounded-lg shadow-sm"
                data-testid="login-submit-btn"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-slate-500">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={loginWithGoogle}
              className="w-full bg-transparent border-blue-600 text-blue-600 hover:bg-blue-50 font-medium uppercase tracking-wider rounded-lg"
              data-testid="google-login-btn"
            >
              <Chrome className="w-4 h-4 mr-2" />
              Sign in with Google
            </Button>

            <p className="mt-6 text-center text-xs text-slate-500">
              Demo credentials: admin@fxbroker.com / password
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
