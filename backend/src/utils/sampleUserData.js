/**
 * Sample data generator for User Management system
 * Creates sample users for testing the admin interface
 */

const bcrypt = require('bcryptjs');

/**
 * Generate sample users for Mumbai University engineering college
 */
const generateSampleUsers = async () => {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  return [
    {
      name: 'Dr. Rajesh Kumar',
      email: 'rajesh.kumar@mu.edu.in',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      profile: {
        firstName: 'Rajesh',
        lastName: 'Kumar',
        phone: '+91-9876543210',
        bio: 'Dean of Engineering, specializing in Computer Science and AI',
        location: 'Mumbai, Maharashtra',
        website: 'https://mu.edu.in/faculty/rajesh-kumar'
      },
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        language: 'en'
      },
      lastLogin: new Date('2024-01-20T10:30:00Z'),
      loginAttempts: 0,
      lockUntil: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-20T10:30:00Z')
    },
    {
      name: 'Prof. Priya Sharma',
      email: 'priya.sharma@mu.edu.in',
      password: hashedPassword,
      role: 'teacher',
      isActive: true,
      isEmailVerified: true,
      profile: {
        firstName: 'Priya',
        lastName: 'Sharma',
        phone: '+91-9876543211',
        bio: 'Professor of Mechanical Engineering, Research in Robotics',
        location: 'Mumbai, Maharashtra',
        website: 'https://mu.edu.in/faculty/priya-sharma'
      },
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          sms: true,
          push: true
        },
        language: 'en'
      },
      lastLogin: new Date('2024-01-20T08:15:00Z'),
      loginAttempts: 0,
      lockUntil: null,
      createdAt: new Date('2024-01-02T00:00:00Z'),
      updatedAt: new Date('2024-01-20T08:15:00Z')
    },
    {
      name: 'Dr. Amit Patel',
      email: 'amit.patel@mu.edu.in',
      password: hashedPassword,
      role: 'teacher',
      isActive: true,
      isEmailVerified: true,
      profile: {
        firstName: 'Amit',
        lastName: 'Patel',
        phone: '+91-9876543212',
        bio: 'Assistant Professor, Electrical Engineering Department',
        location: 'Mumbai, Maharashtra',
        website: null
      },
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          sms: false,
          push: false
        },
        language: 'en'
      },
      lastLogin: new Date('2024-01-19T16:45:00Z'),
      loginAttempts: 0,
      lockUntil: null,
      createdAt: new Date('2024-01-03T00:00:00Z'),
      updatedAt: new Date('2024-01-19T16:45:00Z')
    },
    {
      name: 'Rahul Verma',
      email: 'rahul.verma@student.mu.edu.in',
      password: hashedPassword,
      role: 'student',
      isActive: true,
      isEmailVerified: true,
      profile: {
        firstName: 'Rahul',
        lastName: 'Verma',
        phone: '+91-9876543213',
        bio: 'Final year Computer Science student, interested in AI/ML',
        location: 'Mumbai, Maharashtra',
        website: 'https://github.com/rahulverma'
      },
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          sms: true,
          push: true
        },
        language: 'en'
      },
      lastLogin: new Date('2024-01-20T14:20:00Z'),
      loginAttempts: 0,
      lockUntil: null,
      createdAt: new Date('2024-01-10T00:00:00Z'),
      updatedAt: new Date('2024-01-20T14:20:00Z')
    },
    {
      name: 'Sneha Desai',
      email: 'sneha.desai@student.mu.edu.in',
      password: hashedPassword,
      role: 'student',
      isActive: true,
      isEmailVerified: false,
      profile: {
        firstName: 'Sneha',
        lastName: 'Desai',
        phone: '+91-9876543214',
        bio: 'Third year Mechanical Engineering student',
        location: 'Pune, Maharashtra',
        website: null
      },
      preferences: {
        theme: 'light',
        notifications: {
          email: false,
          sms: true,
          push: false
        },
        language: 'en'
      },
      lastLogin: new Date('2024-01-18T11:30:00Z'),
      loginAttempts: 1,
      lockUntil: null,
      createdAt: new Date('2024-01-12T00:00:00Z'),
      updatedAt: new Date('2024-01-18T11:30:00Z')
    },
    {
      name: 'Vikram Singh',
      email: 'vikram.singh@student.mu.edu.in',
      password: hashedPassword,
      role: 'student',
      isActive: false,
      isEmailVerified: true,
      profile: {
        firstName: 'Vikram',
        lastName: 'Singh',
        phone: '+91-9876543215',
        bio: 'Second year Civil Engineering student',
        location: 'Mumbai, Maharashtra',
        website: null
      },
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        language: 'hi'
      },
      lastLogin: new Date('2024-01-15T09:45:00Z'),
      loginAttempts: 5,
      lockUntil: new Date('2024-01-21T09:45:00Z'),
      createdAt: new Date('2024-01-08T00:00:00Z'),
      updatedAt: new Date('2024-01-15T09:45:00Z')
    },
    {
      name: 'Meera Krishnan',
      email: 'meera.krishnan@mu.edu.in',
      password: hashedPassword,
      role: 'teacher',
      isActive: true,
      isEmailVerified: true,
      profile: {
        firstName: 'Meera',
        lastName: 'Krishnan',
        phone: '+91-9876543216',
        bio: 'Associate Professor, Electronics Engineering',
        location: 'Mumbai, Maharashtra',
        website: 'https://mu.edu.in/faculty/meera-krishnan'
      },
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          sms: true,
          push: false
        },
        language: 'en'
      },
      lastLogin: new Date('2024-01-20T07:30:00Z'),
      loginAttempts: 0,
      lockUntil: null,
      createdAt: new Date('2024-01-04T00:00:00Z'),
      updatedAt: new Date('2024-01-20T07:30:00Z')
    },
    {
      name: 'Arjun Gupta',
      email: 'arjun.gupta@student.mu.edu.in',
      password: hashedPassword,
      role: 'student',
      isActive: true,
      isEmailVerified: true,
      profile: {
        firstName: 'Arjun',
        lastName: 'Gupta',
        phone: '+91-9876543217',
        bio: 'First year Engineering student, exploring different streams',
        location: 'Thane, Maharashtra',
        website: null
      },
      preferences: {
        theme: 'dark',
        notifications: {
          email: false,
          sms: false,
          push: true
        },
        language: 'en'
      },
      lastLogin: new Date('2024-01-20T12:15:00Z'),
      loginAttempts: 0,
      lockUntil: null,
      createdAt: new Date('2024-01-15T00:00:00Z'),
      updatedAt: new Date('2024-01-20T12:15:00Z')
    },
    {
      name: 'Dr. Sunita Rao',
      email: 'sunita.rao@mu.edu.in',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
      profile: {
        firstName: 'Sunita',
        lastName: 'Rao',
        phone: '+91-9876543218',
        bio: 'Vice Principal and Head of Administration',
        location: 'Mumbai, Maharashtra',
        website: 'https://mu.edu.in/administration/sunita-rao'
      },
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          sms: true,
          push: true
        },
        language: 'en'
      },
      lastLogin: new Date('2024-01-20T09:00:00Z'),
      loginAttempts: 0,
      lockUntil: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-20T09:00:00Z')
    },
    {
      name: 'Kiran Nair',
      email: 'kiran.nair@student.mu.edu.in',
      password: hashedPassword,
      role: 'student',
      isActive: true,
      isEmailVerified: false,
      profile: {
        firstName: 'Kiran',
        lastName: 'Nair',
        phone: '+91-9876543219',
        bio: 'Fourth year Information Technology student',
        location: 'Navi Mumbai, Maharashtra',
        website: 'https://linkedin.com/in/kiran-nair'
      },
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          sms: false,
          push: true
        },
        language: 'en'
      },
      lastLogin: new Date('2024-01-19T20:30:00Z'),
      loginAttempts: 0,
      lockUntil: null,
      createdAt: new Date('2024-01-06T00:00:00Z'),
      updatedAt: new Date('2024-01-19T20:30:00Z')
    }
  ];
};

/**
 * Sample CSV data for testing import functionality
 */
const generateSampleCSV = () => {
  return `name,email,role,firstName,lastName,phone,bio,location
Ravi Mehta,ravi.mehta@student.mu.edu.in,student,Ravi,Mehta,+91-9876543220,"Third year Chemical Engineering student","Mumbai, Maharashtra"
Anjali Joshi,anjali.joshi@mu.edu.in,teacher,Anjali,Joshi,+91-9876543221,"Lecturer in Mathematics Department","Mumbai, Maharashtra"
Deepak Agarwal,deepak.agarwal@student.mu.edu.in,student,Deepak,Agarwal,+91-9876543222,"Second year Electrical Engineering student","Kalyan, Maharashtra"
Kavita Reddy,kavita.reddy@mu.edu.in,teacher,Kavita,Reddy,+91-9876543223,"Professor of Chemical Engineering","Mumbai, Maharashtra"
Sanjay Kulkarni,sanjay.kulkarni@student.mu.edu.in,student,Sanjay,Kulkarni,+91-9876543224,"Final year Civil Engineering student","Pune, Maharashtra"`;
};

/**
 * Statistics for testing dashboard
 */
const generateUserStats = () => {
  return {
    totalUsers: 10,
    activeUsers: 8,
    inactiveUsers: 2,
    roleDistribution: {
      admin: 2,
      teacher: 3,
      student: 5
    },
    recentSignups: 3,
    emailVerified: 8,
    emailUnverified: 2,
    lockedUsers: 1,
    departmentDistribution: {
      'Computer Science': 2,
      'Mechanical Engineering': 2,
      'Electrical Engineering': 2,
      'Civil Engineering': 2,
      'Chemical Engineering': 1,
      'Information Technology': 1
    }
  };
};

module.exports = {
  generateSampleUsers,
  generateSampleCSV,
  generateUserStats
};
