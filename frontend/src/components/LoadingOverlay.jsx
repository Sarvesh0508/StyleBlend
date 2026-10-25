import React from 'react';
import { Sparkles, Cpu } from 'lucide-react';

export const LoadingOverlay = ({ message = "Synthesizing virtual garment fit with IDM-VTON diffusion on Replicate GPU. This typically takes 15–30 seconds..." }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090B]/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#18181B] max-w-md w-full p-8 rounded-2xl border border-violet-500/30 shadow-2xl shadow-violet-950/60 text-center space-y-6">
        
        {/* Violet Animated Concentric Rings */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          {/* Outer glowing pulsing ring */}
          <div className="absolute inset-0 rounded-full border border-violet-500/30 animate-ping opacity-25" />
          
          {/* Middle counter-rotating ring */}
          <div className="absolute inset-1 rounded-full border-2 border-dashed border-violet-400/40 animate-spin" style={{ animationDuration: '6s' }} />
          
          {/* Main fast rotating violet ring */}
          <div className="absolute inset-2.5 rounded-full border-2 border-violet-900 border-t-violet-400 animate-spin" style={{ animationDuration: '1.2s' }} />
          
          {/* Inner core */}
          <div className="relative w-12 h-12 rounded-full bg-[#120E24] border border-violet-500/40 flex items-center justify-center shadow-inner">
            <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
          </div>
        </div>

        {/* Text Details with Bebas Neue Heading */}
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-xs font-semibold uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
            <span>Neural Diffusion In Progress</span>
          </div>

          <h3 className="font-display text-3xl sm:text-4xl tracking-wider text-white">
            GENERATING VIRTUAL TRY-ON
          </h3>

          <p className="text-xs text-[#A1A1AA] leading-relaxed max-w-sm mx-auto">
            {message}
          </p>
        </div>

        {/* Pipeline Info */}
        <div className="p-3 rounded-xl bg-[#120E24] border border-violet-500/15 flex items-center justify-between text-xs text-[#A1A1AA]">
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-white/80">IDM-VTON Pipeline</span>
          </span>
          <span className="text-violet-300 font-mono text-[11px]">Cloud GPU Processing</span>
        </div>
      </div>
    </div>
  );
};
