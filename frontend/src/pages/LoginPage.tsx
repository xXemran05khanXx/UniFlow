import { AlertCircle, Eye, EyeOff, GraduationCap } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AccountLockWarning from '../components/AccountLockWarning';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useNotifications } from '../contexts/NotificationContext';
import { useToast } from '../contexts/ToastContext';
import { useAppDispatch } from '../hooks/redux';
import { useAuth } from '../hooks/useAuth';
import { loginUser } from '../store/authSlice';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<Date | null>(null);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();
  const { addToast } = useToast();

  React.useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  React.useEffect(() => {
    const remembered = localStorage.getItem('rememberedEmail');
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      const result = await dispatch(loginUser({ email, password })).unwrap();

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      const role = result.user?.role || 'student';
      switch (role) {
        case 'admin':
          navigate('/dashboard', { replace: true });
          break;
        case 'teacher':
          navigate('/dashboard', { replace: true });
          break;
        default:
          navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      const errorData = err?.response?.data?.error?.data;
      if (errorData) {
        setFailedAttempts(errorData.failedAttempts || 0);
        setLockUntil(errorData.lockUntil ? new Date(errorData.lockUntil) : null);
      }

      let errorText = '';

      if (typeof err === 'string') {
        errorText = err;
      } else if (err?.response?.data?.error) {
        errorText = err.response.data.error;
      } else if (err?.response?.data?.message) {
        errorText = err.response.data.message;
      } else if (err?.message) {
        errorText = err.message;
      } else {
        errorText = String(err);
      }

      let friendly = 'Login failed. Please check your credentials.';
      let errorTitle = 'Login Failed';
      const lower = errorText.toLowerCase();

      if (lower.includes('locked') || lower.includes('try again')) {
        errorTitle = 'Account Locked';
        friendly = errorText || 'Your account is temporarily locked. Please try again later.';
      } else if (lower.includes('invalid credentials')) {
        errorTitle = 'Invalid Credentials';
        friendly = 'Invalid email or password. Please try again.';
      } else if (lower.includes('user not found') || lower.includes('no user')) {
        errorTitle = 'User Not Found';
        friendly = 'No account found with that email. Please register first.';
      } else if (lower.includes('network') || lower.includes('timeout')) {
        errorTitle = 'Network Error';
        friendly = 'Network error. Please check your connection and try again.';
      } else if (errorText) {
        friendly = errorText;
      }

      setError(friendly);
      try {
        addToast({ title: errorTitle, message: friendly, type: 'error', duration: 6000 });
      } catch {
        // no-op
      }

      try {
        addNotification({ type: 'general', title: errorTitle, message: friendly, timestamp: new Date(), read: false });
      } catch {
        // no-op
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:flex-1 flex-col items-center justify-center bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 px-12 py-16 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
        <div className="relative z-10 max-w-sm text-center text-white">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm mb-6 shadow-lg">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">UniFlow</h1>
          <p className="text-lg text-primary-100 font-medium mb-8">Academic Suite</p>
          <div className="space-y-4 text-left">
            {[
              { title: 'Smart Timetabling', desc: 'AI-powered conflict-free schedule generation' },
              { title: 'Swap & Absence Management', desc: 'Seamless teacher substitution workflows' },
              { title: 'Role-Based Access', desc: 'Tailored views for admin, teacher & student' },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary-200 mt-2 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">{feature.title}</p>
                  <p className="text-xs text-primary-200">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-secondary-50 px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary-600 mb-3">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-primary-600">UniFlow</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-secondary-100 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-secondary-900">Welcome back</h2>
              <p className="text-sm text-secondary-500 mt-1">
                Sign in to your account to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <AccountLockWarning
                failedAttempts={failedAttempts}
                lockUntil={lockUntil}
                maxAttempts={5}
              />

              {error && (
                <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                autoComplete="email"
                required
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-[2.15rem] text-secondary-400 hover:text-secondary-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <span className="text-sm text-secondary-600">Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full mt-2"
                isLoading={isLoading}
              >
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-secondary-500">
              Don&apos;t have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
