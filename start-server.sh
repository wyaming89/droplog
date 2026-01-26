#!/bin/bash

# 健康指标记录应用 - 开发服务器启动脚本

PORT=8000

echo "=========================================="
echo "  健康指标记录应用 - 开发服务器"
echo "=========================================="
echo ""
echo "服务器启动在: http://localhost:${PORT}"
echo "手机访问: 请使用电脑的IP地址:${PORT}"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "=========================================="
echo ""

# 检查Python版本
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    python -m http.server $PORT
else
    echo "错误: 未找到Python，请安装Python 3"
    exit 1
fi
