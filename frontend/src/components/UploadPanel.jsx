import React, { useRef, useState } from 'react';
import { Upload, User, Shirt, Sparkles, AlertCircle, Sliders, Image as ImageIcon, RotateCcw, CheckCircle2, ArrowRight } from 'lucide-react';
import { ImagePreview } from './ImagePreview';
import { ResultView } from './ResultView';

const SAMPLE_PERSON = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=768&q=80";
const SAMPLE_GARMENT = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=768&q=80";

export const UploadPanel = ({
  personImage,
  setPersonImage,
  garmentImage,
  setGarmentImage,
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
  resultData = null,
  onReset = null,
}) => {
  const personInputRef = useRef(null);
  const garmentInputRef = useRef(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const validateAndProcessFile = (file, setImage) => {
    setValidationError(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setValidationError('Invalid file format. Please upload a JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setValidationError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 10 MB limit.`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImage({ file, previewUrl, name: file.name });
  };

  const handleFileSelect = (e, setImage) => {
    const file = e.target.files[0];
    validateAndProcessFile(file, setImage);
  };

  const handleDrop = (e, setImage) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    validateAndProcessFile(file, setImage);
  };

  const loadPresetSample = (type) => {
    if (type === 'person') {
      setPersonImage({ file: null, previewUrl: SAMPLE_PERSON, name: 'Sample_Person.jpg' });
    } else {
      setGarmentImage({ file: null, previewUrl: SAMPLE_GARMENT, name: 'Sample_Garment.jpg' });
      setDescription('Casual Cotton White T-Shirt');
    }
  };

  const isReady = personImage && garmentImage && !isLoading;

  return (
    <div className="w-full space-y-6">
      {/* Error & Retry Alert Banner */}
      {(error || validationError) && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-wrap items-center justify-between gap-3 text-rose-300 animate-fade-in">
          <div className="flex items-start space-x-3 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Unable to Process Virtual Try-On</p>
              <p className="text-rose-400/90 mt-0.5 font-sans">{validationError || error}</p>
            </div>
          </div>
          {onRetry && error && (
            <button
              onClick={onRetry}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          )}
        </div>
      )}

      {/* 3-Section Studio Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ==================== LEFT SECTION: Upload Cards (col-span-3) ==================== */}
        <div className="lg:col-span-3 space-y-5">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl tracking-wider text-white">INPUT ASSETS</h2>
            <span className="text-[11px] font-sans text-violet-400 uppercase tracking-widest font-semibold">
              Step 1 of 2
            </span>
          </div>

          {/* 1. Person Upload Card */}
          <div className="bg-[#18181B] p-4 rounded-xl border border-violet-500/20 hover:border-violet-500/40 transition-all space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 text-white font-medium text-xs">
                <div className="w-5 h-5 rounded-md bg-violet-500/20 flex items-center justify-center text-violet-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span>Person Photograph</span>
              </div>
              {!personImage && (
                <button
                  type="button"
                  onClick={() => loadPresetSample('person')}
                  className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold flex items-center space-x-1 transition-colors"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Use Sample</span>
                </button>
              )}
            </div>

            {personImage ? (
              <ImagePreview
                imageSrc={personImage.previewUrl}
                onRemove={() => setPersonImage(null)}
                title={personImage.name || 'Person Photograph'}
              />
            ) : (
              <div
                onClick={() => personInputRef.current.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, setPersonImage)}
                className="upload-dropzone rounded-xl p-6 flex flex-col items-center justify-center space-y-2.5 cursor-pointer text-center group"
              >
                <input
                  ref={personInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, setPersonImage)}
                />
                <div className="w-10 h-10 rounded-xl bg-[#120E24] border border-violet-500/20 text-violet-400 flex items-center justify-center group-hover:scale-110 group-hover:border-violet-500/50 transition-all shadow-inner">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Upload Person Photo</p>
                  <p className="text-[11px] text-[#A1A1AA] mt-0.5">Drag & drop or browse</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#120E24] text-violet-300 border border-violet-500/20 font-mono">
                  JPG, PNG &lt; 10MB
                </span>
              </div>
            )}
          </div>

          {/* 2. Garment Upload Card */}
          <div className="bg-[#18181B] p-4 rounded-xl border border-violet-500/20 hover:border-violet-500/40 transition-all space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2 text-white font-medium text-xs">
                <div className="w-5 h-5 rounded-md bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <Shirt className="w-3.5 h-3.5" />
                </div>
                <span>Garment Photograph</span>
              </div>
              {!garmentImage && (
                <button
                  type="button"
                  onClick={() => loadPresetSample('garment')}
                  className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold flex items-center space-x-1 transition-colors"
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Use Sample</span>
                </button>
              )}
            </div>

            {garmentImage ? (
              <ImagePreview
                imageSrc={garmentImage.previewUrl}
                onRemove={() => setGarmentImage(null)}
                title={garmentImage.name || 'Garment Photograph'}
              />
            ) : (
              <div
                onClick={() => garmentInputRef.current.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, setGarmentImage)}
                className="upload-dropzone rounded-xl p-6 flex flex-col items-center justify-center space-y-2.5 cursor-pointer text-center group"
              >
                <input
                  ref={garmentInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, setGarmentImage)}
                />
                <div className="w-10 h-10 rounded-xl bg-[#120E24] border border-violet-500/20 text-violet-400 flex items-center justify-center group-hover:scale-110 group-hover:border-violet-500/50 transition-all shadow-inner">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Upload Garment Photo</p>
                  <p className="text-[11px] text-[#A1A1AA] mt-0.5">Flat lay or model crop</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#120E24] text-violet-300 border border-violet-500/20 font-mono">
                  JPG, PNG &lt; 10MB
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ==================== CENTER SECTION: Large Result Canvas (col-span-6) ==================== */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl tracking-wider text-white">STUDIO CANVAS</h2>
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  resultData ? 'bg-emerald-400' : isReady ? 'bg-violet-400' : 'bg-zinc-600'
                }`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  resultData ? 'bg-emerald-500' : isReady ? 'bg-violet-500' : 'bg-zinc-600'
                }`} />
              </span>
              <span className="text-[11px] font-mono text-[#A1A1AA]">
                {resultData ? 'Synthesized' : isReady ? 'Assets Ready' : 'Awaiting Assets'}
              </span>
            </div>
          </div>

          {resultData ? (
            <ResultView
              originalPerson={personImage?.previewUrl}
              garmentPerson={garmentImage?.previewUrl}
              resultImage={resultData.result}
              maskedImage={resultData.masked}
              onReset={onReset}
              isMockMode={false}
              executionTime={resultData.executionTime}
            />
          ) : (
            /* Studio Canvas Placeholder Stage */
            <div className="bg-[#18181B] rounded-2xl border border-violet-500/20 p-8 flex flex-col items-center justify-center text-center min-h-[520px] relative overflow-hidden group">
              {/* Subtle ambient violet radial glow */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(139,92,246,0.12),transparent_70%)] pointer-events-none" />

              {/* Decorative Studio Grid Outline */}
              <div className="w-full max-w-md aspect-[3/4] max-h-[380px] rounded-2xl border border-dashed border-violet-500/25 bg-[#120E24]/60 flex flex-col items-center justify-center p-6 space-y-4 relative shadow-2xl">
                {personImage && garmentImage ? (
                  <div className="space-y-4 animate-fade-in w-full">
                    <div className="flex items-center justify-center space-x-4">
                      <div className="w-20 h-24 rounded-lg overflow-hidden border border-violet-500/30 bg-black">
                        <img src={personImage.previewUrl} alt="Person" className="w-full h-full object-cover" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-violet-400 animate-pulse" />
                      <div className="w-20 h-24 rounded-lg overflow-hidden border border-purple-500/30 bg-black">
                        <img src={garmentImage.previewUrl} alt="Garment" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="font-display text-2xl tracking-wider text-white">ASSETS STAGED & READY</p>
                      <p className="text-xs text-[#A1A1AA]">Click "Generate Virtual Try-On" in the right panel to run inference.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600/30 to-purple-600/20 border border-violet-500/30 flex items-center justify-center mx-auto shadow-lg shadow-violet-950/50">
                      <Sparkles className="w-8 h-8 text-violet-400" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-display text-2xl tracking-wider text-white">VIRTUAL TRY-ON CANVAS</h3>
                      <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto leading-relaxed">
                        Upload a person photograph and a clothing item to synthesize a photorealistic virtual fitting.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick sample trigger */}
              {(!personImage || !garmentImage) && (
                <div className="pt-6 z-10">
                  <button
                    type="button"
                    onClick={() => {
                      loadPresetSample('person');
                      loadPresetSample('garment');
                    }}
                    className="text-xs text-violet-300 hover:text-white font-semibold px-4 py-2 rounded-lg bg-[#120E24] border border-violet-500/25 hover:border-violet-500/50 transition-all flex items-center space-x-2 shadow-sm"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-violet-400" />
                    <span>Load Editorial Sample Photos</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ==================== RIGHT SECTION: Settings & Generate CTA (col-span-3) ==================== */}
        <div className="lg:col-span-3 space-y-5">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl tracking-wider text-white">STUDIO CONTROLS</h2>
            <span className="text-[11px] font-sans text-violet-400 uppercase tracking-widest font-semibold">
              Step 2 of 2
            </span>
          </div>

          <div className="bg-[#18181B] p-5 rounded-xl border border-violet-500/20 space-y-5">
            {/* Clothing Category Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-white/90 uppercase tracking-wider">
                Clothing Category
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'upper_body', label: 'Upper' },
                  { id: 'lower_body', label: 'Lower' },
                  { id: 'dresses', label: 'Dress' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all ${
                      category === cat.id
                        ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-600/30'
                        : 'bg-[#120E24] text-[#A1A1AA] border-violet-500/15 hover:text-white hover:border-violet-500/30'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Garment Prompt / Description */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-white/90 uppercase tracking-wider">
                Garment Prompt
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Short Sleeve Round Neck T-Shirt"
                className="w-full bg-[#120E24] border border-violet-500/20 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
              />
              <p className="text-[11px] text-[#A1A1AA]">Guides texture and fold synthesis.</p>
            </div>

            {/* Advanced Settings Accordion */}
            <div className="pt-3 border-t border-violet-500/15">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-medium text-violet-400 hover:text-violet-300 flex items-center justify-between w-full focus:outline-none"
              >
                <span className="flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Advanced Parameters</span>
                </span>
                <span className="text-[10px] text-zinc-500">{showAdvanced ? '▲ Hide' : '▼ Show'}</span>
              </button>

              {showAdvanced && (
                <div className="pt-3 space-y-3 animate-fade-in text-xs">
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-[#A1A1AA]">Denoise Steps:</span>
                      <span className="text-violet-400 font-mono font-bold">{denoiseSteps}</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="40"
                      value={denoiseSteps}
                      onChange={(e) => setDenoiseSteps(parseInt(e.target.value))}
                      className="w-full accent-violet-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-zinc-500">20–40 diffusion iterations</span>
                  </div>

                  <div>
                    <label className="block text-[#A1A1AA] mb-1">Random Seed</label>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(parseInt(e.target.value) || 42)}
                      className="w-full bg-[#120E24] border border-violet-500/20 rounded-lg px-2.5 py-1 text-xs text-white focus:border-violet-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      id="auto-crop"
                      type="checkbox"
                      checked={autoCrop}
                      onChange={(e) => setAutoCrop(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500 bg-[#120E24] border-violet-500/25"
                    />
                    <label htmlFor="auto-crop" className="text-xs text-[#A1A1AA] cursor-pointer">
                      Auto-crop person to 3:4 ratio
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Generate CTA Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onGenerate}
                disabled={!isReady}
                className={`w-full py-4 px-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  isReady
                    ? 'btn-violet-glow text-white shadow-lg active:scale-[0.99]'
                    : 'bg-[#202025] text-zinc-600 border border-zinc-800 cursor-not-allowed opacity-60'
                }`}
              >
                <Sparkles className="w-5 h-5 text-violet-200" />
                <span className="font-display text-xl tracking-wider uppercase">
                  {isLoading ? 'GENERATING TRY-ON...' : 'GENERATE VIRTUAL TRY-ON'}
                </span>
              </button>

              {!isReady && (
                <p className="text-[11px] text-zinc-500 text-center mt-2">
                  Upload both photos to activate generation.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
