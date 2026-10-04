@echo off
title Publish Vraj's PS5 Game to GitHub Pages
echo ========================================================
echo   Publishing Vraj's PS5 Game to GitHub Pages
echo ========================================================
echo.
echo Make sure you have created the empty repository on GitHub first:
echo https://github.com/new?name=vrajs-ps5-game
echo.
echo Pushing code to https://github.com/vrajshah2902-design/vrajs-ps5-game ...
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   SUCCESSFULLY PUSHED TO GITHUB!
    echo ========================================================
    echo.
    echo Final step to make it live on Google / Web:
    echo 1. Open: https://github.com/vrajshah2902-design/vrajs-ps5-game/settings/pages
    echo 2. Under 'Build and deployment', set Branch to 'main' and click 'Save'.
    echo 3. Your game will be live at:
    echo    https://vrajshah2902-design.github.io/vrajs-ps5-game/
) else (
    echo.
    echo Please make sure the repo 'vrajs-ps5-game' is created on GitHub, then try again.
)
echo.
pause
