import React from 'react';
import { X, Cpu, Layers, ShieldCheck, Code2 } from 'lucide-react';

export const AboutModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="bg-[#121215] border border-[#27272A] max-w-xl w-full rounded-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="h-10 border-b border-[#27272A] bg-[#16161A] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300">
            <span className="font-bold text-white tracking-wider">ATELIER ARCHITECTURE</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 font-mono text-[11px]">IDM-VTON SYSTEM</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-zinc-400 max-h-[75vh] overflow-y-auto">
          <p className="text-zinc-300 leading-relaxed">
            <strong className="text-white">StyleBlend Atelier</strong> is an AI-powered virtual try-on studio built on the state-of-the-art <strong className="text-violet-300">IDM-VTON</strong> (Image-based Diffusion Model for Virtual Try-On) framework. It blends garment texture, pose, and body geometry onto human subjects with high photorealism.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded bg-[#18181D] border border-zinc-800 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-violet-400 font-semibold">
                <Cpu className="w-3.5 h-3.5" />
                <span>Cloud GPU Inference</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                IDM-VTON diffusion runs on cloud GPUs via Replicate, generating high-resolution cloth draping and natural fold physics.
              </p>
            </div>

            <div className="p-3 rounded bg-[#18181D] border border-zinc-800 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-purple-400 font-semibold">
                <Layers className="w-3.5 h-3.5" />
                <span>FastAPI Middleware</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                FastAPI handles multipart validation, PIL structural verification, file sanitization, and Replicate client orchestration.
              </p>
            </div>

            <div className="p-3 rounded bg-[#18181D] border border-zinc-800 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Production Guardrails</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Input checks for dimensions, extensions (.jpg/.png/.webp), file size limits, and fail-fast honest error reporting.
              </p>
            </div>

            <div className="p-3 rounded bg-[#18181D] border border-zinc-800 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-blue-400 font-semibold">
                <Code2 className="w-3.5 h-3.5" />
                <span>React 18 &amp; Tailwind</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Single-page atelier layout with instant slider comparison, responsive zoom controls, and live backend telemetry.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 text-[11px] text-zinc-500 font-mono flex justify-between items-center">
            <span>B.Tech Final Year Project Demonstration</span>
            <span className="text-zinc-400">FastAPI + Replicate + React</span>
          </div>
        </div>

        {/* Footer */}
        <div className="h-10 border-t border-[#27272A] bg-[#16161A] px-4 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
