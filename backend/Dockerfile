FROM node:20-alpine

WORKDIR /app

# 安装构建依赖（sqlite3 需要编译原生模块）
# 添加 sqlite 库和构建工具
RUN apk add --no-cache \
    sqlite \
    sqlite-dev \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# 复制package文件
COPY package*.json ./

# 安装所有依赖（包括开发依赖，用于构建）
# 设置环境变量以优化构建
ENV npm_config_build_from_source=true
RUN npm install --verbose

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 删除开发依赖，只保留生产依赖
RUN npm prune --production

# 创建数据目录和上传目录
RUN mkdir -p /app/data /app/uploads

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["npm", "start"]

