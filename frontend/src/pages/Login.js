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
      await login(email, password);
      toast.success('Login successful');
      navigate('/dashboard');
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
        <div className="absolute inset-0 bg-[#0B0C10]/80 backdrop-blur-sm" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-center">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-12 h-12 text-[#66FCF1]" />
            <span className="text-4xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
              FX Broker
            </span>
          </div>
          <h1 className="text-5xl font-bold uppercase tracking-tight text-white mb-4" style={{ fontFamily: 'Barlow Condensed' }}>
            Back-Office Portal
          </h1>
          <p className="text-[#C5C6C7] text-lg max-w-md">
            Comprehensive account management system for FX brokerage operations
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#0B0C10]">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <TrendingUp className="w-10 h-10 text-[#66FCF1]" />
            <span className="text-3xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'Barlow Condensed' }}>
              FX Broker
            </span>
          </div>

          <div className="bg-[#1F2833] rounded-sm border border-white/5 p-8">
            <h2 className="text-3xl font-bold uppercase tracking-tight text-white mb-2" style={{ fontFamily: 'Barlow Condensed' }}>
              Sign In
            </h2>
            <p className="text-[#C5C6C7] mb-8">
              Access your back-office dashboard
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C5C6C7]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@fxbroker.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-[#0B0C10] border-white/10 text-white placeholder:text-white/20 focus:border-[#66FCF1] focus:ring-[#66FCF1] font-mono"
                    data-testid="login-email-input"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#C5C6C7] text-xs uppercase tracking-wider">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C5C6C7]" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-[#0B0C10] border-white/10 text-white placeholder:text-white/20 focus:border-[#66FCF1] focus:ring-[#66FCF1]"
                    data-testid="login-password-input"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#66FCF1] text-[#0B0C10] hover:bg-[#45A29E] font-bold uppercase tracking-wider rounded-sm glow-cyan glow-cyan-hover"
                data-testid="login-submit-btn"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#1F2833] px-4 text-[#C5C6C7]">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={loginWithGoogle}
              className="w-full bg-transparent border-[#66FCF1] text-[#66FCF1] hover:bg-[#66FCF1]/10 font-medium uppercase tracking-wider rounded-sm"
              data-testid="google-login-btn"
            >
              <Chrome className="w-4 h-4 mr-2" />
              Sign in with Google
            </Button>

            <p className="mt-6 text-center text-xs text-[#C5C6C7]">
              Demo credentials: admin@fxbroker.com / admin123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
