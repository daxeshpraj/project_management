# IIS Client Deployment Script for Aemje Architect Project
# Run this script as Administrator on the physical server

Import-Module WebAdministration

$siteName = "Aemje ArchitectApp"
$port = 8089
$rootPath = $PSScriptRoot
$frontendPath = Join-Path $rootPath "frontend\build"
$backendPath = Join-Path $rootPath "backend"
$appPoolName = "Aemje ArchitectPool"

Write-Host "Setting up IIS for Aemje Architect Project at $rootPath..." -ForegroundColor Cyan

# 0. web.config templates + frontend build for IIS
$frontendPublicWebConfig = Join-Path $rootPath "frontend\public\web.config"
$frontendWebConfigExample = Join-Path $rootPath "frontend\public\web.config.example"
if (!(Test-Path $frontendPublicWebConfig) -and (Test-Path $frontendWebConfigExample)) {
    Copy-Item $frontendWebConfigExample $frontendPublicWebConfig
    Write-Host "Copied frontend/public/web.config from example"
}

$backendWebConfig = Join-Path $backendPath "web.config"
$backendWebConfigExample = Join-Path $backendPath "web.config.example"
if (!(Test-Path $backendWebConfig) -and (Test-Path $backendWebConfigExample)) {
    Copy-Item $backendWebConfigExample $backendWebConfig
    Write-Host "Copied backend/web.config from example (edit %PYTHON_PATH% in file)"
}

Write-Host "Building frontend for IIS (REACT_APP_BACKEND_URL=http://localhost:$port)..." -ForegroundColor Cyan
Push-Location (Join-Path $rootPath "frontend")
npm install
$env:REACT_APP_BACKEND_URL = "http://localhost:$port"
npm run build
Pop-Location

# 1. Create App Pool
if (!(Test-Path "IIS:\AppPools\$appPoolName")) {
    Write-Host "Creating App Pool: $appPoolName"
    New-WebAppPool -Name $appPoolName
}
Set-ItemProperty "IIS:\AppPools\$appPoolName" -Name "managedRuntimeVersion" -Value ""

# 2. Create Site
if (!(Test-Path "IIS:\Sites\$siteName")) {
    Write-Host "Creating Content Site: $siteName on port $port"
    New-Website -Name $siteName -Port $port -PhysicalPath $frontendPath -ApplicationPool $appPoolName
} else {
    Write-Host "Updating Site: $siteName"
    Set-ItemProperty "IIS:\Sites\$siteName" -Name "physicalPath" -Value $frontendPath
}

# 3. Create API Application
$apiAppPath = "IIS:\Sites\$siteName\api"
if (!(Test-Path $apiAppPath)) {
    Write-Host "Creating API Application at /api"
    New-WebApplication -Site $siteName -Name "api" -PhysicalPath $backendPath -ApplicationPool $appPoolName
} else {
    Write-Host "Updating API Application"
    Set-ItemProperty $apiAppPath -Name "physicalPath" -Value $backendPath
}

# 4. Set Permissions
Write-Host "Setting folder permissions..."
icacls $rootPath /grant "IIS AppPool\$($appPoolName):(OI)(CI)F" /T

# 5. Create log directory
$logPath = Join-Path $rootPath "logs"
if (!(Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath
}
$backendLogPath = Join-Path $backendPath "logs"
if (!(Test-Path $backendLogPath)) {
    New-Item -ItemType Directory -Path $backendLogPath
}

Write-Host "IIS Setup Complete! Access your app at http://localhost:$port" -ForegroundColor Green
Write-Host "Note: Ensure HttpPlatformHandler v1.2 is installed and Python is in the system PATH." -ForegroundColor Yellow
