# 🥮 中秋在线博饼 - 服务器部署与联机指南

本博饼项目采用 **自适应双模引擎** 设计：
- **多人联机模式 (推荐)**：启动 Node.js 全双工服务，支持所有在线玩家同桌同屏实时博饼、瓷碗摇骰全桌广播、实时奖池同步。
- **本地单机模式 (自适应兜底)**：若仅作为纯静态网页部署或未配置好 Node 后端，前端将自动无缝接管，完整运行排队、博饼规则、奖池计算等，**绝不会提示“加入排队失败”报错**。

---

## 🚀 方式一：Node.js 服务端部署（开启全服多人同桌联机）

### 1. 环境准备
- Node.js 18.x 或更高版本
- npm 或 pnpm / yarn

### 2. 构建与启动
在项目根目录下依次执行：

```bash
# 1. 安装依赖
npm install

# 2. 编译打包前端与后端服务
npm run build

# 3. 启动服务（默认监听 3000 端口）
npm start
```

### 3. 使用 PM2 进行后台常驻运行（生产环境推荐）
```bash
# 全局安装 pm2（如未安装）
npm install -g pm2

# 启动博饼服务
pm2 start dist/server.cjs --name "bobing-game"

# 设置开机自启
pm2 save
pm2 startup
```

---

## 🌐 方式二：Nginx 反向代理配置（支持域名 + HTTPS + 实时 SSE 广播）

如果在服务器上使用 Nginx 绑定域名，需要将请求反代至 Node 服务的 3000 端口。

特别注意：**博饼多人实时广播依赖 Server-Sent Events (SSE)，需在 Nginx 中关闭 `proxy_buffering`，否则实时广播会被 Nginx 缓存导致延迟！**

```nginx
server {
    listen 80;
    server_name your-domain.com; # 替换为您自己的域名或服务器公网 IP

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # 保持连接与 WebSocket / SSE 兼容
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # ★ 关键配置：关闭代理缓冲，确保全桌摇骰毫秒级实时推送
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

---

## 🏰 方式三：宝塔面板部署流程

1. 在宝塔面板进入 **“网站” -> “Node项目”**。
2. 添加 Node 项目：
   - **项目目录**：选择上传的代码解压目录
   - **启动选项**：`dist/server.cjs`
   - **项目端口**：`3000`
   - **运行用户**：`www`
3. 在设置中绑定您的域名，并配置 SSL 证书。
4. 在站点的 Nginx 配置文件中加上 `proxy_buffering off;` 即可开启极致顺畅的多人同桌博饼！
