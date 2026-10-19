import React from 'react';
import { Server, AlertTriangle, RefreshCw, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';

export interface ServerAccount {
  id: 'server-1' | 'server-2' | 'server-3' | 'server-4';
  name: string;
  emailMasked: string;
  status: 'active' | 'standby' | 'exhausted' | 'cooldown';
  generationCountToday: number;
  quotaLimitToday: number;
  totalGenerationsLifetime: number;
  lastActive: string;
}

interface Props {
  servers: ServerAccount[];
  activeServerId: string;
  autoFailoverEnabled: boolean;
  onSelectServer: (serverId: ServerAccount['id']) => void;
  onToggleFailover: (enabled: boolean) => void;
  onResetQuota: (serverId: ServerAccount['id']) => void;
  isSwitching?: boolean;
}

export const ServerSelector: React.FC<Props> = ({
  servers,
  activeServerId,
  autoFailoverEnabled,
  onSelectServer,
  onToggleFailover,
  onResetQuota,
  isSwitching = false,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-slate-100">Multi-Account Pool & Server Selection</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Backend runs 4 isolated Google accounts in parallel with automatic rotation and failover.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60">
          <label className="text-xs font-medium text-slate-300 flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoFailoverEnabled}
              onChange={(e) => onToggleFailover(e.target.checked)}
              className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-900 w-4 h-4 cursor-pointer"
            />
            <span>Automatic Failover & Rotation</span>
          </label>
          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
            autoFailoverEnabled ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-700 text-slate-400'
          }`}>
            {autoFailoverEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Warning Notice as requested */}
      <div className="my-4 p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <strong className="text-amber-300 font-semibold block mb-0.5">Server Project Partition Notice</strong>
          Switching servers loads a different backend account (meaning previous projects tied to a specific server become temporarily inaccessible until you switch back).
        </div>
      </div>

      {/* 4 Server Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {servers.map((server) => {
          const isActive = server.id === activeServerId;
          const usagePercent = Math.min(100, Math.round((server.generationCountToday / server.quotaLimitToday) * 100));
          const isExhausted = server.status === 'exhausted' || usagePercent >= 100;

          return (
            <div
              key={server.id}
              onClick={() => !isActive && !isSwitching && onSelectServer(server.id)}
              className={`relative rounded-xl p-4 transition-all duration-200 border cursor-pointer select-none ${
                isActive
                  ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/30'
              } ${isExhausted ? 'opacity-85' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Server className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span className="font-bold text-sm text-slate-200">
                    {server.name.split(' (')[0]}
                  </span>
                </div>

                {isActive ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                ) : isExhausted ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800">
                    <ShieldAlert className="w-3 h-3" /> Exhausted
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
                    Standby
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-400 font-mono mb-3 truncate">
                {server.emailMasked}
              </div>

              {/* Quota Progress Bar */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Daily Google Quota:</span>
                  <span className={`font-semibold ${
                    usagePercent >= 90 ? 'text-rose-400' : usagePercent >= 70 ? 'text-amber-400' : 'text-slate-300'
                  }`}>
                    {server.generationCountToday} / {server.quotaLimitToday} ({usagePercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      usagePercent >= 90 ? 'bg-rose-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10.5px] text-slate-400">
                <span>Total Lifetime: <strong className="text-slate-300">{server.totalGenerationsLifetime}</strong></span>
                <button
                  type="button"
                  title="Reset quota for simulation testing"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResetQuota(server.id);
                  }}
                  className="p-1 hover:text-blue-400 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>

              {!isActive && (
                <button
                  disabled={isSwitching}
                  className="w-full mt-3 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition border border-slate-700"
                >
                  Switch to this Server
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
