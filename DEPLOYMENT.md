# UniFlow - Timetable Management System

A comprehensive university timetable management system with automated scheduling, conflict detection, and export capabilities.

## Features

- 🎯 **Automated Timetable Generation** - Multiple algorithms (Greedy, Genetic, Constraint Satisfaction)
- 👥 **Role-Based Access** - Admin, Teacher, and Student dashboards
- 📊 **Quality Metrics** - Real-time scheduling quality assessment
- ⚠️ **Conflict Detection** - Automatic detection and resolution of scheduling conflicts
- 📄 **Export Functionality** - CSV and JSON export capabilities
- 🔒 **Authentication** - Secure JWT-based user authentication

## Tech Stack

### Frontend
- React 19.1.1 with TypeScript
- Redux Toolkit for state management
- React Router for navigation
- Axios for API calls
- Tailwind CSS for styling
- React Big Calendar for timetable visualization

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT Authentication
- bcryptjs for password hashing
- Advanced scheduling algorithms

## Demo Credentials

- **Admin**: admin@uniflow.edu / password123
- **Teacher**: teacher@uniflow.edu / password123

## Local Development

### Prerequisites
- Node.js (>= 14.0.0)
- MongoDB
- npm or yarn

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your MongoDB URI and JWT secret
   
   # Frontend
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env with your API URL
   ```

4. Start the development servers:
   ```bash
   # Start backend (port 5000)
   cd backend
   npm run dev
   
   # Start frontend (port 3000)
   cd frontend
   npm start
   ```

## Deployment on Render

### Step 1: Prepare Your Repository
1. Ensure all files are committed to your Git repository
2. Push to GitHub/GitLab

### Step 2: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with your GitHub/GitLab account

### Step 3: Deploy the Application

#### Option A: Using Render Dashboard
1. Click "New +" → "Web Service"
2. Connect your repository
3. Configure the service:
   - **Name**: uniflow-app
   - **Environment**: Node
   - **Build Command**: 
     ```bash
     cd frontend && npm install && npm run build && cd ../backend && npm install && mkdir -p public && cp -r ../frontend/build/* public/
     ```
   - **Start Command**: 
     ```bash
     cd backend && npm start
     ```

#### Option B: Using render.yaml (Infrastructure as Code)
1. The `render.yaml` file in the root directory contains the deployment configuration
2. Simply connect your repository and Render will automatically use this configuration

### Step 4: Set Environment Variables
In your Render service settings, add these environment variables:

**Required:**
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: A secure random string for JWT signing
- `NODE_ENV`: production

**Optional:**
- `FRONTEND_URL`: Your Render app URL (for CORS)

### Step 5: Database Setup
1. Create a MongoDB Atlas account (free tier available)
2. Create a cluster and database
3. Get the connection string and add it to `MONGODB_URI`

## Architecture

```
UniFlow/
├── frontend/          # React TypeScript application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── store/         # Redux store
│   │   └── types/         # TypeScript interfaces
├── backend/           # Node.js Express API
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Custom middleware
│   │   ├── models/        # MongoDB models
│   │   ├── routes/        # API routes
│   │   └── services/      # Business logic
└── academic-system/   # Data models and schemas
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Timetable
- `POST /api/timetable/generate` - Generate timetable
- `GET /api/timetable/export` - Export timetable (CSV/JSON)
- `GET /api/timetable/timeslots` - Get available time slots

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
