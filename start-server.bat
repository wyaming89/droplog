@echo off
REM 健康指标记录应用 - 开发服务器启动脚本 (Windows)

set PORT=8000

echo ==========================================
echo   健康指标记录应用 - 开发服务器
echo ==========================================
echo.
echo 服务器启动在: http://localhost:%PORT%
echo 手机访问: 请使用电脑的IP地址:%PORT%
echo.
echo 按 Ctrl+C 停止服务器
echo ==========================================
echo.

REM 检查Python版本
python -m http.server %PORT% 2>nul
if errorlevel 1 (
    python3 -m http.server %PORT% 2>nul
    if errorlevel 1 (
        echo 错误: 未找到Python，请安装Python 3
        pause
        exit /b 1
    )
)
