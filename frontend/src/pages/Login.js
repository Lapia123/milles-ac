import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { TrendingUp, Mail, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const { login, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result?.requires_2fa) {
        setOtpStep(true);
        setOtpEmail(email);
        setOtpMessage(result.message || 'Verification code sent to your email');
        toast.success(result.message || 'Check your email for the verification code');
      } else {
        toast.success('Login successful');
        if (result?.role === 'vendor') {
          navigate('/exchanger-portal');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userData = await verifyOtp(otpEmail, otpCode);
      toast.success('Login successful');
      if (userData?.role === 'vendor') {
        navigate('/exchanger-portal');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.message || 'Verification failed');
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
            {!otpStep ? (
              <>
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
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold uppercase tracking-tight text-slate-800 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>
                  Verify Identity
                </h2>
                <p className="text-slate-500 mb-2">
                  {otpMessage}
                </p>
                <p className="text-xs text-slate-400 mb-6">
                  Code expires in 5 minutes. 3 attempts max.
                </p>

                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-slate-600 text-xs uppercase tracking-wider">
                      Verification Code
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-2xl tracking-[0.5em] font-mono bg-slate-50 border-slate-200 text-slate-800"
                      data-testid="otp-input"
                      maxLength={6}
                      autoFocus
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    className="w-full bg-blue-600 text-white hover:bg-blue-700 font-bold uppercase tracking-wider rounded-lg shadow-sm"
                    data-testid="otp-submit-btn"
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-slate-500"
                    onClick={() => { setOtpStep(false); setOtpCode(''); }}
                  >
                    Back to Login
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
