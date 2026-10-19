import React from 'react';
import { History, X, ArrowRight } from 'lucide-react';

export interface FailoverEvent {
  id: string;
  timestamp: string;
  fromServer: string;
  toServer: string;
  reason: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  history: FailoverEvent[];
}

export const FailoverHistoryModal: React.FC<Props> = ({ isOpen, onClose, history }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-slate-100 text-base">Account Rotation & Failover Log</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
          {history.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No failover events recorded yet. Pool accounts are currently stable.
            </div>
          ) : (
            history.map((ev) => (
              <div
                key={ev.id}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col gap-1.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono font-semibold">
                    <span className="text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900">
                      {ev.fromServer.toUpperCase()}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
                      {ev.toServer.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-slate-300 font-medium">{ev.reason}</div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
