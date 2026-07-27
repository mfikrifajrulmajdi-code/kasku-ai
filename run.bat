@echo off
echo ===================================================
echo 🚀 STARTING ZENTRA AI (BACKEND + NEXT.JS FRONTEND)
echo ===================================================
echo.

where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    echo [MODE: PM2 PRODUCTION AUTO-RECOVERY]
    echo 🛡️ Menjalankan Backend, Frontend, & Health Monitor via PM2...
    call pm2 start ecosystem.config.js
    echo.
    echo 📊 Status Server PM2:
    call pm2 status
    echo.
    echo 💡 Ketik "pm2 logs" untuk melihat log obrolan real-time.
) else (
    echo [MODE: INTERACTIVE RUNNER]
    echo 🟢 Menjalankan Backend (Port 3000) & Frontend (Port 3001)...
    node runAll.js
)

pause
