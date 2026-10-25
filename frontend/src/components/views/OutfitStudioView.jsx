import React, { useState, useEffect } from 'react';
import {
  LayoutGrid,
  Plus,
  Trash2,
  Sparkles,
  Shirt,
  Layers,
  Save,
  Check,
  X,
  ArrowRight,
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';
import {
  getWardrobeItems,
  getSavedOutfits,
  saveOutfitToStorage,
  deleteOutfitFromStorage
} from '../../services/storage';
import { fetchWardrobe } from '../../services/api';

const API_HOST = 'http://localhost:8000';

export const OutfitStudioView = ({ onSelectGarmentForTryOn }) => {
  const [wardrobe, setWardrobe] = useState([]);
  const [savedOutfits, setSavedOutfits] = useState([]);

  // Current Outfit Working State
  const [outfitTitle, setOutfitTitle] = useState('Urban Chic Ensemble');
  const [outfitOccasion, setOutfitOccasion] = useState('Casual Streetwear');
  const [upperGarment, setUpperGarment] = useState(null);
  const [lowerGarment, setLowerGarment] = useState(null);
  const [accessoryGarment, setAccessoryGarment] = useState(null);

  // Picker modal state
  const [pickerSlot, setPickerSlot] = useState(null); // 'upper' | 'lower' | 'accessory'

  // Notification / message
  const [statusMessage, setStatusMessage] = useState('');

  const formatImageUrl = (url) => {
    if (!url) return '/samples/garment_sample.jpg';
    if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
    return `${API_HOST}${url}`;
  };

  const loadData = async () => {
    let w = await fetchWardrobe();
    if (w && w.length > 0) {
      w = w.map((item) => ({
        ...item,
        imageUrl: formatImageUrl(item.image_url || item.imageUrl),
      }));
    } else {
      w = getWardrobeItems();
    }
    setWardrobe(w);
    const o = getSavedOutfits();
    setSavedOutfits(o);

    // Auto-select initial pieces if wardrobe has items and slots are empty
    if (!upperGarment && w.some((i) => i.category === 'upper_body')) {
      setUpperGarment(w.find((i) => i.category === 'upper_body'));
    }
    if (!lowerGarment && w.some((i) => i.category === 'lower_body')) {
      setLowerGarment(w.find((i) => i.category === 'lower_body'));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveOutfit = (e) => {
    e.preventDefault();
    if (!upperGarment && !lowerGarment && !accessoryGarment) {
      setStatusMessage('Please add at least one garment to create an outfit.');
      return;
    }

    const newOutfit = {
      title: outfitTitle.trim() || 'Custom Ensemble',
      occasion: outfitOccasion,
      upperGarment,
      lowerGarment,
      accessoryGarment,
    };

    saveOutfitToStorage(newOutfit);
    const updated = getSavedOutfits();
    setSavedOutfits(updated);
    setStatusMessage('Outfit saved to your persistent Atelier collection.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleDeleteSavedOutfit = (id) => {
    if (window.confirm('Delete this saved outfit?')) {
      const updated = deleteOutfitFromStorage(id);
      setSavedOutfits(updated);
    }
  };

  const handleLoadSavedOutfit = (outfit) => {
    setOutfitTitle(outfit.title || 'Loaded Ensemble');
    setOutfitOccasion(outfit.occasion || 'Everyday');
    setUpperGarment(outfit.upperGarment || null);
    setLowerGarment(outfit.lowerGarment || null);
    setAccessoryGarment(outfit.accessoryGarment || null);
    setStatusMessage(`Loaded "${outfit.title}" into working studio.`);
    setTimeout(() => setStatusMessage(''), 2500);
  };

  const handleClearCurrent = () => {
    setUpperGarment(null);
    setLowerGarment(null);
    setAccessoryGarment(null);
    setOutfitTitle('New Curated Outfit');
  };

  // Garment selection from picker
  const handleSelectFromPicker = (item) => {
    if (pickerSlot === 'upper') {
      setUpperGarment(item);
    } else if (pickerSlot === 'lower') {
      setLowerGarment(item);
    } else if (pickerSlot === 'accessory') {
      setAccessoryGarment(item);
    }
    setPickerSlot(null);
  };

  // Filter garments for the active picker slot
  const eligibleWardrobeForPicker = wardrobe.filter((item) => {
    if (pickerSlot === 'upper') return item.category === 'upper_body' || item.category === 'dresses';
    if (pickerSlot === 'lower') return item.category === 'lower_body';
    return true;
  });

  return (
    <div className="flex-1 h-full min-h-0 bg-[#09090B] flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="h-12 flex-shrink-0 border-b border-[#27272A] px-4 flex items-center justify-between bg-[#0E0E12]">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-display text-lg tracking-wider text-white uppercase leading-none">
              OUTFIT STUDIO
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono leading-none mt-0.5">
              COMPOSITIONAL STYLING WORKBENCH · REAL WARDROBE ENSEMBLES
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {statusMessage && (
            <span className="text-xs font-mono text-emerald-400 animate-fade-in mr-2">
              {statusMessage}
            </span>
          )}
          <button
            type="button"
            onClick={handleClearCurrent}
            className="h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
          >
            Clear Canvas
          </button>
          <button
            type="button"
            onClick={handleSaveOutfit}
            className="h-7 px-3 rounded bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Outfit</span>
          </button>
        </div>
      </div>

      {/* WORKSPACE AREA: 2 Columns */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Interactive Outfit Composition Canvas */}
        <div className="flex-1 min-h-0 p-4 flex flex-col overflow-y-auto bg-[#09090B] border-r border-[#27272A]">
          {/* Honest distinction alert */}
          <div className="mb-3 p-2.5 rounded bg-[#121217] border border-[#27272A] flex items-start space-x-2 text-xs text-zinc-400">
            <Info className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-zinc-200">Compositional Preview Mode:</strong> This canvas allows you to curate multi-piece wardrobe silhouettes. It shows the genuine clothing items side-by-side. To perform photorealistic AI neural try-on on a human subject, use the <em>Studio Atelier</em> button.
            </div>
          </div>

          {/* Outfit Title & Occasion Input Bar */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#111115] p-3 rounded border border-zinc-800">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                Outfit Title
              </label>
              <input
                type="text"
                value={outfitTitle}
                onChange={(e) => setOutfitTitle(e.target.value)}
                placeholder="Name this look..."
                className="w-full h-8 px-2.5 rounded bg-[#18181F] border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                Occasion / Setting
              </label>
              <input
                type="text"
                value={outfitOccasion}
                onChange={(e) => setOutfitOccasion(e.target.value)}
                placeholder="e.g. Streetwear, Gallery Opening, Weekend Casual"
                className="w-full h-8 px-2.5 rounded bg-[#18181F] border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* OUTFIT SLOTS ASSEMBLY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {/* SLOT 1: UPPER BODY / DRESS */}
            <div className="bg-[#121216] border border-[#27272A] rounded p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                  <Shirt className="w-3.5 h-3.5 text-violet-400" />
                  <span>Upper-Body / Top Piece</span>
                </span>
                {upperGarment && (
                  <button
                    type="button"
                    onClick={() => setUpperGarment(null)}
                    className="text-zinc-500 hover:text-rose-400 text-xs"
                    title="Remove item"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {upperGarment ? (
                <div className="relative flex-1 min-h-[220px] rounded bg-[#18181F] border border-zinc-800 overflow-hidden flex flex-col group">
                  <img
                    src={upperGarment.imageUrl}
                    alt={upperGarment.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-2.5 bg-[#14141A] flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white truncate">{upperGarment.name}</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{upperGarment.color} · {upperGarment.style}</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setPickerSlot('upper')}
                        className="flex-1 py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition-colors"
                      >
                        Change Piece
                      </button>
                      {onSelectGarmentForTryOn && (
                        <button
                          type="button"
                          onClick={() => onSelectGarmentForTryOn(upperGarment)}
                          className="flex-1 py-1 px-2 rounded bg-violet-600 hover:bg-violet-500 text-[11px] text-white font-medium flex items-center justify-center space-x-1 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Try in Studio</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setPickerSlot('upper')}
                  className="flex-1 min-h-[220px] rounded border border-dashed border-zinc-800 hover:border-violet-500/60 bg-[#141419]/50 flex flex-col items-center justify-center cursor-pointer transition-colors group p-4 text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-violet-600/20 flex items-center justify-center text-zinc-400 group-hover:text-violet-400 mb-2 transition-colors">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-zinc-300">Select Upper Garment</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Tee, shirt, jacket, or dress</span>
                </div>
              )}
            </div>

            {/* SLOT 2: LOWER BODY / BOTTOM */}
            <div className="bg-[#121216] border border-[#27272A] rounded p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-violet-400" />
                  <span>Lower-Body / Bottom Piece</span>
                </span>
                {lowerGarment && (
                  <button
                    type="button"
                    onClick={() => setLowerGarment(null)}
                    className="text-zinc-500 hover:text-rose-400 text-xs"
                    title="Remove item"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {lowerGarment ? (
                <div className="relative flex-1 min-h-[220px] rounded bg-[#18181F] border border-zinc-800 overflow-hidden flex flex-col group">
                  <img
                    src={lowerGarment.imageUrl}
                    alt={lowerGarment.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-2.5 bg-[#14141A] flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white truncate">{lowerGarment.name}</h4>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{lowerGarment.color} · {lowerGarment.style}</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setPickerSlot('lower')}
                        className="flex-1 py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition-colors"
                      >
                        Change Piece
                      </button>
                      {onSelectGarmentForTryOn && (
                        <button
                          type="button"
                          onClick={() => onSelectGarmentForTryOn(lowerGarment)}
                          className="flex-1 py-1 px-2 rounded bg-violet-600 hover:bg-violet-500 text-[11px] text-white font-medium flex items-center justify-center space-x-1 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Try in Studio</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setPickerSlot('lower')}
                  className="flex-1 min-h-[220px] rounded border border-dashed border-zinc-800 hover:border-violet-500/60 bg-[#141419]/50 flex flex-col items-center justify-center cursor-pointer transition-colors group p-4 text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-violet-600/20 flex items-center justify-center text-zinc-400 group-hover:text-violet-400 mb-2 transition-colors">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-zinc-300">Select Lower Garment</span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Trousers, denim, skirt, or shorts</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Saved Outfits Archive */}
        <div className="w-full lg:w-80 flex-shrink-0 bg-[#0E0E12] flex flex-col min-h-0 border-t lg:border-t-0">
          <div className="h-10 px-3.5 border-b border-[#27272A] flex items-center justify-between bg-[#121217]">
            <span className="text-xs font-mono font-semibold tracking-wider text-zinc-300 uppercase">
              SAVED OUTFITS ({savedOutfits.length})
            </span>
          </div>

          <div className="flex-1 min-h-0 p-3 overflow-y-auto space-y-3">
            {savedOutfits.length === 0 ? (
              <div className="text-center py-10 px-4 text-zinc-500 text-xs">
                <Layers className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                <p>No saved outfits yet.</p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  Assemble upper and lower pieces on the left and click "Save Outfit" to build your collection.
                </p>
              </div>
            ) : (
              savedOutfits.map((outfit) => (
                <div
                  key={outfit.id}
                  className="bg-[#14141A] border border-[#27272A] rounded p-2.5 hover:border-violet-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-white">{outfit.title}</h4>
                      <p className="text-[10px] text-zinc-400">{outfit.occasion}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedOutfit(outfit.id)}
                      className="p-1 rounded text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Delete outfit"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Thumbnail snippet of pieces */}
                  <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-zinc-800/80">
                    {outfit.upperGarment && (
                      <div className="w-12 h-14 rounded bg-zinc-800 overflow-hidden relative">
                        <img
                          src={outfit.upperGarment.imageUrl}
                          alt="Top"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {outfit.lowerGarment && (
                      <div className="w-12 h-14 rounded bg-zinc-800 overflow-hidden relative">
                        <img
                          src={outfit.lowerGarment.imageUrl}
                          alt="Bottom"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 text-[10px] text-zinc-400 truncate">
                      {outfit.upperGarment?.name || 'Top'} + {outfit.lowerGarment?.name || 'Bottom'}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-end space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleLoadSavedOutfit(outfit)}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 font-medium transition-colors"
                    >
                      Load into Studio
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* GARMENT PICKER MODAL */}
      {pickerSlot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#121216] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-fade-in">
            <div className="h-11 px-4 border-b border-[#27272A] flex items-center justify-between bg-[#16161D]">
              <span className="font-display text-sm tracking-wider text-white uppercase">
                Choose Garment for {pickerSlot === 'upper' ? 'Upper-Body' : 'Lower-Body'}
              </span>
              <button
                onClick={() => setPickerSlot(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {eligibleWardrobeForPicker.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  <Shirt className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                  <p>No suitable garments found in your wardrobe for this category.</p>
                  <p className="text-[10px] text-zinc-600 mt-1">
                    Visit "My Wardrobe" to add clothing items first.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {eligibleWardrobeForPicker.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectFromPicker(item)}
                      className="group cursor-pointer rounded bg-[#18181E] border border-zinc-800 hover:border-violet-500 p-1.5 flex flex-col transition-all hover:scale-102"
                    >
                      <div className="aspect-[3/4] w-full rounded bg-zinc-900 overflow-hidden mb-1.5">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-white truncate">{item.name}</span>
                      <span className="text-[9px] text-zinc-400">{item.color}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-zinc-800 bg-[#141419] flex justify-end">
              <button
                type="button"
                onClick={() => setPickerSlot(null)}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
