# Buffer Killer App Starter Script

Write-Host "Starting Buffer Killer App..." -ForegroundColor Green

# Check if electron is installed locally
if (Test-Path ".\node_modules\.bin\electron.cmd") {
    Write-Host "Using local Electron..." -ForegroundColor Yellow
    & ".\node_modules\.bin\electron.cmd" .
}
# Check if electron is installed globally
elseif (Get-Command electron -ErrorAction SilentlyContinue) {
    Write-Host "Using global Electron..." -ForegroundColor Yellow
    electron .
}
else {
    Write-Host "ERROR: Electron is not installed!" -ForegroundColor Red
    Write-Host "Please run: npm install electron@28.0.0" -ForegroundColor Cyan
    Read-Host "Press Enter to exit"
}