# Road Alert Deployment Script for Windows
Write-Host "Starting Road Alert Deployment Process..." -ForegroundColor Green

# Check if we're in the users directory
if (!(Test-Path "package.json")) {
    Write-Host "Please run this script from the users directory" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Build the project
Write-Host "Building project..." -ForegroundColor Yellow
npm run build

# Check if build was successful
if (Test-Path "dist") {
    Write-Host "Build successful! dist folder created." -ForegroundColor Green
    
    # Calculate build size
    $size = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum
    $sizeInMB = [math]::Round($size / 1MB, 2)
    Write-Host "Build size: $sizeInMB MB" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Ready for Vercel deployment!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Go to vercel.com"
    Write-Host "2. Connect your GitHub repository"
    Write-Host "3. Set root directory to 'users'"
    Write-Host "4. Deploy!"
    Write-Host ""
    Write-Host "Or use Vercel CLI:" -ForegroundColor Yellow
    Write-Host "  npx vercel --prod"
} else {
    Write-Host "Build failed! Check the errors above." -ForegroundColor Red
    exit 1
}