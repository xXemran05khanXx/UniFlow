import React, { createContext, useContext, useState } from 'react';

export interface Notification {
  id: string;
  type: 'schedule' | 'announcement' | 'general';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  icon?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  deleteAllNotifications: () => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'schedule',
      title: 'Class Room Changed',
      message: 'Your Digital Logic lecture has been moved to Room 502.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: false,
      icon: '🗓️'
    },
    {
      id: '2',
      type: 'announcement',
      title: 'Holiday Notice',
      message: 'College will remain closed on August 15th for Independence Day.',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      read: false,
      icon: '📢'
    },
    {
      id: '3',
      type: 'schedule',
      title: 'Lab Session Cancelled',
      message: 'Computer Networks lab scheduled for 2:00 PM has been cancelled.',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      read: true,
      icon: '🗓️'
    },
    {
      id: '4',
      type: 'announcement',
      title: 'Exam Schedule Released',
      message: 'Mid-semester examination schedule has been published on the student portal.',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      read: true,
      icon: '📢'
    },
    {
      id: '5',
      type: 'schedule',
      title: 'Professor Change',
      message: 'Dr. Smith will be taking Data Structures class instead of Dr. Johnson.',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      read: false,
      icon: '🗓️'
    },
    {
      id: '6',
      type: 'general',
      title: 'Library Hours Extended',
      message: 'Library will now remain open until 10:00 PM during exam weeks.',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      read: true,
      icon: '📚'
    },
    {
      id: '7',
      type: 'announcement',
      title: 'New Course Registration',
      message: 'Registration for next semester electives will begin on August 20th.',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      read: false,
      icon: '📢'
    },
    {
      id: '8',
      type: 'schedule',
      title: 'Extra Class Scheduled',
      message: 'Additional Mathematics class scheduled for Saturday 10:00 AM in Room 204.',
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      read: true,
      icon: '🗓️'
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== id)
    );
  };

  const deleteAllNotifications = () => {
    setNotifications([]);
  };

  const addNotification = (notificationData: Omit<Notification, 'id'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: Date.now().toString(),
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      deleteAllNotifications,
      addNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
