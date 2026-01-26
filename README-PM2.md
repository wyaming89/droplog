# PM2 生产环境部署指南

## 快速开始

### 1. 安装 PM2（如果未安装）

```bash
npm install -g pm2
```

### 2. 启动应用

```bash
# 方式一：使用启动脚本（推荐）
./start-pm2.sh    # Linux/macOS
start-pm2.bat     # Windows

# 方式二：使用 npm 脚本
npm run pm2:start
```

### 3. 查看状态和日志

```bash
# 查看应用状态
npm run pm2:status
# 或
pm2 status

# 查看日志
npm run pm2:logs
# 或
pm2 logs health-records-app

# 查看监控面板
npm run pm2:monit
# 或
pm2 monit
```

## 常用命令

```bash
# 启动
npm run pm2:start

# 停止
npm run pm2:stop

# 重启
npm run pm2:restart

# 查看日志
npm run pm2:logs

# 查看状态
npm run pm2:status

# 监控面板
npm run pm2:monit

# 删除应用（从 PM2 列表中移除）
npm run pm2:delete
```

## 开机自启动

### Linux/macOS

```bash
# 1. 保存当前进程列表
pm2 save

# 2. 生成启动脚本
pm2 startup

# 3. 按照提示执行生成的命令（需要 root 权限）
```

### Windows

使用 `pm2-windows-startup` 或任务计划程序。

## PM2 配置文件说明

配置文件：`ecosystem.config.js`

主要配置项：
- `instances: 1` - 实例数量（单进程）
- `autorestart: true` - 自动重启
- `max_memory_restart: '500M'` - 内存超过 500MB 时重启
- `min_uptime: '10s'` - 最小运行时间
- `max_restarts: 10` - 最大重启次数
- `restart_delay: 4000` - 重启延迟（毫秒）

## 日志管理

日志文件位置：`./logs/`

- `err.log` - 错误日志
- `out.log` - 输出日志
- `combined.log` - 合并日志

日志会自动轮转，避免文件过大。

## 故障排查

### 应用无法启动

1. 检查端口是否被占用：
```bash
lsof -i :8000  # Linux/macOS
netstat -ano | findstr :8000  # Windows
```

2. 检查 `.env` 文件配置是否正确

3. 查看错误日志：
```bash
pm2 logs health-records-app --err
```

### 应用频繁重启

1. 查看日志找出错误原因
2. 检查数据库连接
3. 检查系统资源（内存、CPU）

### 查看详细错误信息

```bash
pm2 show health-records-app
```

## 性能优化

如需更高性能，可以：

1. 增加实例数（集群模式）：
```javascript
// ecosystem.config.js
instances: 2  // 或 'max' 使用所有 CPU 核心
```

2. 调整内存限制：
```javascript
max_memory_restart: '1G'
```