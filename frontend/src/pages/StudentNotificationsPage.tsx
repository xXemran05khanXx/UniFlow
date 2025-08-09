import React, { useState } from 'react';
import { Bell, Calendar, MessageSquare, Book, CheckCheck, Filter, Trash2 } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

type FilterType = 'all' | 'schedule' | 'announcement';

const StudentNotificationsPage: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredNotifications = notifications.filter(notification => {
    if (activeFilter === 'all') return true;
    return notification.type === activeFilter;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'schedule':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'announcement':
        return <MessageSquare className="h-5 w-5 text-green-600" />;
      default:
        return <Book className="h-5 w-5 text-purple-600" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return minutes === 0 ? 'Just now' : `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (days < 7) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return timestamp.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const getFilterCount = (filterType: FilterType) => {
    if (filterType === 'all') return notifications.length;
    return notifications.filter(n => n.type === filterType).length;
  };

  const getUnreadCount = (filterType: FilterType) => {
    const filtered = filterType === 'all' 
      ? notifications 
      : notifications.filter(n => n.type === filterType);
    return filtered.filter(n => !n.read).length;
  };

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  const handleDeleteNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent triggering the notification click
    if (window.confirm('Are you sure you want to delete this notification?')) {
      deleteNotification(id);
    }
  };

  const handleDeleteAllNotifications = () => {
    if (window.confirm('Are you sure you want to delete all notifications? This action cannot be undone.')) {
      deleteAllNotifications();
    }
  };

  const filters = [
    { key: 'all' as FilterType, label: 'All', icon: Bell },
    { key: 'schedule' as FilterType, label: 'Schedule Updates', icon: Calendar },
    { key: 'announcement' as FilterType, label: 'Announcements', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                My Notifications
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Stay updated with your class schedules and announcements
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <CheckCheck className="h-5 w-5" />
                  <span className="font-medium">Mark All as Read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleDeleteAllNotifications}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="font-medium">Delete All</span>
                </button>
              )}
            </div>
          </div>

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total</p>
                  <p className="text-3xl font-bold text-gray-900">{notifications.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Unread</p>
                  <p className="text-3xl font-bold text-gray-900">{unreadCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Schedule</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {notifications.filter(n => n.type === 'schedule').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Announcements</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {notifications.filter(n => n.type === 'announcement').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filter Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-2 mb-8">
          <div className="flex flex-wrap items-center space-x-2">
            {filters.map(({ key, label, icon: Icon }) => {
              const count = getFilterCount(key);
              const unread = getUnreadCount(key);
              
              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`flex items-center space-x-3 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeFilter === key
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    activeFilter === key 
                      ? 'bg-white bg-opacity-20 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {count}
                  </span>
                  {unread > 0 && (
                    <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Enhanced Notifications List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          {filteredNotifications.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id)}
                  className={`p-6 hover:bg-gray-50 cursor-pointer transition-all duration-200 ${
                    !notification.read ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 mt-1 p-2 rounded-xl ${
                      notification.type === 'schedule' 
                        ? 'bg-blue-100' 
                        : notification.type === 'announcement'
                        ? 'bg-green-100'
                        : 'bg-purple-100'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-xl font-bold text-gray-900">
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                              New
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500 font-medium">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          <button
                            onClick={(e) => handleDeleteNotification(e, notification.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-700 mt-2 leading-relaxed text-lg">
                        {notification.message}
                      </p>
                      <div className="flex items-center space-x-4 mt-4">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                          notification.type === 'schedule' 
                            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                            : notification.type === 'announcement'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}>
                          {notification.type === 'schedule' ? '📅 Schedule Update' : 
                           notification.type === 'announcement' ? '📢 Announcement' : '📚 General'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="p-4 bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Filter className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No notifications found</h3>
              <p className="text-gray-500 text-lg">
                No notifications match the selected filter.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentNotificationsPage;
