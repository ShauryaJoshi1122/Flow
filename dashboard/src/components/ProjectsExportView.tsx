import React, { useState } from 'react';
import { Download, Film, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ModelTier } from './CreditLedger.js';

export interface VideoProject {
  id: string;
  title: string;
  prompt: string;
  serverId: string;
  modelTier: string;
  createdAt: string;
  durationSeconds: number;
  exportUrls: {
    '270p': string;
    '720p': string;
    '1080p': string;
  };
  thumbnailUrl: string;
}

interface Props {
  projects: VideoProject[];
  activeServerId: string;
  activeServerName: string;
  modelTiers: ModelTier[];
  userCredits: number;
  onSimulateGeneration: (modelTier: string, prompt: string) => Promise<{ success: boolean; failoverTriggered?: boolean; newActiveServer?: string; error?: string }>;
}

export const ProjectsExportView: React.FC<Props> = ({
  projects,
  activeServerId,
  activeServerName,
  modelTiers,
  userCredits,
  onSimulateGeneration,
}) => {
  const [selectedTier, setSelectedTier] = useState<string>('veo-3.1-quality');
  const [promptText, setPromptText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationAlert, setGenerationAlert] = useState<{ message: string; type: 'success' | 'failover' | 'error' } | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    setIsGenerating(true);
    setGenerationAlert(null);

    const result = await onSimulateGeneration(selectedTier, promptText);
    setIsGenerating(false);

    if (result.success) {
      if (result.failoverTriggered) {
        setGenerationAlert({
          type: 'failover',
          message: `Generation succeeded! Quota exhausted on Server -> Automatic failover smoothly rotated to ${result.newActiveServer?.toUpperCase()} with zero downtime.`
        });
      } else {
        setGenerationAlert({
          type: 'success',
          message: 'Video successfully rendered and saved! Ready for direct export.'
        });
      }
      setPromptText('');
    } else {
      setGenerationAlert({
        type: 'error',
        message: result.error || 'Generation failed. Check credit balance.'
      });
    }
  };

  const currentTierObj = modelTiers.find(m => m.id === selectedTier);

  return (
    <div className="space-y-6">
      {/* Simulation Generation Sandbox */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-slate-100">Veo 3.1 Prompt Studio & Test Generator</h3>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700">
            Node: <strong className="text-blue-400">{activeServerName}</strong>
          </span>
        </div>

        {generationAlert && (
          <div className={`p-3.5 rounded-lg mb-4 text-xs flex items-start gap-2.5 border ${
            generationAlert.type === 'failover' 
              ? 'bg-amber-950/60 border-amber-600 text-amber-200'
              : generationAlert.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200'
              : 'bg-rose-950/60 border-rose-600 text-rose-200'
          }`}>
            {generationAlert.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            )}
            <div>{generationAlert.message}</div>
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Veo 3.1 Model Tier:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {modelTiers.map(tier => (
                <button
                  type="button"
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                    selectedTier === tier.id
                      ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-200">{tier.name}</span>
                  <div className="flex justify-between items-center mt-2 text-[11px]">
                    <span className="text-blue-400 font-mono font-semibold">{tier.creditCost} cr</span>
                    <span className="text-slate-500 text-[10px]">{tier.priority}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Prompt Specification:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="e.g. Ultra high definition drone shot gliding over a bioluminescent coral reef at midnight..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isGenerating || !promptText.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs rounded-lg transition shadow-md shadow-blue-600/30 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Rendering...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Render ({currentTierObj?.creditCost || 0} cr)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Projects on Current Server */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Server-Isolated Video Gallery</span>
              <span className="text-xs bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-mono">
                {activeServerId.toUpperCase()}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing projects tied exclusively to this backend node. Google profile details stripped.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {projects.length} project(s) on this node
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No projects found on this server yet. Run a prompt above or switch to another server.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div className="relative aspect-video bg-slate-900 group">
                  <img
                    src={proj.thumbnailUrl}
                    alt={proj.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                    <span className="text-[11px] font-semibold text-slate-300 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">
                      {proj.durationSeconds}s • {proj.modelTier}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-200 line-clamp-1">{proj.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      "{proj.prompt}"
                    </p>
                  </div>

                  {/* Direct Export Buttons (270p, 720p, 1080p) */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="text-[11px] uppercase font-semibold tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>Direct Resolution Export:</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <a
                        href={proj.exportUrls['270p']}
                        download={`flowveo_${proj.id}_270p.mp4`}
                        className="py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-center rounded text-xs font-semibold transition border border-slate-700"
                        title="Low resolution fast draft"
                      >
                        270p
                      </a>
                      <a
                        href={proj.exportUrls['720p']}
                        download={`flowveo_${proj.id}_720p.mp4`}
                        className="py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700 text-blue-300 text-center rounded text-xs font-semibold transition border border-slate-700"
                        title="High Definition Web"
                      >
                        720p HD
                      </a>
                      <a
                        href={proj.exportUrls['1080p']}
                        download={`flowveo_${proj.id}_1080p.mp4`}
                        className="py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white text-center rounded text-xs font-bold transition shadow-sm"
                        title="Full High Definition Master"
                      >
                        1080p FHD
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
