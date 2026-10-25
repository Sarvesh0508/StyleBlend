import React from 'react';
import { Palette, Ruler, SlidersHorizontal, RotateCcw, Loader2, AlertTriangle, CheckCircle2, User, Info } from 'lucide-react';
import {
  COLOR_SWATCHES,
  FIT_STYLES,
  profileToCm,
  hasProfileData,
} from '../services/customization';

const Section = ({ icon: Icon, title, children }) => (
  <div className="space-y-2">
    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
      <Icon className="w-3 h-3 text-violet-400" />
      <span>{title}</span>
    </div>
    {children}
  </div>
);

const Slider = ({ label, value, min, max, step = 1, suffix = '', onChange, hint }) => (
  <div className="space-y-0.5">
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-zinc-400">{label}</span>
      <span className={`font-mono ${value !== 0 ? 'text-violet-300' : 'text-zinc-600'}`}>
        {value > 0 && min < 0 ? '+' : ''}
        {value}
        {suffix}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-violet-500 cursor-pointer h-1.5 bg-zinc-800 rounded"
      aria-label={label}
    />
    {hint && (
      <div className="flex justify-between text-[9px] text-zinc-600 font-mono">
        <span>{hint[0]}</span>
        <span>{hint[1]}</span>
      </div>
    )}
  </div>
);

export const CustomizePanel = ({
  customization,
  setCustomization,
  status,
  onReset,
  canCustomizeResult,
  userProfile,
  category,
  garmentImage,
  activeCount,
}) => {
  const c = customization;
  const set = (patch) => setCustomization((prev) => ({ ...prev, ...patch }));
  const setAdjust = (patch) => setCustomization((prev) => ({ ...prev, adjust: { ...prev.adjust, ...patch } }));

  const prof = profileToCm(userProfile, category);
  const profileAvailable = hasProfileData(userProfile, category);
  const garmentSize = garmentImage ? (garmentImage.sizeLabel || 'M') : null;

  return (
    <div className="space-y-4">
      {/* status banner */}
      <div className="rounded border border-zinc-800 bg-[#14141A] p-2 text-[10px] leading-snug text-zinc-400">
        <div className="flex items-start space-x-1.5">
          <Info className="w-3 h-3 text-violet-400 flex-shrink-0 mt-0.5" />
          <span>
            {canCustomizeResult
              ? 'Changes update the generated image live — no GPU re-run needed.'
              : 'Pick options now; they are applied when you press Generate, then adjust live afterwards.'}
          </span>
        </div>
        {status.updating && (
          <div className="flex items-center space-x-1.5 mt-1.5 text-violet-300">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Updating image…</span>
          </div>
        )}
      </div>

      {/* COLOUR */}
      <Section icon={Palette} title="Garment Colour">
        <div className="grid grid-cols-6 gap-1.5">
          <button
            type="button"
            onClick={() => set({ colorHex: null })}
            title="Keep original colour"
            className={`h-6 rounded text-[9px] font-mono border transition-all ${
              !c.colorHex ? 'border-violet-400 text-violet-300 bg-violet-600/20' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ORIG
          </button>
          {COLOR_SWATCHES.map((sw) => (
            <button
              key={sw.hex}
              type="button"
              title={sw.name}
              aria-label={`Colour ${sw.name}`}
              onClick={() => set({ colorHex: sw.hex })}
              style={{ backgroundColor: sw.hex }}
              className={`h-6 rounded border-2 transition-all ${
                c.colorHex === sw.hex ? 'border-white scale-110 shadow' : 'border-transparent hover:border-zinc-500'
              }`}
            />
          ))}
          <label
            title="Custom colour"
            className="h-6 rounded border border-dashed border-zinc-600 flex items-center justify-center cursor-pointer text-[10px] text-zinc-400 hover:text-white relative overflow-hidden"
          >
            +
            <input
              type="color"
              value={c.colorHex || '#7c4ddb'}
              onChange={(e) => set({ colorHex: e.target.value.toUpperCase() })}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="Custom colour"
            />
          </label>
        </div>
        {c.colorHex && (
          <Slider
            label="Colour strength"
            value={c.colorStrength}
            min={10}
            max={100}
            suffix="%"
            onChange={(v) => set({ colorStrength: v })}
          />
        )}
        <p className="text-[9px] text-zinc-600 leading-snug">
          Recolours the fabric and keeps shading, folds, prints and logos.
        </p>
      </Section>

      {/* FIT */}
      <Section icon={Ruler} title="Fit & Size">
        <div className="grid grid-cols-4 gap-1">
          {FIT_STYLES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => set({ fit: f.id })}
              className={`py-1 rounded text-[10px] font-medium transition-all ${
                c.fit === f.id
                  ? 'btn-violet-accent font-semibold'
                  : 'bg-[#18181D] text-zinc-400 hover:text-white border border-[#27272A]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Slider
          label="Length"
          value={c.length}
          min={-15}
          max={15}
          suffix="%"
          onChange={(v) => set({ length: v })}
          hint={['Cropped', 'Longer']}
        />
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 bg-[#14141A] border border-zinc-800 rounded px-2 py-1">
          <span>Garment size</span>
          <span className="text-zinc-300">
            {garmentSize || '—'}
            <span className="text-zinc-600"> · set under Garment Photograph</span>
          </span>
        </div>
      </Section>

      {/* PROFILE */}
      <Section icon={User} title="My Profile">
        <label className="flex items-start space-x-2 text-[11px] text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={c.useProfile}
            onChange={(e) => set({ useProfile: e.target.checked })}
            className="w-3.5 h-3.5 mt-0.5 rounded text-violet-600 focus:ring-violet-500 bg-[#18181D] border-zinc-700"
          />
          <span>
            Use my height &amp; measurements
            <span className="block text-[9px] text-zinc-600">
              Your body size picks how the garment size fits; height scales garment length.
            </span>
          </span>
        </label>
        {c.useProfile && (
          <div className="text-[10px] font-mono text-zinc-500 bg-[#14141A] border border-zinc-800 rounded px-2 py-1.5 space-y-0.5">
            {profileAvailable ? (
              <>
                {prof.height_cm && <div>Height: <span className="text-zinc-300">{prof.height_cm} cm</span></div>}
                {prof.chest_cm && <div>Chest: <span className="text-zinc-300">{prof.chest_cm} cm</span></div>}
                {prof.waist_cm && <div>Waist: <span className="text-zinc-300">{prof.waist_cm} cm</span></div>}
                {prof.hip_cm && <div>Hips: <span className="text-zinc-300">{prof.hip_cm} cm</span></div>}
                {status.effective && (
                  <div className="pt-0.5 text-violet-300">
                    Body size {status.effective.body_size} · width ×{status.effective.width_scale} · length ×{status.effective.length_scale}
                  </div>
                )}
              </>
            ) : (
              <span className="text-amber-400">
                No height or measurements saved yet — open Profile (gear, bottom-left) and add them.
              </span>
            )}
          </div>
        )}
      </Section>

      {/* FINISHING */}
      <Section icon={SlidersHorizontal} title="Finishing">
        <div className="grid grid-cols-2 gap-1">
          {[
            { id: 'garment', label: 'Garment only' },
            { id: 'image', label: 'Whole image' },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setAdjust({ scope: o.id })}
              className={`py-1 rounded text-[10px] font-medium transition-all ${
                c.adjust.scope === o.id
                  ? 'btn-violet-accent font-semibold'
                  : 'bg-[#18181D] text-zinc-400 hover:text-white border border-[#27272A]'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <Slider label="Brightness" value={c.adjust.brightness} min={-50} max={50} onChange={(v) => setAdjust({ brightness: v })} />
        <Slider label="Contrast" value={c.adjust.contrast} min={-50} max={50} onChange={(v) => setAdjust({ contrast: v })} />
        <Slider label="Saturation" value={c.adjust.saturation} min={-100} max={100} onChange={(v) => setAdjust({ saturation: v })} />
        <Slider label="Warmth" value={c.adjust.warmth} min={-50} max={50} onChange={(v) => setAdjust({ warmth: v })} hint={['Cool', 'Warm']} />
        <Slider label="Sharpness" value={c.adjust.sharpness} min={0} max={100} onChange={(v) => setAdjust({ sharpness: v })} />
      </Section>

      {/* RESULT FEEDBACK */}
      {status.error && (
        <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] flex items-start space-x-1.5">
          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>{status.error}</span>
        </div>
      )}
      {status.warnings?.length > 0 && (
        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] space-y-1">
          {status.warnings.map((w) => (
            <div key={w} className="flex items-start space-x-1.5">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
      {status.applied?.length > 0 && (
        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] space-y-0.5">
          <div className="font-semibold flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Applied to image</span>
          </div>
          {status.applied.map((a) => (
            <div key={a} className="font-mono text-emerald-200/80">• {a}</div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onReset}
        disabled={activeCount === 0}
        className="w-full py-1.5 rounded bg-[#18181D] hover:bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center justify-center space-x-1.5 border border-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <RotateCcw className="w-3 h-3 text-violet-400" />
        <span>Reset customizations</span>
      </button>
    </div>
  );
};
