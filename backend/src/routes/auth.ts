import { Router } from 'express';
import { authService } from '../services/authService.js';
import { creditLedger } from '../services/creditLedger.js';
import { accountPool } from '../services/accountPool.js';

export const authRouter = Router();

// Login endpoint (accepts email+password OR licenseKey)
authRouter.post('/login', (req, res) => {
  const { email, password, licenseKey } = req.body;
  const result = authService.login({ email, password, licenseKey });

  if (!result.success) {
    return res.status(401).json({ error: result.error || 'Authentication failed' });
  }

  return res.json({
    success: true,
    token: result.token,
    user: result.user,
    userCreditBalance: creditLedger.getUserBalance(),
    activeServerId: accountPool.getActiveServer().id
  });
});

// Current user profile
authRouter.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const { valid, user } = authService.validateToken(authHeader);

  if (!valid || !user) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      licenseKey: user.licenseKey
    },
    userCreditBalance: creditLedger.getUserBalance(),
    activeServer: accountPool.getActiveServer()
  });
});

// Logout endpoint
authRouter.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    authService.logout(authHeader);
  }
  return res.json({ success: true, message: 'Logged out successfully' });
});

// Admin endpoint to view users
authRouter.get('/users', (req, res) => {
  const authHeader = req.headers.authorization;
  const { valid, user } = authService.validateToken(authHeader);

  if (!valid || user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  return res.json({
    users: authService.getUsersList()
  });
});
