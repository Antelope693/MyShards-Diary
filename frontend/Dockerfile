FROM node:20-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 设置构建时的环境变量（使用相对路径，由nginx代理）
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# 构建应用
RUN npm run build

# 生产环境使用nginx
FROM nginx:alpine

# 复制构建产物到nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

