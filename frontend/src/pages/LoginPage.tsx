import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../hooks/redux';
import { loginUser } from '../store/authSlice';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { useNotifications } from '../contexts/NotificationContext';
import { useToast } from '../contexts/ToastContext';
import AccountLockWarning from '../components/AccountLockWarning';
import { Eye, EyeOff, LogIn } from 'lucide-react';

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
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🚀 Form submitted, prevented default');
    
    setError('');

    if (!email || !password) {
      const errorMsg = 'Please fill in all fields';
      setError(errorMsg);
      addToast({ title: "Validation Error", message: errorMsg, type: "error" });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const errorMsg = 'Please enter a valid email address';
      setError(errorMsg);
      addToast({ title: "Validation Error", message: errorMsg, type: "error" });
      return;
    }

    console.log('📝 Validation passed, attempting login...');

    try {
      console.log('Attempting login with:', { email, password });
      const result = await dispatch(loginUser({ email, password })).unwrap();
      console.log('Login successful, result:', result);
      // Don't navigate immediately - let Redux handle it via useEffect
      
      // Save email if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      // Redirect based on user role
      const userRole = result.user?.role || 'student';
      console.log('User role:', userRole, 'Navigating to dashboard...');
      switch (userRole) {
        case 'admin':
          navigate('/dashboard?view=admin', { replace: true });
          break;
        case 'teacher':
          navigate('/dashboard?view=teacher', { replace: true });
          break;
        case 'student':
          navigate('/dashboard?view=student', { replace: true });
          break;
        default:
          navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      console.log('⚠️ Entered catch block');
      console.error('=== Login Error Caught ===');
      console.error('Full error object:', err);
      console.error('Error type:', typeof err);
      console.error('Error.message:', err?.message);
      console.error('Error.response:', err?.response);
      console.error('Error.response.data:', err?.response?.data);
      
      // Extract lock/attempt data from error response
      const errorData = err?.response?.data?.error?.data;
      if (errorData) {
        setFailedAttempts(errorData.failedAttempts || 0);
        setLockUntil(errorData.lockUntil ? new Date(errorData.lockUntil) : null);
      }
      
      // Extract error message from various possible formats
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
      
      console.log('Extracted error text:', errorText);
      
      let friendly = 'Login failed. Please check your credentials.';
      let errorTitle = 'Login Failed';

      const lowerError = errorText.toLowerCase();

      // Handle different error types
      if (lowerError.includes('locked') || lowerError.includes('try again')) {
        errorTitle = 'Account Locked';
        friendly = errorText || 'Your account is temporarily locked due to too many failed login attempts. Please try again later.';
      } else if (lowerError.includes('invalid credentials')) {
        errorTitle = 'Invalid Credentials';
        friendly = 'Invalid email or password. Please check your credentials and try again.';
      } else if (lowerError.includes('user not found') || lowerError.includes('no user')) {
        errorTitle = 'User Not Found';
        friendly = 'No account found with that email. Please register first.';
      } else if (lowerError.includes('network') || lowerError.includes('timeout')) {
        errorTitle = 'Network Error';
        friendly = 'Network error. Please check your connection and try again.';
      } else if (errorText) {
        friendly = errorText;
      }

      console.log('Setting error state to:', friendly);
      setError(friendly);
      
      console.log('Calling addToast with:', { title: errorTitle, message: friendly, type: 'error' });
      
      // Show toast notification
      try {
        addToast({
          title: errorTitle,
          message: friendly,
          type: 'error',
          duration: 6000
        });
        console.log('✅ Toast added successfully');
      } catch (toastErr) {
        console.error('❌ Failed to add toast:', toastErr);
      }

      try {
        addNotification({
          type: 'general',
          title: errorTitle,
          message: friendly,
          timestamp: new Date(),
          read: false,
        });
      } catch (notifyErr) {
        console.warn('Notification failed:', notifyErr);
      }
    }
  };

  // Load remembered email on component mount
  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">UniFlow</h1>
          <h2 className="mt-6 text-2xl font-semibold text-secondary-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-secondary-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-500 font-medium">
              Sign up
            </Link>
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Lock Warning */}
            <AccountLockWarning 
              failedAttempts={failedAttempts}
              lockUntil={lockUntil}
              maxAttempts={5}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="text-primary-600 hover:text-primary-500">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full flex items-center justify-center"
              isLoading={isLoading}
            >
              <LogIn className="h-5 w-5 mr-2" />
              Sign In
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
