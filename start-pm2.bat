@echo off
REM 健康指标记录应用 - PM2 启动脚本（生产环境，Windows）

echo ==========================================
echo   健康指标记录应用 - PM2 启动
echo ==========================================

REM 检查 PM2 是否安装
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ PM2 未安装，正在安装...
    call npm install -g pm2
    if %errorlevel% neq 0 (
        echo ❌ PM2 安装失败，请手动安装: npm install -g pm2
        pause
        exit /b 1
    )
    echo ✅ PM2 安装成功
)

REM 创建日志目录
if not exist logs mkdir logs

REM 检查是否已经在运行
pm2 list | findstr /C:"health-records-app" >nul 2>nul
if %errorlevel% equ 0 (
    echo ⚠️  应用已在运行，正在重启...
    call pm2 restart health-records-app
) else (
    echo 🚀 启动应用...
    call pm2 start ecosystem.config.js
)

REM 显示状态
echo.
echo ==========================================
echo 应用状态:
call pm2 status
echo.
echo 访问地址: https://droplog.top
echo 查看日志: npm run pm2:logs
echo 查看监控: npm run pm2:monit
echo 停止应用: npm run pm2:stop
echo ==========================================
pause