import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { GraduationCap, ArrowLeft, Eye, EyeOff } from "lucide-react";
import DefaultCredentials from "./DefaultCredentials";

interface LoginFormProps {
  role: 'student' | 'teacher' | 'admin';
  onBack: () => void;
  onClose: () => void;
}

export default function LoginForm({ role, onBack, onClose }: LoginFormProps) {
  const { setUser } = useAuth();
  const [credentials, setCredentials] = useState({
    identifier: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const roleConfig = {
    student: {
      title: 'Student Login',
      placeholder: 'Student ID or Email',
      color: 'blue'
    },
    teacher: {
      title: 'Teacher Login', 
      placeholder: 'Employee ID or Email',
      color: 'violet'
    },
    admin: {
      title: 'Administrator Login',
      placeholder: 'Admin ID or Email', 
      color: 'emerald'
    }
  };

  const config = roleConfig[role];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: credentials.identifier,
          password: credentials.password,
          role: role
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Login successful - update the auth context with real user data
        setUser(data.user);
        onClose();
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (error) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700'
    },
    violet: {
      bg: 'bg-violet-50', 
      border: 'border-violet-200',
      text: 'text-violet-700',
      button: 'bg-violet-600 hover:bg-violet-700'
    },
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200', 
      text: 'text-emerald-700',
      button: 'bg-emerald-600 hover:bg-emerald-700'
    }
  };

  const colors = colorClasses[config.color as keyof typeof colorClasses];

  return (
    <div className="max-w-md w-full">
      <Card className={`${colors.bg} ${colors.border} border-2`}>
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="text-white text-2xl" />
          </div>
          <CardTitle className={`text-2xl font-bold ${colors.text}`}>
            {config.title}
          </CardTitle>
          <p className="text-gray-600">Enter your credentials to continue</p>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-gray-700">
                {config.placeholder}
              </Label>
              <Input
                id="identifier"
                type="text"
                placeholder={config.placeholder}
                value={credentials.identifier}
                onChange={(e) => setCredentials(prev => ({
                  ...prev,
                  identifier: e.target.value
                }))}
                className="border-gray-300 focus:border-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({
                    ...prev,
                    password: e.target.value
                  }))}
                  className="border-gray-300 focus:border-primary pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <Button
              type="submit"
              className={`w-full ${colors.button} text-white font-semibold py-2.5 transition-all duration-200`}
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="link"
              className="text-primary hover:text-blue-600 text-sm"
            >
              Forgot Password?
            </Button>
          </div>

          <DefaultCredentials role={role} />

          <div className="flex space-x-2">
            <Button
              onClick={onBack}
              variant="outline"
              className="flex-1 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              className="flex-1 text-gray-500 hover:text-gray-700"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}