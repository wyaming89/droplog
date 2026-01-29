#!/bin/bash

# 点滴健康 - 一键部署脚本

echo "=========================================="
echo "  点滴健康 - 部署"
echo "=========================================="

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull

# 安装后端依赖
echo "📦 安装后端依赖..."
npm install

# 安装前端依赖
echo "📦 安装前端依赖..."
npm run install:frontend

# 构建前端
echo "🔨 构建前端..."
npm run build:frontend

if [ $? -ne 0 ]; then
    echo "❌ 前端构建失败"
    exit 1
fi

# 重启 PM2
echo "🔄 重启应用..."
if pm2 list | grep -q "health-records-app"; then
    pm2 restart health-records-app
else
    pm2 start ecosystem.config.js
fi

# 显示状态
echo ""
echo "=========================================="
echo "✅ 部署完成！"
pm2 status
echo ""
echo "访问地址: https://droplog.top"
echo "=========================================="
