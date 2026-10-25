import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeftRight,
  Columns,
  Sliders,
  Upload,
  Sparkles,
  Download,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Check,
  ChevronDown
} from 'lucide-react';
import { getSavedLooks } from '../../services/storage';

export const ComparisonLabView = ({
  currentSubject,
  currentGarment,
  currentResult,
}) => {
  const [mode, setMode] = useState('split'); // 'split' (slider) | 'side_by_side'
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Available candidate images for comparison
  const [candidates, setCandidates] = useState([]);

  // Slot A (Left / Original) and Slot B (Right / Result)
  const [slotA, setSlotA] = useState(null);
  const [slotB, setSlotB] = useState(null);

  // Selector dropdowns
  const [isSelectorOpenA, setIsSelectorOpenA] = useState(false);
  const [isSelectorOpenB, setIsSelectorOpenB] = useState(false);

  // Initialize candidates from current session and saved looks
  useEffect(() => {
    const list = [];

    if (currentSubject) {
      list.push({
        id: 'session_subject',
        label: 'Active Studio Subject',
        tag: 'Original Person',
        url: currentSubject,
      });
    }

    if (currentGarment) {
      list.push({
        id: 'session_garment',
        label: 'Active Studio Garment',
        tag: 'Garment Asset',
        url: currentGarment,
      });
    }

    if (currentResult) {
      list.push({
        id: 'session_result',
        label: 'Current Try-On Result',
        tag: 'Generated Result',
        url: currentResult,
      });
    }

    // Default sample assets
    list.push({
      id: 'sample_model',
      label: 'Sample Subject (Studio Model)',
      tag: 'Reference Sample',
      url: '/samples/model_sample.jpg',
    });

    list.push({
      id: 'sample_garment',
      label: 'Sample Garment (Graphic Tee)',
      tag: 'Reference Sample',
      url: '/samples/garment_sample.jpg',
    });

    // Saved Looks from local storage
    const saved = getSavedLooks();
    saved.forEach((look, idx) => {
      if (look.resultImage) {
        list.push({
          id: `saved_look_result_${look.id || idx}`,
          label: `Saved Look: ${look.description || 'Try-On Synthesis'}`,
          tag: 'Saved Look',
          url: look.resultImage,
        });
      }
      if (look.originalPerson) {
        list.push({
          id: `saved_look_orig_${look.id || idx}`,
          label: `Subject (${new Date(look.timestamp).toLocaleDateString()})`,
          tag: 'Saved Subject',
          url: look.originalPerson,
        });
      }
    });

    setCandidates(list);

    // Initial defaults
    if (!slotA && list.length > 0) {
      const initialA = list.find((c) => c.id === 'session_subject') || list[0];
      setSlotA(initialA);
    }
    if (!slotB && list.length > 1) {
      const initialB =
        list.find((c) => c.id === 'session_result') ||
        list.find((c) => c.id === 'session_garment') ||
        list[1];
      setSlotB(initialB);
    }
  }, [currentSubject, currentGarment, currentResult]);

  // Handle Dragging Slider
  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPos(percent);
  };

  const handleTouchMove = (e) => {
    if (!containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPos(percent);
  };

  const handleCustomUpload = (slotKey, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const customItem = {
        id: `custom_${Date.now()}`,
        label: file.name,
        tag: 'Local Upload',
        url: event.target.result,
      };
      setCandidates((prev) => [customItem, ...prev]);
      if (slotKey === 'A') {
        setSlotA(customItem);
        setIsSelectorOpenA(false);
      } else {
        setSlotB(customItem);
        setIsSelectorOpenB(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSwapSlots = () => {
    const temp = slotA;
    setSlotA(slotB);
    setSlotB(temp);
  };

  return (
    <div className="flex-1 h-full min-h-0 bg-[#09090B] flex flex-col overflow-hidden">
      {/* HEADER BAR */}
      <div className="h-12 flex-shrink-0 border-b border-[#27272A] px-4 flex items-center justify-between bg-[#0E0E12]">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-display text-lg tracking-wider text-white uppercase leading-none">
              COMPARISON LAB
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono leading-none mt-0.5">
              PRECISION SIDE-BY-SIDE &amp; SPLIT SLIDER IMAGE ANALYSIS
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Tools */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-[#18181D] border border-zinc-800 rounded p-0.5">
            <button
              type="button"
              onClick={() => setMode('split')}
              className={`h-6 px-2.5 rounded text-[11px] font-mono flex items-center space-x-1.5 transition-colors ${
                mode === 'split'
                  ? 'bg-violet-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Split Slider</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('side_by_side')}
              className={`h-6 px-2.5 rounded text-[11px] font-mono flex items-center space-x-1.5 transition-colors ${
                mode === 'side_by_side'
                  ? 'bg-violet-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Side-by-Side</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSwapSlots}
            className="h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center space-x-1 transition-colors"
            title="Swap Left and Right Images"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Swap</span>
          </button>
        </div>
      </div>

      {/* COMPARISON SLOTS SELECTOR BAR */}
      <div className="px-4 py-2 border-b border-[#27272A] bg-[#0C0C0F] grid grid-cols-1 md:grid-cols-2 gap-3 flex-shrink-0">
        {/* SLOT A SELECTOR */}
        <div className="relative">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
            <span className="text-violet-400 font-bold">Image A (Left / Base)</span>
            <label className="cursor-pointer text-zinc-500 hover:text-zinc-300 flex items-center space-x-1">
              <Upload className="w-2.5 h-2.5" />
              <span>Upload Custom</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleCustomUpload('A', e)}
                className="hidden"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsSelectorOpenA(!isSelectorOpenA);
              setIsSelectorOpenB(false);
            }}
            className="w-full h-8 px-2.5 rounded bg-[#16161C] border border-zinc-800 hover:border-zinc-700 text-xs text-white flex items-center justify-between transition-colors"
          >
            <span className="truncate">{slotA?.label || 'Select base image...'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 ml-1" />
          </button>

          {isSelectorOpenA && (
            <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 bg-[#16161C] border border-zinc-700 rounded shadow-xl overflow-y-auto p-1 space-y-0.5">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  onClick={() => {
                    setSlotA(cand);
                    setIsSelectorOpenA(false);
                  }}
                  className="px-2 py-1.5 rounded hover:bg-violet-600/20 hover:text-violet-300 cursor-pointer text-xs flex items-center justify-between"
                >
                  <span className="truncate">{cand.label}</span>
                  <span className="text-[9px] font-mono text-zinc-500 ml-2">{cand.tag}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SLOT B SELECTOR */}
        <div className="relative">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
            <span className="text-purple-400 font-bold">Image B (Right / Comparison)</span>
            <label className="cursor-pointer text-zinc-500 hover:text-zinc-300 flex items-center space-x-1">
              <Upload className="w-2.5 h-2.5" />
              <span>Upload Custom</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleCustomUpload('B', e)}
                className="hidden"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsSelectorOpenB(!isSelectorOpenB);
              setIsSelectorOpenA(false);
            }}
            className="w-full h-8 px-2.5 rounded bg-[#16161C] border border-zinc-800 hover:border-zinc-700 text-xs text-white flex items-center justify-between transition-colors"
          >
            <span className="truncate">{slotB?.label || 'Select comparison image...'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 ml-1" />
          </button>

          {isSelectorOpenB && (
            <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 bg-[#16161C] border border-zinc-700 rounded shadow-xl overflow-y-auto p-1 space-y-0.5">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  onClick={() => {
                    setSlotB(cand);
                    setIsSelectorOpenB(false);
                  }}
                  className="px-2 py-1.5 rounded hover:bg-violet-600/20 hover:text-violet-300 cursor-pointer text-xs flex items-center justify-between"
                >
                  <span className="truncate">{cand.label}</span>
                  <span className="text-[9px] font-mono text-zinc-500 ml-2">{cand.tag}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAIN VIEWPORT CANVAS */}
      <div className="flex-1 min-h-0 p-4 flex items-center justify-center bg-[#070709] overflow-hidden">
        {!slotA?.url && !slotB?.url ? (
          <div className="text-center p-8 text-zinc-600">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Select or upload images above to commence comparison.</p>
          </div>
        ) : mode === 'split' ? (
          /* SPLIT SLIDER VIEW */
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchMove={handleTouchMove}
            className="relative max-h-full aspect-[3/4] rounded-lg overflow-hidden border border-[#27272A] shadow-2xl bg-[#0F0F13] select-none cursor-ew-resize group"
          >
            {/* Base Image A (Underneath / Left full canvas) */}
            {slotA?.url && (
              <img
                src={slotA.url}
                alt="Image A"
                className="w-full h-full object-contain pointer-events-none"
              />
            )}

            {/* Overlaid Image B (Right side clipped by sliderPos) */}
            {slotB?.url && (
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
              >
                <img
                  src={slotB.url}
                  alt="Image B"
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            )}

            {/* Draggable Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-violet-400 cursor-ew-resize z-20 shadow-[0_0_10px_rgba(139,92,246,0.8)]"
              style={{ left: `${sliderPos}%` }}
              onMouseDown={handleMouseDown}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-violet-600 border-2 border-white flex items-center justify-center shadow-lg text-white">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Labels overlay */}
            <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/75 backdrop-blur-sm text-[10px] font-mono text-white pointer-events-none z-10 border border-white/10">
              A: {slotA?.label || 'Base'}
            </div>
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/75 backdrop-blur-sm text-[10px] font-mono text-violet-300 pointer-events-none z-10 border border-violet-500/20">
              B: {slotB?.label || 'Comparison'}
            </div>
          </div>
        ) : (
          /* SIDE-BY-SIDE VIEW */
          <div className="h-full w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Left Card */}
            <div className="h-full max-h-[70vh] bg-[#121217] border border-[#27272A] rounded-lg p-3 flex flex-col justify-between overflow-hidden shadow-lg">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-xs font-mono">
                <span className="text-zinc-300 font-semibold truncate">{slotA?.label || 'Image A'}</span>
                <span className="text-[10px] text-zinc-500">{slotA?.tag}</span>
              </div>
              <div className="flex-1 min-h-0 flex items-center justify-center bg-[#0C0C10] rounded overflow-hidden">
                {slotA?.url ? (
                  <img src={slotA.url} alt="A" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-zinc-600">No Image Selected</span>
                )}
              </div>
            </div>

            {/* Right Card */}
            <div className="h-full max-h-[70vh] bg-[#121217] border border-[#27272A] rounded-lg p-3 flex flex-col justify-between overflow-hidden shadow-lg">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-xs font-mono">
                <span className="text-violet-300 font-semibold truncate">{slotB?.label || 'Image B'}</span>
                <span className="text-[10px] text-zinc-500">{slotB?.tag}</span>
              </div>
              <div className="flex-1 min-h-0 flex items-center justify-center bg-[#0C0C10] rounded overflow-hidden">
                {slotB?.url ? (
                  <img src={slotB.url} alt="B" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-zinc-600">No Image Selected</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER CONTROLS */}
      <div className="h-8 flex-shrink-0 bg-[#0C0C0F] border-t border-[#27272A] px-4 flex items-center justify-between text-[11px] font-mono text-zinc-500">
        <span>Slide divider or toggle side-by-side mode to evaluate fabric drape, edge segmentation, and fit.</span>
        <span>Comparison Lab · Client Accelerated</span>
      </div>
    </div>
  );
};
