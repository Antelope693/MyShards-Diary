# 🚀 快速部署指南

## 第一步：准备配置文件

1. **复制配置模板**
   ```bash
   cp env.example .env
   ```

2. **编辑配置文件**
   ```bash
   nano .env  # Linux/Mac
   # 或
   notepad .env  # Windows
   ```

3. **填写必要信息**
   
   必须填写的配置：
   - `ADMIN_PASSWORD`: 管理员密码（请设置强密码！）
   - `SERVER_DOMAIN`: 你的域名或IP地址
   
   示例：
   ```env
   ADMIN_PASSWORD=MySecurePassword123!
   SERVER_DOMAIN=diary.example.com
   # 或使用IP
   # SERVER_DOMAIN=192.168.1.100
   ```

## 第二步：部署

### Linux/Mac 系统

```bash
# 添加执行权限
chmod +x deploy.sh

# 运行部署脚本
./deploy.sh
```

### Windows 系统

```cmd
deploy.bat
```

### 手动部署

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## 第三步：访问

部署成功后，访问：
- **前端地址**: `http://your-domain.com` 或 `http://your-ip`
- **管理页面**: `http://your-domain.com/admin`

使用你在 `.env` 中设置的 `ADMIN_PASSWORD` 登录管理页面。

## 📚 更多信息

详细部署说明请查看：[部署说明.md](./部署说明.md)

## ⚠️ 重要提示

1. **首次部署前必须修改 `ADMIN_PASSWORD`**
2. **如果使用域名，确保域名已正确解析到服务器IP**
3. **确保服务器防火墙开放了相应端口（默认80）**

