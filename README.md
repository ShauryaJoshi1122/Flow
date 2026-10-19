# FlowVeo - Google Labs Flow (Veo 3.1) Multi-Account Pooling & Extension System

FlowVeo is an architecture connecting a browser extension, a multi-account pooling backend, and a real-time web dashboard for Google Labs Flow (`labs.google/fx/tools/flow`).

---

## 🏗️ Architecture Architecture Overview

```
flow/
├── backend/                  # Node.js + Express + WebSocket Master Server
│   ├── src/
│   │   ├── index.ts          # HTTP & WebSocket Sync Server (Port 3001)
│   │   ├── types.ts          # Unified TypeScript interfaces
│   │   ├── routes/api.ts     # REST endpoints for server/credit/generation operations
│   │   └── services/
│   │       ├── accountPool.ts    # Multi-account pooling (Servers 1-4), failover & quota
│   │       ├── creditLedger.ts   # Virtual credit ledger (249,940 master balance & tiers)
│   │       └── sessionManager.ts # Google cookie session injection payload generator
│   ├── package.json
│   └── tsconfig.json
│
├── dashboard/                # FlowVeo React + Tailwind Web Dashboard
│   ├── src/
│   │   ├── App.tsx           # Dashboard root with real-time WebSocket state sync
│   │   ├── components/
│   │   │   ├── ExtensionSyncIndicator.tsx # "Extension connected: Extension is active and sync'ed"
│   │   │   ├── ServerSelector.tsx         # Servers 1-4 with project partition warning
│   │   │   ├── CreditLedger.tsx           # 249,940 master balance, 25k/45k packs & tiers
│   │   │   ├── ProjectsExportView.tsx     # Direct video export (270p, 720p, 1080p)
│   │   │   └── FailoverHistoryModal.tsx   # Live audit trail of auto-rotations
│   └── package.json
│
└── extension/                # Manifest V3 Chrome Extension
    ├── manifest.json         # Chrome MV3 config with cookies, storage, & tabs permissions
    ├── background/
    │   └── service-worker.js # WebSocket client, chrome.cookies injection engine
    ├── content/
    │   ├── flow-injector.js  # Injects 4 Veo 3.1 model tiers into generation settings
    │   ├── mask-profile.css  # CSS hiding Google account avatars, emails, switcher menus
    │   ├── mask-profile.js   # Dynamic DOM observer ensuring Google profile stays hidden
    │   └── export-helper.js  # Injects 270p, 720p, 1080p direct export buttons on videos
    └── popup/
        ├── popup.html        # Quick status popup
        ├── popup.css         # Dark theme styling
        └── popup.js          # Direct session launcher button
```

---

## 🌟 Key Features Implemented

### 1. The Browser Extension (Manifest V3)
* **Connection & Syncing**:
  * Real-time WebSocket connection (`ws://localhost:3001/ws`) with auto-reconnect backoff.
  * Extension handshake notifies the dashboard immediately to display:
    `"Extension connected: Extension is active and sync'ed."`
* **Access Injection**:
  * Seamlessly authenticates Google Labs Flow without requiring user account credentials.
  * Injects session cookies (`__Secure-1PSID`, `__Secure-3PSID`, `OSID`, etc.) via `chrome.cookies.set()` across `.google.com` and `labs.google`.
* **UI & Model Selection**:
  * Injects custom model tier selection cards into Google Labs Flow generation UI:
    1. **Veo 3.1 - Fast** (75 credits - ~15s generation)
    2. **Veo 3.1 - Lite (Lower Priority)** (40 credits - ~35s generation)
    3. **Veo 3.1 - Quality** (150 credits - ~45s generation, maximum fidelity)
    4. **Veo 3.1 - Ultra Lite (Eco / Low Priority)** (25 credits - ~50s rough draft)
  * Credit verification interceptor: Prevents generations if user credits are depleted and guides them to top up.
* **Direct Export**:
  * Injects direct download buttons on each rendered video element:
    * `270p` (Fast mobile preview export)
    * `720p` (HD web video export)
    * `1080p` (Full HD master video export)
* **Identity Masking**:
  * Strips Google profile avatars, email chips, and switcher menus using `mask-profile.css` and `mask-profile.js` to protect backend pooled account privacy.

### 2. The Backend System
* **Multi-Account Pooling**:
  * Runs 4 separate Google accounts concurrently (Server 1, Server 2, Server 3, Server 4).
  * Tracks daily generation counts, quota ceilings, and lifetime generation statistics per account.
* **Automatic Failover/Rotation**:
  * Automatically detects quota exhaustion (e.g. 50/50 generations today) and rotates active session to the next standby server in the pool with zero interruption to the user.
* **Server Selection & Project Partitioning**:
  * Manual switcher in the dashboard between Server 1, Server 2, Server 3, and Server 4.
  * Includes the required warning:
    `"Note: Switching servers loads a different backend account (meaning previous projects tied to a specific server become temporarily inaccessible)."`
* **Virtual Credit Management**:
  * Abstracted master balance ledger: **249,940 credits**.
  * Reseller packages:
    * **Starter Pack**: 25,000 credits ($19)
    * **Pro Pack**: 45,000 credits ($32)
    * **Enterprise Pack**: 100,000 credits ($65)
  * Complete transaction ledger audit trail for every credit deduction and package purchase.

---

## 🚀 Running the Project

### Prerequisites
* Node.js v18+ and pnpm installed.

### Step 1: Install Dependencies & Start Backend
```bash
cd backend
pnpm install
pnpm dev
# Backend runs on http://localhost:3001
# WebSocket server active on ws://localhost:3001/ws
```

### Step 2: Install Dependencies & Start Web Dashboard
```bash
cd dashboard
pnpm install
pnpm dev
# Dashboard runs on http://localhost:5173
```

### Step 3: Load Browser Extension in Chrome / Chromium
1. Open Chrome/Chromium and navigate to `chrome://extensions/`.
2. Toggle on **"Developer mode"** in the top right corner.
3. Click **"Load unpacked"** and select the `flow/extension` folder.
4. Open the FlowVeo Dashboard at `http://localhost:5173`.
5. Notice the top banner changes to:
   `"Extension connected: Extension is active and sync'ed."`
6. Click **"Launch Authenticated Flow Session"** to inject the active server's session into `labs.google/fx/tools/flow`!
