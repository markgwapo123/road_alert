@echo off
echo ========================================
echo 🔥 RoadAlert Mobile Access Quick Fix
echo ========================================
echo.
echo This will temporarily disable Windows Firewall to test mobile access.
echo You can re-enable it after testing.
echo.
echo Current servers running:
echo - Backend API: http://192.168.1.9:3001
echo - Mobile App: http://192.168.1.9:5176
echo.
set /p choice="Disable Windows Firewall for testing? (y/n): "
if /i "%choice%"=="y" (
    echo.
    echo Disabling Windows Firewall...
    netsh advfirewall set allprofiles state off
    echo.
    echo ✅ Windows Firewall disabled!
    echo.
    echo 📱 NOW TRY ACCESSING FROM YOUR PHONE:
    echo    http://192.168.1.9:5176
    echo.
    echo ⚠️ IMPORTANT: Re-enable firewall when done testing:
    echo    Run this script again and choose 'r' to re-enable
    echo.
) else if /i "%choice%"=="r" (
    echo.
    echo Re-enabling Windows Firewall...
    netsh advfirewall set allprofiles state on
    echo.
    echo ✅ Windows Firewall re-enabled!
    echo.
) else (
    echo Operation cancelled.
)
echo.
pause
