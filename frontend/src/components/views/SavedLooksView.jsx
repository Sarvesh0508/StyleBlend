import React, { useState, useEffect } from 'react';
import {
  BookmarkCheck,
  Trash2,
  Download,
  Sparkles,
  ArrowRight,
  Eye,
  ArrowLeftRight,
  Calendar,
  Layers,
  X,
  Clock,
  Info
} from 'lucide-react';
import { getSavedLooks, deleteLookFromStorage } from '../../services/storage';
import { fetchSavedLooks, removeSavedLook } from '../../services/api';

const API_HOST = 'http://localhost:8000';

export const SavedLooksView = ({
  onLoadLookIntoStudio,
  onCompareLook,
}) => {
  const [looks, setLooks] = useState([]);
  const [activeModalLook, setActiveModalLook] = useState(null);
  const [failedImages, setFailedImages] = useState({});

  const formatImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
    return `${API_HOST}${url}`;
  };

  const loadLooks = async () => {
    const backendData = await fetchSavedLooks();
    if (backendData && backendData.length > 0) {
      const formatted = backendData.map((item) => ({
        id: item.id,
        resultImage: formatImageUrl(item.result_url),
        originalPerson: formatImageUrl(item.original_person),
        garmentPerson: formatImageUrl(item.garment_person),
        category: item.category,
        description: item.description,
        executionTime: item.execution_time,
        timestamp: item.created_at,
        mode: item.mode,
      }));
      setLooks(formatted);
    } else {
      const local = getSavedLooks();
      setLooks(local);
    }
  };

  useEffect(() => {
    loadLooks();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this saved look from persistent archive?')) {
      try {
        await removeSavedLook(id);
      } catch (err) {
        console.warn('Backend delete failed, removing locally:', err.message);
      }
      deleteLookFromStorage(id);
      setLooks((prev) => prev.filter((l) => l.id !== id));
      if (activeModalLook?.id === id) {
        setActiveModalLook(null);
      }
    }
  };

  const handleImageError = (id) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const handleDownload = async (imageUrl, e) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `styleblend_look_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download error:', err);
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div className="flex-1 h-full min-h-0 bg-[#09090B] flex flex-col overflow-hidden">
      {/* HEADER BAR */}
      <div className="h-12 flex-shrink-0 border-b border-[#27272A] px-4 flex items-center justify-between bg-[#0E0E12]">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
            <BookmarkCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-display text-lg tracking-wider text-white uppercase leading-none">
              SAVED LOOKS
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono leading-none mt-0.5">
              {looks.length} {looks.length === 1 ? 'TRY-ON RESULT ARCHIVED' : 'TRY-ON RESULTS ARCHIVED'} · SERVER-PERSISTED & PROTECTED FROM CLEANUP
            </p>
          </div>
        </div>
      </div>

      {/* STORAGE PERSISTENCE NOTICE */}
      <div className="px-4 py-1.5 bg-[#121217] border-b border-[#1E1E24] flex items-center justify-between text-[11px] text-zinc-400 font-mono flex-shrink-0">
        <div className="flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
          <span>Permanently archived in server SQLite & dedicated storage. Protected against auto-cleanup deletion.</span>
        </div>
        <span className="text-[10px] text-zinc-500 hidden sm:inline">Zero large base64 quota consumption</span>
      </div>

      {/* MAIN GALLERY VIEW */}
      <div className="flex-1 min-h-0 p-4 overflow-y-auto">
        {looks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-800 rounded-lg">
            <BookmarkCheck className="w-12 h-12 text-zinc-700 mb-3" />
            <h3 className="text-zinc-300 font-semibold text-sm mb-1">No Saved Looks Yet</h3>
            <p className="text-zinc-500 text-xs max-w-sm mb-4">
              When you generate virtual try-ons in Studio Atelier, click the "Save Look" button in the inspector to archive your results permanently.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {looks.map((look) => (
              <div
                key={look.id}
                onClick={() => setActiveModalLook(look)}
                className="group cursor-pointer bg-[#121216] border border-[#27272A] rounded-lg overflow-hidden flex flex-col hover:border-violet-500/60 transition-all hover:shadow-xl"
              >
                {/* Generated Result Image */}
                <div className="relative aspect-[3/4] w-full bg-[#18181E] overflow-hidden flex items-center justify-center">
                  {failedImages[look.id] ? (
                    <div className="flex flex-col items-center justify-center p-3 text-center text-zinc-500 text-xs">
                      <ImageIcon className="w-8 h-8 mb-1 text-zinc-600" />
                      <span>Image unavailable or expired</span>
                    </div>
                  ) : (
                    <img
                      src={look.resultImage}
                      alt="Saved Look"
                      onError={() => handleImageError(look.id)}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-103"
                      loading="lazy"
                    />
                  )}

                  {/* Category Pill */}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[9px] font-mono text-zinc-300 uppercase">
                    {look.category?.replace('_', ' ') || 'VTON'}
                  </div>

                  {/* Quick Action Overlay */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                    <div className="flex justify-end space-x-1">
                      <button
                        type="button"
                        onClick={(e) => handleDownload(look.resultImage, e)}
                        className="p-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200"
                        title="Download image"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(look.id, e)}
                        className="p-1.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-300"
                        title="Delete look"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {onLoadLookIntoStudio && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLoadLookIntoStudio(look);
                          }}
                          className="w-full py-1.5 px-2 rounded bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs flex items-center justify-center space-x-1 shadow-sm transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Return to Studio</span>
                        </button>
                      )}
                      {onCompareLook && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCompareLook(look);
                          }}
                          className="w-full py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] flex items-center justify-center space-x-1 transition-colors"
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          <span>Compare in Lab</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metadata & Sub-assets Footer */}
                <div className="p-3 bg-[#121216] flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="text-xs font-semibold text-white truncate">
                      {look.description || 'Try-On Synthesis'}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1 text-[10px] text-zinc-400 font-mono">
                      <span>{new Date(look.timestamp).toLocaleDateString()}</span>
                      {look.executionTime && (
                        <>
                          <span>·</span>
                          <span>{look.executionTime.toFixed(1)}s GPU</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Input thumbnails preview */}
                  {(look.originalPerson || look.garmentPerson) && (
                    <div className="flex items-center space-x-1.5 mt-2.5 pt-2 border-t border-zinc-800/80">
                      {look.originalPerson && (
                        <div className="w-8 h-8 rounded bg-zinc-800 overflow-hidden relative" title="Original Person">
                          <img src={look.originalPerson} alt="Person" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {look.garmentPerson && (
                        <div className="w-8 h-8 rounded bg-zinc-800 overflow-hidden relative" title="Garment">
                          <img src={look.garmentPerson} alt="Garment" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="text-[10px] text-zinc-500 font-mono ml-1">Input Source Pair</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FULL PREVIEW MODAL */}
      {activeModalLook && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#121216] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            {/* Header */}
            <div className="h-11 px-4 border-b border-[#27272A] flex items-center justify-between bg-[#16161D]">
              <span className="font-display text-sm tracking-wider text-white uppercase">
                {activeModalLook.description || 'Virtual Try-On Look'}
              </span>
              <button
                onClick={() => setActiveModalLook(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col md:flex-row gap-4 flex-1 overflow-y-auto">
              <div className="flex-1 flex items-center justify-center bg-[#0A0A0D] rounded border border-zinc-800/60 overflow-hidden">
                <img
                  src={activeModalLook.resultImage}
                  alt="High-Res Result"
                  className="max-h-[60vh] object-contain"
                />
              </div>

              <div className="w-full md:w-56 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                      Category
                    </span>
                    <span className="text-xs text-white capitalize font-medium">
                      {activeModalLook.category?.replace('_', ' ') || 'Upper body'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                      Saved On
                    </span>
                    <span className="text-xs text-zinc-300 font-mono">
                      {new Date(activeModalLook.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {activeModalLook.executionTime && (
                    <div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                        Neural Synthesis Duration
                      </span>
                      <span className="text-xs text-zinc-300 font-mono">
                        {activeModalLook.executionTime.toFixed(1)} seconds
                      </span>
                    </div>
                  )}

                  {/* Input thumbnails */}
                  <div className="pt-2 border-t border-zinc-800">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block mb-1.5">
                      Input Assets
                    </span>
                    <div className="flex items-center space-x-2">
                      {activeModalLook.originalPerson && (
                        <div className="w-12 h-14 rounded bg-zinc-800 overflow-hidden">
                          <img
                            src={activeModalLook.originalPerson}
                            alt="Subject"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      {activeModalLook.garmentPerson && (
                        <div className="w-12 h-14 rounded bg-zinc-800 overflow-hidden">
                          <img
                            src={activeModalLook.garmentPerson}
                            alt="Garment"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-zinc-800">
                  {onLoadLookIntoStudio && (
                    <button
                      type="button"
                      onClick={() => {
                        onLoadLookIntoStudio(activeModalLook);
                        setActiveModalLook(null);
                      }}
                      className="w-full py-1.5 px-3 rounded bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Stage in Studio Atelier</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDownload(activeModalLook.resultImage, e)}
                    className="w-full py-1.5 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(activeModalLook.id, e)}
                    className="w-full py-1.5 px-3 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800/40 text-rose-300 text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete from Archive</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
