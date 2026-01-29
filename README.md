# 点滴健康

记录每日健康 - 一个简洁美观的手机端健康数据记录应用。

> **v2.0 更新**: 前端已重构为现代化的 React + TypeScript + Tailwind CSS 方案，采用暗色主题，支持底部导航、渐变色卡片、数字键盘输入等特性。

## 功能特性

- 📊 **灵活的健康指标记录**
  - 支持自定义指标（体温、心率、血氧、体重等）
  - 支持累计型指标（如每日饮水量）
  - 可在设置中启用/禁用指标

- 👥 **多用户支持**
  - 账号密码登录
  - 支持用户注册
  - 数据按用户隔离，每个用户只能查看自己的记录
  - 显示当前登录用户名

- 💾 **云端数据存储**
  - 使用 Supabase PostgreSQL 数据库存储数据
  - 数据安全可靠，支持多设备访问
  - 自动备份，数据不丢失

- 📱 **移动端优化**
  - 响应式设计，完美适配手机屏幕
  - 触摸友好的交互界面
  - 支持添加到主屏幕（PWA 风格）

- 🎨 **现代化 UI 设计（React 2.0）**
  - 暗色主题，护眼设计
  - 渐变色卡片，不同指标不同颜色
  - 底部导航栏（首页/趋势/我的）
  - 数字键盘模态框输入
  - Framer Motion 流畅动画

- 📈 **数据可视化**
  - Recharts 趋势图表
  - 历史记录管理
  - 数据统计分析

## 环境配置

### 1. 配置数据库连接

确保项目根目录有 `.env` 文件，包含 Supabase PostgreSQL 连接信息及域名（可选）：

```env
postgres_username=your_username
postgres_database=postgres
postgres_password=your_password
postgres_port=6543
postgres_host=your_host.supabase.com

# 正式域名，用于 CORS 及日志显示（可选，默认 droplog.top）
DOMAIN=droplog.top

# JWT 密钥，用于登录态（务必修改）
JWT_SECRET=your-random-secret-key
```

### 2. 创建数据库表

在 Supabase 数据库管理界面执行 `schema.sql` 文件中的 SQL 语句，或使用命令行工具：

```bash
psql -h your_host -U your_username -d postgres -f schema.sql
```

### 3. 登录功能（用户表与迁移）

```bash
# 执行用户表迁移（创建 users 表，health_records 添加 user_id）
npm run migrate:users

# 创建首个用户（默认 admin / admin123，可通过 SEED_USERNAME、SEED_PASSWORD 覆盖）
npm run seed

# 【可选】将旧记录（user_id 为 NULL）分配给指定用户（默认 admin）
npm run migrate:old-records
# 或指定用户名：node scripts/migrate-old-records.js 用户名
```

首次部署后请修改默认密码，并在 `.env` 中设置 `JWT_SECRET`。

## 开发启动

### 安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
npm run install:frontend
```

### 构建前端

```bash
npm run build:frontend
```

### 启动服务器

```bash
npm start
```

服务器将启动在: **http://localhost:8000**

### 前端开发模式

```bash
# 启动前端开发服务器（端口 3000，热更新）
npm run dev:frontend

# 同时启动后端 API（另一个终端）
npm start
```

**注意**: 前端开发服务器会自动代理 `/api` 请求到后端 8000 端口。

### 访问地址

- **本地**: http://localhost:8000
- **公网域名**: https://droplog.top

### 域名部署（droplog.top）

1. 将域名 **droplog.top**（及可选 **www.droplog.top**）添加到 Cloudflare 管理。
2. 在 Cloudflare 创建 **Origin Certificate**（源站证书）。
3. 使用本项目提供的 **Nginx** 配置：见 [nginx/README.md](nginx/README.md)，含反代、SSL（Cloudflare Origin Certificate）与证书配置步骤。
4. 应用已配置 CORS 允许 `droplog.top`、`www.droplog.top`，无需额外修改。

### 微信验证文件配置

为支持在微信中正常访问，需要配置微信验证文件：

1. 从微信后台下载验证文件（通常是 `MP_verify_xxxxx.txt`）
2. 上传到服务器：`sudo cp MP_verify_xxxxx.txt /var/www/wechat-verify/`
3. 设置权限：`sudo chmod 644 /var/www/wechat-verify/MP_verify_xxxxx.txt`
4. 在微信后台完成验证

详细说明见：[wechat-verify/README.md](wechat-verify/README.md)

### 手机访问

1. **通过域名**: 在浏览器访问 https://droplog.top
2. **局域网**: 确保手机和电脑在同一网络，用 `http://你的电脑IP:8000` 访问

## 使用方法

1. **打开应用**
   - 本地开发：http://localhost:8000
   - 公网访问：https://droplog.top  
   - 未登录会跳转登录页；登录后使用，支持注册新账号与退出

2. **记录数据**
   - 输入体温（范围：30-45°C）
   - 输入心率（范围：30-220 bpm）
   - 输入血氧（范围：70-100%）
   - 输入体重（范围：20-300 kg）
   - 点击"保存记录"按钮

3. **查看历史**
   - 在页面下方查看所有历史记录
   - 记录按时间倒序排列（最新在前）

4. **添加到主屏幕（iOS）**
   - 在 Safari 浏览器中点击分享按钮
   - 选择"添加到主屏幕"

5. **添加到主屏幕（Android）**
   - 在 Chrome 浏览器中点击菜单
   - 选择"添加到主屏幕"

## 文件结构

```
easy_log/
├── frontend/           # React 前端 (v2.0)
│   ├── src/
│   │   ├── components/     # 组件（HealthCard, DataEntryModal 等）
│   │   ├── pages/          # 页面（HomePage, TrendPage, SettingsPage）
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── services/       # API 服务
│   │   └── types/          # TypeScript 类型
│   ├── dist/           # 构建输出（生产环境使用）
│   └── package.json
├── server.js           # 后端 API 服务器
├── schema.sql          # 数据库表结构
├── ecosystem.config.js # PM2 配置
├── package.json        # Node.js 项目配置
├── .env                # 环境变量配置（需自行创建）
├── scripts/            # 数据库迁移脚本
├── nginx/              # Nginx 反向代理与 SSL 配置
├── wechat-verify/      # 微信验证文件目录
├── index.html          # 旧版前端（备用）
├── style.css           # 旧版样式
├── script.js           # 旧版脚本
└── README.md           # 说明文档
```

## 技术说明

- **前端（v2.0）**：React 18 + TypeScript + Tailwind CSS + Vite
  - Framer Motion 动画
  - Recharts 图表
  - Lucide React 图标
- **后端**：Node.js + Express
- **数据库**：Supabase PostgreSQL
- **部署**：PM2 进程管理
- **兼容性**：支持所有现代浏览器

## 数据范围参考

### 正常范围（仅供参考）
- **体温**：36.1-37.2°C（正常范围可能因个体差异而不同）
- **心率**：60-100 bpm（静息状态）
- **血氧**：95-100%（正常）
- **体重**：因人而异，建议保持健康体重范围（BMI 18.5-24.9）

### 注意事项
- 本应用仅用于数据记录，不能替代医疗诊断
- 如有健康问题，请及时咨询专业医生
- 数据存储在 Supabase 云端数据库，需要网络连接
- 请妥善保管 `.env` 文件，不要泄露数据库密码

## 浏览器支持

- Chrome/Edge（推荐）
- Safari
- Firefox
- 其他现代浏览器

## API 接口

服务器提供以下 REST API 接口：

- `POST /api/login` - 用户登录
- `POST /api/register` - 用户注册
- `GET /api/me` - 获取当前用户信息（需登录）
- `GET /api/records` - 获取当前用户的健康记录（需登录）
- `POST /api/records` - 创建新的健康记录（需登录）
- `DELETE /api/records/:id` - 删除单条记录（需登录，仅本人）

## 改进计划

- [x] 云端数据存储（Supabase）
- [x] 用户认证和权限管理
- [x] 数据可视化图表（Recharts）
- [x] React 现代化前端重构
- [x] 灵活的指标配置系统
- [ ] 数据导出功能（CSV/JSON）
- [ ] 数据备份和恢复
- [ ] 提醒功能
- [ ] PWA 离线支持
