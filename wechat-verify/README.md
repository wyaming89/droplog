# 微信验证文件说明

## 用途

用于微信公众平台、微信小程序的域名验证，确保在微信中正常访问。

## 验证文件类型

### 1. 微信公众号域名验证

文件名格式：`MP_verify_xxxxx.txt`

- 在微信公众平台 → **设置** → **公众号设置** → **功能设置** → **JS接口安全域名** 或 **网页授权域名** 中配置
- 下载验证文件，上传到服务器

### 2. 微信小程序域名验证

文件名格式：`MP_verify_xxxxx.txt` 或其他指定文件名

- 在微信小程序后台 → **开发** → **开发管理** → **开发设置** → **服务器域名** 中配置

## 使用方法

### 1. 获取验证文件

从微信后台下载验证文件（通常是 `MP_verify_xxxxx.txt`，其中 `xxxxx` 是随机字符串）。

### 2. 上传验证文件到服务器

```bash
# 将验证文件上传到验证目录
sudo cp /path/to/MP_verify_xxxxx.txt /var/www/wechat-verify/

# 设置权限
sudo chmod 644 /var/www/wechat-verify/MP_verify_xxxxx.txt
sudo chown www-data:www-data /var/www/wechat-verify/MP_verify_xxxxx.txt
```

### 3. 验证访问

在浏览器访问：
- `https://droplog.top/MP_verify_xxxxx.txt`

应能直接看到文件内容（通常是验证码字符串）。

### 4. 在微信后台完成验证

回到微信后台，点击"验证"或"保存"，微信会访问该文件进行验证。

## 注意事项

1. **文件必须放在根目录**：验证文件必须能通过 `https://droplog.top/文件名` 访问
2. **HTTPS 必须**：微信要求使用 HTTPS
3. **文件内容不能修改**：保持微信提供的原始内容
4. **多个验证文件**：如果有多个验证文件，都放在 `/var/www/wechat-verify/` 目录

## 目录结构

```
/var/www/wechat-verify/
├── MP_verify_xxxxx1.txt  # 第一个验证文件
├── MP_verify_xxxxx2.txt  # 第二个验证文件（如有）
└── ...
```

## 故障排查

### 无法访问验证文件

1. 检查文件是否存在：
   ```bash
   ls -la /var/www/wechat-verify/
   ```

2. 检查 Nginx 配置是否包含验证文件 location

3. 检查文件权限：
   ```bash
   ls -l /var/www/wechat-verify/MP_verify_xxxxx.txt
   # 应为 -rw-r--r-- www-data www-data
   ```

4. 测试访问：
   ```bash
   curl https://droplog.top/MP_verify_xxxxx.txt
   ```
