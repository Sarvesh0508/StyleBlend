import React from 'react';
import { Shirt, Cpu, Code2 } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="w-full border-t border-violet-500/15 bg-[#09090B] mt-16 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center shadow-md">
              <Shirt className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-display text-lg tracking-wider text-white">STYLEBLEND STUDIO</span>
              <p className="text-xs text-[#A1A1AA]">AI-Powered Virtual Try-On Pipeline & Image Blending</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs text-[#A1A1AA]">
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#18181B] border border-violet-500/20 text-violet-300">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              <span>IDM-VTON Diffusion</span>
            </span>
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#18181B] border border-violet-500/20 text-violet-300">
              <Code2 className="w-3.5 h-3.5 text-purple-400" />
              <span>FastAPI + React 18</span>
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-violet-500/10 flex flex-col sm:flex-row justify-between items-center text-xs text-[#A1A1AA] gap-2">
          <p>© {new Date().getFullYear()} StyleBlend Virtual Try-On Studio. All rights reserved.</p>
          <p className="text-[#A1A1AA]/80 font-mono text-[11px]">
            Engineered for Photorealistic Fashion Synthesis
          </p>
        </div>
      </div>
    </footer>
  );
};
