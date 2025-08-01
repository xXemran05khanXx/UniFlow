import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AppSettings {
  theme: 'light' | 'dark';
  language: 'en' | 'es' | 'fr';
  timeFormat: '12h' | '24h';
  defaultView: 'week' | 'month' | 'day';
  notifications: boolean;
}

interface AppContextType {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'light',
  language: 'en',
  timeFormat: '12h',
  defaultView: 'week',
  notifications: true,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      } catch (error) {
        console.error('Error parsing saved settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
  }, [settings]);

  // Load user-specific preferences if available
  useEffect(() => {
    if (user) {
      const userSettingsKey = `appSettings_${user._id}`;
      const userSettings = localStorage.getItem(userSettingsKey);
      if (userSettings) {
        try {
          const parsedSettings = JSON.parse(userSettings);
          setSettings({ ...defaultSettings, ...parsedSettings });
        } catch (error) {
          console.error('Error parsing user settings:', error);
        }
      }
    }
  }, [user]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Save user-specific settings if user is logged in
      if (user) {
        const userSettingsKey = `appSettings_${user._id}`;
        localStorage.setItem(userSettingsKey, JSON.stringify(updated));
      }
      
      return updated;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('appSettings');
    if (user) {
      localStorage.removeItem(`appSettings_${user._id}`);
    }
  };

  const value: AppContextType = {
    settings,
    updateSettings,
    resetSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
