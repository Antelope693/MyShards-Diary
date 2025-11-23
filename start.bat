@echo off
chcp 65001 >nul
echo 🚀 启动MyShards应用...
echo.

REM 检查 Docker 是否安装
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未找到 Docker，请先安装 Docker
    exit /b 1
)

where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 未找到 docker-compose，请先安装 docker-compose
    exit /b 1
)

REM 检查 Docker 是否运行
docker ps >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] Docker 未运行，请先启动 Docker Desktop
    echo 请打开 Docker Desktop 并等待其完全启动后再试
    pause
    exit /b 1
)

REM 构建并启动服务
echo [信息] 构建 Docker 镜像...
docker-compose build
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 构建失败，请检查错误信息
    pause
    exit /b 1
)

echo.
echo [信息] 启动服务...
docker-compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 启动失败，请检查错误信息
    pause
    exit /b 1
)

echo.
echo [成功] 服务已启动！
echo.
echo [访问地址]
echo    - 前端：http://localhost:3000
echo    - 管理页面：http://localhost:3000/admin
echo    - 后端API：http://localhost:3001
echo.
echo [常用命令]
echo   查看日志：docker-compose logs -f
echo   停止服务：docker-compose down
echo   查看状态：docker-compose ps

pause

