// FlowVeo Chrome Extension - Background Service Worker (Manifest V3)

const WS_URL = 'ws://localhost:3001/ws';
const API_URL = 'http://localhost:3001/api';

let socket = null;
let isConnected = false;
let reconnectInterval = 3000;
let currentSessionData = null;

// Connect to FlowVeo backend WebSocket server
function connectWebSocket() {
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
    return;
  }

  try {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log('[FlowVeo Ext] WebSocket connected to FlowVeo Backend');
      isConnected = true;
      reconnectInterval = 3000;

      // Send handshake identifying this client as the Chrome Extension
      socket.send(JSON.stringify({
        type: 'EXTENSION_HANDSHAKE',
        version: '1.0.0',
        userAgent: navigator.userAgent
      }));

      chrome.storage.local.set({
        extensionConnected: true,
        lastSyncedAt: new Date().toISOString()
      });
    };

    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('[FlowVeo Ext] Received WS message:', msg.type);

        if (msg.type === 'SESSION_INJECT') {
          currentSessionData = msg.data;
          await injectSessionCookies(msg.data);
        } else if (msg.type === 'STATE_UPDATE' || msg.type === 'INIT_STATE') {
          chrome.storage.local.set({
            systemState: msg.data,
            activeServerId: msg.data.activeServerId,
            activeServerName: msg.data.activeServerName,
            userCreditBalance: msg.data.userCreditBalance,
            masterCreditBalance: msg.data.masterCreditBalance
          });

          // Forward state update to open Google Labs tabs
          broadcastToTabs({
            type: 'FLOWVEO_STATE_UPDATE',
            data: msg.data
          });
        }
      } catch (e) {
        console.error('[FlowVeo Ext] Error handling message:', e);
      }
    };

    socket.onclose = () => {
      console.log('[FlowVeo Ext] WebSocket disconnected. Reconnecting in', reconnectInterval / 1000, 's');
      isConnected = false;
      chrome.storage.local.set({ extensionConnected: false });
      setTimeout(connectWebSocket, reconnectInterval);
      reconnectInterval = Math.min(reconnectInterval * 1.5, 30000);
    };

    socket.onerror = (err) => {
      console.warn('[FlowVeo Ext] WebSocket error:', err);
    };
  } catch (err) {
    console.error('[FlowVeo Ext] WebSocket connection exception:', err);
    setTimeout(connectWebSocket, reconnectInterval);
  }
}

// Injects Google account session cookies using chrome.cookies API
async function injectSessionCookies(sessionPayload) {
  if (!sessionPayload || !sessionPayload.cookies) return;
  console.log(`[FlowVeo Ext] Injecting session cookies for ${sessionPayload.serverName}...`);

  for (const cookie of sessionPayload.cookies) {
    try {
      const url = cookie.domain.startsWith('.') 
        ? `https://${cookie.domain.substring(1)}${cookie.path}`
        : `https://${cookie.domain}${cookie.path}`;

      await chrome.cookies.set({
        url,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        secure: cookie.secure ?? true,
        httpOnly: cookie.httpOnly ?? true,
        sameSite: cookie.sameSite || 'lax'
      });
      console.log(`[FlowVeo Ext] Injected cookie: ${cookie.name} -> ${cookie.domain}`);
    } catch (e) {
      console.warn(`[FlowVeo Ext] Failed to set cookie ${cookie.name}:`, e);
    }
  }

  await chrome.storage.local.set({
    activeSession: {
      serverId: sessionPayload.serverId,
      serverName: sessionPayload.serverName,
      injectedAt: new Date().toISOString()
    }
  });

  // Notify active Google Labs tabs
  broadcastToTabs({
    type: 'SESSION_SWITCHED',
    serverId: sessionPayload.serverId,
    serverName: sessionPayload.serverName
  });
}

function broadcastToTabs(payload) {
  chrome.tabs.query({ url: '*://labs.google/fx/tools/flow*' }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, payload).catch(() => {});
      }
    }
  });
}

// Handle runtime messages from Popup and Content Scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OPEN_LABS_FLOW') {
    (async () => {
      // First ensure session cookies are injected
      if (currentSessionData) {
        await injectSessionCookies(currentSessionData);
      } else {
        // Fetch from backend API
        try {
          const res = await fetch(`${API_URL}/session/injection-payload`);
          if (res.ok) {
            const data = await res.json();
            currentSessionData = data;
            await injectSessionCookies(data);
          }
        } catch (e) {
          console.error('[FlowVeo Ext] Error fetching session payload:', e);
        }
      }

      // Check if a Flow tab is already open
      chrome.tabs.query({ url: '*://labs.google/fx/tools/flow*' }, (tabs) => {
        if (tabs && tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, { active: true });
          chrome.tabs.reload(tabs[0].id);
        } else {
          chrome.tabs.create({ url: 'https://labs.google/fx/tools/flow' });
        }
      });
      sendResponse({ success: true });
    })();
    return true; // Keep response channel open for async
  }

  if (request.type === 'GET_EXTENSION_STATUS') {
    sendResponse({
      connected: isConnected,
      session: currentSessionData
    });
    return true;
  }

  if (request.type === 'SWITCH_SERVER') {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'SELECT_SERVER',
        serverId: request.serverId
      }));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Backend socket not connected' });
    }
    return true;
  }

  if (request.type === 'VERIFY_AND_DEDUCT_CREDITS') {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelTier: request.modelTier,
            prompt: request.prompt
          })
        });
        const data = await res.json();
        sendResponse(data);
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});

// Periodic heartbeat
setInterval(() => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'EXTENSION_PING', timestamp: Date.now() }));
  } else {
    connectWebSocket();
  }
}, 15000);

// Initialize connection immediately
connectWebSocket();
