import { AlertCircle, CheckCircle2, Eye, EyeOff, GraduationCap } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAppDispatch } from '../hooks/redux';
import { useAuth } from '../hooks/useAuth';
import { registerUser } from '../store/authSlice';

const DEPARTMENTS = ['Computer Science', 'Information Technology', 'Artificial Intelligence', 'Data Science'];

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'teacher' | 'student',
    department: '',
    semester: '',
    employeeId: '',
    studentId: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.role === 'student' && !formData.studentId) {
      setError('Student ID is required for student accounts');
      return false;
    }

    if (formData.role === 'teacher' && !formData.employeeId) {
      setError('Employee ID is required for teacher accounts');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      await dispatch(registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        department: formData.department || undefined,
        semester: formData.semester ? parseInt(formData.semester) : undefined,
        employeeId: formData.employeeId || undefined,
        studentId: formData.studentId || undefined,
      })).unwrap();

      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err || 'Registration failed. Please try again.');
    }
  };

  const selectClass =
    'w-full px-3 py-2 text-sm border border-secondary-300 rounded-xl text-secondary-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus:border-primary-400 transition-colors duration-150 bg-white';

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:flex-1 flex-col items-center justify-center bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 px-12 py-16 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10 max-w-sm text-center text-white">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm mb-6 shadow-lg">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">UniFlow</h1>
          <p className="text-lg text-primary-100 font-medium mb-8">Academic Suite</p>
          <p className="text-primary-200 text-sm leading-relaxed">
            Join your university's academic management platform. Access timetables, manage swaps,
            and stay on top of your schedule.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center bg-secondary-50 px-4 py-12 sm:px-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary-600 mb-3">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-primary-600">UniFlow</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-secondary-100 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-secondary-900">Create your account</h2>
              <p className="text-sm text-secondary-500 mt-1">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                  Sign in
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700">{success}</p>
                </div>
              )}

              <Input
                label="Full Name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Your full name"
                autoComplete="name"
                required
              />

              <Input
                label="Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@university.edu"
                autoComplete="email"
                required
              />

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                  Role
                </label>
                <select name="role" value={formData.role} onChange={handleInputChange} className={selectClass} required>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                  Department
                </label>
                <select name="department" value={formData.department} onChange={handleInputChange} className={selectClass}>
                  <option value="">Select department (optional)</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {formData.role === 'student' && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Student ID"
                    type="text"
                    name="studentId"
                    value={formData.studentId}
                    onChange={handleInputChange}
                    placeholder="e.g., STU2024001"
                    required
                  />
                  <Input
                    label="Semester"
                    type="number"
                    name="semester"
                    value={formData.semester}
                    onChange={handleInputChange}
                    placeholder="1-8"
                    min="1"
                    max="8"
                  />
                </div>
              )}

              {formData.role === 'teacher' && (
                <Input
                  label="Employee ID"
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  placeholder="e.g., EMP001"
                  required
                />
              )}

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-[2.15rem] text-secondary-400 hover:text-secondary-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-[2.15rem] text-secondary-400 hover:text-secondary-600 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button type="submit" size="lg" className="w-full mt-2" isLoading={isLoading}>
                Create Account
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
