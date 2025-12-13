# Mobile App Rebuild Script
# Run this whenever you make changes to the mobile app

Write-Host "📱 BantayDalan Mobile App - Rebuild Process" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Navigate to users folder
Write-Host "Step 1: Navigating to users folder..." -ForegroundColor Yellow
Set-Location -Path "D:\copy\road_alert\users"
Write-Host "✓ Location: $PWD" -ForegroundColor Green
Write-Host ""

# Step 2: Build the web assets
Write-Host "Step 2: Building web assets with Vite..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed! Please check errors above." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Web assets built successfully" -ForegroundColor Green
Write-Host ""

# Step 3: Sync to Capacitor
Write-Host "Step 3: Syncing to Android with Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Capacitor sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Capacitor sync completed" -ForegroundColor Green
Write-Host ""

# Step 4: Open Android Studio
Write-Host "Step 4: Opening Android Studio..." -ForegroundColor Yellow
Write-Host "Please wait for Android Studio to load..." -ForegroundColor Cyan
npx cap open android

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "📱 Next Steps in Android Studio:" -ForegroundColor Cyan
Write-Host "1. Wait for Gradle sync to complete" -ForegroundColor White
Write-Host "2. Click: Build → Build Bundle(s) / APK(s) → Build APK(s)" -ForegroundColor White
Write-Host "3. Wait for build to complete (~2-3 minutes)" -ForegroundColor White
Write-Host "4. Find APK at: users\android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor White
Write-Host "5. Transfer to phone and install" -ForegroundColor White
Write-Host "===========================================" -ForegroundColor Cyan
