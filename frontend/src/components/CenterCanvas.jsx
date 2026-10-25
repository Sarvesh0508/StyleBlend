import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Columns,
  Image as ImageIcon,
  ArrowLeftRight,
  Layers,
  AlertCircle
} from 'lucide-react';

export const CenterCanvas = ({
  originalPerson,
  garmentPerson,
  resultData,
  onResetResult,
}) => {
  const [viewMode, setViewMode] = useState('slider'); // 'slider' | 'side_by_side' | 'single'
  const [sliderPos, setSliderPos] = useState(50);
  const [zoom, setZoom] = useState(100);
  const [containerWidth, setContainerWidth] = useState(420);
  const [resultImgError, setResultImgError] = useState(false);
  const sliderContainerRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    setResultImgError(false);
  }, [resultData?.result]);

  // ResizeObserver to keep clipped image exactly aligned with container
  useEffect(() => {
    if (!sliderContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect?.width) {
          setContainerWidth(Math.round(entry.contentRect.width));
        }
      }
    });
    observer.observe(sliderContainerRef.current);
    return () => observer.disconnect();
  }, [viewMode, resultData]);

  const handleSliderMove = (clientX) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pos);
  };

  const handleMouseMove = (e) => {
    if (isDraggingRef.current || e.buttons === 1) {
      handleSliderMove(e.clientX);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(200, prev + 10));
  const handleZoomOut = () => setZoom((prev) => Math.max(50, prev - 10));
  const handleFitCanvas = () => setZoom(100);
  const handleResetView = () => {
    setZoom(100);
    setSliderPos(50);
  };

  const hasResult = Boolean(resultData?.result);

  return (
    <main className="flex-1 min-w-0 flex flex-col atelier-panel overflow-hidden select-none">
      
      {/* CANVAS COMPACT TOP TOOLBAR */}
      <div className="h-9 border-b border-[#27272A] bg-[#141418] px-3 flex items-center justify-between text-xs">
        {/* Left: View Mode Toggles */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className={`h-6 px-2 rounded text-[11px] font-medium flex items-center space-x-1 transition-all ${
              viewMode === 'slider'
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50 font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Draggable Split Slider comparison"
          >
            <ArrowLeftRight className="w-3 h-3" />
            <span className="hidden sm:inline">Split Slider</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('side_by_side')}
            className={`h-6 px-2 rounded text-[11px] font-medium flex items-center space-x-1 transition-all ${
              viewMode === 'side_by_side'
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50 font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Side-by-side view"
          >
            <Columns className="w-3 h-3" />
            <span className="hidden sm:inline">Side-by-Side</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('single')}
            className={`h-6 px-2 rounded text-[11px] font-medium flex items-center space-x-1 transition-all ${
              viewMode === 'single'
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50 font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Single fitted canvas image"
          >
            <ImageIcon className="w-3 h-3" />
            <span className="hidden sm:inline">Single Image</span>
          </button>
        </div>

        {/* Right: Zoom & Canvas Actions */}
        <div className="flex items-center space-x-1 text-[11px] text-zinc-400">
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-6 h-6 rounded bg-[#18181D] hover:bg-zinc-800 border border-[#27272A] flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>

          <span className="w-10 text-center font-mono text-[10px] text-zinc-300">
            {zoom}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            className="w-6 h-6 rounded bg-[#18181D] hover:bg-zinc-800 border border-[#27272A] flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>

          <div className="h-3 w-[1px] bg-zinc-800 mx-1" />

          <button
            type="button"
            onClick={handleFitCanvas}
            className="h-6 px-2 rounded bg-[#18181D] hover:bg-zinc-800 border border-[#27272A] text-[10px] text-zinc-300 hover:text-white flex items-center space-x-1 transition-colors"
            title="Fit Canvas (100%)"
          >
            <Maximize2 className="w-2.5 h-2.5" />
            <span className="hidden md:inline">Fit</span>
          </button>

          <button
            type="button"
            onClick={handleResetView}
            className="h-6 px-2 rounded bg-[#18181D] hover:bg-zinc-800 border border-[#27272A] text-[10px] text-zinc-300 hover:text-white flex items-center space-x-1 transition-colors"
            title="Reset Slider & Zoom"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span className="hidden md:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* MAIN CANVAS VIEWPORT */}
      <div className="flex-1 relative overflow-hidden bg-[#0A0A0D] flex items-center justify-center p-2 sm:p-4">
        
        {/* State A: Generated Result Available */}
        {hasResult ? (
          resultImgError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center bg-[#14141A] border border-amber-900/50 rounded-lg max-w-sm space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-xs text-zinc-200 font-semibold mb-1">Result Image File Missing or Expired</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  The temporary generation file is no longer available on the server. Please re-run the virtual try-on or select a saved look from the archive.
                </p>
              </div>
              {onResetResult && (
                <button
                  type="button"
                  onClick={onResetResult}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded font-medium transition-colors"
                >
                  Reset Canvas
                </button>
              )}
            </div>
          ) : (
            <div
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
              className="transition-transform duration-100 ease-out flex items-center justify-center max-h-full max-w-full"
            >
              {/* 1. Split Slider View */}
              {viewMode === 'slider' && (
                <div
                  ref={sliderContainerRef}
                  onMouseDown={() => (isDraggingRef.current = true)}
                  onMouseUp={() => (isDraggingRef.current = false)}
                  onMouseLeave={() => (isDraggingRef.current = false)}
                  onMouseMove={handleMouseMove}
                  onTouchMove={handleTouchMove}
                  className="relative aspect-[3/4] h-[65vh] max-h-[580px] rounded overflow-hidden select-none cursor-ew-resize border border-zinc-800 shadow-2xl bg-black"
                >
                  {/* Background image: Generated Try-on result */}
                  <img
                    src={resultData.result}
                    alt="Virtual Try-On Result"
                    onError={() => setResultImgError(true)}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />

                  {/* Foreground image: Original person (clipped by sliderPos) */}
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ width: `${sliderPos}%` }}
                  >
                    <img
                      src={originalPerson}
                      alt="Original Subject"
                      className="absolute inset-0 h-full object-contain"
                      style={{
                        width: `${containerWidth}px`,
                        maxWidth: 'none',
                      }}
                    />
                  </div>

                  {/* Vertical Divider with Violet Handle */}
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)] flex items-center justify-center cursor-ew-resize z-20 pointer-events-none"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="w-6 h-6 rounded-full bg-violet-600 border border-white shadow-lg flex items-center justify-center text-white">
                      <ArrowLeftRight className="w-3 h-3" />
                    </div>
                  </div>

                  {/* Floating Badges */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-zinc-300 border border-zinc-800 z-10 pointer-events-none">
                    BEFORE: ORIGINAL
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-violet-950/80 backdrop-blur-sm text-[10px] font-mono text-violet-300 border border-violet-500/30 z-10 pointer-events-none">
                    AFTER: SYNTHESIZED FIT
                  </div>
                </div>
              )}

              {/* 2. Side-by-Side View */}
              {viewMode === 'side_by_side' && (
                <div className="grid grid-cols-2 gap-3 h-[65vh] max-h-[580px] w-full max-w-4xl">
                  <div className="aspect-[3/4] rounded overflow-hidden bg-black border border-zinc-800 relative flex items-center justify-center">
                    <img src={originalPerson} alt="Original Subject" className="w-full h-full object-contain" />
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-zinc-400 border border-zinc-800">
                      ORIGINAL
                    </div>
                  </div>
                  <div className="aspect-[3/4] rounded overflow-hidden bg-black border border-violet-500/40 relative flex items-center justify-center shadow-lg shadow-violet-950/20">
                    <img
                      src={resultData.result}
                      alt="Try-On Fit"
                      onError={() => setResultImgError(true)}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-violet-950/90 text-[10px] font-mono text-violet-300 border border-violet-500/40">
                      VIRTUAL FIT
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Single Image View */}
              {viewMode === 'single' && (
                <div className="aspect-[3/4] h-[65vh] max-h-[580px] rounded overflow-hidden bg-black border border-zinc-800 relative flex items-center justify-center shadow-2xl">
                  <img
                    src={resultData.result}
                    alt="Try-On Fit"
                    onError={() => setResultImgError(true)}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-violet-300 border border-violet-500/30">
                    IDM-VTON FP16
                  </div>
                </div>
              )}
            </div>
          )
        ) : originalPerson ? (
          /* State B: Person Image Loaded, Awaiting Generation */
          <div
            style={{ transform: `scale(${zoom / 100})` }}
            className="relative aspect-[3/4] h-[65vh] max-h-[580px] rounded overflow-hidden bg-black border border-zinc-800 shadow-2xl flex items-center justify-center"
          >
            <img
              src={originalPerson}
              alt="Staged Person"
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-black/80 backdrop-blur-sm border border-zinc-700 text-[10px] font-mono text-zinc-300 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span>STAGED ASSET • READY FOR INFERENCE</span>
            </div>

            {/* Garment Preview PIP badge */}
            {garmentPerson && (
              <div className="absolute top-3 right-3 w-16 h-20 rounded overflow-hidden border border-violet-500/40 bg-black/90 shadow-lg">
                <img src={garmentPerson} alt="Garment Target" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] text-center font-mono text-zinc-300">
                  TARGET
                </div>
              </div>
            )}
          </div>
        ) : (
          /* State C: Compact Empty State */
          <div className="max-w-md w-full border border-dashed border-zinc-800 bg-[#121215]/50 rounded-lg p-6 text-center space-y-2">
            <div className="w-9 h-9 rounded bg-zinc-800/80 border border-zinc-700 text-zinc-500 mx-auto flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-zinc-300 tracking-wider">CANVAS IDLE</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed max-w-xs mx-auto">
                Stage person and garment assets on the left to preview and synthesize virtual fits.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CANVAS BOTTOM STATUS BAR */}
      <div className="h-7 border-t border-[#27272A] bg-[#141418] px-3 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <div className="flex items-center space-x-2">
          <span>CANVAS: 768 × 1024 PX</span>
          <span className="text-zinc-700">•</span>
          <span className="uppercase text-zinc-400">
            {hasResult ? `MODE: ${viewMode.replace('_', ' ')}` : 'AWAITING RUN'}
          </span>
        </div>

        <div>
          {hasResult && resultData?.executionTime ? (
            <span className="text-violet-400">
              Inference: {resultData.executionTime}s (Replicate IDM-VTON)
            </span>
          ) : (
            <span className="text-zinc-600">IDM-VTON Pipeline</span>
          )}
        </div>
      </div>

    </main>
  );
};
