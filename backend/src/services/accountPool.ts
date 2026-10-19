import fs from 'fs';
import path from 'path';
import { ServerAccount, ServerId, FailoverEvent, ModelTierId, CookieItem } from '../types.js';

function getAccountsFilePath(): string {
  const primary = path.resolve(process.cwd(), 'src/data/accounts.json');
  if (fs.existsSync(primary)) return primary;
  const secondary = path.resolve(process.cwd(), 'data/accounts.json');
  if (fs.existsSync(secondary)) return secondary;
  return primary;
}

function maskEmail(email: string): string {
  const atIdx = email.indexOf('@');
  if (atIdx > 1) {
    return `${email[0]}***${email.substring(atIdx)}`;
  }
  return `${email.substring(0, 3)}***@gmail.com`;
}

export class AccountPoolManager {
  private servers: Map<ServerId, ServerAccount> = new Map();
  private activeServerId: ServerId = 'server-1';
  private autoFailoverEnabled: boolean = true;
  private failoverHistory: FailoverEvent[] = [];
  private onStateChangeCallback?: () => void;

  constructor() {
    this.initializePool();
  }

  public setOnStateChange(cb: () => void) {
    this.onStateChangeCallback = cb;
  }

  private notifyChange() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback();
    }
  }

  private initializePool() {
    const accountsFile = getAccountsFilePath();
    try {
      if (fs.existsSync(accountsFile)) {
        const fileContent = fs.readFileSync(accountsFile, 'utf-8');
        const parsed = JSON.parse(fileContent);

        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const item of parsed) {
            const serverId = item.id as ServerId;
            const cookies: CookieItem[] = Array.isArray(item.cookies) && item.cookies.length > 0
              ? item.cookies.map((c: any) => {
                  const isLabs = (c.name || '').includes('OSID');
                  const cleanDom = (c.domain || (isLabs ? 'labs.google' : 'google.com')).replace(/^\./, '');
                  const isClientAccessible = /^(SAPISID|APISID|__Secure-1PAPISID|__Secure-3PAPISID|_ga|SEARCH_SAMESITE|NID)/i.test(c.name);
                  const isNoRestriction = /^(__Secure-3PSID|__Secure-3PAPISID|__Secure-3PSIDTS|__Secure-3PSIDCC)/i.test(c.name);

                  return {
                    name: c.name,
                    value: c.value && !c.value.startsWith('REPLACE_WITH_') ? c.value : `session_token_${serverId}_${Math.random().toString(36).substring(2, 12)}`,
                    domain: cleanDom,
                    path: c.path || '/',
                    secure: true,
                    httpOnly: !isClientAccessible,
                    sameSite: isNoRestriction ? ('no_restriction' as const) : (c.sameSite || ('lax' as const))
                  };
                })
              : this.generateMockCookies(serverId);

            const email = item.email || `${serverId}@gmail.com`;
            const emailMasked = maskEmail(email);

            this.servers.set(serverId, {
              id: serverId,
              name: item.name || `Server (${serverId})`,
              emailMasked,
              status: item.status || (serverId === 'server-1' ? 'active' : 'standby'),
              generationCountToday: 0,
              quotaLimitToday: item.dailyQuota || 50,
              lastActive: new Date().toISOString(),
              totalGenerationsLifetime: 100,
              cookies
            });
          }
          return;
        }
      }
    } catch (err) {
      console.warn('[FlowDeck AccountPool] Notice: loading default pool:', err);
    }

    this.initializeDefaultPool();
  }

  private initializeDefaultPool() {
    const defaultServers: ServerAccount[] = [
      {
        id: 'server-1',
        name: 'Server 1 (Primary Pool A)',
        emailMasked: 'flow.master.pool01***@gmail.com',
        status: 'active',
        generationCountToday: 38,
        quotaLimitToday: 50,
        lastActive: new Date().toISOString(),
        totalGenerationsLifetime: 1420,
        cookies: this.generateMockCookies('server-1')
      },
      {
        id: 'server-2',
        name: 'Server 2 (Primary Pool B)',
        emailMasked: 'flow.cluster.pool02***@gmail.com',
        status: 'standby',
        generationCountToday: 12,
        quotaLimitToday: 50,
        lastActive: new Date(Date.now() - 3600000).toISOString(),
        totalGenerationsLifetime: 890,
        cookies: this.generateMockCookies('server-2')
      },
      {
        id: 'server-3',
        name: 'Server 3 (High-Capacity Node)',
        emailMasked: 'veo.enterprise.node03***@gmail.com',
        status: 'standby',
        generationCountToday: 5,
        quotaLimitToday: 75,
        lastActive: new Date(Date.now() - 7200000).toISOString(),
        totalGenerationsLifetime: 640,
        cookies: this.generateMockCookies('server-3')
      },
      {
        id: 'server-4',
        name: 'Server 4 (Failover Reserve)',
        emailMasked: 'reserve.failover.pool04***@gmail.com',
        status: 'standby',
        generationCountToday: 0,
        quotaLimitToday: 50,
        lastActive: new Date(Date.now() - 86400000).toISOString(),
        totalGenerationsLifetime: 310,
        cookies: this.generateMockCookies('server-4')
      }
    ];

    for (const server of defaultServers) {
      this.servers.set(server.id, server);
    }
  }

  private generateMockCookies(serverId: ServerId) {
    return [
      {
        name: '__Secure-1PSID',
        value: `session_token_${serverId}_${Math.random().toString(36).substring(2, 12)}`,
        domain: '.google.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax' as const
      },
      {
        name: '__Secure-3PSID',
        value: `session_3p_${serverId}_${Math.random().toString(36).substring(2, 12)}`,
        domain: '.google.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'no_restriction' as const
      },
      {
        name: 'OSID',
        value: `osid_labs_flow_${serverId}_${Math.random().toString(36).substring(2, 15)}`,
        domain: 'labs.google',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax' as const
      },
      {
        name: 'FLOW_AUTH_SESSION',
        value: `flow_authenticated_session_${serverId}`,
        domain: 'labs.google',
        path: '/fx/tools/flow',
        secure: true,
        httpOnly: false,
        sameSite: 'lax' as const
      }
    ];
  }

  public getAllServers(): ServerAccount[] {
    return Array.from(this.servers.values()).map(server => ({
      ...server,
      // For security, do not expose raw cookie session values in public API list
      cookies: server.cookies.map(c => ({
        ...c,
        value: `${c.name}=${c.value.substring(0, 8)}...[HIDDEN]`
      }))
    }));
  }

  public getRawServer(serverId: ServerId): ServerAccount | undefined {
    return this.servers.get(serverId);
  }

  public getActiveServer(): ServerAccount {
    const server = this.servers.get(this.activeServerId);
    if (!server) {
      const fallback = this.servers.get('server-1')!;
      this.activeServerId = 'server-1';
      return fallback;
    }
    return server;
  }

  public switchServer(serverId: ServerId, reason: string = 'Manual user selection'): {
    success: boolean;
    server: ServerAccount;
    warning: string;
  } {
    const targetServer = this.servers.get(serverId);
    if (!targetServer) {
      throw new Error(`Server ${serverId} not found`);
    }

    const previousServer = this.getActiveServer();
    if (previousServer.id !== serverId) {
      if (previousServer.status === 'active') {
        previousServer.status = 'standby';
      }
      targetServer.status = 'active';
      targetServer.lastActive = new Date().toISOString();
      this.activeServerId = serverId;

      this.failoverHistory.unshift({
        id: `event-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fromServer: previousServer.id,
        toServer: serverId,
        reason
      });
      this.notifyChange();
    }

    return {
      success: true,
      server: targetServer,
      warning: 'Note: Switching servers loads a different backend account. Previous projects tied to a specific server become temporarily inaccessible until you switch back.'
    };
  }

  public recordGeneration(modelTier: ModelTierId): {
    exhausted: boolean;
    failoverTriggered: boolean;
    newActiveServer?: ServerId;
  } {
    const currentServer = this.getActiveServer();
    currentServer.generationCountToday += 1;
    currentServer.totalGenerationsLifetime += 1;
    currentServer.lastActive = new Date().toISOString();

    let failoverTriggered = false;
    let newActiveServer: ServerId | undefined;

    // Check if quota limit reached
    if (currentServer.generationCountToday >= currentServer.quotaLimitToday) {
      currentServer.status = 'exhausted';
      if (this.autoFailoverEnabled) {
        const nextServer = this.findNextAvailableServer();
        if (nextServer) {
          this.switchServer(nextServer.id, `Automatic failover: ${currentServer.name} exhausted quota (${currentServer.generationCountToday}/${currentServer.quotaLimitToday})`);
          failoverTriggered = true;
          newActiveServer = nextServer.id;
        }
      }
    }

    this.notifyChange();
    return {
      exhausted: currentServer.status === 'exhausted',
      failoverTriggered,
      newActiveServer
    };
  }

  private findNextAvailableServer(): ServerAccount | undefined {
    const serverIds: ServerId[] = ['server-1', 'server-2', 'server-3', 'server-4'];
    for (const id of serverIds) {
      if (id === this.activeServerId) continue;
      const server = this.servers.get(id);
      if (server && server.status !== 'exhausted' && server.generationCountToday < server.quotaLimitToday) {
        return server;
      }
    }
    return undefined;
  }

  public getFailoverHistory(): FailoverEvent[] {
    return this.failoverHistory.slice(0, 50);
  }

  public isAutoFailoverEnabled(): boolean {
    return this.autoFailoverEnabled;
  }

  public setAutoFailover(enabled: boolean): void {
    this.autoFailoverEnabled = enabled;
    this.notifyChange();
  }

  public updateAccount(data: {
    id: ServerId;
    name?: string;
    email?: string;
    dailyQuota?: number;
    cookies?: CookieItem[];
  }): ServerAccount {
    let server = this.servers.get(data.id);
    if (!server) {
      server = {
        id: data.id,
        name: data.name || `Server (${data.id})`,
        emailMasked: data.email ? data.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}***${c}`) : `${data.id}***@gmail.com`,
        status: 'standby',
        generationCountToday: 0,
        quotaLimitToday: data.dailyQuota || 50,
        lastActive: new Date().toISOString(),
        totalGenerationsLifetime: 0,
        cookies: data.cookies || this.generateMockCookies(data.id)
      };
      this.servers.set(data.id, server);
    } else {
      if (data.name) server.name = data.name;
      if (data.email) server.emailMasked = data.email.replace(/^(.)(.*)(@.*)$/, (_, a, b, c) => `${a}***${c}`);
      if (data.dailyQuota) server.quotaLimitToday = data.dailyQuota;
      if (data.cookies && data.cookies.length > 0) {
        const cookieMap = new Map<string, CookieItem>();
        // Keep non-placeholder existing cookies
        for (const existing of server.cookies) {
          const val = existing.value || '';
          if (!val.startsWith('session_token_') && !val.startsWith('session_3p_') && !val.startsWith('osid_labs_flow_')) {
            cookieMap.set(existing.name, existing);
          }
        }
        // Add or overwrite with incoming cookies
        for (const incoming of data.cookies) {
          cookieMap.set(incoming.name, incoming);
        }
        server.cookies = Array.from(cookieMap.values());
      }
    }

    this.saveAccountsToFile();
    this.notifyChange();
    return server;
  }

  public resetServerQuota(serverId: ServerId): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.generationCountToday = 0;
      server.status = server.id === this.activeServerId ? 'active' : 'standby';
      this.notifyChange();
    }
  }

  public saveAccountsToFile(): void {
    try {
      const exportList = Array.from(this.servers.values()).map(s => ({
        id: s.id,
        name: s.name,
        email: s.emailMasked,
        status: s.status,
        dailyQuota: s.quotaLimitToday,
        cookies: s.cookies
      }));
      fs.writeFileSync(getAccountsFilePath(), JSON.stringify(exportList, null, 2), 'utf-8');
    } catch (err) {
      console.error('[FlowDeck] Error saving accounts.json:', err);
    }
  }
}

export const accountPool = new AccountPoolManager();
