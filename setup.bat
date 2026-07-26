@echo off
echo ===================================================
echo 🛠️ KASKU-AI AUTOMATIC 1-CLICK SETUP FOR NEW PC
echo ===================================================
echo.

if not exist .env (
    echo [1/3] Creating .env file from .env.example...
    copy .env.example .env
) else (
    echo [1/3] .env file already exists.
)

echo.
echo [2/3] Installing Backend Dependencies...
call npm install

echo.
echo [3/3] Installing Frontend Dependencies...
cd frontend
call npm install
cd ..

echo.
echo ===================================================
echo ✅ SETUP SELESAI! Selesai diinstall.
echo 🚀 Cukup jalankan "run.bat" atau "npm run app" untuk mulai.
echo ===================================================
pause
