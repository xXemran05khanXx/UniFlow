# Uniflow Setup Guide - Step by Step

This guide will walk you through setting up the Uniflow project on your local computer from scratch.

## 📋 Prerequisites Checklist

Before starting, make sure you have these installed:

### Required Software
- [ ] **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- [ ] **PostgreSQL** (version 13 or higher) - [Download here](https://www.postgresql.org/download/)
- [ ] **Git** - [Download here](https://git-scm.com/downloads)
- [ ] **Code Editor** (VS Code recommended) - [Download here](https://code.visualstudio.com/)

### Verify Installation
Open your terminal/command prompt and run these commands:

```bash
# Check Node.js version
node --version
# Should show v18.x.x or higher

# Check npm version
npm --version
# Should show 8.x.x or higher

# Check PostgreSQL
psql --version
# Should show PostgreSQL version

# Check Git
git --version
# Should show git version
```

## 🚀 Step-by-Step Setup

### Step 1: Clone the Project
```bash
# Navigate to your projects directory
cd /path/to/your/projects

# Clone the repository (replace with your actual repo URL)
git clone https://github.com/your-username/uniflow.git

# Enter the project directory
cd uniflow
```

### Step 2: Install Dependencies
```bash
# Install all project dependencies
npm install

# This will install both frontend and backend dependencies
# Wait for the installation to complete (may take 2-3 minutes)
```

### Step 3: Database Setup

#### Option A: Local PostgreSQL Setup

1. **Start PostgreSQL Service**
   ```bash
   # On Windows (if using PostgreSQL installer)
   # PostgreSQL should start automatically
   
   # On macOS (using Homebrew)
   brew services start postgresql
   
   # On Linux (Ubuntu/Debian)
   sudo service postgresql start
   ```

2. **Create Database and User**
   ```bash
   # Connect to PostgreSQL as superuser
   psql -U postgres
   
   # In the PostgreSQL prompt, run these commands:
   CREATE DATABASE uniflow_db;
   CREATE USER uniflow_user WITH PASSWORD 'uniflow_password123';
   GRANT ALL PRIVILEGES ON DATABASE uniflow_db TO uniflow_user;
   \q
   ```

#### Option B: Cloud Database (Easier)

1. **Sign up for Neon** (recommended): https://neon.tech/
2. **Create a new project** called "Uniflow"
3. **Copy the connection string** (looks like: `postgresql://user:pass@host/db`)

### Step 4: Environment Configuration

1. **Create Environment File**
   ```bash
   # In the project root directory, create .env file
   touch .env
   ```

2. **Add Configuration** (edit `.env` file):
   ```env
   # Database Configuration
   # For local PostgreSQL:
   DATABASE_URL=postgresql://uniflow_user:uniflow_password123@localhost:5432/uniflow_db
   
   # For Neon cloud database (replace with your actual connection string):
   # DATABASE_URL=postgresql://user:password@host.neon.tech/dbname
   
   # Session Secret (generate a random string)
   SESSION_SECRET=your_super_secret_random_string_here_make_it_long_and_unique
   
   # Development Configuration
   NODE_ENV=development
   PORT=5000
   ```

### Step 5: Database Schema Setup
```bash
# Push the database schema to your database
npm run db:push

# You should see output like:
# ✓ Changes applied
```

### Step 6: Start the Development Server
```bash
# Start the development server
npm run dev

# You should see:
# [express] serving on port 5000
# 
# The application is now running at:
# http://localhost:5000
```

### Step 7: Test the Application

1. **Open your browser** and go to: `http://localhost:5000`

2. **Test Login** with demo credentials:
   - **Admin**: username: `admin123`, password: `password123`
   - **Teacher**: username: `teacher456`, password: `password123`
   - **Student**: username: `student123`, password: `password123`

## 🎯 Workflow Walkthrough

### Complete Admin Workflow: Automated Timetable Generation

#### 1. Login as Admin
- Go to `http://localhost:5000`
- Username: `admin123`
- Password: `password123`
- Click "Login"

#### 2. Access Auto Generation Feature
- You'll see the Admin Dashboard
- Look for the "Auto Generate" button with the 🧬 icon
- Click on it to open the automated timetable generator

#### 3. Upload Syllabus (Step 1)
- **Select Department**: Choose "Computer Science"
- **Select Year**: Choose "3rd Year" 
- **Select Division**: Choose "A"
- **Upload PDF**: Click the upload area and select a syllabus PDF file
  - The system will extract subjects automatically
  - If PDF extraction fails, it will use sample subjects
- Click "Upload & Extract Subjects"

#### 4. Review Subjects (Step 2)
- Review the automatically extracted subjects
- Each subject shows:
  - Subject name
  - Lecture hours per week
  - Lab hours per week
  - Total credits
- Adjust Genetic Algorithm parameters if needed:
  - **Population Size**: 50 (more = better quality, slower)
  - **Generations**: 100 (more = better optimization)
  - **Mutation Rate**: 0.1 (higher = more exploration)
  - **Crossover Rate**: 0.8 (mixing rate of solutions)
- Click "Generate Timetable"

#### 5. AI Generation Process (Step 3)
- The system runs the Genetic Algorithm
- You'll see a loading screen with progress information
- This takes 30-60 seconds depending on complexity
- The algorithm optimizes for:
  - No room conflicts
  - No teacher conflicts
  - Appropriate room types (labs vs classrooms)
  - Teacher availability
  - Consecutive lab sessions

#### 6. Review Generated Timetable (Step 4)
- View the automatically generated weekly timetable grid
- Check the **Fitness Score**:
  - 800-1000: Excellent (no major conflicts)
  - 600-799: Good (minor issues)
  - Below 600: Needs improvement
- Options:
  - **Accept & Save Timetable**: Saves to database and makes it active
  - **Regenerate**: Runs the algorithm again for a different solution

#### 7. Verify Results
- After accepting, the timetable is saved
- Students and teachers can now see the generated schedule
- Check other dashboards to see the results

### Student Workflow

#### 1. Login as Student
- Username: `student123`
- Password: `password123`

#### 2. View Timetable
- See department-specific timetable
- View today's classes
- Check weekly schedule grid
- All data comes from the generated timetables

### Teacher Workflow

#### 1. Login as Teacher
- Username: `teacher456`
- Password: `password123`

#### 2. View Teaching Schedule
- See personal teaching assignments
- View today's classes
- Check room assignments
- Monitor weekly workload

## 🔧 Development Workflow

### Making Changes

1. **Frontend Changes**
   ```bash
   # Frontend files are in client/src/
   # Changes auto-reload in browser
   # Edit components in client/src/components/
   # Edit pages in client/src/pages/
   ```

2. **Backend Changes**
   ```bash
   # Backend files are in server/
   # Server auto-restarts on changes
   # Edit API routes in server/routes.ts
   # Edit database operations in server/storage.ts
   ```

3. **Database Changes**
   ```bash
   # Edit schema in shared/schema.ts
   # Then push changes:
   npm run db:push
   ```

### Useful Commands

```bash
# Restart development server
# Press Ctrl+C to stop, then:
npm run dev

# View database data (if using local PostgreSQL)
psql -U uniflow_user -d uniflow_db

# Check logs
# Server logs appear in the terminal where you ran npm run dev

# Reset database (caution: deletes all data)
# Edit shared/schema.ts to add drop statements if needed
npm run db:push
```

## 🐛 Troubleshooting Common Issues

### Issue 1: "Database connection failed"
**Solution:**
```bash
# Check if PostgreSQL is running
# On Windows: Check Services
# On macOS: brew services list | grep postgresql
# On Linux: sudo service postgresql status

# Verify connection string in .env file
# Make sure database exists and user has permissions
```

### Issue 2: "Port 5000 already in use"
**Solution:**
```bash
# Find what's using port 5000
# On Windows:
netstat -ano | findstr :5000

# On macOS/Linux:
lsof -i :5000

# Kill the process or change port in .env:
PORT=5001
```

### Issue 3: "PDF upload not working"
**Solution:**
```bash
# Check file size (must be under 10MB)
# Verify file is actually a PDF
# Check browser console for errors (F12)
```

### Issue 4: "Genetic algorithm taking too long"
**Solution:**
- Reduce population size to 20-30
- Reduce generations to 50
- Use fewer subjects in the syllabus

### Issue 5: "Module not found" errors
**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📊 Understanding the System

### Key Files to Know

- **`client/src/pages/AdminDashboard.tsx`**: Admin interface
- **`client/src/components/AutoTimetableGenerator.tsx`**: AI generation wizard
- **`server/geneticAlgorithm.ts`**: Core AI algorithm
- **`server/pdfExtractor.ts`**: PDF text extraction
- **`server/routes.ts`**: All API endpoints
- **`shared/schema.ts`**: Database structure

### Database Tables

- **users**: Login credentials and user info
- **timetables**: Individual timetable entries
- **subjects**: Subject definitions with hours
- **rooms**: Available rooms and types
- **generatedTimetables**: AI-generated complete timetables
- **syllabusUploads**: PDF upload history

## 🎯 Next Steps

Once you have the system running:

1. **Try the Manual Entry**: Create timetables manually to understand the data structure
2. **Test PDF Upload**: Use various PDF syllabi to test extraction
3. **Experiment with GA Parameters**: See how they affect generation quality
4. **Add Your Own Data**: Create custom departments, rooms, and subjects
5. **Customize the Interface**: Modify the React components to fit your needs

## 💡 Tips for Success

1. **Start Simple**: Begin with manual timetable entries before trying AI generation
2. **Use Demo Data**: The system comes with sample users and rooms
3. **Monitor Fitness Scores**: Higher scores mean better timetables
4. **Check Browser Console**: F12 shows helpful error messages
5. **Read the Logs**: Terminal output shows server-side information

---

You now have a complete understanding of how to set up and use the Uniflow system! The automated timetable generation represents a sophisticated AI solution for real-world scheduling problems.