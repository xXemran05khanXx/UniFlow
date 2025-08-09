import React, { useState } from 'react';
import { Camera, User, GraduationCap, Shield, Eye, EyeOff, Save, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors: string[] = [];

    if (!currentPassword) {
      validationErrors.push('Current password is required');
    }
    if (!newPassword) {
      validationErrors.push('New password is required');
    }
    if (newPassword.length < 6) {
      validationErrors.push('New password must be at least 6 characters long');
    }
    if (newPassword !== confirmPassword) {
      validationErrors.push('New passwords do not match');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    onSubmit(currentPassword, newPassword);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors([]);
    onClose();
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Change Password</h3>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
              title="Close modal"
              aria-label="Close password change modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {errors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <ul className="text-sm text-red-600 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
              >
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const StudentProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [mobileNumber, setMobileNumber] = useState('9876543210');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isMobileEditing, setIsMobileEditing] = useState(false);
  const [tempMobileNumber, setTempMobileNumber] = useState(mobileNumber);

  // Sample student data - in real app, this would come from API
  const studentData = {
    name: user?.name || 'John Doe',
    rollNumber: '21COMPA055',
    email: user?.email || 'john.doe@college.edu',
    department: 'Computer Engineering',
    currentYear: 'Third Year',
    currentSemester: 'Semester 5',
    division: 'A',
    admissionYear: '2022'
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleProfilePictureUpload = () => {
    // In a real app, this would open a file picker
    alert('Profile picture upload functionality would be implemented here');
  };

  const handlePasswordChange = (currentPassword: string, newPassword: string) => {
    // In a real app, this would make an API call
    console.log('Password change request:', { currentPassword, newPassword });
    alert('Password updated successfully!');
  };

  const handleMobileSave = () => {
    if (tempMobileNumber.length !== 10 || !/^\d+$/.test(tempMobileNumber)) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }
    setMobileNumber(tempMobileNumber);
    setIsMobileEditing(false);
    alert('Mobile number updated successfully!');
  };

  const handleMobileCancel = () => {
    setTempMobileNumber(mobileNumber);
    setIsMobileEditing(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            
            {/* Profile Picture */}
            <div className="relative group">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {getInitials(studentData.name)}
              </div>
              <button
                onClick={handleProfilePictureUpload}
                className="absolute bottom-2 right-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-blue-600 hover:shadow-xl transition-all duration-200 group-hover:scale-110"
                title="Upload profile picture"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>

            {/* Student Info */}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {studentData.name}
              </h1>
              <p className="text-xl text-gray-600 mb-4">
                Roll No: {studentData.rollNumber}
              </p>
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-blue-700 font-medium">
                <GraduationCap className="h-5 w-5 mr-2" />
                {studentData.department}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Academic Information Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 ml-4">Academic Details</h2>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Department:</span>
                <span className="text-gray-900 font-semibold">{studentData.department}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Current Year:</span>
                <span className="text-gray-900 font-semibold">{studentData.currentYear}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Current Semester:</span>
                <span className="text-gray-900 font-semibold">{studentData.currentSemester}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Division:</span>
                <span className="text-gray-900 font-semibold">{studentData.division}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600 font-medium">Admission Year:</span>
                <span className="text-gray-900 font-semibold">{studentData.admissionYear}</span>
              </div>
            </div>
          </div>

          {/* Account Management Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 ml-4">Account & Security</h2>
            </div>

            <div className="space-y-6">
              
              {/* Email Address (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={studentData.email}
                  disabled
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed"
                  title="Email address (read-only)"
                  aria-label="Email address"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email address cannot be changed as it's your login identifier
                </p>
              </div>

              {/* Mobile Number (Editable) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={isMobileEditing ? tempMobileNumber : mobileNumber}
                    onChange={(e) => setTempMobileNumber(e.target.value)}
                    disabled={!isMobileEditing}
                    className={`flex-1 px-4 py-3 border rounded-lg transition-all duration-200 ${
                      isMobileEditing
                        ? 'border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                    placeholder="Enter mobile number"
                  />
                  <div className="flex space-x-2">
                    {isMobileEditing ? (
                      <>
                        <button
                          onClick={handleMobileSave}
                          className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center"
                          title="Save changes"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleMobileCancel}
                          className="px-4 py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-all duration-200 flex items-center"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsMobileEditing(true)}
                        className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center"
                        title="Edit mobile number"
                      >
                        <User className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Change Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Security Settings
                </label>
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium flex items-center justify-center space-x-2"
                >
                  <Shield className="h-5 w-5" />
                  <span>Change Password</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Modal */}
        <PasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          onSubmit={handlePasswordChange}
        />
      </div>
    </div>
  );
};

export default StudentProfilePage;
