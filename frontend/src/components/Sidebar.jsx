import React from 'react';
import {
  Sparkles,
  Compass,
  Shirt,
  LayoutGrid,
  ArrowLeftRight,
  BookmarkCheck,
  BarChart2,
  Settings,
  Circle,
  Menu,
  X
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'studio',      label: 'Studio Atelier',  icon: Sparkles },
  { id: 'stylist',     label: 'AI Stylist',       icon: Compass },
  { id: 'wardrobe',    label: 'My Wardrobe',      icon: Shirt },
  { id: 'outfits',     label: 'Outfit Studio',    icon: LayoutGrid },
  { id: 'comparison',  label: 'Comparison Lab',   icon: ArrowLeftRight },
  { id: 'insights',    label: 'Style Insights',   icon: BarChart2 },
  { id: 'saved_looks', label: 'Saved Looks',      icon: BookmarkCheck },
];

export const Sidebar = ({
  activeSection,
  setActiveSection,
  backendHealth,
  userProfile,
  onOpenSettings,
  isOpenOnMobile = false,
  onCloseMobile,
}) => {
  const isOnline = backendHealth?.status === 'online';
  const isReplicateConfigured = backendHealth?.replicate_configured;

  const handleSelect = (id) => {
    setActiveSection(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenOnMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      {/* Main Sidebar Panel */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-[178px] flex-shrink-0 flex flex-col bg-[#0C0C0F] border-r border-[#27272A] select-none transition-transform duration-200 ease-in-out ${
          isOpenOnMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* BRANDING HEADER */}
        <div className="h-11 flex-shrink-0 border-b border-[#27272A] px-3.5 flex items-center justify-between bg-[#0F0F13]">
          <div
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={() => handleSelect('studio')}
          >
            <div className="w-5 h-5 rounded bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Shirt className="w-3 h-3" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-base tracking-wider text-white leading-none">
                STYLEBLEND
              </span>
              <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase -mt-0.5">
                ATELIER
              </span>
            </div>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={onCloseMobile}
            className="p-1 rounded text-zinc-400 hover:text-white lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* NAVIGATION ITEMS (Exact required order) */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          <div className="px-2 pb-1.5 text-[9px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
            Workspace
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full h-8 px-2.5 rounded flex items-center space-x-2.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-300 font-semibold border-l-2 border-violet-500 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    isActive ? 'text-violet-400' : 'text-zinc-500'
                  }`}
                />
                <span className="truncate tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ANCHORED BOTTOM: BACKEND TELEMETRY & PROFILE */}
        <div className="mt-auto flex-shrink-0 border-t border-[#27272A] bg-[#0E0E12] p-2 space-y-2">
          
          {/* Honest Backend & Inference Status */}
          <div className="p-1.5 rounded bg-[#141418] border border-zinc-800/80 space-y-1 text-[10px] font-mono">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">FASTAPI:</span>
              <span className="flex items-center space-x-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'bg-rose-500'
                  }`}
                />
                <span className={isOnline ? 'text-emerald-400' : 'text-rose-400'}>
                  {isOnline ? '8000 OK' : 'Offline'}
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-500">IDM-VTON:</span>
              <span className={isReplicateConfigured ? 'text-violet-400' : 'text-zinc-500'}>
                {isReplicateConfigured ? 'Cloud GPU' : 'No Token'}
              </span>
            </div>
          </div>

          {/* User Profile & Preferences Trigger */}
          <div className="flex items-center justify-between pt-1">
            <div
              onClick={onOpenSettings}
              className="flex items-center space-x-2 min-w-0 cursor-pointer group"
              title="Click to edit profile & atelier preferences"
            >
              <div className="w-6 h-6 rounded bg-violet-950 border border-violet-500/40 text-violet-300 font-bold text-[10px] flex items-center justify-center flex-shrink-0 group-hover:border-violet-400 transition-colors">
                {userProfile?.avatarInitials || 'AS'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                  {userProfile?.userName || 'Atelier User'}
                </p>
                <p className="text-[9px] text-zinc-500 truncate -mt-0.5">
                  {userProfile?.userRole || 'Designer'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              title="Atelier Preferences"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </aside>
    </>
  );
};
