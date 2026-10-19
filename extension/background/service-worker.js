// FlowDeck Chrome Extension - Background Service Worker (Manifest V3)

const WS_URL = 'wss://flow-x007.onrender.com/ws';
const API_URL = 'https://flow-x007.onrender.com/api';

let socket = null;
let isConnected = false;
let reconnectInterval = 3000;
let currentSessionData = null;

async function getAuthHeader() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['flowdeck_token'], (data) => {
      if (data.flowdeck_token) {
        resolve({ 'Authorization': `Bearer ${data.flowdeck_token}` });
      } else {
        resolve({});
      }
    });
  });
}

// Connect to FlowDeck backend WebSocket server
function connectWebSocket() {
  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
    return;
  }

  try {
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log('[FlowDeck Ext] WebSocket connected to FlowDeck Backend');
      isConnected = true;
      reconnectInterval = 3000;

      chrome.storage.local.get(['flowdeck_token'], (storage) => {
        // Send handshake identifying this client as the Chrome Extension with optional auth token
        socket.send(JSON.stringify({
          type: 'EXTENSION_HANDSHAKE',
          version: '1.0.0',
          token: storage.flowdeck_token || null,
          userAgent: navigator.userAgent
        }));
      });

      chrome.storage.local.set({
        extensionConnected: true,
        lastSyncedAt: new Date().toISOString()
      });
    };

    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('[FlowDeck Ext] Received WS message:', msg.type);

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
            type: 'FLOWDECK_STATE_UPDATE',
            data: msg.data
          });
        }
      } catch (e) {
        console.error('[FlowDeck Ext] Error handling message:', e);
      }
    };

    socket.onclose = () => {
      console.log('[FlowDeck Ext] WebSocket disconnected. Reconnecting in', reconnectInterval / 1000, 's');
      isConnected = false;
      chrome.storage.local.set({ extensionConnected: false });
      setTimeout(connectWebSocket, reconnectInterval);
      reconnectInterval = Math.min(reconnectInterval * 1.5, 30000);
    };

    socket.onerror = (err) => {
      console.warn('[FlowDeck Ext] WebSocket error:', err);
    };
  } catch (err) {
    console.error('[FlowDeck Ext] WebSocket connection exception:', err);
    setTimeout(connectWebSocket, reconnectInterval);
  }
}

// Injects Google account session cookies using chrome.cookies API
async function injectSessionCookies(sessionPayload) {
  if (!sessionPayload || !sessionPayload.cookies || sessionPayload.cookies.length === 0) {
    console.warn('[FlowDeck Ext] No cookies provided in session payload');
    return;
  }
  console.log(`[FlowDeck Ext] Injecting ${sessionPayload.cookies.length} session cookies for ${sessionPayload.serverName}...`);

  for (const cookie of sessionPayload.cookies) {
    try {
      // NEVER inject mock or placeholder tokens into browser
      if (!cookie.value || cookie.value.startsWith('session_token_') || cookie.value.startsWith('session_3p_') || cookie.value.startsWith('osid_labs_flow_') || cookie.value.startsWith('REPLACE_WITH_')) {
        console.warn(`[FlowDeck Ext] ⚠️ Skipping mock placeholder cookie: ${cookie.name}`);
        continue;
      }

      const isClientAccessible = /^(SAPISID|APISID|__Secure-1PAPISID|__Secure-3PAPISID|_ga|SEARCH_SAMESITE|NID)/i.test(cookie.name);
      const isNoRestriction = /^(__Secure-3PSID|__Secure-3PAPISID|__Secure-3PSIDTS|__Secure-3PSIDCC|__Secure-OSID|OSID)/i.test(cookie.name);
      const isOriginToken = cookie.name.includes('OSID');

      if (isOriginToken) {
        // Clear previous origin tokens
        try { await chrome.cookies.remove({ url: 'https://flow.google.com/', name: cookie.name }); } catch (_) {}
        try { await chrome.cookies.remove({ url: 'https://labs.google/', name: cookie.name }); } catch (_) {}

        // Set origin cookie for flow.google.com
        await chrome.cookies.set({
          url: 'https://flow.google.com/',
          name: cookie.name,
          value: cookie.value,
          path: '/',
          secure: true,
          httpOnly: true,
          sameSite: isNoRestriction ? 'no_restriction' : 'lax'
        });

        // Set origin cookie for labs.google
        try {
          await chrome.cookies.set({
            url: 'https://labs.google/',
            name: cookie.name,
            value: cookie.value,
            path: '/',
            secure: true,
            httpOnly: true,
            sameSite: isNoRestriction ? 'no_restriction' : 'lax'
          });
        } catch (_) {}

        console.log(`[FlowDeck Ext] ✅ Injected origin cookie: ${cookie.name} -> flow.google.com & labs.google`);
      } else {
        // Root Google account cookie (SID, __Secure-1PSID, SAPISID, etc.)
        const rootDetails = {
          url: 'https://flow.google.com/',
          name: cookie.name,
          value: cookie.value,
          domain: 'google.com',
          path: cookie.path || '/',
          secure: true,
          httpOnly: !isClientAccessible,
          sameSite: isNoRestriction ? 'no_restriction' : (cookie.sameSite || 'lax')
        };

        try {
          await chrome.cookies.remove({ url: 'https://flow.google.com/', name: cookie.name });
        } catch (_) {}

        await chrome.cookies.set(rootDetails);

        // Also inject via google.com url
        try {
          await chrome.cookies.set({
            ...rootDetails,
            url: 'https://google.com/'
          });
        } catch (_) {}

        console.log(`[FlowDeck Ext] ✅ Injected root cookie: ${cookie.name} -> .google.com`);
      }
    } catch (e) {
      console.warn(`[FlowDeck Ext] ⚠️ Failed to set cookie ${cookie.name}:`, e);
    }
  }

  await chrome.storage.local.set({
    activeSession: {
      serverId: sessionPayload.serverId,
      serverName: sessionPayload.serverName,
      injectedAt: new Date().toISOString()
    }
  });

  // Notify active Flow and Google Labs tabs
  broadcastToTabs({
    type: 'SESSION_SWITCHED',
    serverId: sessionPayload.serverId,
    serverName: sessionPayload.serverName
  });
}

function broadcastToTabs(payload) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (tab.id && tab.url && (tab.url.includes('flow.google.com') || tab.url.includes('labs.google/fx/tools/flow'))) {
        chrome.tabs.sendMessage(tab.id, payload).catch(() => {});
      }
    }
  });
}

// Handle runtime messages from Popup and Content Scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'USER_LOGGED_IN') {
    if (socket) socket.close();
    connectWebSocket();
    sendResponse({ success: true });
    return true;
  }

  if (request.type === 'USER_LOGGED_OUT') {
    if (socket) socket.close();
    connectWebSocket();
    sendResponse({ success: true });
    return true;
  }

  if (request.type === 'FORCE_REFRESH_COOKIES') {
    (async () => {
      try {
        const authHeaders = await getAuthHeader();
        const res = await fetch(`${API_URL}/session/injection-payload`, { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          currentSessionData = data;
          await injectSessionCookies(data);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Failed to fetch payload' });
        }
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  }

  if (request.type === 'OPEN_LABS_FLOW') {
    (async () => {
      if (currentSessionData) {
        await injectSessionCookies(currentSessionData);
      } else {
        try {
          const authHeaders = await getAuthHeader();
          const res = await fetch(`${API_URL}/session/injection-payload`, { headers: authHeaders });
          if (res.ok) {
            const data = await res.json();
            currentSessionData = data;
            await injectSessionCookies(data);
          }
        } catch (e) {
          console.error('[FlowDeck Ext] Error fetching session payload:', e);
        }
      }

      // Focus or open Flow tab (checking both flow.google.com and labs.google)
      chrome.tabs.query({}, (tabs) => {
        const flowTab = tabs.find(t => t.url && (t.url.includes('flow.google.com') || t.url.includes('labs.google/fx/tools/flow')));
        if (flowTab) {
          chrome.tabs.update(flowTab.id, { active: true });
          chrome.tabs.reload(flowTab.id);
        } else {
          chrome.tabs.create({ url: 'https://flow.google.com' });
        }
      });
      sendResponse({ success: true });
    })();
    return true;
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
        const authHeaders = await getAuthHeader();
        const res = await fetch(`${API_URL}/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
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
