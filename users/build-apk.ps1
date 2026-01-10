# Quick APK Build Script for BantayDalan
# Builds and syncs the Android APK with all optimizations

Write-Host "📱 BantayDalan APK Builder" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# Navigate to users directory
Set-Location -Path "$PSScriptRoot"

# Step 1: Install dependencies
Write-Host "📦 Step 1: Checking dependencies..." -ForegroundColor Yellow
npm install --silent 2>$null

# Step 2: Build web app
Write-Host "🔨 Step 2: Building web application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Check for errors above." -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Web build complete" -ForegroundColor Green

# Step 3: Sync Capacitor
Write-Host "🔄 Step 3: Syncing Capacitor..." -ForegroundColor Yellow
npx cap sync android

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Capacitor sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Capacitor sync complete" -ForegroundColor Green

# Step 4: Build APK
$gradlePath = "$PSScriptRoot\android\gradlew.bat"

if (Test-Path $gradlePath) {
    Write-Host "🔨 Step 4: Building APK..." -ForegroundColor Yellow
    
    Set-Location -Path "$PSScriptRoot\android"
    & .\gradlew.bat assembleDebug --warning-mode=none
    
    if ($LASTEXITCODE -eq 0) {
        $apkPath = "$PSScriptRoot\android\app\build\outputs\apk\debug\app-debug.apk"
        
        if (Test-Path $apkPath) {
            # Copy to easy location
            $outputPath = "$PSScriptRoot\BantayDalan-latest.apk"
            Copy-Item $apkPath $outputPath -Force
            
            $apkSize = [math]::Round((Get-Item $outputPath).Length / 1MB, 2)
            
            Write-Host ""
            Write-Host "==========================================" -ForegroundColor Green
            Write-Host "✅ APK BUILD SUCCESSFUL!" -ForegroundColor Green
            Write-Host "==========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "📦 APK Location: $outputPath" -ForegroundColor Cyan
            Write-Host "📊 APK Size: $apkSize MB" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "💡 Install on device:" -ForegroundColor White
            Write-Host "   adb install -r `"$outputPath`"" -ForegroundColor Gray
            Write-Host ""
        }
    } else {
        Write-Host "❌ APK build failed!" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Try building from Android Studio:" -ForegroundColor Yellow
        Write-Host "   npx cap open android" -ForegroundColor Gray
    }
} else {
    Write-Host "📱 Step 4: Opening Android Studio..." -ForegroundColor Yellow
    npx cap open android
    Write-Host ""
    Write-Host "💡 In Android Studio:" -ForegroundColor Yellow
    Write-Host "   Build → Build Bundle(s) / APK(s) → Build APK(s)" -ForegroundColor Gray
}

Set-Location -Path "$PSScriptRoot"
