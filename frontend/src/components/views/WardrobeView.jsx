import React, { useState, useEffect } from 'react';
import {
  Shirt,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Search,
  Filter,
  Check,
  X,
  Upload,
  ArrowRight,
  Info,
  Layers,
  Image as ImageIcon,
  Ruler
} from 'lucide-react';
import {
  getWardrobeItems,
  saveWardrobeItem,
  updateWardrobeItem,
  deleteWardrobeItem,
  seedDefaultWardrobe
} from '../../services/storage';
import {
  fetchWardrobe,
  createWardrobeItemApi,
  updateWardrobeItemApi,
  deleteWardrobeItemApi
} from '../../services/api';
import { SizeComparisonModal } from '../SizeComparisonModal';

const API_HOST = 'http://localhost:8000';

const CATEGORIES = [
  { id: 'all', label: 'All Garments' },
  { id: 'upper_body', label: 'Upper-body' },
  { id: 'lower_body', label: 'Lower-body' },
  { id: 'dresses', label: 'Dresses' },
];

export const WardrobeView = ({ onSelectGarmentForTryOn, onNavigateToOutfitStudio, onOpenProfile }) => {
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Active Selections
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeComparisonGarment, setActiveComparisonGarment] = useState(null);
  const [failedImages, setFailedImages] = useState({});

  // Form Fields
  const [formName, setFormName]         = useState('');
  const [formCategory, setFormCategory] = useState('upper_body');
  const [formColor, setFormColor]       = useState('Black');
  const [formStyle, setFormStyle]       = useState('Streetwear');
  const [formSize, setFormSize]         = useState('M');
  const [formBrand, setFormBrand]       = useState('');
  const [formNotes, setFormNotes]       = useState('');
  const [formPrice, setFormPrice]       = useState('');
  const [formMeasChest, setFormMeasChest]   = useState('');
  const [formMeasWaist, setFormMeasWaist]   = useState('');
  const [formMeasHip, setFormMeasHip]       = useState('');
  const [formMeasLength, setFormMeasLength] = useState('');
  const [formMeasUnit, setFormMeasUnit]     = useState('cm');
  const [formImageFile, setFormImageFile]   = useState(null);
  const [formImagePreview, setFormImagePreview] = useState('');
  const [formError, setFormError]       = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatImageUrl = (url) => {
    if (!url) return '/samples/garment_sample.jpg';
    if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
    return `${API_HOST}${url}`;
  };

  const loadItems = async () => {
    const backendItems = await fetchWardrobe();
    if (backendItems && backendItems.length > 0) {
      const formatted = backendItems.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        color: item.color,
        style: item.style,
        size: item.size,
        brand: item.brand,
        notes: item.notes,
        price: item.price,
        meas_chest: item.meas_chest,
        meas_waist: item.meas_waist,
        meas_hip: item.meas_hip,
        meas_length: item.meas_length,
        meas_unit: item.meas_unit || 'cm',
        imageUrl: formatImageUrl(item.image_url),
        image_filename: item.image_filename,
        createdAt: item.created_at,
        timesUsed: item.times_used || 0,
      }));
      setItems(formatted);
    } else {
      const local = getWardrobeItems();
      setItems(local);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const openAddModal = () => {
    setFormName('');
    setFormCategory('upper_body');
    setFormColor('Black');
    setFormStyle('Streetwear');
    setFormSize('M');
    setFormBrand('');
    setFormNotes('');
    setFormPrice('');
    setFormMeasChest('');
    setFormMeasWaist('');
    setFormMeasHip('');
    setFormMeasLength('');
    setFormMeasUnit('cm');
    setFormImageFile(null);
    setFormImagePreview('');
    setFormError('');
    setEditingItem(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormName(item.name || '');
    setFormCategory(item.category || 'upper_body');
    setFormColor(item.color || 'Black');
    setFormStyle(item.style || 'Streetwear');
    setFormSize(item.size || 'M');
    setFormBrand(item.brand || '');
    setFormNotes(item.notes || '');
    setFormPrice(item.price !== undefined && item.price !== null ? String(item.price) : '');
    setFormMeasChest(item.meas_chest !== undefined && item.meas_chest !== null ? String(item.meas_chest) : '');
    setFormMeasWaist(item.meas_waist !== undefined && item.meas_waist !== null ? String(item.meas_waist) : '');
    setFormMeasHip(item.meas_hip !== undefined && item.meas_hip !== null ? String(item.meas_hip) : '');
    setFormMeasLength(item.meas_length !== undefined && item.meas_length !== null ? String(item.meas_length) : '');
    setFormMeasUnit(item.meas_unit || 'cm');
    setFormImageFile(null);
    setFormImagePreview(item.imageUrl || '');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFormError('Image size exceeds 10MB limit.');
      return;
    }

    setFormImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormImagePreview(event.target.result);
      setFormError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Please provide a garment title or name.');
      return;
    }
    if (!formImagePreview && !formImageFile) {
      setFormError('Please upload a garment image.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      if (editingItem) {
        // Edit existing garment
        const formData = new FormData();
        formData.append('name', formName.trim());
        formData.append('category', formCategory);
        formData.append('color', formColor.trim());
        formData.append('style', formStyle.trim());
        formData.append('size', formSize);
        formData.append('brand', formBrand.trim());
        formData.append('notes', formNotes.trim());
        if (formPrice) formData.append('price', parseFloat(formPrice));
        if (formMeasChest) formData.append('meas_chest', parseFloat(formMeasChest));
        if (formMeasWaist) formData.append('meas_waist', parseFloat(formMeasWaist));
        if (formMeasHip) formData.append('meas_hip', parseFloat(formMeasHip));
        if (formMeasLength) formData.append('meas_length', parseFloat(formMeasLength));
        formData.append('meas_unit', formMeasUnit);
        if (formImageFile) formData.append('image', formImageFile);

        try {
          await updateWardrobeItemApi(editingItem.id, formData);
        } catch (apiErr) {
          console.warn('Backend update failed, updating local state:', apiErr.message);
        }

        updateWardrobeItem(editingItem.id, {
          name: formName.trim(),
          category: formCategory,
          color: formColor,
          style: formStyle,
          size: formSize,
          brand: formBrand.trim(),
          notes: formNotes.trim(),
          price: formPrice ? parseFloat(formPrice) : null,
          meas_chest: formMeasChest ? parseFloat(formMeasChest) : null,
          meas_waist: formMeasWaist ? parseFloat(formMeasWaist) : null,
          meas_hip: formMeasHip ? parseFloat(formMeasHip) : null,
          meas_length: formMeasLength ? parseFloat(formMeasLength) : null,
          meas_unit: formMeasUnit,
          imageUrl: formImagePreview,
        });
      } else {
        // Create new garment
        let createdBackendItem = null;
        if (formImageFile) {
          const formData = new FormData();
          formData.append('image', formImageFile);
          formData.append('name', formName.trim());
          formData.append('category', formCategory);
          formData.append('color', formColor.trim());
          formData.append('style', formStyle.trim());
          formData.append('size', formSize);
          formData.append('brand', formBrand.trim());
          formData.append('notes', formNotes.trim());
          if (formPrice) formData.append('price', parseFloat(formPrice));
          if (formMeasChest) formData.append('meas_chest', parseFloat(formMeasChest));
          if (formMeasWaist) formData.append('meas_waist', parseFloat(formMeasWaist));
          if (formMeasHip) formData.append('meas_hip', parseFloat(formMeasHip));
          if (formMeasLength) formData.append('meas_length', parseFloat(formMeasLength));
          formData.append('meas_unit', formMeasUnit);

          try {
            createdBackendItem = await createWardrobeItemApi(formData);
          } catch (apiErr) {
            console.warn('Backend wardrobe creation failed, falling back to local storage:', apiErr.message);
          }
        }

        const persistentUrl = createdBackendItem?.image_url
          ? formatImageUrl(createdBackendItem.image_url)
          : formImagePreview;

        saveWardrobeItem({
          id: createdBackendItem?.id,
          name: formName.trim(),
          category: formCategory,
          color: formColor,
          style: formStyle,
          size: formSize,
          brand: formBrand.trim(),
          notes: formNotes.trim(),
          price: formPrice ? parseFloat(formPrice) : null,
          meas_chest: formMeasChest ? parseFloat(formMeasChest) : null,
          meas_waist: formMeasWaist ? parseFloat(formMeasWaist) : null,
          meas_hip: formMeasHip ? parseFloat(formMeasHip) : null,
          meas_length: formMeasLength ? parseFloat(formMeasLength) : null,
          meas_unit: formMeasUnit,
          imageUrl: persistentUrl,
        });
      }

      await loadItems();
      setIsAddModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save garment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from your wardrobe?`)) {
      try {
        await deleteWardrobeItemApi(id);
      } catch (err) {
        console.warn('Backend delete failed, removing locally:', err.message);
      }
      deleteWardrobeItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset wardrobe to default starter garments? Any custom items will be overwritten.')) {
      seedDefaultWardrobe();
      loadItems();
    }
  };

  const handleImageError = (id) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.color?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.style?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 h-full min-h-0 bg-[#09090B] flex flex-col overflow-hidden">
      {/* HEADER BAR */}
      <div className="h-12 flex-shrink-0 border-b border-[#27272A] px-4 flex items-center justify-between bg-[#0E0E12]">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
            <Shirt className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-display text-lg tracking-wider text-white uppercase leading-none">
              MY WARDROBE
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono leading-none mt-0.5">
              {items.length} {items.length === 1 ? 'GARMENT ARCHIVED' : 'GARMENTS ARCHIVED'} · SERVER-PERSISTED SQLITE & FILE SYSTEM
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={openAddModal}
            className="h-7 px-3 rounded bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Garment</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="px-4 py-2.5 border-b border-[#27272A] bg-[#0C0C0F] flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        {/* Category Pills */}
        <div className="flex items-center space-x-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`h-6 px-2.5 rounded text-[11px] font-mono transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-violet-600 text-white font-semibold'
                  : 'bg-[#18181D] text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wardrobe…"
              className="h-7 pl-8 pr-3 rounded bg-[#18181D] border border-zinc-800 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-violet-500 w-44 sm:w-56"
            />
          </div>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="h-7 px-2 text-[10px] font-mono text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800/60"
            title="Reset default archive garments"
          >
            Restore Samples
          </button>
        </div>
      </div>

      {/* STORAGE PERSISTENCE NOTICE */}
      <div className="px-4 py-1.5 bg-[#121217] border-b border-[#1E1E24] flex items-center justify-between text-[11px] text-zinc-400 font-mono flex-shrink-0">
        <div className="flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
          <span>Garment images stored server-side with separated metadata. Never blows localStorage limits.</span>
        </div>
        <span className="text-[10px] text-zinc-500 hidden sm:inline">Safe cross-reference deletion</span>
      </div>

      {/* MAIN GARMENTS GRID */}
      <div className="flex-1 min-h-0 p-4 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-800 rounded-lg">
            <Shirt className="w-12 h-12 text-zinc-700 mb-3" />
            <h3 className="text-zinc-300 font-semibold text-sm mb-1">No Garments Found</h3>
            <p className="text-zinc-500 text-xs max-w-sm mb-4">
              {searchQuery
                ? `No garments matched "${searchQuery}". Try broadening your search or resetting category filters.`
                : 'Your wardrobe is currently empty. Add your clothing items using the button below.'}
            </p>
            <button
              onClick={openAddModal}
              className="px-3.5 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Garment</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group relative bg-[#121216] border border-[#27272A] rounded overflow-hidden flex flex-col hover:border-violet-500/60 transition-all hover:shadow-lg"
              >
                {/* Image Thumbnail Container */}
                <div className="relative aspect-[3/4] w-full bg-[#18181E] overflow-hidden flex items-center justify-center">
                  {failedImages[item.id] ? (
                    <div className="flex flex-col items-center justify-center p-3 text-center text-zinc-500 text-xs">
                      <ImageIcon className="w-8 h-8 mb-1 text-zinc-600" />
                      <span>Preview offline</span>
                    </div>
                  ) : (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      onError={() => handleImageError(item.id)}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  )}

                  {/* Category Pill on top */}
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[9px] font-mono text-zinc-300 uppercase tracking-wider">
                    {item.category?.replace('_', ' ')}
                  </div>

                  {/* Hover Quick Actions */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                    <div className="flex justify-end space-x-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveComparisonGarment(item);
                        }}
                        className="p-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                        title="Compare measurements & fit"
                      >
                        <Ruler className="w-3 h-3 text-violet-400" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(item);
                        }}
                        className="p-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                        title="Edit details"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id, item.name);
                        }}
                        className="p-1.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-300 hover:text-white transition-colors"
                        title="Delete garment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {onSelectGarmentForTryOn && (
                        <button
                          type="button"
                          onClick={() => onSelectGarmentForTryOn(item)}
                          className="w-full py-1.5 px-2 rounded bg-violet-600 hover:bg-violet-500 text-white font-medium text-[11px] flex items-center justify-center space-x-1 shadow-md transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Try On in Studio</span>
                        </button>
                      )}
                      {onNavigateToOutfitStudio && (
                        <button
                          type="button"
                          onClick={() => onNavigateToOutfitStudio(item)}
                          className="w-full py-1 px-2 rounded bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 text-[10px] flex items-center justify-center space-x-1 transition-colors"
                        >
                          <Layers className="w-2.5 h-2.5" />
                          <span>Use in Outfit</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-2 flex flex-col justify-between flex-1 bg-[#121216]">
                  <div>
                    <h3 className="text-xs font-semibold text-white truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <div className="flex items-center space-x-1 mt-0.5 text-[10px] text-zinc-400">
                      <span>{item.color}</span>
                      <span>·</span>
                      <span>{item.style}</span>
                      {item.size && (
                        <span className="ml-auto bg-zinc-800 px-1 rounded text-[9px] font-mono text-violet-400 border border-zinc-700">{item.size}</span>
                      )}
                    </div>
                    {item.brand && (
                      <p className="text-[9px] text-zinc-600 font-mono mt-0.5">{item.brand}</p>
                    )}
                  </div>

                  {/* Size Comparison pill trigger */}
                  <div className="mt-2 pt-1.5 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
                    <button
                      type="button"
                      onClick={() => setActiveComparisonGarment(item)}
                      className="text-violet-400 hover:text-violet-300 font-mono flex items-center space-x-1"
                    >
                      <Ruler className="w-3 h-3" />
                      <span>Size Check</span>
                    </button>
                    {item.meas_chest ? (
                      <span className="text-zinc-500 font-mono text-[9px]">{item.meas_chest}cm ch</span>
                    ) : (
                      <span className="text-zinc-600 font-mono text-[9px]">no meas</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SIZE COMPARISON MODAL */}
      <SizeComparisonModal
        isOpen={Boolean(activeComparisonGarment)}
        onClose={() => setActiveComparisonGarment(null)}
        garment={activeComparisonGarment}
        onOpenProfile={onOpenProfile}
      />

      {/* ADD / EDIT GARMENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#121216] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            {/* Modal Header */}
            <div className="h-11 px-4 border-b border-[#27272A] flex items-center justify-between bg-[#16161D]">
              <span className="font-display text-sm tracking-wider text-white uppercase">
                {editingItem ? 'Edit Garment Details' : 'Add New Garment to Wardrobe'}
              </span>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="p-4 space-y-3.5 overflow-y-auto flex-1">
              {formError && (
                <div className="p-2 rounded bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              {/* Garment Image Upload & Preview */}
              <div>
                <label className="block text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                  Garment Photograph <span className="text-violet-400">*</span>
                </label>
                <div className="flex items-center space-x-3">
                  <div className="w-20 h-24 rounded border border-zinc-800 bg-[#18181F] overflow-hidden flex items-center justify-center flex-shrink-0 relative group">
                    {formImagePreview ? (
                      <img
                        src={formImagePreview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors border border-zinc-700">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{formImagePreview ? 'Change Image' : 'Select Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      JPG, PNG, or WebP. Saved server-side directly to disk.
                    </p>
                  </div>
                </div>
              </div>

              {/* Title / Name */}
              <div>
                <label className="block text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider mb-1">
                  Garment Name <span className="text-violet-400">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Vintage Leather Biker Jacket"
                  className="w-full h-8 px-2.5 rounded bg-[#18181F] border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              {/* Category & Color row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider mb-1">
                    Category <span className="text-violet-400">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-8 px-2 rounded bg-[#18181F] border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="upper_body">Upper-body (Tops/Jackets)</option>
                    <option value="lower_body">Lower-body (Pants/Skirts)</option>
                    <option value="dresses">Dresses (Full-body)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider mb-1">
                    Primary Color
                  </label>
                  <input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    placeholder="e.g. Black, White, Camel"
                    className="w-full h-8 px-2.5 rounded bg-[#18181F] border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Style & Size row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider mb-1">
                    Aesthetic Style
                  </label>
                  <input
                    type="text"
                    value={formStyle}
                    onChange={(e) => setFormStyle(e.target.value)}
                    placeholder="e.g. Streetwear, Classic"
                    className="w-full h-8 px-2.5 rounded bg-[#18181F] border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider mb-1">
                    Garment Size
                  </label>
                  <select
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value)}
                    className="w-full h-8 px-2 rounded bg-[#18181F] border border-zinc-800 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    {['XS','S','M','L','XL','XXL','One Size'].map(sz => (
                      <option key={sz} value={sz}>{sz}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Brand & Price row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider mb-1">
                    Brand / Label
                  </label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="e.g. Uniqlo, Atelier"
                    className="w-full h-8 px-2.5 rounded bg-[#18181F] border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 59.99"
                    className="w-full h-8 px-2.5 rounded bg-[#18181F] border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Physical Garment Measurements (Phase C) */}
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                    Physical Garment Measurements
                  </span>
                  <div className="flex bg-[#18181F] p-0.5 rounded border border-zinc-800">
                    {['cm', 'in'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setFormMeasUnit(u)}
                        className={`px-1.5 py-0.5 text-[9px] font-mono rounded ${
                          formMeasUnit === u ? 'bg-violet-600 text-white font-bold' : 'text-zinc-500 hover:text-white'
                        }`}
                      >
                        {u.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[9px] font-mono text-zinc-500 mb-0.5">Chest</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formMeasChest}
                      onChange={(e) => setFormMeasChest(e.target.value)}
                      placeholder="e.g. 102"
                      className="w-full h-7 px-1.5 rounded bg-[#18181F] border border-zinc-800 text-[11px] text-white focus:outline-none focus:border-violet-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-zinc-500 mb-0.5">Waist</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formMeasWaist}
                      onChange={(e) => setFormMeasWaist(e.target.value)}
                      placeholder="e.g. 88"
                      className="w-full h-7 px-1.5 rounded bg-[#18181F] border border-zinc-800 text-[11px] text-white focus:outline-none focus:border-violet-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-zinc-500 mb-0.5">Hip</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formMeasHip}
                      onChange={(e) => setFormMeasHip(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full h-7 px-1.5 rounded bg-[#18181F] border border-zinc-800 text-[11px] text-white focus:outline-none focus:border-violet-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-zinc-500 mb-0.5">Length</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formMeasLength}
                      onChange={(e) => setFormMeasLength(e.target.value)}
                      placeholder="e.g. 72"
                      className="w-full h-7 px-1.5 rounded bg-[#18181F] border border-zinc-800 text-[11px] text-white focus:outline-none focus:border-violet-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-mono font-medium text-zinc-400 uppercase tracking-wider mb-1">
                  Fabric / Notes
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. 100% organic cotton, relaxed drape"
                  className="w-full h-8 px-2.5 rounded bg-[#18181F] border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-violet-600 hover:bg-violet-500 text-xs text-white font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving…' : editingItem ? 'Save Changes' : 'Add to Wardrobe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
