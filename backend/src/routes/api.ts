import { Router } from 'express';
import { accountPool } from '../services/accountPool.js';
import { creditLedger } from '../services/creditLedger.js';
import { sessionManager } from '../services/sessionManager.js';
import { ModelTierId, ServerId } from '../types.js';

export const apiRouter = Router();

// 1. Overall System Status
apiRouter.get('/status', (req, res) => {
  const activeServer = accountPool.getActiveServer();
  res.json({
    activeServerId: activeServer.id,
    activeServerName: activeServer.name,
    autoFailoverEnabled: accountPool.isAutoFailoverEnabled(),
    masterCreditBalance: creditLedger.getMasterBalance(),
    userCreditBalance: creditLedger.getUserBalance(),
    servers: accountPool.getAllServers(),
    lastSyncedAt: new Date().toISOString()
  });
});

// 2. Server Management
apiRouter.get('/servers', (req, res) => {
  res.json({
    activeServerId: accountPool.getActiveServer().id,
    servers: accountPool.getAllServers(),
    autoFailoverEnabled: accountPool.isAutoFailoverEnabled(),
    failoverHistory: accountPool.getFailoverHistory()
  });
});

apiRouter.post('/servers/select', (req, res) => {
  const { serverId } = req.body as { serverId: ServerId };
  if (!serverId) {
    return res.status(400).json({ error: 'serverId is required' });
  }

  try {
    const result = accountPool.switchServer(serverId, 'Manual user selection in Dashboard');
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/servers/toggle-failover', (req, res) => {
  const { enabled } = req.body as { enabled: boolean };
  accountPool.setAutoFailover(Boolean(enabled));
  res.json({
    success: true,
    autoFailoverEnabled: accountPool.isAutoFailoverEnabled()
  });
});

apiRouter.post('/servers/reset-quota', (req, res) => {
  const { serverId } = req.body as { serverId: ServerId };
  if (serverId) {
    accountPool.resetServerQuota(serverId);
    res.json({ success: true, message: `Quota reset for ${serverId}` });
  } else {
    res.status(400).json({ error: 'serverId is required' });
  }
});

apiRouter.post('/servers/update-account', (req, res) => {
  const { serverId, email, name, dailyQuota, cookieString, cookies } = req.body;
  if (!serverId) {
    return res.status(400).json({ error: 'serverId is required' });
  }

  let parsedCookies = Array.isArray(cookies) ? cookies : [];

  // Parse raw cookie string if provided (e.g. "key=val; key2=val2")
  if (typeof cookieString === 'string' && cookieString.trim()) {
    const pairs = cookieString.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx > -1) {
        const cName = pair.substring(0, idx).trim();
        const cVal = pair.substring(idx + 1).trim();
        if (cName && cVal) {
          const isLabsCookie = cName.includes('OSID');
          const isClientAccessible = /^(SAPISID|APISID|__Secure-1PAPISID|__Secure-3PAPISID|_ga|SEARCH_SAMESITE|NID)/i.test(cName);
          const isNoRestriction = /^(__Secure-3PSID|__Secure-3PAPISID|__Secure-3PSIDTS|__Secure-3PSIDCC)/i.test(cName);

          parsedCookies.push({
            name: cName,
            value: cVal,
            domain: isLabsCookie ? 'labs.google' : 'google.com',
            path: '/',
            secure: true,
            httpOnly: !isClientAccessible,
            sameSite: isNoRestriction ? 'no_restriction' : 'lax'
          });
        }
      }
    }
  }

  const updated = accountPool.updateAccount({
    id: serverId,
    email,
    name,
    dailyQuota: dailyQuota ? Number(dailyQuota) : undefined,
    cookies: parsedCookies.length > 0 ? parsedCookies : undefined
  });

  return res.json({
    success: true,
    message: `Account for ${serverId} updated successfully.`,
    server: updated
  });
});

// 3. Virtual Credits Management
apiRouter.get('/credits', (req, res) => {
  res.json({
    masterBalance: creditLedger.getMasterBalance(),
    userBalance: creditLedger.getUserBalance(),
    packages: creditLedger.getPackages(),
    transactions: creditLedger.getTransactions()
  });
});

apiRouter.post('/credits/purchase', (req, res) => {
  const { packageId } = req.body as { packageId: string };
  try {
    const result = creditLedger.purchasePackage(packageId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Model Tiers
apiRouter.get('/models', (req, res) => {
  res.json({
    models: creditLedger.getModelTiers()
  });
});

// 5. Video Generation & Failover Simulation
apiRouter.post('/generate', (req, res) => {
  const { modelTier, prompt } = req.body as { modelTier: ModelTierId; prompt?: string };
  if (!modelTier) {
    return res.status(400).json({ error: 'modelTier is required' });
  }

  const activeServer = accountPool.getActiveServer();

  // Step 1: Check and deduct virtual credits
  const creditResult = creditLedger.deductForGeneration(modelTier, activeServer.id);
  if (!creditResult.success) {
    return res.status(402).json({
      error: creditResult.error || 'Payment required',
      remainingBalance: creditResult.remainingBalance
    });
  }

  // Step 2: Record generation on server account and check quota failover
  const poolResult = accountPool.recordGeneration(modelTier);

  // Step 3: Create simulated project output
  const tierObj = creditLedger.getModelTier(modelTier);
  const newProject = sessionManager.addProject({
    title: prompt ? (prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt) : `Veo Render #${Date.now().toString().slice(-4)}`,
    prompt: prompt || 'Rendered via FlowVeo Extension on Google Labs Flow',
    serverId: activeServer.id,
    modelTier,
    durationSeconds: modelTier === 'veo-3.1-quality' ? 6 : 4,
    thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    exportUrls: {
      '270p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4#t=0,5',
      '720p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4#t=0,5',
      '1080p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4#t=0,5'
    }
  });

  return res.json({
    success: true,
    project: newProject,
    deductedCredits: creditResult.cost,
    remainingUserBalance: creditResult.remainingBalance,
    activeServerId: accountPool.getActiveServer().id,
    failoverTriggered: poolResult.failoverTriggered,
    newActiveServer: poolResult.newActiveServer
  });
});

// 6. Direct Extension Session Injection Payload
apiRouter.get('/session/injection-payload', (req, res) => {
  const payload = sessionManager.getSessionPayloadForExtension();
  res.json(payload);
});

// 7. Video Projects (Filtered by active server or all)
apiRouter.get('/projects', (req, res) => {
  const serverId = req.query.serverId as ServerId | undefined;
  if (serverId) {
    res.json({
      serverId,
      projects: sessionManager.getProjectsForServer(serverId)
    });
  } else {
    const activeServer = accountPool.getActiveServer();
    res.json({
      currentActiveServerId: activeServer.id,
      projects: sessionManager.getProjectsForServer(activeServer.id),
      allProjects: sessionManager.getAllProjects()
    });
  }
});
