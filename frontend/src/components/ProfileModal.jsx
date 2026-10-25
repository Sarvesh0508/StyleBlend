import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Sliders,
  HardDrive,
  Trash2,
  Check,
  Settings,
  ShieldAlert,
  Save,
  Server,
  Ruler,
  Info
} from 'lucide-react';
import {
  getUserPreferences,
  saveUserPreferences,
  seedDefaultWardrobe
} from '../services/storage';

const GARMENT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Validate height in cm (80–250 are reasonable adult ranges)
const validateHeightCm = (val) => {
  const n = parseFloat(val);
  if (isNaN(n)) return false;
  return n >= 80 && n <= 250;
};

// Validate feet (1–8) and inches (0–11)
const validateHeightFtIn = (ft, inches) => {
  const f = parseInt(ft);
  const i = parseInt(inches);
  if (isNaN(f) || isNaN(i)) return false;
  return f >= 1 && f <= 8 && i >= 0 && i <= 11;
};

export const ProfileModal = ({
  isOpen,
  onClose,
  backendHealth,
  onPreferencesUpdated,
}) => {
  const [userName, setUserName]                   = useState('Atelier Stylist');
  const [userRole, setUserRole]                   = useState('Lead Designer');
  const [defaultDenoiseSteps, setDefaultDenoiseSteps] = useState(30);
  const [autoCropDefault, setAutoCropDefault]     = useState(false);
  const [defaultCategory, setDefaultCategory]     = useState('upper_body');
  const [saveSuccess, setSaveSuccess]             = useState(false);

  // Height fields
  const [heightUnit, setHeightUnit]   = useState('cm');
  const [heightValue, setHeightValue] = useState('');
  const [heightFt, setHeightFt]       = useState('');
  const [heightIn, setHeightIn]       = useState('');
  const [heightError, setHeightError] = useState('');

  // Body measurements
  const [bodyChest, setBodyChest] = useState('');
  const [bodyWaist, setBodyWaist] = useState('');
  const [bodyHip, setBodyHip]     = useState('');
  const [bodyUnit, setBodyUnit]   = useState('cm');

  // Preferred sizes per category
  const [preferredSizes, setPreferredSizes] = useState({
    upper_body: 'M',
    lower_body: 'M',
    dresses: 'M',
  });

  useEffect(() => {
    if (isOpen) {
      const prefs = getUserPreferences();
      setUserName(prefs.userName || 'Atelier Stylist');
      setUserRole(prefs.userRole || 'Lead Designer');
      setDefaultDenoiseSteps(prefs.defaultDenoiseSteps || 30);
      setAutoCropDefault(Boolean(prefs.autoCropDefault));
      setDefaultCategory(prefs.defaultCategory || 'upper_body');
      setHeightUnit(prefs.heightUnit || 'cm');
      setHeightValue(prefs.heightValue || '');
      setHeightFt(prefs.heightFt || '');
      setHeightIn(prefs.heightIn || '');
      setBodyChest(prefs.bodyMeasurements?.chest || '');
      setBodyWaist(prefs.bodyMeasurements?.waist || '');
      setBodyHip(prefs.bodyMeasurements?.hip || '');
      setBodyUnit(prefs.bodyMeasurements?.unit || 'cm');
      setPreferredSizes({ upper_body: 'M', lower_body: 'M', dresses: 'M', ...(prefs.preferredSizes || {}) });
      setSaveSuccess(false);
      setHeightError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateHeight = () => {
    if (heightUnit === 'cm') {
      if (heightValue && !validateHeightCm(heightValue)) {
        setHeightError('Height must be between 80 cm and 250 cm.');
        return false;
      }
    } else {
      if ((heightFt || heightIn) && !validateHeightFtIn(heightFt, heightIn)) {
        setHeightError("Feet must be 1–8 and inches must be 0–11.");
        return false;
      }
    }
    setHeightError('');
    return true;
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!validateHeight()) return;

    const initials = userName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'AS';

    const newPrefs = {
      userName: userName.trim() || 'Atelier Stylist',
      userRole: userRole.trim() || 'Lead Designer',
      avatarInitials: initials,
      defaultDenoiseSteps: Number(defaultDenoiseSteps),
      autoCropDefault,
      defaultCategory,
      heightUnit,
      heightValue: heightUnit === 'cm' ? heightValue : '',
      heightFt: heightUnit === 'ft_in' ? heightFt : '',
      heightIn: heightUnit === 'ft_in' ? heightIn : '',
      bodyMeasurements: {
        chest: bodyChest ? bodyChest.trim() : '',
        waist: bodyWaist ? bodyWaist.trim() : '',
        hip: bodyHip ? bodyHip.trim() : '',
        unit: bodyUnit,
      },
      preferredSizes,
    };

    saveUserPreferences(newPrefs);
    setSaveSuccess(true);
    if (onPreferencesUpdated) onPreferencesUpdated(newPrefs);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 700);
  };

  const handleClearAllStorage = () => {
    if (
      window.confirm(
        'Warning: This will clear your custom saved wardrobe items, outfits, and saved looks from this browser. Continue?'
      )
    ) {
      localStorage.removeItem('styleblend_wardrobe_items');
      localStorage.removeItem('styleblend_saved_wardrobe');
      localStorage.removeItem('styleblend_saved_outfits');
      localStorage.removeItem('styleblend_garment_queue');
      seedDefaultWardrobe();
      window.location.reload();
    }
  };

  const getDisplayHeight = () => {
    if (heightUnit === 'cm' && heightValue) return `${heightValue} cm`;
    if (heightUnit === 'ft_in' && heightFt) return `${heightFt}′${heightIn || 0}″`;
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#121216] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="h-11 px-4 border-b border-[#27272A] flex items-center justify-between bg-[#16161D]">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-violet-400" />
            <span className="font-display text-sm tracking-wider text-white uppercase">
              Atelier Profile &amp; Preferences
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-4 space-y-4 overflow-y-auto max-h-[80vh]">
          {saveSuccess && (
            <div className="p-2 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-1.5">
              <Check className="w-4 h-4" />
              <span>Preferences updated successfully!</span>
            </div>
          )}

          {/* Profile Section */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
              Local Stylist Profile
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                  Stylist Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#18181F] border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                  Title / Atelier Role
                </label>
                <input
                  type="text"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full h-8 px-2.5 rounded bg-[#18181F] border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Customer Height Section */}
          <div className="space-y-3 pt-3 border-t border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold flex items-center space-x-1.5">
                <Ruler className="w-3 h-3 text-zinc-500" />
                <span>Customer Height</span>
              </span>
              {getDisplayHeight() && (
                <span className="text-[10px] font-mono text-violet-400">{getDisplayHeight()}</span>
              )}
            </div>

            {/* Honest disclosure */}
            <div className="flex items-start space-x-1.5 p-2 rounded bg-amber-950/20 border border-amber-800/30 text-[10px] text-amber-300/80 font-mono">
              <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-amber-400" />
              <span>
                IDM-VTON itself does <strong>not</strong> accept height. StyleBlend applies it afterwards: when <em>Use my height &amp; measurements</em> is on (Studio → Customize), height scales the garment length in the generated image.
              </span>
            </div>

            {/* Unit selector */}
            <div className="flex space-x-2">
              {[{ id: 'cm', label: 'Centimeters (cm)' }, { id: 'ft_in', label: 'Feet & Inches' }].map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => { setHeightUnit(unit.id); setHeightError(''); }}
                  className={`flex-1 py-1 rounded text-[11px] font-medium border transition-all ${
                    heightUnit === unit.id
                      ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                      : 'bg-[#18181F] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {unit.label}
                </button>
              ))}
            </div>

            {/* Height input */}
            {heightUnit === 'cm' ? (
              <div className="relative">
                <input
                  type="number"
                  value={heightValue}
                  onChange={(e) => { setHeightValue(e.target.value); setHeightError(''); }}
                  placeholder="e.g. 170"
                  min="80"
                  max="250"
                  className="w-full h-8 px-2.5 pr-10 rounded bg-[#18181F] border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                />
                <span className="absolute right-2.5 top-2 text-zinc-500 text-[11px] font-mono">cm</span>
              </div>
            ) : (
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={heightFt}
                    onChange={(e) => { setHeightFt(e.target.value); setHeightError(''); }}
                    placeholder="5"
                    min="1"
                    max="8"
                    className="w-full h-8 px-2.5 pr-8 rounded bg-[#18181F] border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                  <span className="absolute right-2 top-2 text-zinc-500 text-[11px] font-mono">ft</span>
                </div>
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={heightIn}
                    onChange={(e) => { setHeightIn(e.target.value); setHeightError(''); }}
                    placeholder="8"
                    min="0"
                    max="11"
                    className="w-full h-8 px-2.5 pr-8 rounded bg-[#18181F] border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                  <span className="absolute right-2 top-2 text-zinc-500 text-[11px] font-mono">in</span>
                </div>
              </div>
            )}

            {heightError && (
              <p className="text-[10px] text-rose-400 font-mono">{heightError}</p>
            )}
          </div>

          {/* Body Measurements Section (Phase C) */}
          <div className="space-y-3 pt-3 border-t border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
                  Body Measurements
                </span>
                <span className="text-[10px] text-zinc-500">For transparent clothing size comparison</span>
              </div>
              <div className="flex bg-[#18181F] p-0.5 rounded border border-zinc-800">
                {['cm', 'in'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setBodyUnit(u)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
                      bodyUnit === u
                        ? 'bg-violet-600 text-white font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {u.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 mb-1">Chest / Bust</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={bodyChest}
                    onChange={(e) => setBodyChest(e.target.value)}
                    placeholder={bodyUnit === 'cm' ? '96' : '38'}
                    className="w-full h-8 px-2 pr-6 rounded bg-[#18181F] border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                  <span className="absolute right-1.5 top-2 text-[10px] text-zinc-500 font-mono">{bodyUnit}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-500 mb-1">Waist</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={bodyWaist}
                    onChange={(e) => setBodyWaist(e.target.value)}
                    placeholder={bodyUnit === 'cm' ? '82' : '32'}
                    className="w-full h-8 px-2 pr-6 rounded bg-[#18181F] border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                  <span className="absolute right-1.5 top-2 text-[10px] text-zinc-500 font-mono">{bodyUnit}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-500 mb-1">Hips</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={bodyHip}
                    onChange={(e) => setBodyHip(e.target.value)}
                    placeholder={bodyUnit === 'cm' ? '98' : '39'}
                    className="w-full h-8 px-2 pr-6 rounded bg-[#18181F] border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                  <span className="absolute right-1.5 top-2 text-[10px] text-zinc-500 font-mono">{bodyUnit}</span>
                </div>
              </div>
            </div>

            <div className="p-2 rounded bg-zinc-900/40 border border-zinc-800 text-[10px] text-zinc-500 font-mono flex items-start space-x-1.5">
              <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-zinc-600" />
              <span>Chest (tops, dresses) or waist (bottoms) sets your body size. A garment size larger or smaller than that is shown as a looser or tighter fit in the image (Studio → Customize). Not sent to IDM-VTON.</span>
            </div>
          </div>

          {/* Preferred Sizes Section */}
          <div className="space-y-3 pt-3 border-t border-zinc-800/80">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
              Preferred Clothing Sizes
            </span>
            <div className="flex items-start space-x-1.5 p-2 rounded bg-zinc-900/40 border border-zinc-800 text-[10px] text-zinc-500 font-mono">
              <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-zinc-600" />
              <span>Size labels vary by brand. Your preferred size is used as your body size when no measurements are saved, so garment size changes show as a fit difference in the image.</span>
            </div>
            <div className="space-y-2">
              {[
                { key: 'upper_body', label: 'Upper-body' },
                { key: 'lower_body', label: 'Lower-body' },
                { key: 'dresses', label: 'Dresses' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[10px] font-mono text-zinc-500 mb-1">{label}</label>
                  <div className="flex gap-1">
                    {GARMENT_SIZES.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setPreferredSizes((prev) => ({ ...prev, [key]: sz }))}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                          preferredSizes[key] === sz
                            ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                            : 'bg-[#18181F] text-zinc-500 border border-zinc-800 hover:text-zinc-300'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Default Studio Parameters */}
          <div className="space-y-3 pt-3 border-t border-zinc-800/80">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
              Default Studio Parameters
            </span>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label className="font-mono text-zinc-400">Default Denoise Steps</label>
                <span className="font-mono text-violet-400 font-bold">{defaultDenoiseSteps}</span>
              </div>
              <input
                type="range"
                min={20}
                max={40}
                step={1}
                value={defaultDenoiseSteps}
                onChange={(e) => setDefaultDenoiseSteps(e.target.value)}
                className="w-full accent-violet-600 h-1 bg-zinc-800 rounded"
              />
              <span className="text-[10px] text-zinc-500 block mt-0.5">
                30 steps balances photorealism against cloud GPU inference latency.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                  Default Category
                </label>
                <select
                  value={defaultCategory}
                  onChange={(e) => setDefaultCategory(e.target.value)}
                  className="w-full h-8 px-2 rounded bg-[#18181F] border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="upper_body">Upper-body</option>
                  <option value="lower_body">Lower-body</option>
                  <option value="dresses">Dresses</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                  Auto-Crop Default
                </label>
                <button
                  type="button"
                  onClick={() => setAutoCropDefault(!autoCropDefault)}
                  className={`w-full h-8 px-2.5 rounded border text-xs font-mono flex items-center justify-between transition-colors ${
                    autoCropDefault
                      ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                      : 'bg-[#18181F] border-zinc-800 text-zinc-400'
                  }`}
                >
                  <span>Auto-Crop Subject</span>
                  <span className="text-[10px] uppercase font-bold">
                    {autoCropDefault ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Honest System Telemetry */}
          <div className="space-y-2 pt-3 border-t border-zinc-800/80">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
              Application &amp; Backend Telemetry
            </span>
            <div className="p-2.5 rounded bg-[#16161D] border border-zinc-800 text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">FastAPI Host:</span>
                <span className="text-zinc-300">http://localhost:8000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">FastAPI Status:</span>
                <span className={backendHealth?.status === 'online' ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                  {backendHealth?.status === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Replicate IDM-VTON:</span>
                <span className={backendHealth?.replicate_configured ? 'text-violet-400 font-semibold' : 'text-amber-400'}>
                  {backendHealth?.replicate_configured ? 'API Token Validated' : 'REPLICATE_API_TOKEN Missing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Client Persistence:</span>
                <span className="text-zinc-300">HTML5 localStorage Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Height sent to API:</span>
                <span className="text-amber-400">No — applied after generation by StyleBlend</span>
              </div>
            </div>
          </div>

          {/* Storage Maintenance */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-400 font-medium block">Reset Atelier Data</span>
              <span className="text-[10px] text-zinc-500 block">Wipe custom items and restore factory sample presets.</span>
            </div>
            <button
              type="button"
              onClick={handleClearAllStorage}
              className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800/40 text-rose-300 text-xs flex items-center space-x-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Reset Data</span>
            </button>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Preferences</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
