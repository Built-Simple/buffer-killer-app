# Buffer Killer - Dependency Installer PowerShell Script

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  BUFFER KILLER - DEPENDENCY INSTALLER" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to the app directory
Set-Location -Path "C:\buffer-killer-app"

Write-Host "Installing all required dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes." -ForegroundColor Yellow
Write-Host ""

# Install all dependencies
Write-Host "[1/3] Installing core dependencies..." -ForegroundColor Green
npm install

Write-Host ""
Write-Host "[2/3] Ensuring all packages are installed..." -ForegroundColor Green
npm install googleapis oauth pkce-challenge crypto-js

Write-Host ""
Write-Host "[3/3] Installing build tools..." -ForegroundColor Green
npm install --save-dev electron-builder

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if installation was successful by testing imports
Write-Host "Verifying installation..." -ForegroundColor Yellow
node -e "try { require('googleapis'); console.log('✅ googleapis installed'); } catch { console.log('❌ googleapis missing'); }"
node -e "try { require('oauth'); console.log('✅ oauth installed'); } catch { console.log('❌ oauth missing'); }"
node -e "try { require('pkce-challenge'); console.log('✅ pkce-challenge installed'); } catch { console.log('❌ pkce-challenge missing'); }"
node -e "try { require('crypto-js'); console.log('✅ crypto-js installed'); } catch { console.log('❌ crypto-js missing'); }"

Write-Host ""
Write-Host "You can now:" -ForegroundColor Green
Write-Host "  1. Run the app: npm start" -ForegroundColor White
Write-Host "  2. Test platforms: npm test" -ForegroundColor White
Write-Host "  3. Quick test: npm run test:quick" -ForegroundColor White
Write-Host "  4. Test Twitter: npm run test:twitter" -ForegroundColor White
Write-Host "  5. Test GitHub: npm run test:github" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")