@echo off
title Launch Trendum Kiosk App
echo ==========================================
echo    STARTING TRENDUM AS NATIVE APP...
echo ==========================================

:: Закрываем старые браузеры
taskkill /F /IM chrome.exe >nul 2>&1
taskkill /F /IM msedge.exe >nul 2>&1

:: Создаем отдельную локальную папку данных чтобы Windows не просил пароли
if not exist "D:\Trendum2\kiosk_data" mkdir "D:\Trendum2\kiosk_data"

set APP_PATH=file:///D:/Trendum2/kiosk-ui/index.html
set APP_FLAGS=--app="%APP_PATH%" --start-fullscreen --user-data-dir="D:\Trendum2\kiosk_data" --no-first-run --no-default-browser-check --disable-sync --password-store=basic --disable-save-password-bubble --use-fake-ui-for-media-stream

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo Launching App via Chrome...
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" %APP_FLAGS%
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    echo Launching App via Chrome...
    start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" %APP_FLAGS%
) else (
    echo Launching App via Edge...
    start "" msedge %APP_FLAGS%
)

echo Success! Kiosk App Started.
