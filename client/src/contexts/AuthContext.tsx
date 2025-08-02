import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
  email: string;
  username: string;
  department?: string;
  isAvailable?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (role: 'student' | 'teacher' | 'admin') => void;
  setUser: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);

  const login = (role: 'student' | 'teacher' | 'admin') => {
    // This will be called after successful API authentication
    // The actual user data will be set via setUser from the LoginForm
  };

  const setUser = (userData: User) => {
    setUserState(userData);
  };

  const logout = () => {
    setUserState(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, login, setUser, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
