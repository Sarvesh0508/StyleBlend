import React from 'react';
import { X, RefreshCw } from 'lucide-react';

export const ImagePreview = ({ imageSrc, onRemove, title, aspect = 'aspect-[3/4]' }) => {
  if (!imageSrc) return null;

  return (
    <div className="relative group rounded-xl overflow-hidden bg-[#18181B] border border-violet-500/25 shadow-lg transition-all hover:border-violet-500/50">
      <div className={`w-full ${aspect} relative bg-[#120E24] overflow-hidden flex items-center justify-center`}>
        <img
          src={imageSrc}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B]/90 via-[#09090B]/20 to-transparent opacity-70 group-hover:opacity-40 transition-opacity" />
      </div>

      {/* Top Remove Action */}
      <div className="absolute top-2.5 right-2.5 flex items-center space-x-1.5 z-10">
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg bg-[#09090B]/85 hover:bg-rose-600 text-white/80 hover:text-white transition-all border border-violet-500/20 shadow-md"
          title="Remove image"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Bar: Title & Change Action */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-between items-center px-3 py-1.5 rounded-lg bg-[#09090B]/85 border border-violet-500/25 backdrop-blur-sm z-10">
        <span className="text-xs font-medium text-white truncate max-w-[170px]">{title}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-xs text-violet-300 hover:text-white flex items-center space-x-1 font-semibold ml-2 transition-colors shrink-0"
        >
          <RefreshCw className="w-3 h-3 text-violet-400" />
          <span>Replace</span>
        </button>
      </div>
    </div>
  );
};
