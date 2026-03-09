FROM node:20-slim

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 复制所有文件
COPY . .

# 构建前端
RUN npm run build

# 暴露端口 (Hugging Face 默认使用 7860)
EXPOSE 7860

# 启动服务器 (修改 server.ts 以监听 7860)
ENV PORT=7860
CMD ["npm", "start"]
