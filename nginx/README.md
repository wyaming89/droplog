# Nginx 配置说明（droplog.top - Cloudflare）

将 `droplog.top` 反代到本机 Node 应用（`http://127.0.0.1:8000`），使用 **Cloudflare Origin Certificate**（源站证书）启用 HTTPS。

## 前置条件

- 已安装 Nginx
- 域名 `droplog.top`、`www.droplog.top` 已在 Cloudflare 管理
- 已在 Cloudflare 创建 **Origin Certificate**（源站证书）
- 本机 80、443 端口可访问

## 一、获取 Cloudflare Origin Certificate

### 1. 在 Cloudflare Dashboard 创建证书

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择域名 `droplog.top`
3. 进入 **SSL/TLS** → **Origin Server**
4. 点击 **Create Certificate**
5. 配置：
   - **Private key type**: RSA (2048)
   - **Hostnames**: 
     - `droplog.top`
     - `*.droplog.top`（可选，支持子域名）
   - **Certificate Validity**: 15 年（默认）
6. 点击 **Create**，保存：
   - **Origin Certificate**（证书内容，保存为 `.pem`）
   - **Private Key**（私钥，保存为 `.key`）

### 2. 上传证书到服务器

将证书和私钥上传到服务器，建议放在 `/etc/ssl/cloudflare/`：

```bash
# 创建证书目录
sudo mkdir -p /etc/ssl/cloudflare

# 上传证书文件（使用 scp 或其他方式）
# 将证书内容保存为 droplog.top.pem
# 将私钥保存为 droplog.top.key

# 设置权限
sudo chmod 600 /etc/ssl/cloudflare/droplog.top.key
sudo chmod 644 /etc/ssl/cloudflare/droplog.top.pem
sudo chown root:root /etc/ssl/cloudflare/droplog.top.*
```

**注意**：如果证书放在其他位置，请修改 Nginx 配置中的证书路径。

## 二、配置 Nginx

### 1. 安装 Nginx（如未安装）

```bash
sudo apt update
sudo apt install -y nginx
```

### 2. 复制配置文件

在**项目根目录**执行：

```bash
# 使用标准配置（推荐）
sudo cp nginx/droplog.top.conf /etc/nginx/sites-available/droplog.top

# 或使用带 IP 白名单的配置（Full (strict) 模式推荐）
# sudo cp nginx/droplog.top.cloudflare.conf /etc/nginx/sites-available/droplog.top
```

### 3. 修改证书路径（如需要）

如果证书不在 `/etc/ssl/cloudflare/`，编辑配置文件：

```bash
sudo nano /etc/nginx/sites-available/droplog.top
```

修改这两行：
```nginx
ssl_certificate     /你的证书路径/droplog.top.pem;
ssl_certificate_key /你的证书路径/droplog.top.key;
```

### 4. 启用配置

```bash
# 创建符号链接
sudo ln -sf /etc/nginx/sites-available/droplog.top /etc/nginx/sites-enabled/

# 删除默认站点（可选）
sudo rm -f /etc/nginx/sites-enabled/default

# 检查配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

## 三、Cloudflare SSL/TLS 模式设置

在 Cloudflare Dashboard → **SSL/TLS** → **Overview**，选择：

- **Full (strict)**（推荐）：Cloudflare ↔ 源站使用 Origin Certificate 加密
- **Full**：Cloudflare 接受自签名证书（不推荐）
- **Flexible**：仅 Cloudflare ↔ 用户加密（不推荐，源站不加密）

**推荐使用 Full (strict)**，并启用 IP 白名单配置（`droplog.top.cloudflare.conf`）。

## 四、启用 IP 白名单（可选，推荐）

如果使用 **Full (strict)** 模式，建议限制只有 Cloudflare IP 可以访问源站：

1. 使用 `droplog.top.cloudflare.conf` 配置
2. 取消注释 IP 白名单检查：

```nginx
# 在 server 块中取消注释：
if ($cloudflare_ip != 1) {
    return 403;
}
```

这样可以防止绕过 Cloudflare 直接访问源站。

## 五、常用命令

```bash
# 检查配置
sudo nginx -t

# 重载配置（不中断服务）
sudo systemctl reload nginx

# 重启 Nginx
sudo systemctl restart nginx

# 查看状态
sudo systemctl status nginx

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 查看访问日志
sudo tail -f /var/log/nginx/access.log
```

## 六、配置文件说明

| 文件 | 用途 |
|------|------|
| `droplog.top.conf` | 标准配置：HTTP 重定向到 HTTPS，443 反代到 Node |
| `droplog.top.cloudflare.conf` | 带 IP 白名单：限制只有 Cloudflare 可访问源站 |

## 七、验证

1. **HTTP 重定向**：访问 `http://droplog.top` → 应 301 跳转到 `https://droplog.top`
2. **HTTPS 访问**：访问 `https://droplog.top` → 应打开健康指标记录应用
3. **SSL 测试**：在浏览器检查证书，应显示 Cloudflare Origin CA

## 八、证书续期

Cloudflare Origin Certificate 有效期通常为 **15 年**，到期前在 Cloudflare Dashboard 重新创建并替换即可。

## 九、故障排查

### 证书错误

```bash
# 检查证书文件是否存在
sudo ls -la /etc/ssl/cloudflare/

# 检查证书内容
sudo openssl x509 -in /etc/ssl/cloudflare/droplog.top.pem -text -noout

# 检查私钥
sudo openssl rsa -in /etc/ssl/cloudflare/droplog.top.key -check
```

### 502 Bad Gateway

- 检查 Node 应用是否运行：`pm2 status` 或 `systemctl status your-app`
- 检查端口 8000 是否监听：`sudo netstat -tlnp | grep 8000`

### 403 Forbidden（启用 IP 白名单后）

- 检查是否从 Cloudflare 访问（不是直接访问源站 IP）
- 检查 Cloudflare IP 白名单配置是否正确
