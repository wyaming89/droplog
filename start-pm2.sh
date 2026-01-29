#!/bin/bash

# 点滴健康 - PM2 启动脚本（生产环境）

echo "=========================================="
echo "  点滴健康 - PM2 启动"
echo "=========================================="

# 检查 PM2 是否安装
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 未安装，正在安装..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        echo "❌ PM2 安装失败，请手动安装: npm install -g pm2"
        exit 1
    fi
    echo "✅ PM2 安装成功"
fi

# 创建日志目录
mkdir -p logs

# 检查前端是否已构建
if [ ! -d "frontend/dist" ]; then
    echo "⚠️  前端未构建，正在构建..."
    
    # 检查前端依赖
    if [ ! -d "frontend/node_modules" ]; then
        echo "📦 安装前端依赖..."
        npm run install:frontend
    fi
    
    # 构建前端
    echo "🔨 构建前端..."
    npm run build:frontend
    
    if [ $? -ne 0 ]; then
        echo "❌ 前端构建失败"
        exit 1
    fi
    echo "✅ 前端构建成功"
else
    echo "✅ 前端已构建"
fi

# 检查是否已经在运行
if pm2 list | grep -q "health-records-app"; then
    echo "⚠️  应用已在运行，正在重启..."
    pm2 restart health-records-app
else
    echo "🚀 启动应用..."
    pm2 start ecosystem.config.js
fi

# 显示状态
echo ""
echo "=========================================="
echo "应用状态:"
pm2 status
echo ""
echo "访问地址: https://droplog.top"
echo "查看日志: npm run pm2:logs"
echo "查看监控: npm run pm2:monit"
echo "停止应用: npm run pm2:stop"
echo "=========================================="