import React, { useState, useEffect } from 'react';
import { 
  Settings,
  Database,
  Upload,
  Building,
  AlertTriangle,
  Save,
  FileText,
  Bell,
  Lock,
  RefreshCw,
  Info,
  Monitor,
  Shield
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

interface AdminSettingsProps {}

interface AppConfiguration {
  collegeName: string;
  collegeLogo: string;
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

interface BackupSettings {
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  lastBackupDate: string;
}

const AdminSettingsPage: React.FC<AdminSettingsProps> = () => {
  // State management
  const [activeSection, setActiveSection] = useState<'application' | 'backup'>('application');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Application Configuration State
  const [appConfig, setAppConfig] = useState<AppConfiguration>({
    collegeName: 'Your College Name',
    collegeLogo: '',
    enableEmailNotifications: true,
    enableSMSNotifications: false,
    maintenanceMode: false,
    maintenanceMessage: 'System is under maintenance. Please check back later.'
  });

  // Backup Settings State
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    autoBackupEnabled: true,
    backupFrequency: 'weekly',
    retentionDays: 30,
    lastBackupDate: '2025-01-01'
  });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // TODO: Load settings from API
      // const response = await adminAPI.getSettings();
      // if (response.success) {
      //   setAcademicSettings(response.data.academic);
      //   setTimetableRules(response.data.timetable);
      //   setAppConfig(response.data.application);
      //   setBackupSettings(response.data.backup);
      // }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      
      // TODO: Save settings to API
      // const response = await adminAPI.saveSettings({
      //   application: appConfig,
      //   backup: backupSettings
      // });
      // if (response.success) {
      setMessage({ type: 'success', text: 'Settings saved successfully' });
      setUnsavedChanges(false);
      // }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAppConfig(prev => ({
          ...prev,
          collegeLogo: e.target?.result as string
        }));
        setUnsavedChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const createBackup = async () => {
    try {
      setLoading(true);
      // TODO: Create backup via API
      // const response = await adminAPI.createBackup();
      // if (response.success) {
      setMessage({ type: 'success', text: 'Backup created successfully' });
      setBackupSettings(prev => ({
        ...prev,
        lastBackupDate: new Date().toISOString().split('T')[0]
      }));
      // }
    } catch (error) {
      console.error('Error creating backup:', error);
      setMessage({ type: 'error', text: 'Failed to create backup' });
    } finally {
      setLoading(false);
    }
  };

  const handleSectionClick = (section: 'application' | 'backup') => {
    setActiveSection(section);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl mr-4">
                  <Settings className="h-8 w-8 text-white" />
                </div>
                Admin Settings
              </h1>
              <p className="text-gray-600 mt-3 text-lg">Manage system configuration and application settings</p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={loadSettings}
                disabled={loading}
                className="flex items-center border-gray-300 hover:border-gray-400 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Reload
              </Button>
              <Button
                onClick={saveSettings}
                disabled={loading || !unsavedChanges}
                className="flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg transition-all"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>

          {/* Unsaved changes warning */}
          {unsavedChanges && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                <span className="text-yellow-800">You have unsaved changes</span>
              </div>
            </div>
          )}

          {/* Message display */}
          {message && (
            <div className={`mt-4 p-3 rounded-md ${
              message.type === 'success' ? 'bg-green-50 border border-green-200' :
              message.type === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center">
                {message.type === 'success' && <Save className="h-5 w-5 text-green-400 mr-2" />}
                {message.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />}
                {message.type === 'info' && <Info className="h-5 w-5 text-blue-400 mr-2" />}
                <span className={
                  message.type === 'success' ? 'text-green-800' :
                  message.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }>{message.text}</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-4">
            <Card className="p-6 shadow-lg border-0 bg-white/70 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Settings Categories</h3>
              <nav className="space-y-3">
                {[
                  { 
                    id: 'application', 
                    title: 'Application Configuration', 
                    icon: Building, 
                    description: 'Branding, notifications, and maintenance settings',
                    gradient: 'from-blue-500 to-cyan-500'
                  },
                  { 
                    id: 'backup', 
                    title: 'Data & Backup Operations', 
                    icon: Database, 
                    description: 'Database backups and system maintenance',
                    gradient: 'from-purple-500 to-pink-500'
                  }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSectionClick(item.id as any)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                      activeSection === item.id 
                        ? 'bg-gradient-to-r ' + item.gradient + ' text-white shadow-lg transform scale-105' 
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-2 rounded-lg ${
                        activeSection === item.id ? 'bg-white/20' : 'bg-white'
                      }`}>
                        <item.icon className={`h-6 w-6 ${
                          activeSection === item.id ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${
                          activeSection === item.id ? 'text-white' : 'text-gray-900'
                        }`}>{item.title}</p>
                        <p className={`text-sm mt-1 ${
                          activeSection === item.id ? 'text-white/90' : 'text-gray-500'
                        }`}>{item.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Application Configuration */}
            {activeSection === 'application' && (
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 rounded-t-lg">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <Building className="h-7 w-7 mr-3" />
                    Application & System Configuration
                  </h2>
                  <p className="text-blue-100 mt-2">Manage branding, notifications, and system settings</p>
                </div>
                <div className="p-8 space-y-8">
                  {/* Branding */}
                  <div className="bg-gray-50 p-6 rounded-xl">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <div className="bg-blue-100 p-2 rounded-lg mr-3">
                        <Building className="h-5 w-5 text-blue-600" />
                      </div>
                      Institution Branding
                    </h3>
                    <div className="space-y-6">
                      <Input
                        label="College Name"
                        value={appConfig.collegeName}
                        onChange={(e) => {
                          setAppConfig(prev => ({ ...prev, collegeName: e.target.value }));
                          setUnsavedChanges(true);
                        }}
                        placeholder="Enter your college name"
                        className="text-lg"
                      />
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          College Logo
                        </label>
                        <div className="flex items-center space-x-6">
                          {appConfig.collegeLogo && (
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                              <img
                                src={appConfig.collegeLogo}
                                alt="College Logo"
                                className="h-20 w-20 object-contain"
                              />
                            </div>
                          )}
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                              id="logo-upload"
                            />
                            <label
                              htmlFor="logo-upload"
                              className="cursor-pointer inline-flex items-center px-6 py-3 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            >
                              <Upload className="h-5 w-5 mr-2" />
                              Upload Logo
                            </label>
                            <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 2MB</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div className="bg-gray-50 p-6 rounded-xl">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <div className="bg-green-100 p-2 rounded-lg mr-3">
                        <Bell className="h-5 w-5 text-green-600" />
                      </div>
                      Notification Settings
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900 flex items-center">
                              <Bell className="h-5 w-5 mr-2 text-blue-600" />
                              Email Notifications
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">Send email notifications for system events</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={appConfig.enableEmailNotifications}
                              onChange={(e) => {
                                setAppConfig(prev => ({ ...prev, enableEmailNotifications: e.target.checked }));
                                setUnsavedChanges(true);
                              }}
                              className="sr-only peer"
                              aria-label="Enable email notifications"
                            />
                            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900 flex items-center">
                              <Bell className="h-5 w-5 mr-2 text-green-600" />
                              SMS Notifications
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">Send SMS notifications for urgent events</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={appConfig.enableSMSNotifications}
                              onChange={(e) => {
                                setAppConfig(prev => ({ ...prev, enableSMSNotifications: e.target.checked }));
                                setUnsavedChanges(true);
                              }}
                              className="sr-only peer"
                              aria-label="Enable SMS notifications"
                            />
                            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Maintenance Mode */}
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl border border-red-200">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <div className="bg-red-100 p-2 rounded-lg mr-3">
                        <Lock className="h-5 w-5 text-red-600" />
                      </div>
                      Maintenance Mode
                    </h3>
                    <div className="space-y-6">
                      <div className={`p-6 rounded-xl border-2 transition-all ${
                        appConfig.maintenanceMode 
                          ? 'bg-red-100 border-red-300 shadow-lg' 
                          : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-semibold text-gray-900 flex items-center">
                              <Lock className="h-5 w-5 mr-2 text-red-600" />
                              Enable Maintenance Mode
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">Put the application in maintenance mode</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={appConfig.maintenanceMode}
                              onChange={(e) => {
                                setAppConfig(prev => ({ ...prev, maintenanceMode: e.target.checked }));
                                setUnsavedChanges(true);
                              }}
                              className="sr-only peer"
                              aria-label="Enable maintenance mode"
                            />
                            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                          </label>
                        </div>
                        
                        {appConfig.maintenanceMode && (
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                              Maintenance Message
                            </label>
                            <textarea
                              value={appConfig.maintenanceMessage}
                              onChange={(e) => {
                                setAppConfig(prev => ({ ...prev, maintenanceMessage: e.target.value }));
                                setUnsavedChanges(true);
                              }}
                              rows={4}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                              placeholder="Enter maintenance message for users"
                            />
                          </div>
                        )}
                      </div>

                      {appConfig.maintenanceMode && (
                        <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-xl">
                          <div className="flex items-center">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
                            <span className="text-yellow-800 font-medium">
                              Warning: Maintenance mode will restrict access for all users except administrators
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Data & Backup Operations */}
            {activeSection === 'backup' && (
              <Card className="shadow-lg border-0 bg-white/70 backdrop-blur-sm">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-t-lg">
                  <h2 className="text-2xl font-bold text-white flex items-center">
                    <Database className="h-7 w-7 mr-3" />
                    Data & Backup Operations
                  </h2>
                  <p className="text-purple-100 mt-2">Manage database backups and system maintenance</p>
                </div>
                <div className="p-8 space-y-8">
                  {/* Database Backup */}
                  <div className="bg-gray-50 p-6 rounded-xl">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <div className="bg-purple-100 p-2 rounded-lg mr-3">
                        <Database className="h-5 w-5 text-purple-600" />
                      </div>
                      Database Backup
                    </h3>
                    <div className="grid lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">Auto Backup</h4>
                              <p className="text-sm text-gray-600 mt-1">Automatically create database backups</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={backupSettings.autoBackupEnabled}
                                onChange={(e) => {
                                  setBackupSettings(prev => ({ ...prev, autoBackupEnabled: e.target.checked }));
                                  setUnsavedChanges(true);
                                }}
                                className="sr-only peer"
                                aria-label="Enable automatic backup"
                              />
                              <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                          </div>
                        </div>

                        {backupSettings.autoBackupEnabled && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-3">
                                Backup Frequency
                              </label>
                              <select
                                value={backupSettings.backupFrequency}
                                onChange={(e) => {
                                  setBackupSettings(prev => ({ ...prev, backupFrequency: e.target.value as any }));
                                  setUnsavedChanges(true);
                                }}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                aria-label="Select backup frequency"
                              >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                              </select>
                            </div>

                            <Input
                              label="Retention Days"
                              type="number"
                              min="1"
                              max="365"
                              value={backupSettings.retentionDays}
                              onChange={(e) => {
                                setBackupSettings(prev => ({ ...prev, retentionDays: parseInt(e.target.value) }));
                                setUnsavedChanges(true);
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
                          <h4 className="font-semibold text-blue-900 mb-3">Backup Status</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-blue-700">Last Backup:</span>
                              <span className="text-sm font-medium text-blue-900">
                                {new Date(backupSettings.lastBackupDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-blue-700">Status:</span>
                              <span className="text-sm font-medium text-green-600">Healthy</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={createBackup}
                          disabled={loading}
                          className="w-full flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl shadow-lg transition-all"
                        >
                          <Database className="h-5 w-5 mr-2" />
                          Create Backup Now
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl border border-red-200">
                    <h3 className="text-xl font-semibold text-red-600 mb-6 flex items-center">
                      <div className="bg-red-100 p-2 rounded-lg mr-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      Danger Zone
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm">
                        <h4 className="font-semibold text-red-900 mb-3">Database Restore</h4>
                        <p className="text-sm text-red-700 mb-4">
                          Restore database from a backup file. This action cannot be undone.
                        </p>
                        <Button 
                          variant="outline" 
                          className="w-full text-red-600 border-red-300 hover:bg-red-50 transition-colors"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Restore from Backup
                        </Button>
                      </div>

                      <div className="bg-white p-6 rounded-xl border border-red-200 shadow-sm">
                        <h4 className="font-semibold text-red-900 mb-3">System Logs</h4>
                        <p className="text-sm text-red-700 mb-4">
                          View system logs and critical activities
                        </p>
                        <Button 
                          variant="outline" 
                          className="w-full text-red-600 border-red-300 hover:bg-red-50 transition-colors"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View System Logs
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
