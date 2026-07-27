@echo off
echo ===================================================
echo 🛡️ KASKU-AI PM2 AUTO-RECOVERY SETUP
echo ===================================================
echo.

REM 1. Install PM2 globally
echo [1/4] Installing PM2 (Process Manager)...
call npm install -g pm2
call npm install -g pm2-windows-startup

echo.
echo [2/4] Creating logs directory...
if not exist "logs" mkdir logs

echo.
echo [3/4] Starting all services with PM2...
call pm2 delete all 2>nul
call pm2 start ecosystem.config.js

echo.
echo [4/4] Setting up auto-start on Windows boot...
call pm2 save
call pm2-startup install

echo.
echo ===================================================
echo ✅ PM2 AUTO-RECOVERY SETUP SELESAI!
echo ===================================================
echo.
echo Perintah berguna:
echo   pm2 status        - Lihat status semua server
echo   pm2 logs          - Lihat log real-time
echo   pm2 restart all   - Restart semua server
echo   pm2 monit         - Dashboard monitoring terminal
echo.
echo 🌐 Backend API   : http://localhost:3000
echo 🎨 Frontend UI   : http://localhost:3001
echo.
echo 🛡️ Semua server akan AUTO-RESTART jika crash
echo 🔄 Semua server akan AUTO-START saat PC dinyalakan
echo ===================================================
pause
