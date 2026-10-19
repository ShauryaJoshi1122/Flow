export type ServerId = 'server-1' | 'server-2' | 'server-3' | 'server-4';

export interface CookieItem {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: 'lax' | 'strict' | 'no_restriction' | 'unspecified';
}

export interface ServerAccount {
  id: ServerId;
  name: string;
  emailMasked: string;
  status: 'active' | 'standby' | 'exhausted' | 'cooldown';
  generationCountToday: number;
  quotaLimitToday: number;
  cookies: CookieItem[];
  lastActive: string;
  totalGenerationsLifetime: number;
}

export type ModelTierId = 'veo-3.1-fast' | 'veo-3.1-lite' | 'veo-3.1-quality' | 'veo-3.1-ultra-lite';

export interface ModelTier {
  id: ModelTierId;
  name: string;
  tagline: string;
  creditCost: number;
  priority: 'high' | 'normal' | 'low' | 'eco';
  nativeGoogleModelKey: string;
  estimatedGenerationTime: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  isPopular?: boolean;
}

export interface CreditTransaction {
  id: string;
  timestamp: string;
  type: 'deduction' | 'package_purchase' | 'admin_adjustment' | 'refund';
  amount: number;
  modelTier?: ModelTierId;
  serverId?: ServerId;
  description: string;
  balanceAfter: number;
}

export interface FailoverEvent {
  id: string;
  timestamp: string;
  fromServer: ServerId;
  toServer: ServerId;
  reason: string;
}

export type ExportResolution = '270p' | '720p' | '1080p';

export interface VideoProject {
  id: string;
  title: string;
  prompt: string;
  serverId: ServerId;
  modelTier: ModelTierId;
  createdAt: string;
  durationSeconds: number;
  exportUrls: {
    '270p': string;
    '720p': string;
    '1080p': string;
  };
  thumbnailUrl: string;
}

export interface ExtensionClientState {
  connected: boolean;
  lastPing: string;
  version: string;
  activeTabUrl?: string;
}

export interface SystemState {
  activeServerId: ServerId;
  autoFailoverEnabled: boolean;
  masterCreditBalance: number;
  userCreditBalance: number;
  extensionConnected: boolean;
  lastSyncedAt: string;
}
