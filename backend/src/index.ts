import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { apiRouter } from './routes/api.js';
import { authRouter } from './routes/auth.js';
import { authService } from './services/authService.js';
import { accountPool } from './services/accountPool.js';
import { creditLedger } from './services/creditLedger.js';
import { sessionManager } from './services/sessionManager.js';
import { ServerId } from './types.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve logo
app.get('/logo.png', (req, res) => {
  const p = path.resolve(process.cwd(), 'src/views/logo.png');
  if (fs.existsSync(p)) return res.sendFile(p);
  const fallback = path.resolve(process.cwd(), '../dashboard/public/logo.png');
  if (fs.existsSync(fallback)) return res.sendFile(fallback);
  res.status(404).end();
});

// Serve Backend Login & Admin Portal
app.get(['/login', '/admin'], (req, res) => {
  const loginHtmlPath = path.resolve(process.cwd(), 'src/views/login.html');
  if (fs.existsSync(loginHtmlPath)) {
    return res.sendFile(loginHtmlPath);
  }
  res.send('<h1>FlowDeck Login</h1><p>Login page file not found.</p>');
});

// Redirect root to /login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Mount Authentication routes
app.use('/api/auth', authRouter);

// Mount core API routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FlowDeck Master Server',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const server = http.createServer(app);

// WebSocket Server for real-time bi-directional sync with Dashboard and Chrome Extension
const wss = new WebSocketServer({ server, path: '/ws' });

interface ConnectedClient {
  ws: WebSocket;
  type: 'dashboard' | 'extension';
  id: string;
  connectedAt: Date;
}

const clients = new Map<WebSocket, ConnectedClient>();
let extensionConnected = false;

function broadcastState() {
  const activeServer = accountPool.getActiveServer();
  const statePayload = JSON.stringify({
    type: 'STATE_UPDATE',
    data: {
      extensionConnected,
      activeServerId: activeServer.id,
      activeServerName: activeServer.name,
      autoFailoverEnabled: accountPool.isAutoFailoverEnabled(),
      masterCreditBalance: creditLedger.getMasterBalance(),
      userCreditBalance: creditLedger.getUserBalance(),
      servers: accountPool.getAllServers(),
      failoverHistory: accountPool.getFailoverHistory(),
      timestamp: new Date().toISOString()
    }
  });

  for (const client of clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(statePayload);
    }
  }
}

// Hook state change listeners
accountPool.setOnStateChange(() => {
  broadcastState();
  // Also send fresh session to extension if it's connected
  sendSessionToExtensions();
});

creditLedger.setOnStateChange(() => {
  broadcastState();
});

function sendSessionToExtensions() {
  const sessionPayload = JSON.stringify({
    type: 'SESSION_INJECT',
    data: sessionManager.getSessionPayloadForExtension()
  });

  for (const client of clients.values()) {
    if (client.type === 'extension' && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(sessionPayload);
    }
  }
}

wss.on('connection', (ws: WebSocket, req) => {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  // Default as dashboard until identified
  const clientInfo: ConnectedClient = {
    ws,
    type: 'dashboard',
    id: clientId,
    connectedAt: new Date()
  };
  clients.set(ws, clientInfo);

  console.log(`[FlowVeo WS] New connection: ${clientId}`);

  // Send initial state immediately
  ws.send(JSON.stringify({
    type: 'INIT_STATE',
    data: {
      extensionConnected,
      activeServerId: accountPool.getActiveServer().id,
      activeServerName: accountPool.getActiveServer().name,
      autoFailoverEnabled: accountPool.isAutoFailoverEnabled(),
      masterCreditBalance: creditLedger.getMasterBalance(),
      userCreditBalance: creditLedger.getUserBalance(),
      servers: accountPool.getAllServers(),
      failoverHistory: accountPool.getFailoverHistory(),
      timestamp: new Date().toISOString()
    }
  }));

  ws.on('message', (data: Buffer | string) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'EXTENSION_HANDSHAKE': {
          clientInfo.type = 'extension';
          const token = message.token;
          const { valid, user } = authService.validateToken(token);

          extensionConnected = true;
          console.log(`[FlowDeck WS] Chrome Extension connected: ${clientId} (User: ${user ? user.email : 'Guest'})`);

          // Send active session cookies to extension for injection
          ws.send(JSON.stringify({
            type: 'SESSION_INJECT',
            data: sessionManager.getSessionPayloadForExtension(),
            auth: {
              authenticated: valid,
              user: user ? { name: user.name, email: user.email, role: user.role } : null
            }
          }));

          // Notify dashboard that extension is connected
          broadcastState();
          break;
        }

        case 'EXTENSION_PING': {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          break;
        }

        case 'SELECT_SERVER': {
          const { serverId } = message;
          if (serverId) {
            accountPool.switchServer(serverId as ServerId, 'Manual switch from UI');
          }
          break;
        }

        case 'TRIGGER_GENERATION': {
          const { modelTier, prompt } = message;
          const activeServer = accountPool.getActiveServer();
          const creditResult = creditLedger.deductForGeneration(modelTier, activeServer.id);
          
          if (creditResult.success) {
            const poolResult = accountPool.recordGeneration(modelTier);
            ws.send(JSON.stringify({
              type: 'GENERATION_AUTHORIZED',
              data: {
                success: true,
                remainingCredits: creditResult.remainingBalance,
                activeServerId: accountPool.getActiveServer().id,
                failoverTriggered: poolResult.failoverTriggered
              }
            }));
          } else {
            ws.send(JSON.stringify({
              type: 'GENERATION_REJECTED',
              data: {
                error: creditResult.error
              }
            }));
          }
          break;
        }

        default:
          console.log(`[FlowVeo WS] Unhandled message type: ${message.type}`);
      }
    } catch (err) {
      console.error('[FlowVeo WS] Error processing message:', err);
    }
  });

  ws.on('close', () => {
    const info = clients.get(ws);
    clients.delete(ws);
    
    if (info?.type === 'extension') {
      // Check if any other extension connections remain
      const hasOtherExtension = Array.from(clients.values()).some(c => c.type === 'extension');
      if (!hasOtherExtension) {
        extensionConnected = false;
        console.log('[FlowVeo WS] All extensions disconnected');
        broadcastState();
      }
    }
    console.log(`[FlowVeo WS] Connection closed: ${clientId}`);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 FlowVeo Backend running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server live on ws://localhost:${PORT}/ws`);
  console.log(`🔑 Multi-Account Pool initialized: 4 Google accounts loaded`);
  console.log(`💳 Virtual Master Ledger: 249,940 credits`);
  console.log(`=======================================================`);
});
