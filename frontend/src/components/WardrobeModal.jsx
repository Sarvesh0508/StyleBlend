import React, { useState, useEffect } from 'react';
import { X, Trash2, Download, ArrowRight, Shirt, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'styleblend_saved_wardrobe';

export const getSavedWardrobe = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load wardrobe:', err);
    return [];
  }
};

export const saveToWardrobe = (item) => {
  try {
    const existing = getSavedWardrobe();
    const updated = [
      {
        id: `look_${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...item,
      },
      ...existing,
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to save to wardrobe:', err);
    return false;
  }
};

export const deleteFromWardrobe = (id) => {
  try {
    const existing = getSavedWardrobe();
    const updated = existing.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete from wardrobe:', err);
    return [];
  }
};

export const WardrobeModal = ({ isOpen, onClose, onLoadLook }) => {
  const [looks, setLooks] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setLooks(getSavedWardrobe());
    }
  }, [isOpen]);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    const updated = deleteFromWardrobe(id);
    setLooks(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="bg-[#121215] border border-[#27272A] max-w-2xl w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="h-10 border-b border-[#27272A] bg-[#16161A] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-300">
            <Shirt className="w-3.5 h-3.5 text-violet-400" />
            <span className="font-bold text-white tracking-wider">STUDIO WARDROBE</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400 font-mono text-[11px]">{looks.length} Saved Looks</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {looks.length === 0 ? (
            <div className="p-8 text-center space-y-2 border border-dashed border-zinc-800 rounded bg-[#18181D]/40">
              <div className="w-9 h-9 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto text-zinc-500">
                <Shirt className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-zinc-300">WARDROBE EMPTY</h4>
              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                Generate a try-on result and click "Save Look" in the right panel to store your outfits in local storage.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {looks.map((look) => (
                <div
                  key={look.id}
                  className="p-2.5 rounded bg-[#18181D] border border-zinc-800 hover:border-violet-500/40 transition-all space-y-2 group"
                >
                  <div className="flex space-x-2 aspect-[3/2] rounded overflow-hidden bg-black border border-zinc-800">
                    {/* Person */}
                    {look.originalPerson && (
                      <div className="w-1/3 h-full relative">
                        <img src={look.originalPerson} alt="Subject" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 px-1 rounded bg-black/80 text-[8px] font-mono text-zinc-400">
                          SUBJ
                        </span>
                      </div>
                    )}
                    {/* Garment */}
                    {look.garmentPerson && (
                      <div className="w-1/3 h-full relative border-l border-zinc-800">
                        <img src={look.garmentPerson} alt="Garment" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 px-1 rounded bg-black/80 text-[8px] font-mono text-zinc-400">
                          GARM
                        </span>
                      </div>
                    )}
                    {/* Result */}
                    {look.resultImage && (
                      <div className="w-1/3 h-full relative border-l border-violet-500/40">
                        <img src={look.resultImage} alt="Result" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 px-1 rounded bg-violet-950/90 text-[8px] font-mono text-violet-300">
                          FIT
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between text-[11px]">
                    <div className="min-w-0 pr-2">
                      <p className="text-zinc-200 font-medium truncate capitalize">
                        {look.category?.replace('_', ' ') || 'Upper body'}
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {look.description || 'Try-on outfit'}
                      </p>
                      <p className="text-[9px] text-zinc-600 font-mono">
                        {new Date(look.timestamp).toLocaleDateString()} · {new Date(look.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          if (onLoadLook) onLoadLook(look);
                          onClose();
                        }}
                        className="p-1 rounded bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-semibold flex items-center space-x-0.5"
                        title="Load this look into workspace"
                      >
                        <span>Load</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(look.id, e)}
                        className="p-1 rounded bg-zinc-800 hover:bg-rose-900 text-zinc-400 hover:text-white transition-colors"
                        title="Delete look"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-10 border-t border-[#27272A] bg-[#16161A] px-4 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Persistent in browser localStorage</span>
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
