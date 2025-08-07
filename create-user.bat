@echo off
echo 🔧 Creating Test User for Road Alert System
echo ==========================================

cd /d "c:\Users\marks\OneDrive\Documents\finalcapstone\backend"

echo 📧 Creating test user with email: test@example.com
echo 🔑 Password will be: password123
echo.

node create-test-user.js

echo.
echo ✅ Test user setup complete!
echo.
echo You can now use these credentials:
echo Email: test@example.com
echo Password: password123
echo.

pause
