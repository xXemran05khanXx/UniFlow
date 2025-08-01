#!/bin/bash
set -e

echo "Starting build process..."

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm ci --only=production

# Install frontend dependencies and build
echo "Installing frontend dependencies..."
cd ../frontend
npm ci
echo "Building React frontend..."
npm run build

# Copy build files to backend
echo "Setting up production files..."
cd ../backend
mkdir -p public
cp -r ../frontend/build/* public/

echo "Build completed successfully!"
echo "Backend will serve React app from /backend/public/"
