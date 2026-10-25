import React from 'react';
import { Download, Info, Menu } from 'lucide-react';

export const Navbar = ({
  backendHealth,
  statusState = 'empty', // 'empty' | 'generating' | 'active_result' | 'error'
  hasResult = false,
  onDownload,
  onOpenAbout,
  isDownloading = false,
  onToggleMobileSidebar,
}) => {
  const isOnline = backendHealth?.status === 'online';

  return (
    <header className="h-11 flex-shrink-0 w-full bg-[#121215] border-b border-[#27272A] px-3 sm:px-4 flex items-center justify-between select-none">
      {/* Left: Mobile Menu Toggle & Breadcrumb */}
      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 lg:hidden"
            title="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center space-x-1.5 text-xs">
          <span className="font-semibold text-zinc-400 tracking-wider">ATELIER</span>
          <span className="text-zinc-600 font-bold">&gt;</span>
          <span className="font-bold text-white tracking-wider">VIRTUAL TRY-ON</span>
        </div>

        <div className="h-3 w-[1px] bg-zinc-800" />

        {/* Backend Connectivity Status */}
        <div
          className="flex items-center space-x-1.5 text-[11px] text-zinc-400"
          title={isOnline ? "FastAPI backend connected at http://localhost:8000" : "FastAPI backend offline"}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isOnline ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-rose-500'
            }`}
          />
          <span className="hidden sm:inline font-mono">
            {isOnline ? 'API Connected' : 'API Offline'}
          </span>
        </div>

        {/* Inference Provider Readiness Status */}
        {backendHealth && (
          <div
            className="hidden md:flex items-center space-x-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400"
            title={backendHealth.replicate_configured ? "Replicate API token configured" : "Replicate API token missing from backend/.env"}
          >
            <span className={`w-1 h-1 rounded-full ${backendHealth.replicate_configured ? 'bg-violet-400' : 'bg-amber-400'}`} />
            <span>IDM-VTON: {backendHealth.replicate_configured ? 'Configured' : 'No Token'}</span>
          </div>
        )}
      </div>

      {/* Center/Right: State Indicators & Result Actions */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Real State Indicators: EMPTY, GENERATING, ACTIVE RESULT, ERROR */}
        <div className="flex items-center bg-[#18181D] border border-[#27272A] rounded p-0.5 text-[10px] font-mono tracking-wider">
          <span
            className={`px-2 py-0.5 rounded transition-all ${
              statusState === 'empty'
                ? 'bg-zinc-700/80 text-white font-bold'
                : 'text-zinc-500'
            }`}
          >
            EMPTY
          </span>

          <span
            className={`px-2 py-0.5 rounded flex items-center space-x-1 transition-all ${
              statusState === 'generating'
                ? 'bg-violet-600/30 text-violet-300 font-bold border border-violet-500/40'
                : 'text-zinc-500'
            }`}
          >
            {statusState === 'generating' && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping inline-block" />
            )}
            <span>GENERATING</span>
          </span>

          <span
            className={`px-2 py-0.5 rounded transition-all ${
              statusState === 'active_result'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                : 'text-zinc-500'
            }`}
          >
            ACTIVE RESULT
          </span>

          <span
            className={`px-2 py-0.5 rounded transition-all ${
              statusState === 'error'
                ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                : 'text-zinc-500'
            }`}
          >
            ERROR
          </span>
        </div>

        {/* Download Result Button (Active only when result exists) */}
        <button
          onClick={onDownload}
          disabled={!hasResult || isDownloading}
          className={`h-7 px-2.5 rounded text-xs font-medium flex items-center space-x-1.5 transition-all ${
            hasResult && !isDownloading
              ? 'btn-violet-accent active:scale-95 cursor-pointer shadow-sm'
              : 'bg-zinc-800/60 text-zinc-600 border border-zinc-800 cursor-not-allowed opacity-60'
          }`}
          title={hasResult ? "Download generated result image" : "Generate a result to download"}
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Download</span>
        </button>

        {/* About Atelier Modal Toggle */}
        <button
          onClick={onOpenAbout}
          className="h-7 w-7 rounded bg-[#18181D] hover:bg-zinc-800 border border-[#27272A] text-zinc-400 hover:text-white flex items-center justify-center transition-all"
          title="About Atelier Architecture"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};

