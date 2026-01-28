@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ==========================================
echo   日记系统部署脚本
echo ==========================================
echo.

REM 检查是否存在 .env 文件
if not exist .env (
    echo ❌ 错误: 未找到 .env 配置文件
    echo.
    echo 请先创建配置文件:
    echo   1. 复制模板: copy env.example .env
    echo   2. 编辑配置: notepad .env
    echo   3. 填写必要的配置信息（至少填写 MAINTAINER_*、JWT_SECRET 和 SERVER_DOMAIN）
    echo.
    pause
    exit /b 1
)

REM 检查 Docker 是否运行
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: Docker 未运行或未安装
    echo.
    echo 请确保 Docker Desktop 正在运行
    echo.
    pause
    exit /b 1
)

echo 📋 开始部署...
echo.

REM 停止现有容器
echo 1️⃣  停止现有容器...
docker-compose -f docker-compose.prod.yml down 2>nul

REM 构建镜像
echo.
echo 2️⃣  构建 Docker 镜像...
docker-compose -f docker-compose.prod.yml build --no-cache
if errorlevel 1 (
    echo ❌ 构建失败
    pause
    exit /b 1
)

REM 启动服务
echo.
echo 3️⃣  启动服务...
docker-compose -f docker-compose.prod.yml up -d
if errorlevel 1 (
    echo ❌ 启动失败
    pause
    exit /b 1
)

REM 等待服务启动
echo.
echo 4️⃣  等待服务启动...
timeout /t 10 /nobreak >nul

REM 检查服务状态
echo.
echo 5️⃣  检查服务状态...
docker-compose -f docker-compose.prod.yml ps

echo.
echo ==========================================
echo ✅ 部署完成！
echo ==========================================
echo.
echo 📝 访问信息:
echo   - 前端地址: http://localhost
echo   - 管理页面: http://localhost/admin
echo.
echo 📊 查看日志:
echo   - docker-compose -f docker-compose.prod.yml logs -f
echo.
echo 🛑 停止服务:
echo   - docker-compose -f docker-compose.prod.yml down
echo.

pause

