import { ServerAccount, ServerId, FailoverEvent, ModelTierId } from '../types.js';

export class AccountPoolManager {
  private servers: Map<ServerId, ServerAccount> = new Map();
  private activeServerId: ServerId = 'server-1';
  private autoFailoverEnabled: boolean = true;
  private failoverHistory: FailoverEvent[] = [];
  private onStateChangeCallback?: () => void;

  constructor() {
    this.initializeDefaultPool();
  }

  public setOnStateChange(cb: () => void) {
    this.onStateChangeCallback = cb;
  }

  private notifyChange() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback();
    }
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

  public resetServerQuota(serverId: ServerId): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.generationCountToday = 0;
      server.status = server.id === this.activeServerId ? 'active' : 'standby';
      this.notifyChange();
    }
  }
}

export const accountPool = new AccountPoolManager();
