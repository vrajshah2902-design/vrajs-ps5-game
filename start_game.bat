@echo off
title OVERSTEER // PS5 Drift Racer Launcher
echo ========================================================
echo   OVERSTEER - PS5 DualSense Drift Racer
echo ========================================================
echo.
echo Starting local web server on http://localhost:8080 ...
echo Connect your PS5 Controller via USB or Bluetooth!
echo.

start "" "http://localhost:8080"
python -m http.server 8080

pause
