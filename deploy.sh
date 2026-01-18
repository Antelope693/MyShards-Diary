#!/bin/bash

# ============================================
# 日记系统部署脚本
# ============================================

set -e

echo "=========================================="
echo "  日记系统部署脚本"
echo "=========================================="
echo ""

# 检查是否存在 .env 文件
if [ ! -f .env ]; then
    echo "❌ 错误: 未找到 .env 配置文件"
    echo ""
    echo "请先创建配置文件:"
    echo "  1. 复制模板: cp env.example .env"
    echo "  2. 编辑配置: nano .env (或使用其他编辑器)"
    echo "  3. 填写必要的配置信息（至少填写 MAINTAINER_*, JWT_SECRET 和 SERVER_DOMAIN）"
    echo ""
    exit 1
fi

# 加载环境变量
source .env

# 检查必要的配置
required_vars=("MAINTAINER_USERNAME" "MAINTAINER_EMAIL" "MAINTAINER_PASSWORD" "JWT_SECRET")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ] || [[ "${!var}" == *"change"* ]]; then
    echo "❌ 错误: 请在 .env 中正确设置 ${var}"
    exit 1
  fi
done

if [ -z "$SERVER_DOMAIN" ] || [ "$SERVER_DOMAIN" = "your-domain.com" ]; then
    echo "⚠️  警告: SERVER_DOMAIN 未设置，将使用默认值"
    SERVER_DOMAIN=${SERVER_DOMAIN:-localhost}
fi

echo "📋 配置信息:"
echo "  - 服务器域名: ${SERVER_DOMAIN}"
echo "  - 前端端口: ${FRONTEND_PORT:-80}"
echo "  - 后端端口: ${BACKEND_PORT:-3001}"
echo "  - 环境: ${NODE_ENV:-production}"
echo ""

# 确认部署
read -p "确认开始部署? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "部署已取消"
    exit 0
fi

echo ""
echo "🚀 开始部署..."
echo ""

# 停止现有容器
echo "1️⃣  停止现有容器..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# 构建镜像
echo ""
echo "2️⃣  构建 Docker 镜像..."
docker-compose -f docker-compose.prod.yml build --no-cache

# 启动服务
echo ""
echo "3️⃣  启动服务..."
docker-compose -f docker-compose.prod.yml up -d

# 等待服务启动
echo ""
echo "4️⃣  等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo "5️⃣  检查服务状态..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "📝 访问信息:"
if [ "$FRONTEND_PORT" = "80" ]; then
    echo "  - 前端地址: http://${SERVER_DOMAIN}"
else
    echo "  - 前端地址: http://${SERVER_DOMAIN}:${FRONTEND_PORT}"
fi
echo "  - 管理页面: http://${SERVER_DOMAIN}/admin"
echo ""
echo "🔐 登录信息:"
echo "  - 首次登录账号: ${MAINTAINER_USERNAME} (${MAINTAINER_EMAIL})"
echo ""
echo "📊 查看日志:"
echo "  - docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🛑 停止服务:"
echo "  - docker-compose -f docker-compose.prod.yml down"
echo ""

