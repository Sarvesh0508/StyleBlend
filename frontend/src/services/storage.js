/**
 * StyleBlend Local Persistence Service
 * STORAGE ARCHITECTURE:
 * - Provider: HTML5 localStorage (browser-scoped, not cloud-synced)
 * - Capacity: ~5 MB per origin (browser-enforced)
 * - Persistence: Until manually cleared or browser data wiped
 * - Limitation: Not shared across devices or browsers; base64 images consume significant quota
 */

const WARDROBE_KEY = 'styleblend_wardrobe_items';
const OUTFITS_KEY = 'styleblend_saved_outfits';
const SAVED_LOOKS_KEY = 'styleblend_saved_wardrobe'; // try-on history (key matches WardrobeModal for compatibility)
const PREFERENCES_KEY = 'styleblend_user_preferences';
const GARMENT_QUEUE_KEY = 'styleblend_garment_queue'; // multiple garments for Studio

// ---------------------------------------------------------------------------
// 1. My Wardrobe Items
// ---------------------------------------------------------------------------
export const getWardrobeItems = () => {
  try {
    const raw = localStorage.getItem(WARDROBE_KEY);
    if (!raw) return seedDefaultWardrobe();
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load wardrobe items:', err);
    return [];
  }
};

export const saveWardrobeItem = (item) => {
  try {
    const items = getWardrobeItems();
    const newItem = {
      id: `garment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      timesUsed: 0,
      ...item,
    };
    const updated = [newItem, ...items];
    localStorage.setItem(WARDROBE_KEY, JSON.stringify(updated));
    return newItem;
  } catch (err) {
    console.error('Failed to save wardrobe item:', err);
    return null;
  }
};

export const updateWardrobeItem = (id, updates) => {
  try {
    const items = getWardrobeItems();
    const updated = items.map((item) => (item.id === id ? { ...item, ...updates } : item));
    localStorage.setItem(WARDROBE_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to update wardrobe item:', err);
    return false;
  }
};

export const deleteWardrobeItem = (id) => {
  try {
    const items = getWardrobeItems();
    const updated = items.filter((item) => item.id !== id);
    localStorage.setItem(WARDROBE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete wardrobe item:', err);
    return [];
  }
};

export const seedDefaultWardrobe = () => {
  const initialItems = [
    {
      id: 'default_garment_01',
      name: 'Urban Echoes Graphic Tee',
      category: 'upper_body',
      color: 'Black',
      style: 'Streetwear',
      size: 'M',
      brand: '',
      imageUrl: '/samples/garment_sample.jpg',
      createdAt: new Date().toISOString(),
      notes: 'Black oversized streetwear graphic tee with vibrant artwork',
      timesUsed: 0,
    },
    {
      id: 'default_garment_02',
      name: 'Classic White Cotton Tee',
      category: 'upper_body',
      color: 'White',
      style: 'Minimalist',
      size: 'L',
      brand: '',
      imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=768&q=80',
      createdAt: new Date().toISOString(),
      notes: 'Breathable lightweight organic white cotton crewneck',
      timesUsed: 0,
    },
    {
      id: 'default_garment_03',
      name: 'Tailored Camel Trousers',
      category: 'lower_body',
      color: 'Earth Tones',
      style: 'Classic',
      size: 'M',
      brand: '',
      imageUrl: '/samples/model_sample.jpg',
      createdAt: new Date().toISOString(),
      notes: 'Pleated high-rise beige chinos with cuff hem',
      timesUsed: 0,
    },
    {
      id: 'default_garment_04',
      name: 'Midnight Silk Slip Dress',
      category: 'dresses',
      color: 'Black',
      style: 'Avant-Garde',
      size: 'S',
      brand: '',
      imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=768&q=80',
      createdAt: new Date().toISOString(),
      notes: 'Elegant cowl-neck slip dress with subtle sheen',
      timesUsed: 0,
    },
  ];
  try {
    localStorage.setItem(WARDROBE_KEY, JSON.stringify(initialItems));
  } catch (e) {
    console.warn('Could not seed wardrobe:', e);
  }
  return initialItems;
};

// ---------------------------------------------------------------------------
// 2. Saved Looks (Try-On History)
// ---------------------------------------------------------------------------
export const getSavedLooks = () => {
  try {
    const raw = localStorage.getItem(SAVED_LOOKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load saved looks:', err);
    return [];
  }
};

// Unified save — replaces both saveToWardrobe (WardrobeModal) and saveLookToStorage
export const saveLookToStorage = (look) => {
  try {
    const looks = getSavedLooks();
    const newLook = {
      id: `look_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...look,
    };
    const updated = [newLook, ...looks];
    localStorage.setItem(SAVED_LOOKS_KEY, JSON.stringify(updated));
    return newLook;
  } catch (err) {
    console.error('Failed to save look:', err);
    return null;
  }
};

export const deleteLookFromStorage = (id) => {
  try {
    const looks = getSavedLooks();
    const updated = looks.filter((look) => look.id !== id);
    localStorage.setItem(SAVED_LOOKS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete look:', err);
    return [];
  }
};

// ---------------------------------------------------------------------------
// 3. Saved Outfits
// ---------------------------------------------------------------------------
export const getSavedOutfits = () => {
  try {
    const raw = localStorage.getItem(OUTFITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load outfits:', err);
    return [];
  }
};

export const saveOutfitToStorage = (outfit) => {
  try {
    const outfits = getSavedOutfits();
    const newOutfit = {
      id: `outfit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      ...outfit,
    };
    const updated = [newOutfit, ...outfits];
    localStorage.setItem(OUTFITS_KEY, JSON.stringify(updated));
    return newOutfit;
  } catch (err) {
    console.error('Failed to save outfit:', err);
    return null;
  }
};

export const deleteOutfitFromStorage = (id) => {
  try {
    const outfits = getSavedOutfits();
    const updated = outfits.filter((o) => o.id !== id);
    localStorage.setItem(OUTFITS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete outfit:', err);
    return [];
  }
};

// ---------------------------------------------------------------------------
// 4. User Preferences & Profile (includes height/body measurements)
// ---------------------------------------------------------------------------
const DEFAULT_PREFS = {
  userName: 'Atelier Stylist',
  userRole: 'Lead Designer',
  avatarInitials: 'AS',
  defaultDenoiseSteps: 30,
  defaultCategory: 'upper_body',
  autoCropDefault: false,
  // Body measurements — stored as profile metadata only.
  // IDM-VTON does NOT accept height or measurements as inference parameters.
  heightValue: '',
  heightUnit: 'cm', // 'cm' or 'ft_in'
  heightFt: '',
  heightIn: '',
  bodyMeasurements: {
    chest: '',
    waist: '',
    hip: '',
    unit: 'cm', // 'cm' or 'in'
  },
  // Preferred clothing sizes (per category)
  preferredSizes: {
    upper_body: 'M',
    lower_body: 'M',
    dresses: 'M',
  },
};

export const getUserPreferences = () => {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw);
    // Merge with defaults to handle missing fields from older saves
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      bodyMeasurements: {
        ...DEFAULT_PREFS.bodyMeasurements,
        ...(parsed.bodyMeasurements || {}),
      },
      preferredSizes: {
        ...DEFAULT_PREFS.preferredSizes,
        ...(parsed.preferredSizes || {}),
      },
    };
  } catch (err) {
    return { ...DEFAULT_PREFS };
  }
};

export const saveUserPreferences = (prefs) => {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    return true;
  } catch (err) {
    console.error('Failed to save preferences:', err);
    return false;
  }
};

// ---------------------------------------------------------------------------
// 5. Garment Queue (multiple garment options for Studio Atelier)
// ---------------------------------------------------------------------------
export const getGarmentQueue = () => {
  try {
    const raw = localStorage.getItem(GARMENT_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
};

export const saveGarmentQueue = (queue) => {
  try {
    // Strip File objects (not serializable) — store metadata + previewUrl only
    const serializable = queue.map(({ file, ...rest }) => rest);
    localStorage.setItem(GARMENT_QUEUE_KEY, JSON.stringify(serializable));
  } catch (err) {
    console.warn('Could not persist garment queue:', err);
  }
};

export const clearGarmentQueue = () => {
  try {
    localStorage.removeItem(GARMENT_QUEUE_KEY);
  } catch (err) {
    console.warn('Could not clear garment queue:', err);
  }
};

// ---------------------------------------------------------------------------
// 6. Wardrobe Insights (computed from actual stored data, never fabricated)
// ---------------------------------------------------------------------------
export const computeWardrobeInsights = (customItems = null, customLooks = null, customOutfits = null) => {
  const items = customItems || getWardrobeItems();
  const looks = customLooks || getSavedLooks();
  const outfits = customOutfits || getSavedOutfits();

  if (!items || items.length === 0) {
    return { hasData: false, items: items || [], looks: looks || [], outfits: outfits || [] };
  }

  const categoryCount = {};
  items.forEach((item) => {
    const cat = item.category || 'unknown';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  const colorCount = {};
  items.forEach((item) => {
    if (item.color) colorCount[item.color] = (colorCount[item.color] || 0) + 1;
  });

  const styleCount = {};
  items.forEach((item) => {
    if (item.style) styleCount[item.style] = (styleCount[item.style] || 0) + 1;
  });

  const topColors = Object.entries(colorCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([color, count]) => ({ color, count }));

  const avgExecTime =
    looks.length > 0
      ? looks.reduce((acc, l) => acc + (l.executionTime || 0), 0) / looks.length
      : 0;

  const gaps = [];
  if (!categoryCount['lower_body']) gaps.push('No lower-body items in wardrobe');
  if (!categoryCount['dresses']) gaps.push('No dresses or full-body items in wardrobe');
  if (!categoryCount['upper_body']) gaps.push('No upper-body items in wardrobe');
  if (items.length < 3) gaps.push('Wardrobe has fewer than 3 items — add more for better recommendations');

  return {
    hasData: true,
    totalItems: items.length,
    totalLooks: looks.length,
    totalOutfits: outfits.length,
    categoryCount,
    colorCount,
    styleCount,
    topColors,
    avgExecTime: avgExecTime > 0 ? avgExecTime.toFixed(1) : null,
    gaps,
    items,
    looks,
    outfits,
  };
};
