# 健康指标记录应用

一个简洁美观的手机端健康数据记录应用，用于记录和管理每日的体温、心率和血氧指标。

## 功能特性

- 📊 **四项核心指标记录**
  - 体温（°C）
  - 心率（bpm）
  - 血氧（%）
  - 体重（kg）

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

- 🎨 **现代化 UI 设计**
  - 渐变色主题
  - 流畅的动画效果
  - 直观的状态指示（正常/异常颜色）

- 📈 **历史记录查看**
  - 按时间倒序显示所有记录
  - 清晰的数据展示

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
npm install
```

### 启动服务器

```bash
npm start
```

服务器将启动在: **http://localhost:8000**

**注意**: 现在需要使用 Node.js 服务器（不再是静态文件服务器），因为需要连接 Supabase 数据库。

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
├── index.html          # 主页面（需登录）
├── login.html          # 登录 / 注册页
├── login.js            # 登录页脚本
├── style.css           # 样式文件
├── script.js           # 主站脚本（含鉴权）
├── server.js           # 后端 API 服务器
├── schema.sql          # 数据库表结构
├── migration_add_users.sql # 用户表迁移
├── package.json        # Node.js 项目配置
├── .env                # 环境变量配置（需自行创建）
├── scripts/
│   ├── migrate-users.js        # 执行用户表迁移
│   ├── migrate-old-records.js  # 迁移旧记录到指定用户
│   └── seed-user.js            # 创建首个用户
├── nginx/              # Nginx 反向代理与 SSL 配置（Cloudflare）
│   ├── droplog.top.conf              # 标准配置（HTTPS + 反代）
│   ├── droplog.top.cloudflare.conf   # 带 IP 白名单配置（Full strict 推荐）
│   └── README.md                     # 部署说明
├── wechat-verify/      # 微信验证文件目录
│   ├── README.md                     # 微信验证文件使用说明
│   └── MP_verify_EXAMPLE.txt         # 示例文件
├── start-server.sh     # 开发启动脚本
├── start-server.bat    # 开发启动脚本（Windows）
└── README.md           # 说明文档
```

## 技术说明

- **前端**：HTML + CSS + JavaScript（原生，无框架）
- **后端**：Node.js + Express
- **数据库**：Supabase PostgreSQL
- **数据存储**：PostgreSQL 数据库（通过 REST API）
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

## 未来可能的改进

- [x] 云端数据存储（Supabase）
- [ ] 用户认证和权限管理
- [ ] 数据导出功能（CSV/JSON）
- [ ] 数据可视化图表
- [ ] 数据统计和分析
- [ ] 数据备份和恢复
- [ ] 提醒功能
