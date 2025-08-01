# UniFlow Frontend - User Role Views & Timetable System

## Overview

This implementation provides comprehensive user role-based views, an interactive timetable component, and centralized API integration for the UniFlow academic system. The frontend is built with React, TypeScript, and Tailwind CSS.

## Features Implemented

### 1. User Role Views

#### Role-Based Dashboard Components
- **AdminDashboard**: Comprehensive system overview with user management, statistics, and quick actions
- **TeacherDashboard**: Teacher-focused view with personal schedule, classes, and attendance
- **StudentDashboard**: Student-focused view with personal timetable, subjects, and academic progress

#### Key Features
- **Conditional Rendering**: Different content and actions based on user role (Admin, Teacher, Student)
- **JWT Integration**: User role extracted from JWT token for secure role verification
- **Statistics & Analytics**: Role-specific metrics and insights
- **Quick Actions**: Context-appropriate actions for each user type

### 2. Interactive Timetable Component

#### TimetableCalendar Component
- **Multiple View Modes**: Week, Month, Day, and Agenda views
- **Role-Based Data**: Shows relevant timetable data based on user role
- **Interactive Events**: Click events for detailed information
- **Filter System**: Filter by department, semester, session type
- **Export Functionality**: PDF export for timetables

#### Features
- **react-big-calendar** integration for professional calendar interface
- **Recurring Events**: Automatically generates weekly recurring classes
- **Color Coding**: Different colors for lecture, practical, and lab sessions
- **Real-time Updates**: Dynamic data fetching and updates
- **Responsive Design**: Works on desktop and mobile devices

### 3. API Integration

#### Centralized Axios Configuration
- **Base Configuration**: Centralized API base URL and timeout settings
- **Authentication**: Automatic JWT token injection in requests
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Interceptors**: Request/Response interceptors for logging and error management

#### API Services
- **authAPI**: Login, register, logout, profile management
- **usersAPI**: User CRUD operations
- **timetablesAPI**: Timetable management with role-based endpoints
- **subjectsAPI**: Subject management
- **roomsAPI**: Room management
- **timeSlotsAPI**: Time slot management

### 4. Additional Components

#### RoleGuard Component
- **Access Control**: Restricts content based on user roles
- **Fallback Options**: Customizable fallback content for unauthorized access
- **Flexible Usage**: Can show/hide content or redirect users

#### StatsGrid Component
- **Reusable Statistics**: Modular stats cards with icons and change indicators
- **Responsive Layout**: Adaptive grid layout for different screen sizes
- **Color Coding**: Visual indicators for different metrics

#### ErrorBoundary Component
- **Error Handling**: Catches and displays React errors gracefully
- **Development Mode**: Shows detailed error information in development
- **User-Friendly**: Provides clear error messages and recovery options

## File Structure

```
src/
├── components/
│   ├── dashboards/
│   │   ├── AdminDashboard.tsx      # Admin-specific dashboard
│   │   ├── TeacherDashboard.tsx    # Teacher-specific dashboard
│   │   ├── StudentDashboard.tsx    # Student-specific dashboard
│   │   └── RoleBasedDashboard.tsx  # Main role router component
│   ├── timetable/
│   │   ├── TimetableCalendar.tsx   # Main timetable component
│   │   └── TimetableCalendar.css   # Timetable-specific styles
│   ├── common/
│   │   ├── RoleGuard.tsx           # Role-based access control
│   │   ├── StatsGrid.tsx           # Reusable statistics components
│   │   └── ErrorBoundary.tsx       # Error handling component
│   └── ui/
│       ├── Card.tsx                # Card UI component
│       ├── Button.tsx              # Button UI component
│       └── LoadingSpinner.tsx      # Loading component
├── pages/
│   ├── DashboardPage.tsx           # Main dashboard page
│   ├── TimetablePage.tsx           # Timetable page
│   └── LoginPage.tsx               # Login page
├── services/
│   ├── api.ts                      # Main API service functions
│   └── apiClient.ts                # Axios configuration and utilities
├── contexts/
│   └── AppContext.tsx              # Application settings context
├── hooks/
│   ├── useAuth.ts                  # Authentication hook
│   └── redux.ts                    # Redux hooks
├── store/
│   ├── index.ts                    # Redux store configuration
│   ├── authSlice.ts                # Authentication state management
│   └── timetableSlice.ts           # Timetable state management
└── types/
    └── index.ts                    # TypeScript type definitions
```

## Role-Based Features

### Admin Dashboard
- **System Statistics**: Total users, teachers, students, active timetables
- **User Management**: Recent users with role indicators
- **Timetable Overview**: Recent timetables with status
- **Quick Actions**: User management, timetable creation, reports

### Teacher Dashboard
- **Personal Schedule**: Today's classes and upcoming sessions
- **Class Statistics**: Weekly class count, completion rate, subjects taught
- **Next Class Alert**: Prominent display of next scheduled class
- **Recent Activity**: Class completion, attendance updates, schedule changes

### Student Dashboard
- **Class Schedule**: Today's classes with teacher and room information
- **Academic Progress**: Attendance percentage, enrolled subjects
- **Performance Metrics**: Visual progress indicators
- **Quick Links**: Timetable, course materials, academic progress

## Timetable Features

### View Modes
- **All Timetables** (Admin): View all institutional timetables
- **Teacher View**: Personal teaching schedule
- **Student View**: Personal class schedule

### Interactive Features
- **Event Details**: Click events to view class information
- **Filter System**: Multi-level filtering by department, semester, type
- **Export Options**: PDF export for selected timetables
- **Responsive Calendar**: Adapts to different screen sizes

### Color Coding
- **Blue**: Lecture sessions
- **Green**: Practical sessions
- **Purple**: Lab sessions

## API Integration Features

### Authentication
- **Automatic Token Management**: JWT tokens automatically added to requests
- **Token Refresh**: Handles token expiration and refresh
- **Secure Storage**: Tokens stored securely in localStorage

### Error Handling
- **HTTP Status Codes**: Appropriate handling for 401, 403, 404, 422, 500
- **Network Errors**: Graceful handling of network connectivity issues
- **User Feedback**: Clear error messages for users

### Development Features
- **Request Logging**: Automatic logging of API requests in development
- **Response Monitoring**: Tracking of API response times and status
- **Error Debugging**: Detailed error information for developers

## Usage Examples

### Role-Based Rendering
```tsx
import RoleGuard from '../components/common/RoleGuard';

<RoleGuard allowedRoles={['admin']} showFallback>
  <AdminOnlyContent />
</RoleGuard>
```

### Timetable Integration
```tsx
import TimetableCalendar from '../components/timetable/TimetableCalendar';

<TimetableCalendar viewMode="teacher" />
```

### API Usage
```tsx
import { timetablesAPI } from '../services/api';

const fetchTimetables = async () => {
  const response = await timetablesAPI.getAll();
  if (response.success) {
    setTimetables(response.data);
  }
};
```

## Security Features

- **JWT-Based Authentication**: Secure token-based authentication
- **Role Verification**: Server-side role verification through JWT
- **Automatic Logout**: Automatic logout on token expiration
- **Protected Routes**: Route-level protection based on authentication

## Performance Optimizations

- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo and useMemo for performance
- **Efficient Re-renders**: Optimized state management
- **Code Splitting**: Automatic code splitting by route

## Responsive Design

- **Mobile-First**: Designed for mobile devices first
- **Adaptive Layouts**: Layouts adapt to screen size
- **Touch-Friendly**: Touch-optimized interface elements
- **Cross-Browser**: Compatible with modern browsers

## Development Setup

1. **Install Dependencies**: `npm install`
2. **Start Development Server**: `npm start`
3. **Build for Production**: `npm run build`
4. **Environment Variables**: Configure API_URL in `.env`

## Environment Configuration

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Future Enhancements

- **Real-time Updates**: WebSocket integration for live updates
- **Notification System**: Push notifications for schedule changes
- **Offline Support**: Service worker for offline functionality
- **Advanced Filtering**: More sophisticated filtering options
- **Accessibility**: WCAG compliance improvements

## Testing

The application includes comprehensive error handling and is ready for integration with:
- **Unit Tests**: Component-level testing
- **Integration Tests**: API integration testing
- **E2E Tests**: End-to-end user flow testing

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Browsers**: iOS Safari, Chrome Mobile
- **Minimum Requirements**: ES6 support required

This implementation provides a solid foundation for a role-based academic management system with interactive timetable functionality and robust API integration.
