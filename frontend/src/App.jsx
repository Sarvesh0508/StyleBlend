import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LeftPanel } from './components/LeftPanel';
import { CenterCanvas } from './components/CenterCanvas';
import { RightPanel } from './components/RightPanel';
import { StylistView } from './components/views/StylistView';
import { WardrobeView } from './components/views/WardrobeView';
import { OutfitStudioView } from './components/views/OutfitStudioView';
import { ComparisonLabView } from './components/views/ComparisonLabView';
import { SavedLooksView } from './components/views/SavedLooksView';
import { ProfileModal } from './components/ProfileModal';
import { AboutModal } from './components/AboutModal';
import { WardrobeModal, getSavedWardrobe } from './components/WardrobeModal';
import { LoadingOverlay } from './components/LoadingOverlay';
import { StyleInsightsView } from './components/views/StyleInsightsView';
import { checkHealth, generateVirtualTryOn, saveLookToBackend, customizeResult } from './services/api';
import {
  cloneDefaultCustomization,
  buildCustomizationPayload,
  countActiveCustomizations,
} from './services/customization';
import { getUserPreferences, saveLookToStorage } from './services/storage';

const API_HOST = 'http://localhost:8000';

export default function App() {
  // Navigation & Modal State
  const [activeSection, setActiveSection] = useState('studio');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);

  // User Profile
  const [userProfile, setUserProfile] = useState(getUserPreferences());

  // Virtual Try-on Atelier State
  const [personImage, setPersonImage] = useState(null);
  const [garmentImage, setGarmentImage] = useState(null);
  const [category, setCategory] = useState(userProfile?.defaultCategory || 'upper_body');
  const [description, setDescription] = useState('Short Sleeve Round Neck T-shirt');
  const [autoCrop, setAutoCrop] = useState(Boolean(userProfile?.autoCropDefault));
  const [denoiseSteps, setDenoiseSteps] = useState(userProfile?.defaultDenoiseSteps || 30);
  const [seed, setSeed] = useState(42);

  // Customization (colour / fit / size / length / profile / finishing)
  const [customization, setCustomization] = useState(cloneDefaultCustomization());
  const [customStatus, setCustomStatus] = useState({
    updating: false, applied: [], warnings: [], summary: [], effective: null, error: null,
  });
  const lastCustomKeyRef = useRef('');

  const [isLoading, setIsLoading] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [error, setError] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [wardrobeCount, setWardrobeCount] = useState(0);

  // Anti-stale request guard
  const latestRequestIdRef = useRef(0);

  const updateWardrobeCount = () => {
    const list = getSavedWardrobe();
    setWardrobeCount(list.length);
  };

  const fetchHealthStatus = async () => {
    const health = await checkHealth();
    setBackendHealth(health);
  };

  useEffect(() => {
    fetchHealthStatus();
    updateWardrobeCount();
    const interval = setInterval(fetchHealthStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const garmentSize = garmentImage ? (garmentImage.sizeLabel || 'M') : null;

  const getCustomizationPayload = (cat = category) =>
    buildCustomizationPayload(customization, {
      garmentSize,
      prefs: userProfile,
      category: cat,
    });

  const getFileFromImageState = async (imageState, defaultName) => {
    if (imageState.file) {
      return imageState.file;
    }
    // Fetch blob for local/preset samples
    try {
      const response = await fetch(imageState.previewUrl);
      if (!response.ok) throw new Error(`Asset fetch error (HTTP ${response.status})`);
      const blob = await response.blob();
      return new File([blob], defaultName, { type: blob.type || 'image/jpeg' });
    } catch (err) {
      throw new Error(
        'Could not package image asset for upload. Please upload an image directly.'
      );
    }
  };

  const handleGenerate = async () => {
    if (!personImage || !garmentImage) {
      setError('Please provide both a person photograph and a garment photograph.');
      return;
    }

    // Increment request ID so previous slow responses are invalidated
    const currentRequestId = ++latestRequestIdRef.current;

    // Clear previous error and ensure old result is NOT presented as new
    setError(null);
    setResultData(null);
    setIsLoading(true);

    try {
      const personFile = await getFileFromImageState(personImage, 'person_upload.jpg');
      const garmentFile = await getFileFromImageState(garmentImage, 'garment_upload.jpg');

      const formData = new FormData();
      formData.append('person_image', personFile);
      formData.append('garment_image', garmentFile);
      formData.append('category', category);
      formData.append('garment_description', description);
      formData.append('auto_crop', autoCrop);
      formData.append('denoise_steps', denoiseSteps);
      formData.append('seed', seed);
      const customPayload = getCustomizationPayload(category);
      formData.append('customization', JSON.stringify(customPayload));

      const response = await generateVirtualTryOn(formData);

      // Guard against stale response
      if (currentRequestId !== latestRequestIdRef.current) {
        return;
      }

      if (response && response.status === 'success') {
        const fullResultUrl = response.result_url.startsWith('http')
          ? response.result_url
          : `${API_HOST}${response.result_url}`;
          
        const fullMaskedUrl = response.masked_url.startsWith('http')
          ? response.masked_url
          : `${API_HOST}${response.masked_url}`;

        lastCustomKeyRef.current = `${response.job_id}|${category}|${JSON.stringify(customPayload)}`;
        setCustomStatus({
          updating: false,
          applied: response.applied || [],
          warnings: response.warnings || [],
          summary: [],
          effective: null,
          error: null,
        });
        setResultData({
          result: fullResultUrl,
          masked: fullMaskedUrl,
          jobId: response.job_id,
          jobCategory: category,
          maskAvailable: Boolean(response.mask_available),
          mode: response.mode,
          message: response.message,
          executionTime: response.execution_time_seconds ?? null
        });
      } else {
        throw new Error(response.message || 'Generation failed.');
      }
    } catch (err) {
      if (currentRequestId === latestRequestIdRef.current) {
        console.error('Try-on error:', err);
        setError(err.message || 'An error occurred during virtual try-on processing.');
      }
    } finally {
      if (currentRequestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  // LIVE CUSTOMIZATION: re-style the existing result on the server (no GPU re-run)
  useEffect(() => {
    if (!resultData?.jobId) return undefined;

    const jobId = resultData.jobId;
    const jobCategory = resultData.jobCategory || 'upper_body';
    const payload = getCustomizationPayload(jobCategory);
    const key = `${jobId}|${jobCategory}|${JSON.stringify(payload)}`;
    if (key === lastCustomKeyRef.current) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCustomStatus((prev) => ({ ...prev, updating: true, error: null }));
      try {
        const res = await customizeResult(
          { job_id: jobId, category: jobCategory, customization: payload },
          controller.signal
        );
        lastCustomKeyRef.current = key;
        const url = res.result_url.startsWith('http') ? res.result_url : `${API_HOST}${res.result_url}`;
        setResultData((prev) => (prev && prev.jobId === res.job_id ? { ...prev, result: url } : prev));
        setCustomStatus({
          updating: false,
          applied: res.applied || [],
          warnings: res.warnings || [],
          summary: res.summary || [],
          effective: res.effective || null,
          error: null,
        });
      } catch (err) {
        if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') return;
        setCustomStatus((prev) => ({ ...prev, updating: false, error: err.message }));
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customization, garmentSize, userProfile, resultData?.jobId]);

  const handleResetCustomization = () => setCustomization(cloneDefaultCustomization());

  const handleDownload = async () => {
    if (!resultData?.result) return;
    setIsDownloading(true);

    try {
      const response = await fetch(resultData.result);
      if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
      const blob = await response.blob();
      
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `styleblend_tryon_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download error:', err);
      setError('Could not download image directly. Try right-clicking the canvas image and selecting "Save Image As".');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveLook = async () => {
    if (!resultData?.result) return false;
    try {
      let backendRecord = null;
      try {
        backendRecord = await saveLookToBackend({
          result_url: resultData.result,
          original_person: personImage?.previewUrl || null,
          garment_person: garmentImage?.previewUrl || null,
          category,
          description,
          execution_time: resultData.executionTime,
          mode: resultData.mode,
        });
      } catch (backendErr) {
        console.warn('Backend persistent save failed, saving locally:', backendErr.message);
      }

      const persistentResultUrl = backendRecord?.result_url
        ? (backendRecord.result_url.startsWith('http') ? backendRecord.result_url : `${API_HOST}${backendRecord.result_url}`)
        : resultData.result;

      const persistentPersonUrl = backendRecord?.original_person
        ? (backendRecord.original_person.startsWith('http') ? backendRecord.original_person : `${API_HOST}${backendRecord.original_person}`)
        : personImage?.previewUrl;

      const persistentGarmentUrl = backendRecord?.garment_person
        ? (backendRecord.garment_person.startsWith('http') ? backendRecord.garment_person : `${API_HOST}${backendRecord.garment_person}`)
        : garmentImage?.previewUrl;

      const saved = saveLookToStorage({
        id: backendRecord?.id,
        resultImage: persistentResultUrl,
        originalPerson: persistentPersonUrl,
        garmentPerson: persistentGarmentUrl,
        category,
        description,
        executionTime: resultData.executionTime,
        mode: resultData.mode,
      });

      if (saved) updateWardrobeCount();
      return true;
    } catch (err) {
      console.error('Error saving look:', err);
      return false;
    }
  };

  const handleLoadSavedLook = (look) => {
    if (look.originalPerson) {
      setPersonImage({
        file: null,
        previewUrl: look.originalPerson,
        name: 'staged_saved_subject.jpg',
      });
    }
    if (look.garmentPerson) {
      setGarmentImage({
        file: null,
        previewUrl: look.garmentPerson,
        name: 'staged_saved_garment.jpg',
      });
    }
    if (look.category) {
      setCategory(look.category);
    }
    if (look.description) {
      setDescription(look.description);
    }
    if (look.resultImage) {
      setResultData({
        result: look.resultImage,
        masked: look.resultImage,
        mode: 'wardrobe_recall',
        message: 'Loaded from Studio Wardrobe',
        executionTime: look.executionTime ?? null,
      });
    }
    setActiveSection('studio');
  };

  // Cross-view bridge: Select garment from Wardrobe, Stylist, or Outfit Studio into Studio Atelier
  const handleSelectGarmentFromOtherView = (garment) => {
    if (!garment) return;
    setGarmentImage({
      file: null,
      previewUrl: garment.imageUrl,
      name: `${garment.name || 'garment'}.jpg`,
      sizeLabel: (garment.size || 'M').toString().toUpperCase(),
    });
    if (garment.category) {
      setCategory(garment.category);
    }
    if (garment.notes || garment.name) {
      setDescription(garment.notes || garment.name);
    }
    setActiveSection('studio');
  };

  const handleSelectGarmentForOutfitStudio = (garment) => {
    setActiveSection('outfits');
  };

  const handlePreferencesUpdated = (newPrefs) => {
    setUserProfile(newPrefs);
    if (newPrefs.defaultDenoiseSteps) {
      setDenoiseSteps(newPrefs.defaultDenoiseSteps);
    }
    if (newPrefs.defaultCategory) {
      setCategory(newPrefs.defaultCategory);
    }
    if (newPrefs.autoCropDefault !== undefined) {
      setAutoCrop(newPrefs.autoCropDefault);
    }
  };

  const handleReset = () => {
    setResultData(null);
    setError(null);
  };

  // Honest state calculation for top toolbar
  const statusState = isLoading
    ? 'generating'
    : error
    ? 'error'
    : resultData
    ? 'active_result'
    : 'empty';

  const hasAssets = Boolean(personImage && garmentImage);
  const hasResult = Boolean(resultData?.result);

  return (
    <div className="h-screen w-screen bg-[#09090B] text-white flex flex-row overflow-hidden select-none">
      
      {/* 1. LEFT NAVIGATION SIDEBAR (Desktop ~178px fixed, Mobile drawer) */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        backendHealth={backendHealth}
        userProfile={userProfile}
        onOpenSettings={() => setIsProfileOpen(true)}
        isOpenOnMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden bg-[#09090B]">
        {/* Top Toolbar */}
        <Navbar
          backendHealth={backendHealth}
          statusState={statusState}
          hasResult={hasResult}
          onDownload={handleDownload}
          onOpenAbout={() => setIsAboutOpen(true)}
          isDownloading={isDownloading}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        />

        {/* View Switcher Container */}
        <div className="flex-1 min-h-0 overflow-hidden relative bg-[#09090B]">
          
          {/* VIEW 1: STUDIO ATELIER (Preserved 3-column workspace) */}
          {activeSection === 'studio' && (
            <div className="h-full w-full p-2 flex flex-col lg:flex-row gap-2 overflow-hidden bg-[#09090B]">
              {/* Left Column: Person & Garment Assets (~260px) */}
              <LeftPanel
                personImage={personImage}
                setPersonImage={setPersonImage}
                garmentImage={garmentImage}
                setGarmentImage={setGarmentImage}
                category={category}
                onValidationError={(msg) => setError(msg)}
                onOpenWardrobe={() => setIsWardrobeOpen(true)}
                wardrobeCount={wardrobeCount}
              />

              {/* Center Column: Try-On Canvas (Flexible width, ~1fr) */}
              <CenterCanvas
                originalPerson={personImage?.previewUrl}
                garmentPerson={garmentImage?.previewUrl}
                resultData={resultData}
                onResetResult={handleReset}
              />

              {/* Right Column: Settings Inspector (~270px) */}
              <RightPanel
                category={category}
                setCategory={setCategory}
                description={description}
                setDescription={setDescription}
                autoCrop={autoCrop}
                setAutoCrop={setAutoCrop}
                denoiseSteps={denoiseSteps}
                setDenoiseSteps={setDenoiseSteps}
                seed={seed}
                setSeed={setSeed}
                onGenerate={handleGenerate}
                isLoading={isLoading}
                error={error}
                onRetry={handleGenerate}
                hasAssets={hasAssets}
                hasResult={hasResult}
                onDownload={handleDownload}
                onSaveLook={handleSaveLook}
                garmentImage={garmentImage}
                setGarmentImage={setGarmentImage}
                backendHealth={backendHealth}
                customization={customization}
                setCustomization={setCustomization}
                customStatus={customStatus}
                onResetCustomization={handleResetCustomization}
                canCustomizeResult={Boolean(resultData?.jobId)}
                userProfile={userProfile}
                activeCustomizations={countActiveCustomizations(customization, garmentSize)}
              />
            </div>
          )}

          {/* VIEW 2: AI STYLIST */}
          {activeSection === 'stylist' && (
            <StylistView
              onSelectGarmentForTryOn={handleSelectGarmentFromOtherView}
            />
          )}

          {/* VIEW 3: MY WARDROBE */}
          {activeSection === 'wardrobe' && (
            <WardrobeView
              onSelectGarmentForTryOn={handleSelectGarmentFromOtherView}
              onNavigateToOutfitStudio={handleSelectGarmentForOutfitStudio}
              onOpenProfile={() => setIsProfileOpen(true)}
            />
          )}

          {/* VIEW 4: OUTFIT STUDIO */}
          {activeSection === 'outfits' && (
            <OutfitStudioView
              onSelectGarmentForTryOn={handleSelectGarmentFromOtherView}
            />
          )}

          {/* VIEW 5: COMPARISON LAB */}
          {activeSection === 'comparison' && (
            <ComparisonLabView
              currentSubject={personImage?.previewUrl}
              currentGarment={garmentImage?.previewUrl}
              currentResult={resultData?.result}
            />
          )}

          {/* VIEW 6: SAVED LOOKS */}
          {activeSection === 'saved_looks' && (
            <SavedLooksView
              onLoadLookIntoStudio={handleLoadSavedLook}
              onCompareLook={() => setActiveSection('comparison')}
            />
          )}

          {/* VIEW 7: STYLE INSIGHTS */}
          {activeSection === 'insights' && (
            <StyleInsightsView />
          )}

        </div>

        {/* Compact Bottom Atelier Status Bar */}
        <footer className="h-6 flex-shrink-0 bg-[#0C0C0F] border-t border-[#27272A] px-3 flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 font-semibold">STYLEBLEND ATELIER</span>
            <span className="text-zinc-700">|</span>
            <span>cuuupid/idm-vton · Replicate GPU</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline">
              FastAPI: <strong className={backendHealth?.status === 'online' ? 'text-emerald-400 font-normal' : 'text-rose-400 font-normal'}>
                {backendHealth?.status === 'online' ? '127.0.0.1:8000' : 'Offline'}
              </strong>
            </span>
            <span className="text-zinc-700 hidden sm:inline">|</span>
            <button
              onClick={() => setIsAboutOpen(true)}
              className="hover:text-zinc-300 transition-colors"
            >
              Docs &amp; Architecture
            </button>
          </div>
        </footer>
      </div>

      {/* Loading Modal during GPU inference */}
      {isLoading && (
        <LoadingOverlay message="Executing IDM-VTON neural diffusion on Replicate Cloud GPU. Synthesizing texture, folds, and body posture..." />
      )}

      {/* About & Technical Specifications Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Quick Studio Wardrobe Modal */}
      <WardrobeModal
        isOpen={isWardrobeOpen}
        onClose={() => {
          setIsWardrobeOpen(false);
          updateWardrobeCount();
        }}
        onLoadLook={handleLoadSavedLook}
      />

      {/* Atelier Profile & Preferences Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        backendHealth={backendHealth}
        onPreferencesUpdated={handlePreferencesUpdated}
      />

    </div>
  );
}
