#!/usr/bin/env powershell
# Mobile Network Troubleshooting Script for RoadAlert

Write-Host "🔍 RoadAlert Mobile Network Troubleshooting" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Get network information
Write-Host "1️⃣ Network Information:" -ForegroundColor Yellow
$LocalIP = (Get-NetIPConfiguration | Where-Object {$_.IPv4DefaultGateway -ne $null}).IPv4Address.IPAddress
Write-Host "  Local IP: $LocalIP" -ForegroundColor White
Write-Host "  Client App URL: http://$LocalIP:5175" -ForegroundColor Green
Write-Host "  Backend API URL: http://$LocalIP:3001" -ForegroundColor Green
Write-Host ""

# Check if services are running
Write-Host "2️⃣ Service Status:" -ForegroundColor Yellow
$ViteProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like "*vite*"}
$BackendProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like "*server.js*"}

if ($ViteProcess) {
    Write-Host "  ✅ Client App (Vite) is running" -ForegroundColor Green
} else {
    Write-Host "  ❌ Client App (Vite) is NOT running" -ForegroundColor Red
}

if ($BackendProcess) {
    Write-Host "  ✅ Backend API is running" -ForegroundColor Green
} else {
    Write-Host "  ❌ Backend API is NOT running" -ForegroundColor Red
}
Write-Host ""

# Check ports
Write-Host "3️⃣ Port Status:" -ForegroundColor Yellow
$Port5175 = Test-NetConnection -ComputerName $LocalIP -Port 5175 -InformationLevel Quiet
$Port3001 = Test-NetConnection -ComputerName $LocalIP -Port 3001 -InformationLevel Quiet

if ($Port5175) {
    Write-Host "  ✅ Port 5175 (Client App) is accessible" -ForegroundColor Green
} else {
    Write-Host "  ❌ Port 5175 (Client App) is NOT accessible" -ForegroundColor Red
}

if ($Port3001) {
    Write-Host "  ✅ Port 3001 (Backend API) is accessible" -ForegroundColor Green
} else {
    Write-Host "  ❌ Port 3001 (Backend API) is NOT accessible" -ForegroundColor Red
}
Write-Host ""

# Check Windows Firewall
Write-Host "4️⃣ Windows Firewall Status:" -ForegroundColor Yellow
try {
    $FirewallProfile = Get-NetFirewallProfile -Profile Domain,Public,Private
    foreach ($profile in $FirewallProfile) {
        $status = if ($profile.Enabled) { "ENABLED" } else { "DISABLED" }
        $color = if ($profile.Enabled) { "Red" } else { "Green" }
        Write-Host "  $($profile.Name) Profile: $status" -ForegroundColor $color
    }
} catch {
    Write-Host "  Unable to check firewall status" -ForegroundColor Yellow
}
Write-Host ""

# Check for existing firewall rules
Write-Host "5️⃣ Firewall Rules for Node.js:" -ForegroundColor Yellow
$NodeRules = Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Node*" -or $_.DisplayName -like "*node*"} | Select-Object DisplayName, Enabled, Direction
if ($NodeRules) {
    foreach ($rule in $NodeRules) {
        $status = if ($rule.Enabled) { "ENABLED" } else { "DISABLED" }
        $color = if ($rule.Enabled) { "Green" } else { "Red" }
        Write-Host "  $($rule.DisplayName) ($($rule.Direction)): $status" -ForegroundColor $color
    }
} else {
    Write-Host "  ❌ No Node.js firewall rules found" -ForegroundColor Red
}
Write-Host ""

# Solutions
Write-Host "🔧 TROUBLESHOOTING SOLUTIONS:" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📱 For Mobile Access Issues:" -ForegroundColor Yellow
Write-Host "1. Ensure mobile device is on SAME WiFi network as this computer" -ForegroundColor White
Write-Host "2. Try accessing: http://$LocalIP:5175 from mobile browser" -ForegroundColor White
Write-Host "3. If timeout/connection refused, continue with firewall fixes below" -ForegroundColor White
Write-Host ""

Write-Host "🔥 Windows Firewall Solutions:" -ForegroundColor Yellow
Write-Host "Option A - Quick Fix (Temporarily disable firewall):" -ForegroundColor White
Write-Host "  Run as Administrator: netsh advfirewall set allprofiles state off" -ForegroundColor Gray
Write-Host "  ⚠️  Remember to re-enable after testing!" -ForegroundColor Red
Write-Host ""
Write-Host "Option B - Create specific firewall rules:" -ForegroundColor White
Write-Host "  1. Open Windows Defender Firewall with Advanced Security" -ForegroundColor Gray
Write-Host "  2. Create new Inbound Rules for ports 3001 and 5175" -ForegroundColor Gray
Write-Host "  3. Or run the firewall configuration script below" -ForegroundColor Gray
Write-Host ""

Write-Host "🚀 Quick Start Commands:" -ForegroundColor Yellow
Write-Host "1. Start backend: npm run dev (in backend folder)" -ForegroundColor White
Write-Host "2. Start client: npm run dev (in client-app folder)" -ForegroundColor White
Write-Host "3. Configure firewall (run next script)" -ForegroundColor White
Write-Host ""

Write-Host "💡 Next Steps:" -ForegroundColor Green
Write-Host "Run: .\configure-firewall.ps1 (as Administrator)" -ForegroundColor White
Write-Host "Then test mobile access again" -ForegroundColor White
