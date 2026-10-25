import React, { useState, useRef } from 'react';
import { Download, Columns, Image as ImageIcon, RotateCcw, CheckCircle, SlidersHorizontal, ArrowLeftRight, Sparkles } from 'lucide-react';

export const ResultView = ({ originalPerson, garmentPerson, resultImage, maskedImage, onReset, isMockMode = false, executionTime = null }) => {
  const [viewMode, setViewMode] = useState('slider'); // 'slider' | 'side_by_side' | 'pipeline'
  const [sliderPos, setSliderPos] = useState(50);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const sliderContainerRef = useRef(null);

  const handleSliderMove = (e) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pos);
  };

  const handleDownload = async () => {
    if (!resultImage) return;
    setIsDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch(resultImage);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const blob = await response.blob();
      
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `styleblend_tryon_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download error:', err);
      setDownloadError('Could not download image directly. Try right-clicking the image and selecting "Save Image As".');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full space-y-5 animate-fade-in">
      {downloadError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex justify-between items-center">
          <span>{downloadError}</span>
          <button onClick={() => setDownloadError(null)} className="text-rose-400 hover:text-white font-bold ml-2">✕</button>
        </div>
      )}

      {/* Studio Result Action Header */}
      <div className="bg-[#18181B] p-4 rounded-xl border border-violet-500/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-display text-xl tracking-wider text-white">TRY-ON SYNTHESIS READY</h3>
            {executionTime !== null && (
              <span className="text-[11px] text-[#A1A1AA] font-mono">
                Processed in {executionTime}s via Replicate IDM-VTON
              </span>
            )}
          </div>
        </div>

        {/* View Mode Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[#120E24] p-1 rounded-lg border border-violet-500/20 flex space-x-1">
            <button
              onClick={() => setViewMode('slider')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
                viewMode === 'slider'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Slider</span>
            </button>

            <button
              onClick={() => setViewMode('side_by_side')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
                viewMode === 'side_by_side'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>

            <button
              onClick={() => setViewMode('pipeline')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all ${
                viewMode === 'pipeline'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Pipeline</span>
            </button>
          </div>

          <button
            onClick={onReset}
            className="px-3.5 py-1.5 rounded-lg bg-[#222227] hover:bg-[#2c2c34] text-white/90 text-xs font-medium flex items-center space-x-1.5 transition-all border border-violet-500/20 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-violet-400" />
            <span>New Try-On</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="btn-violet-glow px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Downloading...' : 'Download Image'}</span>
          </button>
        </div>
      </div>

      {/* 1. Interactive Slider View */}
      {viewMode === 'slider' && (
        <div className="bg-[#18181B] p-5 rounded-2xl border border-violet-500/25 shadow-xl space-y-3">
          <div className="flex justify-between items-center text-xs text-[#A1A1AA]">
            <span className="flex items-center space-x-1.5 text-violet-300 font-medium">
              <SlidersHorizontal className="w-4 h-4 text-violet-400" />
              <span>Drag divider horizontally to compare Original vs AI Virtual Fit</span>
            </span>
            <span className="hidden sm:inline text-white/40">Touch or mouse enabled</span>
          </div>

          <div
            ref={sliderContainerRef}
            onMouseMove={handleSliderMove}
            onTouchMove={handleSliderMove}
            className="relative w-full aspect-[3/4] max-w-xl mx-auto rounded-xl overflow-hidden select-none cursor-ew-resize border border-violet-500/20 shadow-2xl bg-[#09090B]"
          >
            {/* Background Image: Generated Try-On Result */}
            <img
              src={resultImage}
              alt="Virtual Try-On Result"
              className="absolute inset-0 w-full h-full object-contain bg-[#09090B]"
            />

            {/* Foreground Image: Original Subject (Clipped by slider position) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={originalPerson}
                alt="Original Subject"
                className="absolute inset-0 w-full h-full object-contain bg-[#09090B]"
                style={{ width: sliderContainerRef.current ? `${sliderContainerRef.current.clientWidth}px` : '100%' }}
              />
            </div>

            {/* Vertical Slider Handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.9)] flex items-center justify-center cursor-ew-resize z-20"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="w-8 h-8 rounded-full bg-violet-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Floating Badges */}
            <div className="absolute top-3.5 left-3.5 px-3 py-1 rounded-lg bg-[#09090B]/85 backdrop-blur-sm text-[11px] font-semibold text-white border border-violet-500/25 z-10 pointer-events-none">
              Original Photo
            </div>
            <div className="absolute top-3.5 right-3.5 px-3 py-1 rounded-lg bg-violet-950/90 backdrop-blur-sm text-[11px] font-semibold text-violet-200 border border-violet-500/40 z-10 pointer-events-none">
              Virtual Try-On
            </div>
          </div>
        </div>
      )}

      {/* 2. Side-by-Side Comparison View */}
      {viewMode === 'side_by_side' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-[#18181B] p-4 rounded-xl border border-violet-500/20 space-y-3">
            <h4 className="font-display text-lg tracking-wider text-[#A1A1AA]">ORIGINAL PHOTO</h4>
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-[#09090B] flex items-center justify-center relative border border-violet-500/15">
              <img src={originalPerson} alt="Original Subject" className="w-full h-full object-contain" />
              <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-md bg-[#09090B]/85 text-[11px] text-white/80 border border-violet-500/20 font-medium">
                Input Subject
              </div>
            </div>
          </div>

          <div className="bg-[#18181B] p-4 rounded-xl border border-violet-500/35 shadow-xl shadow-violet-950/30 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-display text-lg tracking-wider text-violet-300">VIRTUAL TRY-ON RESULT</h4>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold font-sans">
                IDM-VTON
              </span>
            </div>
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-[#09090B] flex items-center justify-center relative border border-violet-500/30">
              <img src={resultImage} alt="Virtual Try-On Result" className="w-full h-full object-contain" />
              <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-md bg-violet-950/90 text-[11px] text-violet-200 border border-violet-500/30 font-medium">
                Synthesized Blend
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Pipeline Steps View */}
      {viewMode === 'pipeline' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#18181B] p-4 rounded-xl border border-violet-500/20 space-y-2">
            <h5 className="font-display text-base tracking-wider text-[#A1A1AA]">1. INPUT PERSON</h5>
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-[#09090B] flex items-center justify-center border border-violet-500/15">
              <img src={originalPerson} alt="Original" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="bg-[#18181B] p-4 rounded-xl border border-violet-500/20 space-y-2">
            <h5 className="font-display text-base tracking-wider text-violet-400">2. INPUT GARMENT</h5>
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-[#09090B] flex items-center justify-center border border-violet-500/15">
              <img src={garmentPerson || originalPerson} alt="Garment" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="bg-[#18181B] p-4 rounded-xl border border-violet-500/35 space-y-2">
            <h5 className="font-display text-base tracking-wider text-emerald-400">3. VIRTUAL FIT RESULT</h5>
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-[#09090B] flex items-center justify-center border border-violet-500/30">
              <img src={resultImage} alt="Result" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
