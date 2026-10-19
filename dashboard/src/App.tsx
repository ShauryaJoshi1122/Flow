import { useState, useEffect, useRef } from 'react';
import { Server, Coins, Film, History } from 'lucide-react';
import { ExtensionSyncIndicator } from './components/ExtensionSyncIndicator.js';
import { ServerSelector, ServerAccount } from './components/ServerSelector.js';
import { CreditLedger, CreditPackage, CreditTransaction, ModelTier } from './components/CreditLedger.js';
import { ProjectsExportView, VideoProject } from './components/ProjectsExportView.js';
import { FailoverHistoryModal, FailoverEvent } from './components/FailoverHistoryModal.js';

const API_BASE = 'http://localhost:3001/api';
const WS_BASE = 'ws://localhost:3001/ws';

export default function App() {
  const [activeTab, setActiveTab] = useState<'servers' | 'credits' | 'projects'>('servers');
  const [extensionConnected, setExtensionConnected] = useState<boolean>(false);
  const [activeServerId, setActiveServerId] = useState<string>('server-1');
  const [activeServerName, setActiveServerName] = useState<string>('Server 1 (Primary Pool A)');
  const [autoFailoverEnabled, setAutoFailoverEnabled] = useState<boolean>(true);
  const [masterBalance, setMasterBalance] = useState<number>(249940);
  const [userBalance, setUserBalance] = useState<number>(25000);
  const [servers, setServers] = useState<ServerAccount[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [modelTiers, setModelTiers] = useState<ModelTier[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [failoverHistory, setFailoverHistory] = useState<FailoverEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSwitchingServer, setIsSwitchingServer] = useState<boolean>(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  // Initial data fetch via REST API
  const fetchAllData = async () => {
    try {
      const [statusRes, creditsRes, modelsRes, projectsRes] = await Promise.all([
        fetch(`${API_BASE}/status`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/credits`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/models`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/projects?serverId=${activeServerId}`).then(r => r.json()).catch(() => null)
      ]);

      if (statusRes) {
        setActiveServerId(statusRes.activeServerId);
        setActiveServerName(statusRes.activeServerName);
        setAutoFailoverEnabled(statusRes.autoFailoverEnabled);
        setMasterBalance(statusRes.masterCreditBalance);
        setUserBalance(statusRes.userCreditBalance);
        setServers(statusRes.servers || []);
      }

      if (creditsRes) {
        setPackages(creditsRes.packages || []);
        setTransactions(creditsRes.transactions || []);
      }

      if (modelsRes) {
        setModelTiers(modelsRes.models || []);
      }

      if (projectsRes) {
        setProjects(projectsRes.projects || []);
      }
    } catch (err) {
      console.warn('Backend currently unreachable, waiting for service startup...', err);
    }
  };

  // Setup persistent WebSocket for real-time updates
  useEffect(() => {
    fetchAllData();

    function connectWS() {
      const ws = new WebSocket(WS_BASE);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('[Dashboard WS] Connected to FlowVeo Master Server');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'STATE_UPDATE' || payload.type === 'INIT_STATE') {
            const data = payload.data;
            setExtensionConnected(Boolean(data.extensionConnected));
            setActiveServerId(data.activeServerId);
            setActiveServerName(data.activeServerName);
            setAutoFailoverEnabled(data.autoFailoverEnabled);
            setMasterBalance(data.masterCreditBalance);
            setUserBalance(data.userCreditBalance);
            if (data.servers) setServers(data.servers);
            if (data.failoverHistory) setFailoverHistory(data.failoverHistory);
          }
        } catch (e) {
          console.error('[Dashboard WS] Error parsing message:', e);
        }
      };

      ws.onclose = () => {
        setTimeout(connectWS, 4000);
      };
    }

    connectWS();

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  // Refresh projects when active server changes
  useEffect(() => {
    fetch(`${API_BASE}/projects?serverId=${activeServerId}`)
      .then(r => r.json())
      .then(data => {
        if (data?.projects) setProjects(data.projects);
      })
      .catch(() => {});
  }, [activeServerId]);

  // Handle server switch
  const handleSelectServer = async (serverId: ServerAccount['id']) => {
    setIsSwitchingServer(true);
    setNoticeMessage(null);
    try {
      const res = await fetch(`${API_BASE}/servers/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId })
      });
      const data = await res.json();
      if (data.success) {
        setActiveServerId(serverId);
        setActiveServerName(data.server.name);
        setNoticeMessage(data.warning);
      }
    } catch (e: any) {
      alert(`Server switch error: ${e.message}`);
    } finally {
      setIsSwitchingServer(false);
    }
  };

  const handleToggleFailover = async (enabled: boolean) => {
    setAutoFailoverEnabled(enabled);
    try {
      await fetch(`${API_BASE}/servers/toggle-failover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetQuota = async (serverId: ServerAccount['id']) => {
    try {
      await fetch(`${API_BASE}/servers/reset-quota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId })
      });
      fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePurchasePackage = async (packageId: string) => {
    try {
      const res = await fetch(`${API_BASE}/credits/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId })
      });
      const data = await res.json();
      if (data.success) {
        setUserBalance(data.newBalance);
        fetchAllData();
      }
    } catch (e: any) {
      alert(`Purchase error: ${e.message}`);
    }
  };

  const handleSimulateGeneration = async (modelTier: string, prompt: string) => {
    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelTier, prompt })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUserBalance(data.remainingUserBalance);
        if (data.failoverTriggered && data.newActiveServer) {
          setActiveServerId(data.newActiveServer);
        }
        fetchAllData();
        return {
          success: true,
          failoverTriggered: data.failoverTriggered,
          newActiveServer: data.newActiveServer
        };
      } else {
        return { success: false, error: data.error };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans">
      {/* 1. Sync & Connection Banner */}
      <ExtensionSyncIndicator
        connected={extensionConnected}
        activeServerName={activeServerName}
        activeServerId={activeServerId}
      />

      {/* 2. Main Dashboard Navigation Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="FlowDeck Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-blue-500/20 border border-blue-500/30"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">FlowDeck</h1>
                <span className="text-[10px] font-bold bg-slate-800 text-blue-400 px-2 py-0.5 rounded-full border border-slate-700">
                  Dashboard
                </span>
              </div>
              <p className="text-[11px] text-slate-400">AI Video Creation & Profile Manager • Google Labs Flow</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('servers')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'servers'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>Servers & Pooling</span>
            </button>

            <button
              onClick={() => setActiveTab('credits')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'credits'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Virtual Credits & Tiers</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'projects'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Export Studio</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
              title="View account rotation history"
            >
              <History className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Rotation Log</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {noticeMessage && (
          <div className="mb-6 p-4 bg-amber-950/60 border border-amber-600/80 rounded-xl text-xs text-amber-200 flex items-start justify-between gap-3 shadow-lg">
            <div>{noticeMessage}</div>
            <button
              onClick={() => setNoticeMessage(null)}
              className="text-amber-400 hover:text-amber-200 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === 'servers' && (
          <div className="space-y-6">
            <ServerSelector
              servers={servers}
              activeServerId={activeServerId}
              autoFailoverEnabled={autoFailoverEnabled}
              onSelectServer={handleSelectServer}
              onToggleFailover={handleToggleFailover}
              onResetQuota={handleResetQuota}
              onRefreshData={fetchAllData}
              isSwitching={isSwitchingServer}
            />

            {/* Quick Projects Preview for current server */}
            <ProjectsExportView
              projects={projects}
              activeServerId={activeServerId}
              activeServerName={activeServerName}
              modelTiers={modelTiers}
              userCredits={userBalance}
              onSimulateGeneration={handleSimulateGeneration}
            />
          </div>
        )}

        {activeTab === 'credits' && (
          <CreditLedger
            masterBalance={masterBalance}
            userBalance={userBalance}
            packages={packages}
            modelTiers={modelTiers}
            transactions={transactions}
            onPurchasePackage={handlePurchasePackage}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectsExportView
            projects={projects}
            activeServerId={activeServerId}
            activeServerName={activeServerName}
            modelTiers={modelTiers}
            userCredits={userBalance}
            onSimulateGeneration={handleSimulateGeneration}
          />
        )}
      </main>

      {/* Rotation & Failover Log Modal */}
      <FailoverHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        history={failoverHistory}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        FlowDeck • AI Video Creation & Profile Manager • Google Labs Flow Session Virtualization
      </footer>
    </div>
  );
}
