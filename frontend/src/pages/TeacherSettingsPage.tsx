import React, { useState } from 'react';
import {
  User,
  Clock,
  Bell,
  Calendar,
  Mail,
  Phone,
  Building2,
  Badge,
  Save,
  Edit3,
  CheckCircle,
  AlertCircle,
  Settings as SettingsIcon,
  UserCircle
} from 'lucide-react';

// Types for settings data
interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  employeeId: string;
  designation: string;
  joiningDate: string;
  subjects: string[];
}

interface AvailabilitySlot {
  day: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  swapRequests: boolean;
  timetableUpdates: boolean;
  reminderNotifications: boolean;
}

const TeacherSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'availability' | 'notifications'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Sample data - replace with actual API calls
  const [profile, setProfile] = useState<TeacherProfile>({
    id: 'teacher-001',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@university.edu',
    phone: '+1 (555) 123-4567',
    department: 'Computer Science',
    employeeId: 'CSE-001',
    designation: 'Associate Professor',
    joiningDate: '2020-09-01',
    subjects: ['Data Structures', 'Algorithms', 'Database Systems', 'Software Engineering']
  });

  const [availability, setAvailability] = useState<AvailabilitySlot[]>([
    { day: 'Monday', startTime: '09:00', endTime: '17:00', isAvailable: true },
    { day: 'Tuesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
    { day: 'Wednesday', startTime: '09:00', endTime: '17:00', isAvailable: true },
    { day: 'Thursday', startTime: '09:00', endTime: '17:00', isAvailable: true },
    { day: 'Friday', startTime: '09:00', endTime: '17:00', isAvailable: true },
    { day: 'Saturday', startTime: '09:00', endTime: '13:00', isAvailable: false },
    { day: 'Sunday', startTime: '09:00', endTime: '13:00', isAvailable: false }
  ]);

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    inApp: true,
    email: true,
    sms: false,
    swapRequests: true,
    timetableUpdates: true,
    reminderNotifications: true
  });

  const handleProfileUpdate = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setIsEditing(false);
    setSuccessMessage('Profile updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleAvailabilityUpdate = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setSuccessMessage('Availability updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleNotificationUpdate = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setSuccessMessage('Notification preferences updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const updateAvailability = (index: number, field: keyof AvailabilitySlot, value: any) => {
    const updated = [...availability];
    updated[index] = { ...updated[index], [field]: value };
    setAvailability(updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-4">
            <SettingsIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
            Teacher Settings
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Manage your personal information, availability, and notification preferences
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <span className="text-green-800 font-medium">{successMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 mb-8 overflow-hidden">
          <div className="border-b border-gray-200/50">
            <nav className="-mb-px flex space-x-8 px-8 bg-gradient-to-r from-gray-50/50 to-white/50">
              {[
                { id: 'profile', label: 'Profile Information', icon: UserCircle },
                { id: 'availability', label: 'Availability Schedule', icon: Clock },
                { id: 'notifications', label: 'Notification Preferences', icon: Bell }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`group flex items-center py-6 px-1 border-b-3 font-semibold text-sm transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'border-gradient-to-r from-indigo-500 to-purple-500 text-indigo-600 transform scale-105'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:transform hover:scale-102'
                    }`}
                  >
                    <div className={`p-2 rounded-lg mr-3 transition-all duration-300 ${
                      activeTab === tab.id 
                        ? 'bg-gradient-to-r from-indigo-100 to-purple-100' 
                        : 'group-hover:bg-gray-100'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8 bg-gradient-to-br from-white/50 to-gray-50/30">
            
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <Edit3 className="h-4 w-4" />
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleProfileUpdate}
                        disabled={loading}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-xl flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50"
                      >
                        <Save className="h-4 w-4" />
                        <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Profile Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Basic Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <User className="h-5 w-5 mr-2 text-indigo-600" />
                        Basic Information
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={profile.name}
                              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                              placeholder="Enter your full name"
                              className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            />
                          ) : (
                            <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 font-medium">{profile.name}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                          {isEditing ? (
                            <input
                              type="email"
                              value={profile.email}
                              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                              placeholder="Enter your email address"
                              className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            />
                          ) : (
                            <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 font-medium flex items-center">
                              <Mail className="h-4 w-4 mr-2 text-gray-500" />
                              {profile.email}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                          {isEditing ? (
                            <input
                              type="tel"
                              value={profile.phone}
                              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                              placeholder="Enter your phone number"
                              className="w-full px-4 py-3 bg-white/70 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            />
                          ) : (
                            <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 font-medium flex items-center">
                              <Phone className="h-4 w-4 mr-2 text-gray-500" />
                              {profile.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Professional Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Building2 className="h-5 w-5 mr-2 text-indigo-600" />
                        Professional Information
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                          <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 font-medium flex items-center">
                            <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                            {profile.department}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                          <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 font-medium flex items-center">
                            <Badge className="h-4 w-4 mr-2 text-gray-500" />
                            {profile.employeeId}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                          <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 font-medium">{profile.designation}</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date</label>
                          <p className="px-4 py-3 bg-gray-50 rounded-xl text-gray-900 font-medium flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                            {new Date(profile.joiningDate).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subjects */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Subjects</h3>
                    <div className="flex flex-wrap gap-3">
                      {profile.subjects.map((subject, index) => (
                        <span
                          key={index}
                          className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 rounded-full text-sm font-medium"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Availability Tab */}
            {activeTab === 'availability' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Availability Schedule</h2>
                  <button
                    onClick={handleAvailabilityUpdate}
                    disabled={loading}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-xl flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Saving...' : 'Update Availability'}</span>
                  </button>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg">
                  <div className="mb-6">
                    <div className="flex items-center mb-4">
                      <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                      <span className="text-sm text-gray-600">
                        Set your preferred working hours for each day. This will be used for future timetable generation.
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {availability.map((slot, index) => (
                      <div key={slot.day} className="flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-indigo-300 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-24">
                            <span className="font-semibold text-gray-900">{slot.day}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={slot.isAvailable}
                                onChange={(e) => updateAvailability(index, 'isAvailable', e.target.checked)}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Available</span>
                            </label>
                          </div>
                        </div>

                        {slot.isAvailable && (
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <label htmlFor={`start-time-${slot.day}-${index}`} className="text-sm text-gray-600">From:</label>
                              <input
                                id={`start-time-${slot.day}-${index}`}
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => updateAvailability(index, 'startTime', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Select start time"
                                title={`Set start time for ${slot.day}`}
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <label htmlFor={`end-time-${slot.day}-${index}`} className="text-sm text-gray-600">To:</label>
                              <input
                                id={`end-time-${slot.day}-${index}`}
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => updateAvailability(index, 'endTime', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Select end time"
                                title={`Set end time for ${slot.day}`}
                              />
                            </div>
                          </div>
                        )}

                        {!slot.isAvailable && (
                          <span className="text-sm text-gray-500 italic">Not available</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
                  <button
                    onClick={handleNotificationUpdate}
                    disabled={loading}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-xl flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loading ? 'Saving...' : 'Save Preferences'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Notification Channels */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                      <Bell className="h-5 w-5 mr-2 text-indigo-600" />
                      Notification Channels
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                        <div className="flex items-center">
                          <Bell className="h-5 w-5 text-blue-600 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">In-App Notifications</p>
                            <p className="text-sm text-gray-600">Receive notifications within the application</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            id="in-app-notifications"
                            type="checkbox"
                            checked={notifications.inApp}
                            onChange={(e) => setNotifications({ ...notifications, inApp: e.target.checked })}
                            className="sr-only peer"
                            title="Toggle in-app notifications"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                        <div className="flex items-center">
                          <Mail className="h-5 w-5 text-green-600 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">Email Notifications</p>
                            <p className="text-sm text-gray-600">Receive notifications via email</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            id="email-notifications"
                            type="checkbox"
                            checked={notifications.email}
                            onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                            className="sr-only peer"
                            title="Toggle email notifications"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                        <div className="flex items-center">
                          <Phone className="h-5 w-5 text-purple-600 mr-3" />
                          <div>
                            <p className="font-medium text-gray-900">SMS Notifications</p>
                            <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            id="sms-notifications"
                            type="checkbox"
                            checked={notifications.sms}
                            onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })}
                            className="sr-only peer"
                            title="Toggle SMS notifications"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Notification Types */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2 text-indigo-600" />
                      Notification Types
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900">Swap Requests</p>
                          <p className="text-sm text-gray-600">Get notified about lecture swap requests</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            id="swap-requests-notifications"
                            type="checkbox"
                            checked={notifications.swapRequests}
                            onChange={(e) => setNotifications({ ...notifications, swapRequests: e.target.checked })}
                            className="sr-only peer"
                            title="Toggle swap request notifications"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900">Timetable Updates</p>
                          <p className="text-sm text-gray-600">Get notified about timetable changes</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            id="timetable-updates-notifications"
                            type="checkbox"
                            checked={notifications.timetableUpdates}
                            onChange={(e) => setNotifications({ ...notifications, timetableUpdates: e.target.checked })}
                            className="sr-only peer"
                            title="Toggle timetable update notifications"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl">
                        <div>
                          <p className="font-medium text-gray-900">Class Reminders</p>
                          <p className="text-sm text-gray-600">Get reminded about upcoming classes</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            id="class-reminders-notifications"
                            type="checkbox"
                            checked={notifications.reminderNotifications}
                            onChange={(e) => setNotifications({ ...notifications, reminderNotifications: e.target.checked })}
                            className="sr-only peer"
                            title="Toggle class reminder notifications"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherSettingsPage;
