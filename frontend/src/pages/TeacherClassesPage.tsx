import React, { useState, useEffect } from 'react';
// import { useAuth } from '../hooks/useAuth'; // Commented out due to ID issue
import { 
  Calendar, 
  Clock, 
  Users, 
  ArrowLeftRight, 
  Send, 
  Check, 
  X, 
  Eye, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';

// Types for our data structures
interface ClassSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  courseName: string;
  courseCode: string;
  studentGroup: string;
  room: string;
  type: 'lecture' | 'lab';
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface SwapRequest {
  id: string;
  fromSession: ClassSession;
  toSlot: {
    date: string;
    startTime: string;
    endTime: string;
    room: string;
  };
  targetTeacher?: string;
  swapType: 'move' | 'swap';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  message?: string;
  createdAt: string;
  requestedBy: string;
  requestedTo?: string;
}

const TeacherClassesPage: React.FC = () => {
  // const { user } = useAuth(); // Commented out due to ID issue
  const [activeTab, setActiveTab] = useState<'classes' | 'sent' | 'received' | 'history'>('classes');
  const [upcomingClasses, setUpcomingClasses] = useState<ClassSession[]>([]);
  const [sentRequests, setSentRequests] = useState<SwapRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<SwapRequest[]>([]);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Sample data - replace with actual API calls
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Sample upcoming classes
      const mockClasses: ClassSession[] = [
        {
          id: '1',
          date: '2025-08-12',
          startTime: '09:00',
          endTime: '10:30',
          courseName: 'Data Structures and Algorithms',
          courseCode: 'CS-301',
          studentGroup: 'CS-3A',
          room: 'Room 201',
          type: 'lecture',
          status: 'scheduled'
        },
        {
          id: '2',
          date: '2025-08-12',
          startTime: '14:00',
          endTime: '16:00',
          courseName: 'Database Management Systems',
          courseCode: 'CS-302',
          studentGroup: 'CS-3B',
          room: 'Lab 101',
          type: 'lab',
          status: 'scheduled'
        },
        {
          id: '3',
          date: '2025-08-13',
          startTime: '11:00',
          endTime: '12:30',
          courseName: 'Software Engineering',
          courseCode: 'CS-303',
          studentGroup: 'CS-3A',
          room: 'Room 205',
          type: 'lecture',
          status: 'scheduled'
        },
        {
          id: '4',
          date: '2025-08-14',
          startTime: '10:00',
          endTime: '11:30',
          courseName: 'Data Structures and Algorithms',
          courseCode: 'CS-301',
          studentGroup: 'CS-3C',
          room: 'Room 203',
          type: 'lecture',
          status: 'scheduled'
        }
      ];

      // Sample swap requests
      const mockSentRequests: SwapRequest[] = [
        {
          id: 'sr1',
          fromSession: mockClasses[0],
          toSlot: {
            date: '2025-08-13',
            startTime: '14:00',
            endTime: '15:30',
            room: 'Room 201'
          },
          swapType: 'move',
          status: 'pending',
          message: 'Need to attend a conference',
          createdAt: '2025-08-09T10:00:00Z',
          requestedBy: 'current-teacher' // user?.id || '' - commented out ID issue
        }
      ];

      const mockReceivedRequests: SwapRequest[] = [
        {
          id: 'rr1',
          fromSession: {
            id: '5',
            date: '2025-08-15',
            startTime: '09:00',
            endTime: '10:30',
            courseName: 'Web Development',
            courseCode: 'CS-304',
            studentGroup: 'CS-3B',
            room: 'Room 202',
            type: 'lecture',
            status: 'scheduled'
          },
          toSlot: {
            date: '2025-08-12',
            startTime: '11:00',
            endTime: '12:30',
            room: 'Room 202'
          },
          swapType: 'swap',
          status: 'pending',
          message: 'Family emergency, need to swap',
          createdAt: '2025-08-09T08:30:00Z',
          requestedBy: 'teacher-456',
          requestedTo: 'current-teacher' // user?.id || '' - commented out ID issue
        }
      ];

      setUpcomingClasses(mockClasses);
      setSentRequests(mockSentRequests);
      setReceivedRequests(mockReceivedRequests);
      setLoading(false);
    };

    fetchData();
  }, []); // [user] - commented out user dependency due to ID issue

  const handleSwapRequest = (classSession: ClassSession) => {
    setSelectedClass(classSession);
    setShowSwapModal(true);
  };

  const handleApproveRequest = async (requestId: string) => {
    // Implementation for approving a swap request
    console.log('Approving request:', requestId);
    // Update the request status and timetable
  };

  const handleRejectRequest = async (requestId: string) => {
    // Implementation for rejecting a swap request
    console.log('Rejecting request:', requestId);
    // Update the request status
  };

  const handleCancelRequest = async (requestId: string) => {
    // Implementation for cancelling a sent request
    console.log('Cancelling request:', requestId);
    // Update the request status
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { 
        color: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-lg', 
        icon: Clock,
        animation: 'animate-pulse'
      },
      approved: { 
        color: 'bg-gradient-to-r from-green-400 to-emerald-400 text-white shadow-lg', 
        icon: CheckCircle,
        animation: ''
      },
      rejected: { 
        color: 'bg-gradient-to-r from-red-400 to-pink-400 text-white shadow-lg', 
        icon: XCircle,
        animation: ''
      },
      cancelled: { 
        color: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg', 
        icon: X,
        animation: ''
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${config.color} ${config.animation} transform hover:scale-105 transition-all duration-300`}>
        <Icon className="h-4 w-4 mr-2" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-ping opacity-20"></div>
            <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-full w-24 h-24 flex items-center justify-center">
              <Loader className="h-10 w-10 text-white animate-spin" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Your Classes</h2>
          <p className="text-gray-600">Please wait while we fetch your schedule...</p>
          <div className="flex justify-center mt-6">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce animation-delay-100"></div>
              <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce animation-delay-200"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
            My Classes & Swap Management
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Efficiently manage your upcoming classes and lecture swap requests with our streamlined interface
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 mb-8 overflow-hidden">
          <div className="border-b border-gray-200/50">
            <nav className="-mb-px flex space-x-8 px-8 bg-gradient-to-r from-gray-50/50 to-white/50">
              {[
                { id: 'classes', label: 'Upcoming Classes', icon: Calendar, count: upcomingClasses.length },
                { id: 'sent', label: 'Sent Requests', icon: Send, count: sentRequests.length },
                { id: 'received', label: 'Received Requests', icon: AlertCircle, count: receivedRequests.length },
                { id: 'history', label: 'History', icon: Eye, count: 0 }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`group flex items-center py-6 px-1 border-b-3 font-semibold text-sm transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'border-gradient-to-r from-blue-500 to-purple-500 text-blue-600 transform scale-105'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:transform hover:scale-102'
                    }`}
                  >
                    <div className={`p-2 rounded-lg mr-3 transition-all duration-300 ${
                      activeTab === tab.id 
                        ? 'bg-gradient-to-r from-blue-100 to-purple-100' 
                        : 'group-hover:bg-gray-100'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="relative">
                      {tab.label}
                      {tab.count > 0 && (
                        <span className="absolute -top-2 -right-6 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center shadow-lg animate-pulse">
                          {tab.count}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8 bg-gradient-to-br from-white/50 to-gray-50/30">
            {/* Upcoming Classes Tab */}
            {activeTab === 'classes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Upcoming Classes</h2>
                  <div className="flex items-center text-sm text-gray-500 bg-white/60 rounded-full px-4 py-2">
                    <Clock className="h-4 w-4 mr-2" />
                    Next 14 Days
                  </div>
                </div>
                {upcomingClasses.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Calendar className="h-12 w-12 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Classes</h3>
                    <p className="text-gray-500 max-w-md mx-auto">You don't have any classes scheduled for the next 14 days. Enjoy your break!</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {upcomingClasses.map((classSession, index) => {
                      // Define color schemes for different subjects
                      const colorSchemes = [
                        {
                          gradient: 'from-blue-500 to-cyan-500',
                          cardBg: 'from-blue-50/80 to-cyan-50/80',
                          border: 'border-blue-200/50',
                          hoverBg: 'from-blue-100/50 to-cyan-100/50',
                          accent: 'bg-blue-500'
                        },
                        {
                          gradient: 'from-purple-500 to-pink-500',
                          cardBg: 'from-purple-50/80 to-pink-50/80',
                          border: 'border-purple-200/50',
                          hoverBg: 'from-purple-100/50 to-pink-100/50',
                          accent: 'bg-purple-500'
                        },
                        {
                          gradient: 'from-green-500 to-emerald-500',
                          cardBg: 'from-green-50/80 to-emerald-50/80',
                          border: 'border-green-200/50',
                          hoverBg: 'from-green-100/50 to-emerald-100/50',
                          accent: 'bg-green-500'
                        },
                        {
                          gradient: 'from-orange-500 to-red-500',
                          cardBg: 'from-orange-50/80 to-red-50/80',
                          border: 'border-orange-200/50',
                          hoverBg: 'from-orange-100/50 to-red-100/50',
                          accent: 'bg-orange-500'
                        },
                        {
                          gradient: 'from-indigo-500 to-blue-500',
                          cardBg: 'from-indigo-50/80 to-blue-50/80',
                          border: 'border-indigo-200/50',
                          hoverBg: 'from-indigo-100/50 to-blue-100/50',
                          accent: 'bg-indigo-500'
                        },
                        {
                          gradient: 'from-pink-500 to-rose-500',
                          cardBg: 'from-pink-50/80 to-rose-50/80',
                          border: 'border-pink-200/50',
                          hoverBg: 'from-pink-100/50 to-rose-100/50',
                          accent: 'bg-pink-500'
                        }
                      ];
                      
                      const colorScheme = colorSchemes[index % colorSchemes.length];
                      
                      return (
                      <div key={classSession.id} className={`group relative bg-gradient-to-br ${colorScheme.cardBg} backdrop-blur-sm rounded-2xl p-8 border ${colorScheme.border} shadow-lg hover:shadow-2xl transition-all duration-500 hover:transform hover:scale-[1.02] overflow-hidden`}>
                        {/* Animated background gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${colorScheme.hoverBg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                        
                        {/* Content */}
                        <div className="relative flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full animate-pulse ${colorScheme.accent}`}></div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                  {classSession.courseName}
                                </h3>
                              </div>
                              <span className="text-sm font-medium text-gray-500 bg-white/70 rounded-full px-3 py-1 shadow-sm">
                                {classSession.courseCode}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r ${colorScheme.gradient} text-white shadow-lg ${
                                classSession.type === 'lab' ? 'animate-pulse' : ''
                              }`}>
                                {classSession.type.toUpperCase()}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
                              <div className="flex items-center bg-white/70 rounded-xl p-3 group-hover:bg-white/90 transition-colors shadow-sm">
                                <Calendar className="h-5 w-5 mr-3 text-blue-500" />
                                <div>
                                  <p className="font-medium text-gray-900">{formatDate(classSession.date)}</p>
                                </div>
                              </div>
                              <div className="flex items-center bg-white/70 rounded-xl p-3 group-hover:bg-white/90 transition-colors shadow-sm">
                                <Clock className="h-5 w-5 mr-3 text-green-500" />
                                <div>
                                  <p className="font-medium text-gray-900">{classSession.startTime} - {classSession.endTime}</p>
                                </div>
                              </div>
                              <div className="flex items-center bg-white/70 rounded-xl p-3 group-hover:bg-white/90 transition-colors shadow-sm">
                                <Users className="h-5 w-5 mr-3 text-purple-500" />
                                <div>
                                  <p className="font-medium text-gray-900">{classSession.studentGroup}</p>
                                </div>
                              </div>
                              <div className="flex items-center bg-white/70 rounded-xl p-3 group-hover:bg-white/90 transition-colors shadow-sm">
                                <div className={`h-5 w-5 bg-gradient-to-r ${colorScheme.gradient} rounded-md mr-3`}></div>
                                <div>
                                  <p className="font-medium text-gray-900">{classSession.room}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSwapRequest(classSession)}
                            className={`group/btn bg-gradient-to-r ${colorScheme.gradient} hover:shadow-xl text-white px-6 py-3 rounded-xl flex items-center space-x-3 transition-all duration-300 shadow-lg transform hover:scale-105 ml-6`}
                          >
                            <ArrowLeftRight className="h-5 w-5 group-hover/btn:rotate-180 transition-transform duration-300" />
                            <span className="font-semibold">Request Swap</span>
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Sent Requests Tab */}
            {activeTab === 'sent' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Sent Swap Requests</h2>
                  <div className="flex items-center text-sm text-gray-500 bg-white/60 rounded-full px-4 py-2">
                    <Send className="h-4 w-4 mr-2" />
                    {sentRequests.length} Request{sentRequests.length !== 1 ? 's' : ''}
                  </div>
                </div>
                {sentRequests.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Send className="h-12 w-12 text-green-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Requests Sent</h3>
                    <p className="text-gray-500 max-w-md mx-auto">You haven't sent any swap requests yet. Use the "Request Swap" button on your classes to get started.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {sentRequests.map((request) => (
                      <div key={request.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-4">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {request.fromSession.courseName}
                            </h3>
                            {getStatusBadge(request.status)}
                          </div>
                          {request.status === 'pending' && (
                            <button
                              onClick={() => handleCancelRequest(request.id)}
                              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                              Cancel Request
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border border-red-100">
                            <p className="font-bold text-red-700 mb-3 flex items-center">
                              <ArrowLeftRight className="h-4 w-4 mr-2" />
                              Original Slot
                            </p>
                            <div className="space-y-2 text-sm text-gray-700">
                              <p><strong>Date:</strong> {formatDate(request.fromSession.date)}</p>
                              <p><strong>Time:</strong> {request.fromSession.startTime} - {request.fromSession.endTime}</p>
                              <p><strong>Room:</strong> {request.fromSession.room}</p>
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border border-green-100">
                            <p className="font-bold text-green-700 mb-3 flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              Requested Slot
                            </p>
                            <div className="space-y-2 text-sm text-gray-700">
                              <p><strong>Date:</strong> {formatDate(request.toSlot.date)}</p>
                              <p><strong>Time:</strong> {request.toSlot.startTime} - {request.toSlot.endTime}</p>
                              <p><strong>Room:</strong> {request.toSlot.room}</p>
                            </div>
                          </div>
                        </div>
                        {request.message && (
                          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                            <p className="text-sm text-gray-700">
                              <strong className="text-blue-700">Message:</strong> {request.message}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Received Requests Tab */}
            {activeTab === 'received' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Received Swap Requests</h2>
                  <div className="flex items-center text-sm text-gray-500 bg-white/60 rounded-full px-4 py-2">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {receivedRequests.length} Pending
                  </div>
                </div>
                {receivedRequests.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <AlertCircle className="h-12 w-12 text-yellow-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Pending Requests</h3>
                    <p className="text-gray-500 max-w-md mx-auto">You don't have any pending swap requests from other teachers at the moment.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {receivedRequests.map((request) => (
                      <div key={request.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 border-2 border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                        {/* Urgent indicator */}
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-400 to-pink-500 transform rotate-45 translate-x-10 -translate-y-10">
                          <div className="absolute bottom-2 left-2 text-white text-xs font-bold transform -rotate-45">
                            NEW
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center space-x-4">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce"></div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {request.fromSession.courseName}
                            </h3>
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleApproveRequest(request.id)}
                              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-xl flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                            >
                              <Check className="h-5 w-5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id)}
                              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl flex items-center space-x-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                            >
                              <X className="h-5 w-5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white/80 rounded-xl p-6 border border-white/50">
                            <p className="font-bold text-blue-700 mb-3 flex items-center">
                              <Calendar className="h-4 w-4 mr-2" />
                              Their Class
                            </p>
                            <div className="space-y-2 text-sm text-gray-700">
                              <p><strong>Date:</strong> {formatDate(request.fromSession.date)}</p>
                              <p><strong>Time:</strong> {request.fromSession.startTime} - {request.fromSession.endTime}</p>
                              <p><strong>Room:</strong> {request.fromSession.room}</p>
                            </div>
                          </div>
                          <div className="bg-white/80 rounded-xl p-6 border border-white/50">
                            <p className="font-bold text-purple-700 mb-3 flex items-center">
                              <ArrowLeftRight className="h-4 w-4 mr-2" />
                              Wants Your Slot
                            </p>
                            <div className="space-y-2 text-sm text-gray-700">
                              <p><strong>Date:</strong> {formatDate(request.toSlot.date)}</p>
                              <p><strong>Time:</strong> {request.toSlot.startTime} - {request.toSlot.endTime}</p>
                              <p><strong>Room:</strong> {request.toSlot.room}</p>
                            </div>
                          </div>
                        </div>
                        {request.message && (
                          <div className="mt-6 p-4 bg-white/80 rounded-xl border border-white/50">
                            <p className="text-sm text-gray-700">
                              <strong className="text-orange-700">Reason:</strong> {request.message}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Swap Request History</h2>
                  <div className="flex items-center text-sm text-gray-500 bg-white/60 rounded-full px-4 py-2">
                    <Eye className="h-4 w-4 mr-2" />
                    All Time
                  </div>
                </div>
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Eye className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No History Yet</h3>
                  <p className="text-gray-500 max-w-md mx-auto">Your completed swap requests will appear here once you start using the system.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Swap Request Modal */}
      {showSwapModal && selectedClass && (
        <SwapRequestModal
          classSession={selectedClass}
          onClose={() => setShowSwapModal(false)}
          onSubmit={(swapData) => {
            console.log('Swap request submitted:', swapData);
            setShowSwapModal(false);
          }}
        />
      )}
    </div>
  );
};

// Swap Request Modal Component
interface SwapRequestModalProps {
  classSession: ClassSession;
  onClose: () => void;
  onSubmit: (swapData: any) => void;
}

const SwapRequestModal: React.FC<SwapRequestModalProps> = ({ classSession, onClose, onSubmit }) => {
  const [swapType, setSwapType] = useState<'move' | 'swap'>('move');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  // Sample available slots - replace with actual API call
  const availableSlots = [
    {
      id: '1',
      date: '2025-08-13',
      startTime: '14:00',
      endTime: '15:30',
      room: 'Room 201',
      type: 'empty'
    },
    {
      id: '2',
      date: '2025-08-14',
      startTime: '11:00',
      endTime: '12:30',
      room: 'Room 203',
      type: 'empty'
    }
  ];

  const handleSubmit = () => {
    const swapData = {
      fromSession: classSession,
      toSlot: selectedSlot,
      swapType,
      message
    };
    onSubmit(swapData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Request Lecture Swap</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              title="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {step === 'select' && (
            <>
              {/* Current Class Info */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Current Class to Swap:</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Course:</strong> {classSession.courseName}</p>
                    <p><strong>Date:</strong> {new Date(classSession.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p><strong>Time:</strong> {classSession.startTime} - {classSession.endTime}</p>
                    <p><strong>Room:</strong> {classSession.room}</p>
                  </div>
                </div>
              </div>

              {/* Swap Type Selection */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Select Swap Type:</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSwapType('move')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      swapType === 'move'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h4 className="font-medium text-gray-900 mb-1">Move to Empty Slot</h4>
                    <p className="text-sm text-gray-600">Move your class to an available time slot</p>
                  </button>
                  <button
                    onClick={() => setSwapType('swap')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      swapType === 'swap'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h4 className="font-medium text-gray-900 mb-1">Swap with Another Teacher</h4>
                    <p className="text-sm text-gray-600">Exchange time slots with another teacher</p>
                  </button>
                </div>
              </div>

              {/* Available Slots */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Available Time Slots:</h3>
                <div className="grid gap-3">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        selectedSlot?.id === slot.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(slot.date).toLocaleDateString()} | {slot.startTime} - {slot.endTime}
                          </p>
                          <p className="text-sm text-gray-600">{slot.room}</p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Available
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Swap (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Explain why you need this swap..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  disabled={!selectedSlot}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Confirm Swap Request</h3>
                
                {/* Swap Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Current Class:</h4>
                      <div className="text-sm text-gray-600">
                        <p>{classSession.courseName}</p>
                        <p>{new Date(classSession.date).toLocaleDateString()}</p>
                        <p>{classSession.startTime} - {classSession.endTime}</p>
                        <p>{classSession.room}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">New Slot:</h4>
                      <div className="text-sm text-gray-600">
                        <p>{classSession.courseName}</p>
                        <p>{new Date(selectedSlot.date).toLocaleDateString()}</p>
                        <p>{selectedSlot.startTime} - {selectedSlot.endTime}</p>
                        <p>{selectedSlot.room}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {message && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-700 mb-1">Message:</h4>
                    <p className="text-sm text-gray-600">{message}</p>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Important:</p>
                      <p>This request will be sent for approval. Your class will only be moved once the request is approved by the administration or the other teacher involved.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Swap Request</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherClassesPage;
