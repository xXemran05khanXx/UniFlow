// Mock Authentication Service
// This service simulates backend authentication for development purposes

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  department?: string;
  semester?: number;
  employeeId?: string;
  studentId?: string;
}

// Mock user database
const mockUsers: MockUser[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@uniflow.edu',
    role: 'admin',
  },
  {
    id: '2',
    name: 'John Teacher',
    email: 'teacher@uniflow.edu',
    role: 'teacher',
    department: 'Computer Science',
    employeeId: 'EMP001',
  },
  {
    id: '3',
    name: 'Jane Student',
    email: 'student@uniflow.edu',
    role: 'student',
    department: 'Computer Science',
    semester: 3,
    studentId: 'STU001',
  },
];

// Mock API responses
export interface MockAuthResponse {
  success: boolean;
  data?: {
    user: MockUser;
    token: string;
  };
  error?: string;
}

// Mock login function
export const mockLogin = async (email: string, password: string): Promise<MockAuthResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check for demo credentials
  if (password !== 'password123') {
    return {
      success: false,
      error: 'Invalid credentials. Use password: password123',
    };
  }

  // Find user by email
  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return {
      success: false,
      error: 'User not found. Use admin@uniflow.edu, teacher@uniflow.edu, or student@uniflow.edu',
    };
  }

  // Generate mock token
  const token = `mock_token_${user.id}_${Date.now()}`;

  return {
    success: true,
    data: {
      user,
      token,
    },
  };
};

// Mock register function
export const mockRegister = async (userData: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'teacher' | 'student';
  department?: string;
  semester?: number;
  employeeId?: string;
  studentId?: string;
}): Promise<MockAuthResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Check if user already exists
  const existingUser = mockUsers.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
  if (existingUser) {
    return {
      success: false,
      error: 'User with this email already exists',
    };
  }

  // Create new user
  const newUser: MockUser = {
    id: `mock_${Date.now()}`,
    name: userData.name,
    email: userData.email,
    role: userData.role,
    department: userData.department,
    semester: userData.semester,
    employeeId: userData.employeeId,
    studentId: userData.studentId,
  };

  // Add to mock database
  mockUsers.push(newUser);

  // Generate mock token
  const token = `mock_token_${newUser.id}_${Date.now()}`;

  return {
    success: true,
    data: {
      user: newUser,
      token,
    },
  };
};

// Mock logout function
export const mockLogout = async (): Promise<{ success: boolean }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return { success: true };
};

// Check if we should use mock authentication
export const shouldUseMockAuth = (): boolean => {
  return process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_REAL_API;
};
