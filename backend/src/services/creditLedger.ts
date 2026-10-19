import { CreditPackage, CreditTransaction, ModelTier, ModelTierId, ServerId } from '../types.js';

export const MODEL_TIERS: ModelTier[] = [
  {
    id: 'veo-3.1-quality',
    name: 'Veo 3.1 - Quality',
    tagline: 'Maximum fidelity, photorealistic textures & advanced temporal stability',
    creditCost: 150,
    priority: 'high',
    nativeGoogleModelKey: 'veo-3.1-generate-hq',
    estimatedGenerationTime: '~45 seconds'
  },
  {
    id: 'veo-3.1-fast',
    name: 'Veo 3.1 - Fast',
    tagline: 'High-speed render pipeline for rapid creative iteration',
    creditCost: 75,
    priority: 'normal',
    nativeGoogleModelKey: 'veo-3.1-generate-fast',
    estimatedGenerationTime: '~15 seconds'
  },
  {
    id: 'veo-3.1-lite',
    name: 'Veo 3.1 - Lite (Lower Priority)',
    tagline: 'Optimized resource queue with lower compute priority',
    creditCost: 40,
    priority: 'low',
    nativeGoogleModelKey: 'veo-3.1-generate-lite',
    estimatedGenerationTime: '~35 seconds'
  },
  {
    id: 'veo-3.1-ultra-lite',
    name: 'Veo 3.1 - Ultra Lite (Eco / Low Priority)',
    tagline: 'Maximum credit efficiency for rough drafts and storyboards',
    creditCost: 25,
    priority: 'eco',
    nativeGoogleModelKey: 'veo-3.1-generate-eco',
    estimatedGenerationTime: '~50 seconds'
  }
];

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pkg-25k',
    name: 'Starter Creator Pack',
    credits: 25000,
    priceUsd: 19,
    isPopular: false
  },
  {
    id: 'pkg-45k',
    name: 'Pro Studio Pack',
    credits: 45000,
    priceUsd: 32,
    isPopular: true
  },
  {
    id: 'pkg-100k',
    name: 'Enterprise Agency Tier',
    credits: 100000,
    priceUsd: 65,
    isPopular: false
  }
];

export class CreditLedgerManager {
  private masterCreditBalance: number = 249940; // As specified by user
  private userCreditBalance: number = 25000;    // Default initial user balance
  private transactions: CreditTransaction[] = [];
  private onStateChangeCallback?: () => void;

  constructor() {
    this.recordInitialTransactions();
  }

  public setOnStateChange(cb: () => void) {
    this.onStateChangeCallback = cb;
  }

  private notifyChange() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback();
    }
  }

  private recordInitialTransactions() {
    this.transactions.push({
      id: `tx-init-1`,
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      type: 'package_purchase',
      amount: 25000,
      description: 'Purchased Starter Creator Pack (25,000 Credits)',
      balanceAfter: 25000
    });
  }

  public getMasterBalance(): number {
    return this.masterCreditBalance;
  }

  public getUserBalance(): number {
    return this.userCreditBalance;
  }

  public getModelTiers(): ModelTier[] {
    return MODEL_TIERS;
  }

  public getModelTier(id: ModelTierId): ModelTier | undefined {
    return MODEL_TIERS.find(m => m.id === id);
  }

  public getPackages(): CreditPackage[] {
    return CREDIT_PACKAGES;
  }

  public getTransactions(): CreditTransaction[] {
    return this.transactions.slice(0, 50);
  }

  public deductForGeneration(modelTierId: ModelTierId, serverId: ServerId): {
    success: boolean;
    remainingBalance: number;
    cost: number;
    error?: string;
  } {
    const tier = this.getModelTier(modelTierId);
    if (!tier) {
      return { success: false, remainingBalance: this.userCreditBalance, cost: 0, error: 'Invalid model tier' };
    }

    if (this.userCreditBalance < tier.creditCost) {
      return {
        success: false,
        remainingBalance: this.userCreditBalance,
        cost: tier.creditCost,
        error: `Insufficient credits. Need ${tier.creditCost} credits, but you have ${this.userCreditBalance}.`
      };
    }

    this.userCreditBalance -= tier.creditCost;
    this.masterCreditBalance -= tier.creditCost;

    this.transactions.unshift({
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: 'deduction',
      amount: tier.creditCost,
      modelTier: modelTierId,
      serverId,
      description: `Generation using ${tier.name}`,
      balanceAfter: this.userCreditBalance
    });

    this.notifyChange();

    return {
      success: true,
      remainingBalance: this.userCreditBalance,
      cost: tier.creditCost
    };
  }

  public purchasePackage(packageId: string): {
    success: boolean;
    newBalance: number;
    creditsAdded: number;
  } {
    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) {
      throw new Error(`Package ${packageId} not found`);
    }

    this.userCreditBalance += pkg.credits;

    this.transactions.unshift({
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: 'package_purchase',
      amount: pkg.credits,
      description: `Purchased ${pkg.name} (+${pkg.credits.toLocaleString()} credits)`,
      balanceAfter: this.userCreditBalance
    });

    this.notifyChange();

    return {
      success: true,
      newBalance: this.userCreditBalance,
      creditsAdded: pkg.credits
    };
  }
}

export const creditLedger = new CreditLedgerManager();
