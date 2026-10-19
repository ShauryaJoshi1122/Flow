import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  role: 'admin' | 'user';
  licenseKey: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  expiresAt: number;
}

export class AuthService {
  private users: Map<string, UserAccount> = new Map();
  private sessions: Map<string, AuthSession> = new Map();

  constructor() {
    this.seedDefaultAccounts();
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  }

  private seedDefaultAccounts() {
    // 1. Master Admin User
    const adminSalt = crypto.randomBytes(16).toString('hex');
    const adminUser: UserAccount = {
      id: 'usr-admin-01',
      email: 'admin@flowdeck.ai',
      name: 'System Administrator',
      salt: adminSalt,
      passwordHash: this.hashPassword('admin123', adminSalt),
      role: 'admin',
      licenseKey: 'FLOWDECK-ADMIN-MASTER',
      createdAt: new Date().toISOString()
    };
    this.users.set(adminUser.email, adminUser);

    // 2. Pro Creator User
    const creatorSalt = crypto.randomBytes(16).toString('hex');
    const creatorUser: UserAccount = {
      id: 'usr-creator-02',
      email: 'creator@flowdeck.ai',
      name: 'Studio Creator',
      salt: creatorSalt,
      passwordHash: this.hashPassword('creator123', creatorSalt),
      role: 'user',
      licenseKey: 'FLOWDECK-PRO-STUDIO',
      createdAt: new Date().toISOString()
    };
    this.users.set(creatorUser.email, creatorUser);
  }

  public login(credentials: { email?: string; password?: string; licenseKey?: string }): {
    success: boolean;
    token?: string;
    user?: { id: string; email: string; name: string; role: string };
    error?: string;
  } {
    // Allow login via license key directly
    if (credentials.licenseKey) {
      const user = Array.from(this.users.values()).find(
        u => u.licenseKey.toLowerCase() === credentials.licenseKey?.trim().toLowerCase()
      );
      if (user) {
        const token = this.createSession(user.id);
        return {
          success: true,
          token,
          user: { id: user.id, email: user.email, name: user.name, role: user.role }
        };
      }
      return { success: false, error: 'Invalid license key' };
    }

    // Login via Email and Password
    if (!credentials.email || !credentials.password) {
      return { success: false, error: 'Email and password (or license key) are required' };
    }

    const user = this.users.get(credentials.email.toLowerCase().trim());
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    const testHash = this.hashPassword(credentials.password, user.salt);
    if (testHash !== user.passwordHash) {
      return { success: false, error: 'Invalid credentials' };
    }

    const token = this.createSession(user.id);
    return {
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    };
  }

  public createSession(userId: string): string {
    const token = `fdk_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
    this.sessions.set(token, { token, userId, expiresAt });
    return token;
  }

  public validateToken(token?: string): { valid: boolean; user?: UserAccount } {
    if (!token) return { valid: false };

    // Strip "Bearer " prefix if provided
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7).trim() : token.trim();
    const session = this.sessions.get(cleanToken);

    if (!session) return { valid: false };

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(cleanToken);
      return { valid: false };
    }

    const user = Array.from(this.users.values()).find(u => u.id === session.userId);
    if (!user) return { valid: false };

    return { valid: true, user };
  }

  public logout(token: string): boolean {
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7).trim() : token.trim();
    return this.sessions.delete(cleanToken);
  }

  public getUsersList() {
    return Array.from(this.users.values()).map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      licenseKey: u.licenseKey,
      createdAt: u.createdAt
    }));
  }
}

export const authService = new AuthService();

// Express Middleware to protect backend routes
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Allow health check, login, static assets, and preflight requests
  if (req.method === 'OPTIONS' || req.path === '/health' || req.path.startsWith('/auth/')) {
    return next();
  }

  const authHeader = req.headers.authorization || (req.query.token as string);
  const { valid, user } = authService.validateToken(authHeader);

  if (!valid) {
    return res.status(401).json({
      error: 'Unauthorized: Valid FlowDeck session token or license key required.',
      loginUrl: '/login'
    });
  }

  (req as any).user = user;
  next();
}
