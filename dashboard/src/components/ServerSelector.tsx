import React, { useState } from 'react';
import { Server, AlertTriangle, RefreshCw, CheckCircle2, ShieldAlert, Cpu, PlusCircle, X, KeyRound } from 'lucide-react';

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
  onRefreshData?: () => void;
  isSwitching?: boolean;
}

export const ServerSelector: React.FC<Props> = ({
  servers,
  activeServerId,
  autoFailoverEnabled,
  onSelectServer,
  onToggleFailover,
  onResetQuota,
  onRefreshData,
  isSwitching = false,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedServerForEdit, setSelectedServerForEdit] = useState<'server-1' | 'server-2' | 'server-3' | 'server-4'>('server-1');
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editDailyQuota, setEditDailyQuota] = useState('50');
  const [editCookieString, setEditCookieString] = useState('');
  const [saveStatus, setSaveStatus] = useState<{ message: string; isError?: boolean } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEdit = (serverId?: ServerAccount['id']) => {
    const targetId = serverId || (activeServerId as any) || 'server-1';
    setSelectedServerForEdit(targetId);
    const existing = servers.find(s => s.id === targetId);
    if (existing) {
      setEditName(existing.name);
      setEditEmail(existing.emailMasked);
      setEditDailyQuota(String(existing.quotaLimitToday));
    }
    setEditCookieString('');
    setSaveStatus(null);
    setIsEditModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'https://flow-x007.onrender.com/api';
      const res = await fetch(`${apiBase}/servers/update-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: selectedServerForEdit,
          email: editEmail,
          name: editName,
          dailyQuota: Number(editDailyQuota) || 50,
          cookieString: editCookieString
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveStatus({ message: `Success! ${selectedServerForEdit.toUpperCase()} updated and synced.` });
        if (onRefreshData) onRefreshData();
        setTimeout(() => setIsEditModalOpen(false), 1200);
      } else {
        setSaveStatus({ message: data.error || 'Failed to update account', isError: true });
      }
    } catch (err: any) {
      setSaveStatus({ message: err.message || 'Error connecting to backend', isError: true });
    } finally {
      setIsSaving(false);
    }
  };

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

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenEdit()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Manage Gmail / Cookies</span>
          </button>

          <div className="flex items-center gap-3 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoFailoverEnabled}
                onChange={(e) => onToggleFailover(e.target.checked)}
                className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-900 w-4 h-4 cursor-pointer"
              />
              <span>Auto Failover</span>
            </label>
            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
              autoFailoverEnabled ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-700 text-slate-400'
            }`}>
              {autoFailoverEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
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

      {/* Edit Gmail Account Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-slate-100 text-base">Configure Gmail Node Session</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-5 space-y-4">
              {saveStatus && (
                <div className={`p-3 rounded-lg text-xs ${
                  saveStatus.isError ? 'bg-rose-950/70 border border-rose-600 text-rose-200' : 'bg-emerald-950/70 border border-emerald-600 text-emerald-200'
                }`}>
                  {saveStatus.message}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Select Server Node
                  </label>
                  <select
                    value={selectedServerForEdit}
                    onChange={(e) => handleOpenEdit(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="server-1">Server 1 (Node A)</option>
                    <option value="server-2">Server 2 (Node B)</option>
                    <option value="server-3">Server 3 (Node C)</option>
                    <option value="server-4">Server 4 (Node D)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Daily Quota Limit
                  </label>
                  <input
                    type="number"
                    value={editDailyQuota}
                    onChange={(e) => setEditDailyQuota(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                    placeholder="50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Gmail ID / Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. creator.studio01@gmail.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Node Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Server 1 (Primary High-Res Node)"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Paste Google Labs Cookies (Header String)
                  </label>
                  <span className="text-[10px] text-blue-400">__Secure-1PSID, OSID...</span>
                </div>
                <textarea
                  rows={3}
                  value={editCookieString}
                  onChange={(e) => setEditCookieString(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="__Secure-1PSID=...; __Secure-3PSID=...; OSID=..."
                />
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Tip: Copy from Cookie-Editor on <code>labs.google</code>. If left empty, existing cookies are preserved.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md transition disabled:opacity-50"
                >
                  {isSaving ? 'Saving & Syncing...' : 'Save & Sync Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
