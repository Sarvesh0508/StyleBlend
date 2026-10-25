import React, { useRef, useState } from 'react';
import { Sparkles, Sliders, AlertCircle, RotateCcw, Download, RefreshCw, BookmarkCheck, BookmarkPlus, Info, Ruler } from 'lucide-react';
import { getUserPreferences } from '../services/storage';
import { CustomizePanel } from './CustomizePanel';

export const RightPanel = ({
  category,
  setCategory,
  description,
  setDescription,
  autoCrop,
  setAutoCrop,
  denoiseSteps,
  setDenoiseSteps,
  seed,
  setSeed,
  onGenerate,
  isLoading,
  error,
  onRetry,
  hasAssets,
  hasResult,
  onDownload,
  onSaveLook,
  garmentImage,
  setGarmentImage,
  backendHealth,
  customization,
  setCustomization,
  customStatus,
  onResetCustomization,
  canCustomizeResult,
  userProfile,
  activeCustomizations = 0,
}) => {
  const [tab, setTab] = useState('settings'); // 'settings' | 'customize'
  const garmentInputRef = useRef(null);
  const [justSaved, setJustSaved] = useState(false);
  const [userPrefs] = useState(() => getUserPreferences());
  const garmentSizeLabel = garmentImage?.sizeLabel || null;

  const handleGarmentSwap = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      setGarmentImage({
        file,
        previewUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        width: probe.naturalWidth,
        height: probe.naturalHeight,
      });
    };
    probe.onerror = () => {
      setGarmentImage({ file, previewUrl, name: file.name, size: file.size, type: file.type });
    };
    probe.src = previewUrl;
    e.target.value = '';
  };

  const handleSaveClick = () => {
    if (onSaveLook) {
      onSaveLook();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    }
  };

  return (
    <aside className="w-full lg:w-[270px] flex-shrink-0 flex flex-col atelier-panel p-3 overflow-y-auto space-y-3.5 select-none text-xs">
      
      {/* HEADER */}
      <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 tracking-wider">
        <span>SETTINGS INSPECTOR</span>
        <Sliders className="w-3.5 h-3.5 text-zinc-500" />
      </div>

      {/* TABS */}
      <div className="grid grid-cols-2 gap-1 p-0.5 rounded bg-[#121217] border border-[#27272A]">
        {[
          { id: 'settings', label: 'Settings' },
          { id: 'customize', label: 'Customize' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`py-1 rounded text-[11px] font-semibold transition-all flex items-center justify-center space-x-1.5 ${
              tab === t.id ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>{t.label}</span>
            {t.id === 'customize' && activeCustomizations > 0 && (
              <span className="min-w-[16px] h-4 px-1 rounded-full bg-violet-500 text-white text-[9px] font-mono flex items-center justify-center">
                {activeCustomizations}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'customize' && (
        <CustomizePanel
          customization={customization}
          setCustomization={setCustomization}
          status={customStatus}
          onReset={onResetCustomization}
          canCustomizeResult={canCustomizeResult}
          userProfile={userProfile}
          category={category}
          garmentImage={garmentImage}
          activeCount={activeCustomizations}
        />
      )}

      {tab === 'settings' && (<>
      {/* 1. GARMENT SETTINGS: CATEGORY */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
          Garment Category
        </label>
        <div className="grid grid-cols-3 gap-1">
          {[
            { id: 'upper_body', label: 'Upper-body' },
            { id: 'lower_body', label: 'Lower-body' },
            { id: 'dresses', label: 'Full-body' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`py-1.5 px-1 rounded text-xs font-medium text-center transition-all ${
                category === cat.id
                  ? 'btn-violet-accent font-semibold shadow-sm'
                  : 'bg-[#18181D] text-zinc-400 hover:text-white border border-[#27272A]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. GARMENT INFORMATION & PROMPT */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Garment Prompt
          </label>
          {garmentImage && (
            <button
              type="button"
              onClick={() => garmentInputRef.current?.click()}
              className="text-[10px] text-violet-400 hover:text-violet-300 font-medium flex items-center space-x-1"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Swap</span>
            </button>
          )}
        </div>

        {/* Garment mini thumbnail if loaded */}
        {garmentImage && (
          <div className="flex items-center space-x-2 p-1.5 rounded bg-[#18181D] border border-zinc-800">
            <div className="w-8 h-10 rounded overflow-hidden bg-black flex-shrink-0 border border-zinc-700">
              <img src={garmentImage.previewUrl} alt="Garment" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-zinc-200 truncate">{garmentImage.name || 'Target Garment'}</p>
              <p className="text-[10px] text-zinc-500 font-mono">
                {garmentImage.width ? `${garmentImage.width}×${garmentImage.height} px` : `Category: ${category}`}
              </p>
            </div>
          </div>
        )}

        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Short Sleeve Round Neck T-shirt"
          className="w-full bg-[#18181D] border border-zinc-800 rounded p-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors resize-none leading-relaxed"
        />

        <input
          ref={garmentInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleGarmentSwap}
        />
      </div>

      {/* 2a. HEIGHT CONTEXT — transparent disclosure */}
      {userPrefs?.heightValue && (
        <div className="flex items-center space-x-1.5 p-1.5 rounded bg-zinc-900/60 border border-zinc-800/60 text-[10px] font-mono text-zinc-500">
          <Ruler className="w-3 h-3 text-zinc-600 flex-shrink-0" />
          <span>
            Customer height: <span className="text-zinc-400">
              {userPrefs.heightUnit === 'cm' ? `${userPrefs.heightValue}cm` : `${userPrefs.heightFt}′${userPrefs.heightIn || 0}″`}
            </span> — scales garment length when "Use my profile" is on (Customize tab)
          </span>
        </div>
      )}

      <div className="h-[1px] bg-zinc-800/80 my-0.5" />

      {/* 3. GENERATION SETTINGS */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          <span>Denoising Steps</span>
          <span className="text-violet-400 font-mono font-bold text-xs">{denoiseSteps}</span>
        </div>
        <input
          type="range"
          min="20"
          max="40"
          value={denoiseSteps}
          onChange={(e) => setDenoiseSteps(parseInt(e.target.value))}
          className="w-full accent-violet-500 cursor-pointer h-1.5 bg-zinc-800 rounded"
        />
        <div className="flex justify-between text-[9px] text-zinc-600 font-mono">
          <span>Fast (20)</span>
          <span>Balanced (30)</span>
          <span>Quality (40)</span>
        </div>
      </div>

      {/* 4. ADVANCED SETTINGS */}
      <div className="space-y-2 pt-1 border-t border-zinc-800/80">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
          Advanced Pipeline
        </label>

        {/* Auto Crop */}
        <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={autoCrop}
            onChange={(e) => setAutoCrop(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500 bg-[#18181D] border-zinc-700"
          />
          <span className="text-[11px]">Auto-crop framing (3:4 ratio)</span>
        </label>

        {/* Seed */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className="text-[11px] text-zinc-400">Random Seed:</span>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(parseInt(e.target.value) || 42)}
            className="w-20 bg-[#18181D] border border-zinc-800 rounded px-2 py-0.5 text-xs text-right font-mono text-zinc-200 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      </>)}

      {/* 5. PRIMARY BUTTON — GENERATE TRY-ON */}
      <div className="pt-2 space-y-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!hasAssets || isLoading}
          className={`w-full py-2.5 rounded font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-sm ${
            hasAssets && !isLoading
              ? 'btn-violet-accent active:scale-98 cursor-pointer'
              : 'bg-zinc-800/80 text-zinc-600 border border-zinc-800 cursor-not-allowed opacity-60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isLoading ? 'GENERATING FIT...' : 'GENERATE TRY-ON'}</span>
        </button>

        {!hasAssets && (
          <p className="text-[10px] text-zinc-500 text-center">
            Upload person &amp; garment to enable generation.
          </p>
        )}
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1.5 animate-fade-in">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] leading-tight font-medium">{error}</p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="w-full py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center space-x-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry Generation</span>
            </button>
          )}
        </div>
      )}

      {/* RESULT ACTIONS IF ACTIVE (DOWNLOAD + SAVE LOOK) */}
      {hasResult && (
        <div className="pt-2 border-t border-zinc-800 space-y-1.5">
          <button
            type="button"
            onClick={onDownload}
            className="w-full py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center space-x-1.5 border border-zinc-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-violet-400" />
            <span>Download Result Image</span>
          </button>

          <button
            type="button"
            onClick={handleSaveClick}
            disabled={justSaved}
            className="w-full py-1.5 rounded bg-[#18181D] hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center space-x-1.5 border border-zinc-800 transition-colors"
          >
            {justSaved ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Saved to Wardrobe!</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5 text-violet-400" />
                <span>Save Look to Wardrobe</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* SYSTEM STATUS INFO */}
      <div className="mt-auto pt-2 border-t border-zinc-800 text-[10px] font-mono text-zinc-500 space-y-0.5">
        <div className="flex justify-between">
          <span>MODEL:</span>
          <span className="text-zinc-400">cuuupid/idm-vton</span>
        </div>
        <div className="flex justify-between">
          <span>HOST:</span>
          <span className="text-zinc-400">Replicate Cloud GPU</span>
        </div>
      </div>

    </aside>
  );
};
