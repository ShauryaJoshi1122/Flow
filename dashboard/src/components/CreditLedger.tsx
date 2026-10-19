import React from 'react';
import { Coins, Sparkles, CreditCard, ShieldCheck, ArrowDownRight, ArrowUpRight } from 'lucide-react';

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
  type: string;
  amount: number;
  description: string;
  balanceAfter: number;
}

export interface ModelTier {
  id: string;
  name: string;
  tagline: string;
  creditCost: number;
  priority: string;
  estimatedGenerationTime: string;
}

interface Props {
  masterBalance: number;
  userBalance: number;
  packages: CreditPackage[];
  modelTiers: ModelTier[];
  transactions: CreditTransaction[];
  onPurchasePackage: (pkgId: string) => void;
}

export const CreditLedger: React.FC<Props> = ({
  masterBalance,
  userBalance,
  packages,
  modelTiers,
  transactions,
  onPurchasePackage,
}) => {
  return (
    <div className="space-y-6">
      {/* Balances Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Master Ledger Balance */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Master System Ledger (Abstracted Pool)
            </span>
            <span className="text-[11px] font-mono bg-blue-950/80 text-blue-400 border border-blue-800 px-2.5 py-0.5 rounded-full">
              4 Pooled Accounts
            </span>
          </div>

          <div className="flex items-baseline gap-3 my-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-blue-400 tracking-tight">
              {masterBalance.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-slate-400">Master Credits</span>
          </div>

          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Google's native API quotas are abstracted into this master credit reserve, which is dynamically partitioned and distributed to user packages.
          </p>
        </div>

        {/* User Virtual Balance */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Your Current Balance
            </span>
            <span className="text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Ready to Render
            </span>
          </div>

          <div className="flex items-baseline gap-3 my-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight">
              {userBalance.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-slate-400">Available Credits</span>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
            <span>Deductions occur per generation according to chosen Veo 3.1 tier.</span>
          </div>
        </div>
      </div>

      {/* Model Tier Pricing Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-slate-100">Veo 3.1 Model Tiers & Generation Rates</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Select between maximum visual fidelity or rapid iteration with optimized resource priority.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {modelTiers.map((tier) => (
            <div
              key={tier.id}
              className="bg-slate-950/60 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-sm text-slate-200">{tier.name}</h4>
                  <span className="text-xs font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
                    {tier.creditCost} cr
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                  {tier.tagline}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex justify-between items-center text-[11px] text-slate-500">
                <span className="capitalize">{tier.priority} Priority</span>
                <span>{tier.estimatedGenerationTime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reseller Credit Packages */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold text-slate-100">Credit Packages & Reseller Allocation</h3>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Partitioned from the master pool balance. Instant allocation to your active browser extension session.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`rounded-xl p-4 border relative flex flex-col justify-between ${
                pkg.isPopular
                  ? 'bg-blue-950/20 border-blue-500/80 ring-1 ring-blue-500/40'
                  : 'bg-slate-950/50 border-slate-800'
              }`}
            >
              {pkg.isPopular && (
                <div className="absolute -top-2.5 right-4 bg-blue-600 text-[10px] uppercase font-bold text-white px-2.5 py-0.5 rounded-full shadow">
                  Most Popular
                </div>
              )}

              <div>
                <h4 className="font-bold text-base text-slate-200">{pkg.name}</h4>
                <div className="flex items-baseline gap-1 my-2">
                  <span className="text-2xl font-black text-white">${pkg.priceUsd}</span>
                  <span className="text-xs text-slate-400">/ one-time</span>
                </div>

                <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-400 mb-4">
                  <Coins className="w-4 h-4" />
                  <span>+{pkg.credits.toLocaleString()} Virtual Credits</span>
                </div>
              </div>

              <button
                onClick={() => onPurchasePackage(pkg.id)}
                className={`w-full py-2 px-4 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
                  pkg.isPopular
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <span>Add {pkg.credits.toLocaleString()} Credits</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History Log */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <h3 className="text-base font-bold text-slate-100 mb-3">Credit Ledger Activity Log</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 8).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-200">{tx.description}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold">
                      {tx.type === 'deduction' ? (
                        <span className="text-rose-400 inline-flex items-center gap-0.5">
                          <ArrowDownRight className="w-3 h-3" /> -{tx.amount}
                        </span>
                      ) : (
                        <span className="text-emerald-400 inline-flex items-center gap-0.5">
                          <ArrowUpRight className="w-3 h-3" /> +{tx.amount.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {tx.balanceAfter.toLocaleString()} cr
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
