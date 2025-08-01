# Render Deployment Quick Guide

## Prerequisites
1. ✅ Git repository (GitHub/GitLab)
2. ✅ MongoDB Atlas account (free tier)
3. ✅ Render account

## Step-by-Step Deployment

### 1. Push your code to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Set up MongoDB Atlas
1. Go to https://cloud.mongodb.com
2. Create free cluster
3. Create database user
4. Get connection string (looks like: mongodb+srv://username:password@cluster.mongodb.net/uniflow)

### 3. Deploy on Render
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Use these settings:
   - **Name**: uniflow-app (or any name you prefer)
   - **Environment**: Node
   - **Build Command**: 
     ```
     cd frontend && npm ci && npm run build && cd ../backend && npm ci && mkdir -p public && cp -r ../frontend/build/* public/
     ```
   - **Start Command**: 
     ```
     cd backend && npm start
     ```

### 4. Set Environment Variables
In Render dashboard → Environment, add:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/uniflow
JWT_SECRET=your-super-secret-random-string-here
NODE_ENV=production
```

### 5. Deploy!
- Click "Create Web Service"
- Wait for deployment (5-10 minutes)
- Your app will be available at: https://your-app-name.onrender.com

## Demo Credentials for Your Team
- **Admin**: admin@uniflow.edu / password123
- **Teacher**: teacher@uniflow.edu / password123

## Features to Show Your Team
1. 🔐 **Login System** - Role-based access
2. 🎯 **Timetable Generator** - Multiple algorithms
3. 📊 **Quality Metrics** - Real-time scheduling assessment
4. 📄 **Export Features** - CSV and JSON downloads
5. 📅 **Interactive Calendar** - Visual timetable display

## Troubleshooting
- If deployment fails, check the build logs in Render dashboard
- Make sure MongoDB connection string is correct
- Verify environment variables are set properly

## Free Tier Limitations
- App sleeps after 15 minutes of inactivity
- First request after sleep may take 30+ seconds
- 750 hours/month (enough for demos and testing)
