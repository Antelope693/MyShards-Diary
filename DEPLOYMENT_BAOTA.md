# MyShards Diary - 宝塔面板 (Baota) 部署攻略

本文档将指导你如何在宝塔面板上部署 MyShards Diary 项目。本项目包含 Node.js 后端和 React 前端。

## 1. 准备工作

*   **服务器**: 安装了 Linux 系统 (CentOS/Ubuntu/Debian) 的服务器。
*   **面板**: 已安装宝塔面板 (Test verified on 8.x)。
*   **域名**: `myshards.cn` (已解析到服务器 IP)。
*   **项目文件**: 本地 `d:\work\Diary` 的所有文件。

## 2. 环境安装 (软件商店)

在宝塔面板的【软件商店】中安装以下应用：
1.  **Nginx** (推荐 1.21+)
2.  **MySQL** (推荐 5.7 或 8.0) - *如果只使用 SQLite 可跳过，但生产环境推荐 MySQL*
3.  **Node.js 版本管理器** (必需)
    *   安装后，在设置中安装 **Node.js v18.x** 或更高版本 (推荐 v20)。
    *   设置 v18/v20 为默认版本。
4.  **PM2 管理器** (可选，Node.js 版本管理器常自带 PM2，用于守护进程)。

## 3. 上传项目

1.  在宝塔【文件】中，进入 `/www/wwwroot`。
2.  创建文件夹 `myshards.cn`。
3.  将本地 `d:\work\Diary` 下的所有文件（排除 `node_modules`）打包上传并解压到该目录。
    *   结构应为：
        *   `/www/wwwroot/myshards.cn/backend`
        *   `/www/wwwroot/myshards.cn/frontend`
        *   ...其他文件

## 4. 后端部署 (Backend)

1.  **打开终端** (在文件页面右键 -> 终端，或使用 SSH)。
2.  进入后端目录：
    ```bash
    cd /www/wwwroot/myshards.cn/backend
    ```
3.  **安装依赖**:
    ```bash
    npm install
    # 或者使用淘宝源
    npm install --registry=https://registry.npmmirror.com
    ```
4.  **配置环境变量**:
    *   复制 `.env` 模板 (如果还没有，创建一个): `cp .env.example .env` (或者直接新建)
    *   编辑 `.env` 文件 (`r`):
    ```env
    PORT=3001
    # JWT 密钥，修改为随机长字符串
    JWT_SECRET=Set_A_Complex_Secret_Here_!@#
    
    # 数据库配置 (选择 SQLite 或 PostgreSQL/MySQL)
    # 默认 SQLite (无需配置，直接可用):
    DB_TYPE=sqlite
    
    # 如果使用 PostgreSQL/MySQL (需对应安装):
    # DB_TYPE=postgres
    # DB_HOST=127.0.0.1
    # DB_USER=diary
    # DB_PASSWORD=your_password
    # DB_NAME=diary_db
    
    # 管理员初始密码 (仅首次启动有效)
    ADMIN_PASSWORD=admin123
    ```
5.  **编译后端 (TS -> JS)**:
    ```bash
    npm run build
    ```
6.  **启动服务**:
    *   使用 PM2 启动以保证后台运行:
    ```bash
    pm2 start dist/index.js --name "diary-backend"
    ```
    *   检查状态: `pm2 status` 或 `curl http://127.0.0.1:3001/api/auth/verify`

## 5. 前端部署 (Frontend)

1.  进入前端目录：
    ```bash
    cd /www/wwwroot/myshards.cn/frontend
    ```
2.  **配置环境变量**:
    *   创建/编辑 `.env` 或 `.env.production`:
    ```env
    # 指向你的域名/api (通过 Nginx 转发)
    VITE_API_URL=https://myshards.cn/api
    ```
3.  **安装依赖**:
    ```bash
    npm install --registry=https://registry.npmmirror.com
    ```
4.  **构建项目**:
    ```bash
    npm run build
    ```
    *   完成后会生成 `dist` 目录 (`/www/wwwroot/myshards.cn/frontend/dist`)。这个目录就是网站的静态文件。

## 6. 添加网站 (Nginx 配置)

1.  在宝塔【网站】菜单 -> 【添加站点】。
2.  **域名**: `myshards.cn`
3.  **根目录**: 选择 `/www/wwwroot/myshards.cn/frontend/dist` (注意是 dist 目录!)
4.  **PHP版本**: 纯静态 (Static)
5.  提交创建。

## 7. 配置反向代理与重写

点击刚刚创建的网站名（配置）：

### 7.1 配置 SSL (HTTPS)
1.  进入【SSL】菜单。
2.  选择【Let's Encrypt】。
3.  勾选域名，申请证书。
4.  申请成功后，开启【强制 HTTPS】。

### 7.2 配置后端接口转发 (反向代理)
1.  进入【反向代理】菜单。
2.  添加反向代理：
    *   **代理名称**: `API`
    *   **目标URL**: `http://127.0.0.1:3001` (后端的端口)
    *   **发送域名**: `$host`
3.  **重要**: 默认反向代理会代理所有请求。我们需要点击【配置文件】手动修改，或者更简单的方法是：
    *   **不要**直接在UI添加“整站”反向代理，因为我们还需要托管前端静态文件。
    *   **推荐做法**: 直接修改【配置文件】。
    
    进入【配置文件】菜单，在 `server` 块中（在 `root` 配置下方）添加以下内容：

    ```nginx
    # 1. API 转发
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 2. 图片上传文件夹转发 (如果使用了本地文件存储)
    location /uploads {
        alias /www/wwwroot/myshards.cn/backend/uploads;
    }
    
    # 3. 前端路由支持 (刷新不白屏)
    location / {
        try_files $uri $uri/ /index.html;
    }
    ```

    *注意：如果你的根目录 `root` 已经是 `/www/wwwroot/myshards.cn/frontend/dist`，上面的配置就完美了。*

## 8. 验证

1.  访问 `https://myshards.cn`。
2.  应该能看到前端页面。
3.  打开 F12 -> Network，尝试登录或获取数据，请求应指向 `https://myshards.cn/api/...` 并且成功 (200 OK)。

## 9. 维护

*   **更新代码**:
    1.  上传新代码。
    2.  前端：重新 `npm run build`。
    3.  后端：重新 `npm run build`，然后 `pm2 restart diary-backend`。
*   **查看日志**: `pm2 logs diary-backend` (后端) 或 Nginx 日志 (前端/代理)。

---
如果有问题，请检查：
1.  宝塔【安全】菜单是否放行了 80/443 端口？
2.  后端是否启动成功 (`pm2 status`)？
3.  `.env` 中的配置是否正确？
