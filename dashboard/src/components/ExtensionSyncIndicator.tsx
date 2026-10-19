import React from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';

interface Props {
  connected: boolean;
  activeServerName: string;
  activeServerId: string;
}

export const ExtensionSyncIndicator: React.FC<Props> = ({
  connected,
  activeServerName,
  activeServerId,
}) => {
  return (
    <div className={`w-full border-b transition-all duration-300 ${
      connected 
        ? 'bg-emerald-950/40 border-emerald-800/40' 
        : 'bg-amber-950/30 border-amber-800/40'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-3">
          {connected ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-emerald-300">
                Extension connected: Extension is active and sync'ed.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <span className="text-amber-300 font-medium">
                Extension offline. Open or pin the FlowVeo Chrome extension to enable real-time session sync.
              </span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-700/60 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Active Session: <strong className="text-slate-200">{activeServerName}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://labs.google/fx/tools/flow"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium transition shadow-sm"
          >
            <span>Open Google Labs Flow</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
