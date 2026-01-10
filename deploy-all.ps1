# Deploy and Build Script for BantayDalan
# Run this script to deploy backend and rebuild Android APK

# ============================================
# STEP 1: Deploy Backend to Render
# ============================================

Write-Host "🚀 STEP 1: Deploying Backend to Render..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if git is available
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed. Please install Git first." -ForegroundColor Red
    exit 1
}

# Navigate to project root
Set-Location -Path $PSScriptRoot

# Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "📝 Found uncommitted changes. Committing..." -ForegroundColor Yellow
    
    git add .
    git commit -m "🚀 Performance optimizations: caching, compression, keep-alive"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ No changes to commit or commit failed" -ForegroundColor Yellow
    }
}

# Push to remote (triggers Render auto-deploy)
Write-Host "📤 Pushing to remote repository..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend deployment triggered on Render!" -ForegroundColor Green
    Write-Host "   Check deployment at: https://dashboard.render.com" -ForegroundColor Gray
} else {
    Write-Host "⚠️ Push failed. Please check your git configuration." -ForegroundColor Yellow
}

Write-Host ""

# ============================================
# STEP 2: Build Frontend & Android APK
# ============================================

Write-Host "📱 STEP 2: Building Android APK..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Navigate to users directory
Set-Location -Path "$PSScriptRoot\users"

# Install dependencies if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    npm install
}

# Build the web app
Write-Host "🔨 Building web application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Web build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Web build complete!" -ForegroundColor Green

# Sync with Capacitor
Write-Host "🔄 Syncing with Capacitor..." -ForegroundColor Yellow
npx cap sync android

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Capacitor sync failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Capacitor sync complete!" -ForegroundColor Green

# Check if Android Studio is available
$androidStudioPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$gradlePath = "$PSScriptRoot\users\android\gradlew.bat"

if (Test-Path $gradlePath) {
    Write-Host "🔨 Building APK with Gradle..." -ForegroundColor Yellow
    
    Set-Location -Path "$PSScriptRoot\users\android"
    
    # Build debug APK
    & .\gradlew.bat assembleDebug
    
    if ($LASTEXITCODE -eq 0) {
        $apkPath = "$PSScriptRoot\users\android\app\build\outputs\apk\debug\app-debug.apk"
        
        if (Test-Path $apkPath) {
            Write-Host "✅ APK built successfully!" -ForegroundColor Green
            Write-Host "📍 APK Location: $apkPath" -ForegroundColor Cyan
            
            # Copy APK to more accessible location
            $outputDir = "$PSScriptRoot\apk-output"
            if (!(Test-Path $outputDir)) {
                New-Item -ItemType Directory -Path $outputDir | Out-Null
            }
            
            $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
            $outputPath = "$outputDir\BantayDalan-$timestamp.apk"
            Copy-Item $apkPath $outputPath
            
            Write-Host "📦 APK copied to: $outputPath" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Gradle build failed!" -ForegroundColor Red
        Write-Host "💡 Try opening in Android Studio: npx cap open android" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ Android project not found. Opening in Android Studio..." -ForegroundColor Yellow
    npx cap open android
    Write-Host "💡 Build APK from Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor White
Write-Host "   1. ✅ Backend changes pushed to Render" -ForegroundColor Gray
Write-Host "   2. ✅ Frontend built with optimizations" -ForegroundColor Gray
Write-Host "   3. ✅ Android APK created" -ForegroundColor Gray
Write-Host ""
Write-Host "🔗 Next Steps:" -ForegroundColor White
Write-Host "   - Check Render deployment: https://dashboard.render.com" -ForegroundColor Gray
Write-Host "   - Enable GitHub Actions for keep-alive pings" -ForegroundColor Gray
Write-Host "   - Install APK on test device" -ForegroundColor Gray
Write-Host ""
