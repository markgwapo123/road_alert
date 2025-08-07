@echo off
echo 🚀 Starting Road Alert Backend Server
echo ======================================

REM Change to backend directory
cd /d "c:\Users\marks\OneDrive\Documents\finalcapstone\backend"

echo 📁 Current directory: %CD%
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    echo.
)

REM Check if uploads directory exists
if not exist "uploads" (
    echo 📁 Creating uploads directory...
    mkdir uploads
)

echo 🔧 Starting backend server...
echo 📡 Server will be available at: http://192.168.1.150:3001
echo 🛑 Press Ctrl+C to stop the server
echo.

node server.js

pause
