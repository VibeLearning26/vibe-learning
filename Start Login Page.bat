@echo off
title DoubtHub Login Server
echo ===================================================
echo Starting DoubtHub 3D Login Page...
echo ===================================================
echo.
echo Please leave this window open while you view the page!
echo.
start "" cmd /c "timeout /t 1 /nobreak >nul && start "" http://localhost:8000/auth.html"
where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8000
) else (
  py -m http.server 8000
)
