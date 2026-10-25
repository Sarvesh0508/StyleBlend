import React, { useRef, useState, useEffect } from 'react';
import { Upload, User, Shirt, RefreshCw, X, Image as ImageIcon, FolderHeart, Plus, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { getGarmentQueue, saveGarmentQueue } from '../services/storage';

const LOCAL_SAMPLE_MODEL   = "/samples/model_sample.jpg";
const LOCAL_SAMPLE_GARMENT = "/samples/garment_sample.jpg";

const GARMENT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const LeftPanel = ({
  personImage,
  setPersonImage,
  garmentImage,
  setGarmentImage,
  category,
  onValidationError,
  onOpenWardrobe,
  wardrobeCount = 0,
}) => {
  const personInputRef  = useRef(null);
  const garmentInputRef = useRef(null);
  const addGarmentRef   = useRef(null);

  // Multi-garment queue (in-session + persisted metadata)
  const [garmentQueue, setGarmentQueue]       = useState([]);
  const [activeQueueIdx, setActiveQueueIdx]   = useState(0);
  const [showQueuePanel, setShowQueuePanel]   = useState(false);

  // Load persisted queue metadata on mount (files not persistent, just metadata)
  useEffect(() => {
    const persisted = getGarmentQueue();
    if (persisted.length > 0) {
      setGarmentQueue(persisted);
      // Restore active garment selection from first queue item if no garmentImage
    }
  }, []);

  const cleanupObjectUrl = (imageObj) => {
    if (imageObj?.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(imageObj.previewUrl);
    }
  };

  const processImageFile = (file, setImage, oldImage, onSuccess) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      if (onValidationError) onValidationError('Invalid file format. Please upload JPG, PNG, or WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      if (onValidationError)
        onValidationError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 10 MB limit.`);
      return;
    }
    cleanupObjectUrl(oldImage);
    const previewUrl = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      const result = { file, previewUrl, name: file.name, size: file.size, type: file.type, width: probe.naturalWidth, height: probe.naturalHeight };
      if (setImage) setImage(result);
      if (onSuccess) onSuccess(result);
    };
    probe.onerror = () => {
      const result = { file, previewUrl, name: file.name, size: file.size, type: file.type };
      if (setImage) setImage(result);
      if (onSuccess) onSuccess(result);
    };
    probe.src = previewUrl;
  };

  const handleFileSelect = (e, setImage, oldImage) => {
    const file = e.target.files[0];
    processImageFile(file, setImage, oldImage);
    e.target.value = '';
  };

  const handleDrop = (e, setImage, oldImage) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    processImageFile(file, setImage, oldImage);
  };

  const handleRemove = (type) => {
    if (type === 'person') {
      cleanupObjectUrl(personImage);
      setPersonImage(null);
    } else {
      cleanupObjectUrl(garmentImage);
      setGarmentImage(null);
    }
  };

  const loadGenuineSample = async (type) => {
    try {
      if (type === 'person') {
        const res = await fetch(LOCAL_SAMPLE_MODEL);
        if (!res.ok) throw new Error('Local sample model asset not available');
        const blob = await res.blob();
        const file = new File([blob], 'model_sample.jpg', { type: 'image/jpeg' });
        processImageFile(file, setPersonImage, personImage);
      } else {
        const res = await fetch(LOCAL_SAMPLE_GARMENT);
        if (!res.ok) throw new Error('Local sample garment asset not available');
        const blob = await res.blob();
        const file = new File([blob], 'garment_sample.jpg', { type: 'image/jpeg' });
        processImageFile(file, setGarmentImage, garmentImage);
      }
    } catch (err) {
      console.warn('Could not load sample asset:', err);
      if (onValidationError)
        onValidationError('Sample image is currently unavailable. Please upload your own image.');
    }
  };

  // Add garment to queue
  const handleAddToQueue = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processImageFile(file, null, null, (result) => {
      const entry = {
        ...result,
        queueId: `gq_${Date.now()}`,
        size: result.size || '',
        sizeLabel: 'M',
        name: file.name,
      };
      const updated = [...garmentQueue, entry];
      setGarmentQueue(updated);
      saveGarmentQueue(updated);
      // Auto-select if first or no active garment
      if (garmentQueue.length === 0 || !garmentImage) {
        setGarmentImage(entry);
        setActiveQueueIdx(updated.length - 1);
      }
    });
    e.target.value = '';
  };

  const handleSelectFromQueue = (entry, idx) => {
    setGarmentImage(entry);
    setActiveQueueIdx(idx);
    setShowQueuePanel(false);
  };

  const handleRemoveFromQueue = (queueId, e) => {
    e.stopPropagation();
    const updated = garmentQueue.filter((g) => g.queueId !== queueId);
    setGarmentQueue(updated);
    saveGarmentQueue(updated);
    // If removing the active one, clear or select next
    const removedIdx = garmentQueue.findIndex((g) => g.queueId === queueId);
    if (garmentImage && garmentQueue[removedIdx]?.previewUrl === garmentImage?.previewUrl) {
      if (updated.length > 0) {
        setGarmentImage(updated[0]);
        setActiveQueueIdx(0);
      } else {
        cleanupObjectUrl(garmentImage);
        setGarmentImage(null);
      }
    }
  };

  const updateQueueItemSize = (queueId, sizeLabel) => {
    const updated = garmentQueue.map((g) => g.queueId === queueId ? { ...g, sizeLabel } : g);
    setGarmentQueue(updated);
    saveGarmentQueue(updated);
    // If this is the active garment, update it too
    if (garmentImage && garmentQueue.find((g) => g.queueId === queueId)?.previewUrl === garmentImage?.previewUrl) {
      setGarmentImage((prev) => prev ? { ...prev, sizeLabel } : prev);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <aside className="w-full lg:w-[260px] flex-shrink-0 flex flex-col atelier-panel p-3 overflow-y-auto space-y-3.5 select-none text-xs">

      {/* SECTION 01 — PERSON IMAGE */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 tracking-wider">
          <span>01 · PERSON IMAGE</span>
          {personImage?.width && (
            <span className="text-[10px] text-zinc-500 font-mono">
              {personImage.width}×{personImage.height}
            </span>
          )}
        </div>

        {personImage ? (
          <div className="atelier-card p-2 space-y-2">
            <div className="relative aspect-[3/4] max-h-44 w-full rounded overflow-hidden bg-black border border-zinc-800">
              <img
                src={personImage.previewUrl}
                alt="Person Subject"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-1.5 right-1.5 flex space-x-1">
                <button
                  type="button"
                  onClick={() => personInputRef.current?.click()}
                  className="p-1 rounded bg-black/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
                  title="Replace Person Image"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove('person')}
                  className="p-1 rounded bg-black/80 hover:bg-rose-950 text-zinc-300 hover:text-rose-300 border border-zinc-700 transition-colors"
                  title="Remove Image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="truncate max-w-[140px] text-zinc-300 font-medium">
                {personImage.name || 'person_photo.jpg'}
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                {formatFileSize(personImage.size)}
              </span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => personInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, setPersonImage, personImage)}
            className="upload-dropzone h-36 rounded flex flex-col items-center justify-center p-3 text-center cursor-pointer group"
          >
            <div className="w-7 h-7 rounded bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-400 group-hover:text-violet-400 group-hover:border-violet-500/50 mb-1.5 transition-all">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs font-semibold text-zinc-200">Upload Person Photo</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Drag &amp; drop or click to browse</p>
            <span className="text-[9px] font-mono text-zinc-600 mt-1">JPG, PNG, WEBP &lt; 10MB</span>
          </div>
        )}

        <input
          ref={personInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFileSelect(e, setPersonImage, personImage)}
        />

        {!personImage && (
          <button
            type="button"
            onClick={() => loadGenuineSample('person')}
            className="w-full py-1 px-2 rounded bg-[#18181D] hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center justify-center space-x-1.5 transition-colors"
          >
            <ImageIcon className="w-3 h-3 text-violet-400" />
            <span>Load Studio Model A (Sample)</span>
          </button>
        )}
      </div>

      <div className="h-[1px] bg-zinc-800/80 my-0.5" />

      {/* SECTION 02 — TARGET GARMENT (with multi-garment queue) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 tracking-wider">
          <span>02 · TARGET GARMENT</span>
          <div className="flex items-center space-x-1">
            {garmentQueue.length > 1 && (
              <span className="text-[10px] text-violet-400 font-mono">{garmentQueue.length} queued</span>
            )}
            {garmentImage?.width && (
              <span className="text-[10px] text-zinc-500 font-mono">
                {garmentImage.width}×{garmentImage.height}
              </span>
            )}
          </div>
        </div>

        {garmentImage ? (
          <div className="atelier-card p-2 space-y-2">
            {/* Garment preview — object-contain for flat-lay clothing */}
            <div className="relative aspect-[3/4] max-h-44 w-full rounded overflow-hidden bg-[#0E0E11] border border-zinc-800">
              <img
                src={garmentImage.previewUrl}
                alt="Target Garment"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-1.5 right-1.5 flex space-x-1">
                <button
                  type="button"
                  onClick={() => garmentInputRef.current?.click()}
                  className="p-1 rounded bg-black/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
                  title="Replace Garment Image"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove('garment')}
                  className="p-1 rounded bg-black/80 hover:bg-rose-950 text-zinc-300 hover:text-rose-300 border border-zinc-700 transition-colors"
                  title="Remove Garment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {/* Active queue badge */}
              {garmentQueue.length > 1 && (
                <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-violet-600/90 text-[9px] font-mono text-white">
                  {activeQueueIdx + 1}/{garmentQueue.length}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="truncate max-w-[140px] text-zinc-300 font-medium">
                {garmentImage.name || 'garment_photo.jpg'}
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                {formatFileSize(garmentImage.size)}
              </span>
            </div>

            {/* Size selector for active garment */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-zinc-500">
                <span className="uppercase tracking-wider">Garment Size</span>
                <span className="text-[9px] text-zinc-600">Drives fit preview (Customize tab)</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {GARMENT_SIZES.map((sz) => {
                  const activeSize = garmentQueue.find(
                    (g) => g.previewUrl === garmentImage?.previewUrl
                  )?.sizeLabel || garmentImage?.sizeLabel || 'M';
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        const queueId = garmentQueue.find(g => g.previewUrl === garmentImage?.previewUrl)?.queueId;
                        if (queueId) updateQueueItemSize(queueId, sz);
                        else setGarmentImage(prev => prev ? { ...prev, sizeLabel: sz } : prev);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                        activeSize === sz
                          ? 'bg-violet-600/30 text-violet-300 border border-violet-500/50'
                          : 'bg-[#18181D] text-zinc-500 border border-zinc-800 hover:text-zinc-300'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => garmentInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, setGarmentImage, garmentImage)}
            className="upload-dropzone h-36 rounded flex flex-col items-center justify-center p-3 text-center cursor-pointer group"
          >
            <div className="w-7 h-7 rounded bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-400 group-hover:text-purple-400 group-hover:border-purple-500/50 mb-1.5 transition-all">
              <Shirt className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs font-semibold text-zinc-200">Upload Target Garment</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Flat lay or ghost mannequin</p>
            <span className="text-[9px] font-mono text-zinc-600 mt-1">JPG, PNG, WEBP &lt; 10MB</span>
          </div>
        )}

        <input
          ref={garmentInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFileSelect(e, setGarmentImage, garmentImage)}
        />
        <input
          ref={addGarmentRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAddToQueue}
        />

        {!garmentImage && (
          <button
            type="button"
            onClick={() => loadGenuineSample('garment')}
            className="w-full py-1 px-2 rounded bg-[#18181D] hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Shirt className="w-3 h-3 text-purple-400" />
            <span>Load Graphic Tee (Sample)</span>
          </button>
        )}

        {/* Add more garments to queue */}
        <button
          type="button"
          onClick={() => addGarmentRef.current?.click()}
          className="w-full py-1 px-2 rounded bg-[#18181D] hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-400 hover:text-violet-300 flex items-center justify-center space-x-1.5 transition-colors"
        >
          <Plus className="w-3 h-3 text-violet-400" />
          <span>Add Another Garment Option</span>
        </button>

        {/* Garment queue toggle */}
        {garmentQueue.length > 1 && (
          <button
            type="button"
            onClick={() => setShowQueuePanel((prev) => !prev)}
            className="w-full py-1 px-2 rounded bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-[10px] text-violet-300 flex items-center justify-between transition-colors"
          >
            <span>Garment Queue ({garmentQueue.length} options)</span>
            <ChevronRight className={`w-3 h-3 transition-transform ${showQueuePanel ? 'rotate-90' : ''}`} />
          </button>
        )}

        {/* Garment queue panel */}
        {showQueuePanel && garmentQueue.length > 1 && (
          <div className="rounded bg-[#101014] border border-zinc-800 overflow-hidden space-y-0">
            {garmentQueue.map((entry, idx) => {
              const isActive = garmentImage?.previewUrl === entry.previewUrl;
              return (
                <div
                  key={entry.queueId}
                  onClick={() => handleSelectFromQueue(entry, idx)}
                  className={`flex items-center space-x-2 p-1.5 cursor-pointer transition-all ${
                    isActive ? 'bg-violet-600/15 border-l-2 border-violet-500' : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="w-8 h-10 rounded overflow-hidden bg-black flex-shrink-0 border border-zinc-800">
                    <img src={entry.previewUrl} alt={entry.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-200 truncate">{entry.name}</p>
                    <p className="text-[9px] text-zinc-500 font-mono">{entry.sizeLabel || 'M'}</p>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    {isActive ? (
                      <CheckCircle2 className="w-3 h-3 text-violet-400" />
                    ) : (
                      <Circle className="w-3 h-3 text-zinc-700" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleRemoveFromQueue(entry.queueId, e)}
                      className="p-0.5 rounded hover:bg-rose-950 text-zinc-600 hover:text-rose-400 transition-colors"
                      title="Remove from queue"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Wardrobe action */}
        {onOpenWardrobe && (
          <button
            type="button"
            onClick={onOpenWardrobe}
            className="w-full py-1 px-2 rounded bg-[#18181D] hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-400 hover:text-violet-300 flex items-center justify-center space-x-1.5 transition-colors"
          >
            <FolderHeart className="w-3 h-3 text-violet-400" />
            <span>Open Studio Wardrobe {wardrobeCount > 0 ? `(${wardrobeCount})` : ''}</span>
          </button>
        )}
      </div>

      {/* BOTTOM REAL METADATA */}
      {(personImage || garmentImage) && (
        <div className="mt-auto pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-500 space-y-1 font-mono">
          <div className="flex justify-between">
            <span>PIPELINE:</span>
            <span className="text-zinc-400">IDM-VTON FP16</span>
          </div>
          <div className="flex justify-between">
            <span>CATEGORY:</span>
            <span className="text-violet-400 uppercase">{category.replace('_', ' ')}</span>
          </div>
          {personImage?.size && (
            <div className="flex justify-between">
              <span>PERSON ASSET:</span>
              <span className="text-zinc-400">{formatFileSize(personImage.size)}</span>
            </div>
          )}
          {garmentImage?.size && (
            <div className="flex justify-between">
              <span>GARMENT ASSET:</span>
              <span className="text-zinc-400">{formatFileSize(garmentImage.size)}</span>
            </div>
          )}
          {garmentQueue.length > 0 && (
            <div className="flex justify-between">
              <span>GARMENT QUEUE:</span>
              <span className="text-violet-400">{garmentQueue.length} option{garmentQueue.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
