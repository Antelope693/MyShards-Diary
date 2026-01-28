#!/bin/bash

echo "🚀 启动MyShards应用..."
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 未找到 Docker，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ 未找到 docker-compose，请先安装 docker-compose"
    exit 1
fi

# 构建并启动服务
echo "📦 构建 Docker 镜像..."
docker-compose build

echo ""
echo "🚀 启动服务..."
docker-compose up -d

echo ""
echo "✅ 服务已启动！"
echo ""
echo "📝 访问地址："
echo "   - 前端：http://localhost:3000"
echo "   - 管理页面：http://localhost:3000/admin"
echo "   - 后端API：http://localhost:3001"
echo ""
echo "查看日志：docker-compose logs -f"
echo "停止服务：docker-compose down"

