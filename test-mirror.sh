#!/bin/bash

# 测试 Alpine 镜像源是否可用
# 使用方法: ./test-mirror.sh

echo "=========================================="
echo "测试 Alpine 镜像源可用性"
echo "=========================================="
echo ""

# 测试默认源
echo "1. 测试默认源 (dl-cdn.alpinelinux.org)..."
timeout 30 apk update --repository=http://dl-cdn.alpinelinux.org/alpine/v3.19/main 2>&1 | head -5
if [ $? -eq 0 ]; then
    echo "✅ 默认源可用"
else
    echo "❌ 默认源不可用或超时"
fi
echo ""

# 测试阿里云镜像
echo "2. 测试阿里云镜像 (mirrors.aliyun.com)..."
sed -i.bak 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories 2>/dev/null || true
timeout 30 apk update 2>&1 | head -5
if [ $? -eq 0 ]; then
    echo "✅ 阿里云镜像可用"
else
    echo "❌ 阿里云镜像不可用或超时"
    # 恢复原配置
    mv /etc/apk/repositories.bak /etc/apk/repositories 2>/dev/null || true
fi
echo ""

# 测试清华大学镜像
echo "3. 测试清华大学镜像 (mirrors.tuna.tsinghua.edu.cn)..."
sed -i.bak 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories 2>/dev/null || true
timeout 30 apk update 2>&1 | head -5
if [ $? -eq 0 ]; then
    echo "✅ 清华大学镜像可用"
else
    echo "❌ 清华大学镜像不可用或超时"
    mv /etc/apk/repositories.bak /etc/apk/repositories 2>/dev/null || true
fi
echo ""

# 测试中科大镜像
echo "4. 测试中科大镜像 (mirrors.ustc.edu.cn)..."
sed -i.bak 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories 2>/dev/null || true
timeout 30 apk update 2>&1 | head -5
if [ $? -eq 0 ]; then
    echo "✅ 中科大镜像可用"
else
    echo "❌ 中科大镜像不可用或超时"
    mv /etc/apk/repositories.bak /etc/apk/repositories 2>/dev/null || true
fi
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="

