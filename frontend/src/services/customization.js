/**
 * Customization helpers.
 *
 * IDM-VTON itself only receives person photo, garment photo, prompt, category, steps,
 * seed and crop. Everything built here (colour, fit, size, length, profile, finishing)
 * is applied by the StyleBlend backend to the generated image (see backend/customizer.py).
 */

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const FIT_STYLES = [
  { id: 'slim', label: 'Slim' },
  { id: 'regular', label: 'Regular' },
  { id: 'relaxed', label: 'Relaxed' },
  { id: 'oversized', label: 'Oversized' },
];

export const COLOR_SWATCHES = [
  { name: 'Crimson', hex: '#C0392B' },
  { name: 'Coral', hex: '#E9725B' },
  { name: 'Amber', hex: '#E69F1E' },
  { name: 'Mustard', hex: '#C9A227' },
  { name: 'Forest', hex: '#2E7D4F' },
  { name: 'Teal', hex: '#128C8C' },
  { name: 'Sky', hex: '#4A90D9' },
  { name: 'Navy', hex: '#1F3A6B' },
  { name: 'Violet', hex: '#7C4DDB' },
  { name: 'Rose', hex: '#D86AA0' },
  { name: 'Charcoal', hex: '#3A3A40' },
  { name: 'Ivory', hex: '#EDE6D6' },
];

export const DEFAULT_CUSTOMIZATION = {
  colorHex: null, // null = keep original colour
  colorStrength: 100,
  fit: 'regular',
  length: 0, // percent, -15..15
  useProfile: false,
  adjust: {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
    sharpness: 0,
    scope: 'garment', // 'garment' | 'image'
  },
};

export const cloneDefaultCustomization = () => ({
  ...DEFAULT_CUSTOMIZATION,
  adjust: { ...DEFAULT_CUSTOMIZATION.adjust },
});

const toNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Reads height / measurements from saved profile preferences, normalised to cm. */
export const profileToCm = (prefs, category) => {
  if (!prefs) return {};
  let height = null;
  if (prefs.heightUnit === 'ft_in') {
    const ft = toNum(prefs.heightFt) || 0;
    const inch = parseFloat(prefs.heightIn) || 0;
    if (ft > 0) height = ft * 30.48 + inch * 2.54;
  } else {
    height = toNum(prefs.heightValue);
  }

  const bm = prefs.bodyMeasurements || {};
  const mult = bm.unit === 'in' ? 2.54 : 1;
  const conv = (v) => {
    const n = toNum(v);
    return n ? Math.round(n * mult * 10) / 10 : null;
  };

  return {
    height_cm: height ? Math.round(height * 10) / 10 : null,
    chest_cm: conv(bm.chest),
    waist_cm: conv(bm.waist),
    hip_cm: conv(bm.hip),
    preferred_size: prefs.preferredSizes?.[category] || null,
  };
};

export const hasProfileData = (prefs, category) => {
  const p = profileToCm(prefs, category);
  return Boolean(p.height_cm || p.chest_cm || p.waist_cm || p.hip_cm);
};

/** Builds the JSON payload the backend expects. */
export const buildCustomizationPayload = (state, { garmentSize, prefs, category }) => ({
  color: { hex: state.colorHex, strength: state.colorStrength },
  fit: state.fit,
  garment_size: garmentSize || null,
  length: state.length,
  use_profile: Boolean(state.useProfile),
  profile: state.useProfile ? profileToCm(prefs, category) : {},
  adjust: { ...state.adjust },
});

/** Count of active (non-default) customizations — drives the badge on the tab. */
export const countActiveCustomizations = (state, garmentSize) => {
  let n = 0;
  if (state.colorHex) n += 1;
  if (state.fit !== 'regular') n += 1;
  if (state.length !== 0) n += 1;
  if (state.useProfile) n += 1;
  if (garmentSize && garmentSize !== 'M') n += 1;
  n += ['brightness', 'contrast', 'saturation', 'warmth', 'sharpness'].filter((k) => state.adjust[k] !== 0).length;
  return n;
};
