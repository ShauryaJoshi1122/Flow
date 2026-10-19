# 🌐 FlowDeck 100% Free Cloud Hosting & Deployment Guide

This complete guide walks you through deploying the entire **FlowDeck** ecosystem (**Backend + WebSocket Hub**, **React Dashboard**, and **Chrome Extension**) to the cloud for **$0 / month** using free-tier cloud platforms.

---

## 🗺️ Free Cloud Architecture

| Component | Recommended Free Platform | Free Limits & Features |
| :--- | :--- | :--- |
| **Backend API & WebSockets** | **Render.com** or **Koyeb** | 750 free hours/mo, Full WebSocket support, Free SSL/HTTPS |
| **Frontend Dashboard** | **Vercel** or **Cloudflare Pages** | Unlimited bandwidth, Global CDN, Automatic continuous deployment |
| **Extension Distribution** | **GitHub Releases** | Unlimited downloads, Versioning, Direct `.zip` delivery |
| **24/7 Uptime Keep-Alive** | **UptimeRobot** | Free 5-minute health check pings (prevents free dyno sleep) |

---

## 📁 Step 1: Push Code to a Free GitHub Repository

1. Initialize git in your project root:
   ```bash
   cd ~/flow
   git init
   git add .
   git commit -m "Initial commit of FlowDeck"
   ```
2. Create a new repository on [GitHub](https://github.com/new) (can be Private or Public).
3. Push your repository:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/flowdeck.git
   git branch -M main
   git push -u origin main
   ```

---

## 🚀 Step 2: Deploy Backend & WebSockets for Free on Render.com

Render offers free web services with native Node.js and WebSocket support.

### 1. Create Web Service on Render
1. Log in to [Render.com](https://render.com) (free signup with GitHub).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository `flowdeck`.
4. Configure the service settings:
   * **Name**: `flowdeck-backend`
   * **Root Directory**: `backend`
   * **Runtime**: `Node`
   * **Build Command**: `pnpm install && pnpm build` (or `npm install && npm run build`)
   * **Start Command**: `node dist/index.js`
   * **Instance Type**: **Free** ($0/month)

### 2. Configure Environment Variables in Render Dashboard
Go to the **Environment** tab on your Render service and add:
* `PORT` = `3001`
* `NODE_ENV` = `production`
* `CORS_ORIGIN` = `*` (or your dashboard Vercel domain)

Click **Deploy Web Service**. Once deployed, Render will provide a free URL such as:
`https://flowdeck-backend.onrender.com`

---

## ⚡ Step 3: Keep the Backend Awake 24/7 for Free

Render's free tier sleeps after 15 minutes of inactivity. You can keep it active 24/7 with zero cost:

1. Sign up for free at [UptimeRobot.com](https://uptimerobot.com).
2. Click **Add New Monitor**.
   * **Monitor Type**: `HTTP(s)`
   * **Friendly Name**: `FlowDeck Backend Keep-Alive`
   * **URL**: `https://flowdeck-backend.onrender.com/health`
   * **Monitoring Interval**: `Every 5 minutes`
3. Click **Create Monitor**. Your backend will now stay awake 24/7 with zero sleep lag.

---

## 🎨 Step 4: Deploy Web Dashboard for Free on Vercel

Vercel provides blazing-fast edge hosting with unlimited SSL.

### 1. Update Production URLs
In your dashboard source code or environment variables, connect to your live Render backend:
Create `dashboard/.env.production`:
```ini
VITE_API_URL=https://flowdeck-backend.onrender.com/api
VITE_WS_URL=wss://flowdeck-backend.onrender.com/ws
```

### 2. Deploy on Vercel
1. Log in to [Vercel.com](https://vercel.com) with GitHub.
2. Click **Add New Project** → Import `flowdeck`.
3. In project settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `dashboard`
   * **Build Command**: `pnpm build`
   * **Output Directory**: `dist`
4. Add Environment Variables:
   * `VITE_API_URL`: `https://flowdeck-backend.onrender.com/api`
   * `VITE_WS_URL`: `wss://flowdeck-backend.onrender.com/ws`
5. Click **Deploy**.
6. Within 30 seconds, your dashboard will be live at:
   `https://flowdeck.vercel.app`

---

## 🧩 Step 5: Configure & Distribute the Browser Extension

Now update the Chrome extension to point to your live cloud endpoints.

### 1. Update Extension Endpoint URLs
Open `extension/background/service-worker.js` and update the first two lines:
```javascript
// Replace localhost with your live cloud URLs:
const WS_URL = 'wss://flowdeck-backend.onrender.com/ws';
const API_URL = 'https://flowdeck-backend.onrender.com/api';
```

Also update `extension/manifest.json` host permissions:
```json
"host_permissions": [
  "https://labs.google/*",
  "https://*.google.com/*",
  "https://flowdeck-backend.onrender.com/*",
  "https://flowdeck.vercel.app/*"
]
```

### 2. Package the Extension into a `.zip`
Run in terminal:
```bash
cd ~/flow
zip -r flowdeck-extension.zip extension/
```

### 3. Share with Users via GitHub Releases (Free)
1. Go to your GitHub repository → **Releases** → **Draft a new release**.
2. Tag version `v1.0.0`.
3. Attach `flowdeck-extension.zip`.
4. Provide users the download link and simple instructions:
   > 1. Download and extract `flowdeck-extension.zip`.
   > 2. Open `chrome://extensions/` and enable **Developer Mode**.
   > 3. Click **Load Unpacked** and select the folder.
   > 4. Open `https://flowdeck.vercel.app` — notice status shows **Extension connected: Extension is active and sync'ed.**

---

## 🔐 Step 6: Multi-Account Management (4 Google Accounts)

To configure your 4 actual pooled Google accounts:

1. Open an incognito browser window for each account.
2. Log into the Google account and visit `https://labs.google/fx/tools/flow`.
3. Open Developer Tools (`F12`) → **Application** tab → **Cookies** → `https://labs.google`.
4. Extract the following essential session cookies:
   * `__Secure-1PSID`
   * `__Secure-3PSID`
   * `HSID`, `SSID`, `SID`
   * `OSID`
5. Update your backend account configuration in `backend/src/services/accountPool.ts` (or store them as encrypted JSON strings in Render Environment Variables).

---

## 📊 Summary of Free Costs

| Resource | Service | Monthly Cost |
| :--- | :--- | :--- |
| Backend Compute & WebSockets | Render.com Free Tier | **$0.00** |
| Dashboard Hosting & CDN | Vercel Free Tier | **$0.00** |
| HTTPS & WSS SSL Certificates | Let's Encrypt (Built-in) | **$0.00** |
| Keep-Alive Pings | UptimeRobot Free Tier | **$0.00** |
| Extension Hosting & ZIP CDN | GitHub Releases | **$0.00** |
| **Total Monthly Operating Cost** | | **$0.00 / month** |
