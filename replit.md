# Uniflow: Streamlining Campus Productivity

## Overview

Uniflow is a full-stack web application designed to streamline campus productivity for educational institutions. The application serves three distinct user types (Students, Teachers, and Admins) with role-specific dashboards and functionality. The system focuses on timetable management, meeting scheduling, room allocation, and real-time notifications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for development and production builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Context API for authentication
- **Data Fetching**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript throughout the stack
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL store
- **API Structure**: RESTful API with `/api` prefix routing

### Database Design
The application uses PostgreSQL with the following core tables:
- **users**: Stores user information with role-based access (student, teacher, admin)
- **timetables**: Manages class schedules with department, year, and division organization
- **meetings**: Handles meeting scheduling between admins and faculty
- **notifications**: Manages real-time alerts and updates for users

## Key Components

### Authentication System
- Real database authentication with PostgreSQL integration
- Password hashing using bcrypt for security
- Role-based authentication with three user types
- Default demo credentials for testing
- Context-based state management for user sessions

### User Dashboards
- **Student Dashboard**: Real department-based timetable view, today's classes, weekly schedule grid
- **Teacher Dashboard**: Personal teaching schedule, today's classes, availability management
- **Admin Dashboard**: Master timetable management, create/edit functionality, all departments view

### Timetable Management System (Phase 2 - Completed)
- Full CRUD operations for timetable entries
- Department-wise and user-specific timetable filtering
- Beautiful grid-based weekly schedule display
- Color-coded subjects with room and time information
- Real-time data loading with PostgreSQL integration
- Admin can create new timetable entries through modal interface

### Meeting Scheduling (Future Phase)
- Real-time availability checking based on timetables and teacher status
- Room booking integration
- Meeting invitation system with accept/decline functionality

## Data Flow

1. **Authentication Flow**: Users select role → Real database authentication → JWT-less session → Redirect to role-specific dashboard
2. **Timetable Flow**: 
   - Admin creates timetables through modal interface → API validates data → PostgreSQL storage
   - Students/Teachers fetch department/user-specific schedules → Real-time timetable grid display
   - Dynamic filtering by department, user, or all timetables
3. **Meeting Flow**: Admin schedules meetings → System checks availability → Notifications sent → Teachers respond
4. **Notification Flow**: System events trigger notifications → Database storage → Real-time display on dashboards

## Recent Changes (January 31, 2025)

### Phase 2: Timetable Management System - COMPLETED
- ✅Real PostgreSQL integration with Drizzle ORM
- ✅Comprehensive timetable CRUD API endpoints  
- ✅Beautiful TimetableGrid component with color-coded subjects
- ✅Department-wise and user-specific filtering
- ✅Student Dashboard: Shows department timetables and today's classes
- ✅Teacher Dashboard: Shows personal teaching schedule
- ✅Admin Dashboard: Master timetable view with create functionality
- ✅CreateTimetableModal for admin to add new entries
- ✅Real authentication with bcrypt password hashing
- ✅Default demo users seeded in database

### Phase 3: Automated Timetable Generation - COMPLETED
- ✅PDF syllabus extraction using pdf-parse
- ✅Genetic Algorithm implementation for optimal scheduling
- ✅Subject extraction with pattern matching
- ✅Conflict-free timetable generation
- ✅Fitness scoring for solution quality
- ✅AutoTimetableGenerator React component
- ✅Multi-step wizard interface (Upload → Subjects → Generate → Review)
- ✅Database tables for subjects, rooms, and generated timetables
- ✅Room and teacher availability constraints
- ✅Admin interface for automated generation
- ✅Complete backend API endpoints for timetable generation
- ✅File upload handling with multer
- ✅Genetic Algorithm with crossover, mutation, and fitness evaluation
- ✅Pattern-based subject extraction from PDF syllabi
- ✅Admin dashboard integration with both manual and automated options
- ✅Comprehensive error handling and fallback mechanisms

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database driver for serverless environments
- **drizzle-orm**: Type-safe ORM for database operations
- **drizzle-zod**: Schema validation integration
- **connect-pg-simple**: PostgreSQL session store for Express
- **@tanstack/react-query**: Server state management and caching

### UI Dependencies
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant management
- **lucide-react**: Icon library

### Development Dependencies
- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundling for production
- **vite**: Development server and build tool

## Deployment Strategy

### Development Environment
- Hot module replacement with Vite
- TypeScript compilation checking
- Development server proxy for API routes
- Replit-specific development features integrated

### Production Build
- Client-side build using Vite to `/dist/public`
- Server-side bundle using esbuild to `/dist`
- Single production command serves both static files and API
- Environment variable configuration for database connections

### Database Management
- Drizzle migrations in `/migrations` directory
- Schema definitions in `/shared/schema.ts`
- Database push command for development schema updates
- PostgreSQL URL configuration through environment variables

### File Structure
```
├── client/          # Frontend React application
├── server/          # Backend Express application  
├── shared/          # Shared types and schemas
├── migrations/      # Database migration files
└── dist/           # Production build output
```

The application is structured as a monorepo with clear separation between frontend, backend, and shared code, making it scalable and maintainable for future feature additions.