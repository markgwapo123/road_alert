# RoadAlert Firewall Rules Setup
# Run this script as Administrator in PowerShell

Write-Host "🔥 Setting up Windows Firewall rules for RoadAlert mobile access..." -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "Then run: .\setup-firewall-rules.ps1" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Remove existing RoadAlert rules
Write-Host "🧹 Removing existing RoadAlert firewall rules..." -ForegroundColor Yellow
try {
    Get-NetFirewallRule -DisplayName "*RoadAlert*" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    Write-Host "  ✅ Existing rules removed" -ForegroundColor Green
} catch {
    Write-Host "  ℹ️ No existing rules found" -ForegroundColor Gray
}

Write-Host ""

# Create new firewall rules
Write-Host "🔧 Creating new firewall rules..." -ForegroundColor Yellow

$rules = @(
    @{Name="RoadAlert Client App (Port 5176)"; Port=5176; Protocol="TCP"},
    @{Name="RoadAlert Backend API (Port 3001)"; Port=3001; Protocol="TCP"}
)

$successCount = 0
foreach ($rule in $rules) {
    try {
        # Inbound rule
        New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -Protocol $rule.Protocol -LocalPort $rule.Port -Action Allow -Profile Any | Out-Null
        Write-Host "  ✅ Created: $($rule.Name)" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "  ❌ Failed: $($rule.Name) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📊 Results: $successCount/2 rules created successfully" -ForegroundColor $(if($successCount -eq 2){"Green"}else{"Yellow"})
Write-Host ""

# Test the ports
Write-Host "🧪 Testing port accessibility..." -ForegroundColor Yellow
$LocalIP = (Get-NetIPConfiguration | Where-Object {$_.IPv4DefaultGateway -ne $null}).IPv4Address.IPAddress

$Port5176Test = Test-NetConnection -ComputerName $LocalIP -Port 5176 -InformationLevel Quiet -WarningAction SilentlyContinue
$Port3001Test = Test-NetConnection -ComputerName $LocalIP -Port 3001 -InformationLevel Quiet -WarningAction SilentlyContinue

Write-Host "  Port 5176 (Client): $(if($Port5176Test){'✅ ACCESSIBLE'}else{'❌ NOT ACCESSIBLE'})" -ForegroundColor $(if($Port5176Test){"Green"}else{"Red"})
Write-Host "  Port 3001 (Backend): $(if($Port3001Test){'✅ ACCESSIBLE'}else{'❌ NOT ACCESSIBLE'})" -ForegroundColor $(if($Port3001Test){"Green"}else{"Red"})

Write-Host ""

# Final instructions
Write-Host "🎯 Mobile Access Instructions:" -ForegroundColor Cyan
Write-Host "1. Ensure your mobile device is on the same WiFi network" -ForegroundColor White
Write-Host "2. Open mobile browser and go to: http://$LocalIP`:5176" -ForegroundColor Green
Write-Host "3. The RoadAlert app should load successfully!" -ForegroundColor White
Write-Host ""

if ($successCount -eq 2 -and $Port5176Test) {
    Write-Host "✨ Setup complete! Try accessing the app from your mobile device now." -ForegroundColor Green
} else {
    Write-Host "⚠️ Some issues detected. If mobile access still fails, try:" -ForegroundColor Yellow
    Write-Host "   - Temporarily disable Windows Firewall completely" -ForegroundColor Gray
    Write-Host "   - Check your router settings for device isolation" -ForegroundColor Gray
    Write-Host "   - Verify your antivirus isn't blocking connections" -ForegroundColor Gray
}

Write-Host ""
Read-Host "Press Enter to exit"
