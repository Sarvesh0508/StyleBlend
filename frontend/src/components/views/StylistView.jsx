import React, { useState, useEffect } from 'react';
import {
  Compass,
  Sparkles,
  Shirt,
  ArrowRight,
  Sliders,
  Check,
  Palette,
  Calendar,
  Layers,
  Info,
  DollarSign,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getWardrobeItems, seedDefaultWardrobe, getUserPreferences } from '../../services/storage';
import { fetchWardrobe } from '../../services/api';

const OCCASIONS = ['Casual', 'Streetwear', 'Formal', 'Date Night', 'Business Casual', 'Party'];
const STYLES = ['Minimalist', 'Streetwear', 'Classic', 'Avant-Garde', 'Athleisure', 'Vintage'];
const COLORS = ['Monochrome', 'Black', 'White', 'Earth Tones', 'Vibrant', 'Pastel'];
const CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'upper_body', label: 'Upper-body' },
  { id: 'lower_body', label: 'Lower-body' },
  { id: 'dresses', label: 'Dresses' },
];
const BUDGETS = ['Budget (< $40)', 'Contemporary ($40–$150)', 'Luxury (> $150)'];

export const StylistView = ({ onSelectGarmentForTryOn }) => {
  const [selectedOccasion, setSelectedOccasion] = useState('Streetwear');
  const [selectedStyle, setSelectedStyle] = useState('Streetwear');
  const [selectedColor, setSelectedColor] = useState('Black');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBudget, setSelectedBudget] = useState('Contemporary ($40–$150)');
  const [wardrobe, setWardrobe] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [expandedReasons, setExpandedReasons] = useState({});

  useEffect(() => {
    const loadWardrobeData = async () => {
      const backendItems = await fetchWardrobe();
      if (backendItems && backendItems.length > 0) {
        setWardrobe(backendItems);
      } else {
        const local = getWardrobeItems();
        setWardrobe(local);
      }
    };
    loadWardrobeData();
  }, []);

  // Rule-based Deterministic Recommendation Engine (No LLM fabricated claims)
  useEffect(() => {
    if (!wardrobe || wardrobe.length === 0) {
      setRecommendations([]);
      return;
    }

    const prefs = getUserPreferences();
    const userPreferredSize = prefs?.preferredSizes || {};

    const scored = wardrobe
      .filter((item) => {
        if (selectedCategory === 'all') return true;
        return item.category === selectedCategory;
      })
      .map((item) => {
        let score = 50; // Base baseline
        const factorBreakdown = [];
        const bulletReasons = [];

        // 1. Style matching
        const itemStyle = (item.style || '').toLowerCase();
        const targetStyle = selectedStyle.toLowerCase();
        if (itemStyle === targetStyle) {
          score += 20;
          factorBreakdown.push({ label: 'Style Match', points: 20 });
          bulletReasons.push(`Direct aesthetic alignment with ${selectedStyle} design language.`);
        } else if ((item.notes || '').toLowerCase().includes(targetStyle)) {
          score += 10;
          factorBreakdown.push({ label: 'Style Trait', points: 10 });
          bulletReasons.push(`Fabric and styling notes reflect ${selectedStyle} elements.`);
        }

        // 2. Color harmony
        const itemColor = (item.color || '').toLowerCase();
        const targetColor = selectedColor.toLowerCase();
        if (itemColor === targetColor) {
          score += 15;
          factorBreakdown.push({ label: 'Color Match', points: 15 });
          bulletReasons.push(`Color profile matches selected ${selectedColor} palette.`);
        } else if (
          ['black', 'white', 'earth tones', 'monochrome'].includes(itemColor) ||
          ['black', 'white', 'monochrome'].includes(targetColor)
        ) {
          score += 10;
          factorBreakdown.push({ label: 'Neutral Harmony', points: 10 });
          bulletReasons.push(`Neutral palette (${item.color || 'Neutral'}) coordinates seamlessly with ${selectedColor}.`);
        }

        // 3. Occasion compatibility
        if (selectedOccasion === 'Streetwear') {
          if (item.category === 'upper_body' || itemStyle === 'streetwear') {
            score += 10;
            factorBreakdown.push({ label: 'Occasion Alignment', points: 10 });
            bulletReasons.push('Oversized/relaxed silhouette tailored for streetwear aesthetics.');
          }
        } else if (selectedOccasion === 'Formal' || selectedOccasion === 'Date Night') {
          if (item.category === 'dresses') {
            score += 15;
            factorBreakdown.push({ label: 'Occasion Cut', points: 15 });
            bulletReasons.push(`Structured silhouette well-suited for ${selectedOccasion} settings.`);
          } else if (item.category === 'lower_body') {
            score += 10;
            factorBreakdown.push({ label: 'Tailored Fit', points: 10 });
            bulletReasons.push(`Tailored trousers fit formal dressing codes.`);
          }
        } else if (selectedOccasion === 'Casual' || selectedOccasion === 'Business Casual') {
          score += 8;
          factorBreakdown.push({ label: 'Everyday Versatility', points: 8 });
          bulletReasons.push(`High day-to-day versatility suited for ${selectedOccasion}.`);
        }

        // 4. Budget alignment
        if (item.price !== undefined && item.price !== null) {
          const p = Number(item.price);
          if (selectedBudget.includes('Budget') && p <= 40) {
            score += 10;
            factorBreakdown.push({ label: 'Budget Fit', points: 10 });
            bulletReasons.push(`Price ($${p.toFixed(2)}) is within budget tier.`);
          } else if (selectedBudget.includes('Contemporary') && p > 40 && p <= 150) {
            score += 10;
            factorBreakdown.push({ label: 'Contemporary Tier', points: 10 });
            bulletReasons.push(`Price ($${p.toFixed(2)}) aligns with contemporary designer tier.`);
          } else if (selectedBudget.includes('Luxury') && p > 150) {
            score += 10;
            factorBreakdown.push({ label: 'Luxury Tier', points: 10 });
            bulletReasons.push(`Price ($${p.toFixed(2)}) aligns with premium/luxury curation.`);
          }
        }

        // 5. Preferred Size alignment
        const preferredForCat = userPreferredSize[item.category];
        if (preferredForCat && item.size && item.size.toUpperCase() === preferredForCat.toUpperCase()) {
          score += 5;
          factorBreakdown.push({ label: 'Preferred Size', points: 5 });
          bulletReasons.push(`Size ${item.size} matches your profile preferred size for ${item.category?.replace('_', ' ')}.`);
        }

        // Cap at 95% to avoid implying perfection/guaranteed fit
        const finalScore = Math.min(95, score);

        return {
          item,
          score: finalScore,
          factorBreakdown,
          reasons: bulletReasons.length > 0 ? bulletReasons : [`Versatile garment complementary to your ${selectedOccasion} aesthetic profile.`],
        };
      })
      .sort((a, b) => b.score - a.score);

    setRecommendations(scored);
  }, [wardrobe, selectedOccasion, selectedStyle, selectedColor, selectedCategory, selectedBudget]);

  const toggleExpand = (id) => {
    setExpandedReasons((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleResetStarter = () => {
    const seeded = seedDefaultWardrobe();
    setWardrobe(seeded);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090B] overflow-hidden select-none">
      {/* Header Bar */}
      <div className="h-11 flex-shrink-0 border-b border-[#27272A] bg-[#121215] px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs">
          <Compass className="w-4 h-4 text-violet-400" />
          <span className="font-bold text-white tracking-wider">AI STYLIST</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-400 font-mono text-[11px]">Algorithmic Wardrobe Curation</span>
        </div>
        <div className="text-[11px] font-mono text-zinc-500">
          Deterministic Rule-Based Curation Engine (No LLM)
        </div>
      </div>

      {/* Honest Disclosure Banner */}
      <div className="px-4 py-1.5 bg-[#121217] border-b border-[#1E1E24] flex items-center justify-between text-[11px] text-zinc-400 font-mono flex-shrink-0">
        <div className="flex items-center space-x-1.5">
          <Info className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
          <span>Curated using transparent rule scoring across style, color harmony, occasion, budget, and sizing preferences.</span>
        </div>
        <span className="text-[10px] text-zinc-500 hidden sm:inline">Scores capped at 95%</span>
      </div>

      {/* Main Stylist Content: 2 Columns */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden p-3 gap-3">
        
        {/* LEFT: Style Parameter Controls (approx 320px) */}
        <div className="w-full lg:w-[320px] flex-shrink-0 atelier-panel p-3.5 space-y-4 overflow-y-auto">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Sliders className="w-3.5 h-3.5 text-zinc-500" />
            <span>Style Profile Inputs</span>
          </div>

          {/* Occasion */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-zinc-500" />
              <span>Occasion</span>
            </label>
            <div className="grid grid-cols-2 gap-1">
              {OCCASIONS.map((occ) => (
                <button
                  key={occ}
                  type="button"
                  onClick={() => setSelectedOccasion(occ)}
                  className={`py-1 px-2 rounded text-xs font-medium text-left truncate transition-all ${
                    selectedOccasion === occ
                      ? 'btn-violet-accent font-semibold shadow-sm'
                      : 'bg-[#18181D] text-zinc-400 hover:text-white border border-[#27272A]'
                  }`}
                >
                  {occ}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Style */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-zinc-500" />
              <span>Aesthetic Style</span>
            </label>
            <div className="grid grid-cols-2 gap-1">
              {STYLES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStyle(st)}
                  className={`py-1 px-2 rounded text-xs font-medium text-left truncate transition-all ${
                    selectedStyle === st
                      ? 'btn-violet-accent font-semibold shadow-sm'
                      : 'bg-[#18181D] text-zinc-400 hover:text-white border border-[#27272A]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1">
              <Palette className="w-3 h-3 text-zinc-500" />
              <span>Color Harmony</span>
            </label>
            <div className="grid grid-cols-2 gap-1">
              {COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setSelectedColor(col)}
                  className={`py-1 px-2 rounded text-xs font-medium text-left truncate transition-all ${
                    selectedColor === col
                      ? 'btn-violet-accent font-semibold shadow-sm'
                      : 'bg-[#18181D] text-zinc-400 hover:text-white border border-[#27272A]'
                  }`}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1">
              <Layers className="w-3 h-3 text-zinc-500" />
              <span>Garment Category</span>
            </label>
            <div className="grid grid-cols-2 gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`py-1 px-2 rounded text-xs font-medium text-left truncate transition-all ${
                    selectedCategory === cat.id
                      ? 'btn-violet-accent font-semibold shadow-sm'
                      : 'bg-[#18181D] text-zinc-400 hover:text-white border border-[#27272A]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Tier */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1">
              <DollarSign className="w-3 h-3 text-zinc-500" />
              <span>Budget Tier</span>
            </label>
            <div className="space-y-1">
              {BUDGETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBudget(b)}
                  className={`w-full py-1 px-2 rounded text-xs font-medium text-left transition-all ${
                    selectedBudget === b
                      ? 'bg-zinc-800 text-white border border-violet-500/50 font-semibold'
                      : 'bg-[#18181D] text-zinc-400 hover:text-white border border-[#27272A]'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800 text-[10px] font-mono text-zinc-500">
            Evaluating {wardrobe.length} stored garments in wardrobe.
          </div>
        </div>

        {/* RIGHT: Curated Recommendations Results */}
        <div className="flex-1 atelier-panel p-4 flex flex-col min-h-0 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 flex-shrink-0">
            <div>
              <h3 className="font-display text-lg tracking-wider text-white">
                CURATED RECOMMENDATIONS ({recommendations.length})
              </h3>
              <p className="text-[11px] text-zinc-400">
                Ranked by deterministic aesthetic compatibility · {selectedOccasion} · {selectedStyle}
              </p>
            </div>

            {wardrobe.length === 0 && (
              <button
                type="button"
                onClick={handleResetStarter}
                className="px-2.5 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
              >
                Load Starter Wardrobe
              </button>
            )}
          </div>

          {/* Results Grid */}
          {recommendations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500">
                <Shirt className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-zinc-200">NO MATCHING WARDROBE GARMENTS</h4>
              <p className="text-[11px] text-zinc-500 max-w-sm leading-relaxed">
                Add garments to My Wardrobe matching these tags or click below to populate the starter wardrobe.
              </p>
              <button
                type="button"
                onClick={handleResetStarter}
                className="btn-violet-accent px-3 py-1.5 rounded text-xs font-semibold"
              >
                Seed Starter Wardrobe
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto flex-1">
              {recommendations.map(({ item, score, factorBreakdown, reasons }) => {
                const isExpanded = Boolean(expandedReasons[item.id]);
                const imageUrl = item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `http://localhost:8000${item.image_url}`) : (item.imageUrl || '/samples/garment_sample.jpg');

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded bg-[#18181D] border border-zinc-800 hover:border-violet-500/40 transition-all flex flex-col justify-between space-y-2.5 group"
                  >
                    <div className="space-y-2">
                      {/* Image Thumbnail Container */}
                      <div className="relative aspect-[3/4] max-h-48 rounded overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
                        <img
                          src={imageUrl}
                          alt={item.name}
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-violet-950/90 text-violet-300 font-mono text-[10px] font-bold border border-violet-500/40 shadow-sm">
                          {score}% FIT
                        </div>
                        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-zinc-300 uppercase">
                          {item.category?.replace('_', ' ')}
                        </div>
                      </div>

                      {/* Details */}
                      <div>
                        <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                        <div className="flex items-center space-x-1.5 text-[10px] text-zinc-400 font-mono mt-0.5">
                          <span>{item.color || 'Neutral'}</span>
                          <span>·</span>
                          <span>{item.style || selectedStyle}</span>
                          {item.size && (
                            <span className="ml-auto bg-zinc-800 px-1 rounded text-violet-400 border border-zinc-700">
                              {item.size}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Factor Breakdown Pills */}
                      <div className="flex flex-wrap gap-1">
                        {factorBreakdown.map((f, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
                          >
                            {f.label} +{f.points}
                          </span>
                        ))}
                      </div>

                      {/* Curatorial Explanation Accordion */}
                      <div className="bg-[#121215] p-2 rounded border border-zinc-800/80 text-[11px] space-y-1">
                        <div
                          onClick={() => toggleExpand(item.id)}
                          className="flex items-center justify-between cursor-pointer text-zinc-400 hover:text-white"
                        >
                          <span className="font-medium text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                            Why recommended ({reasons.length})
                          </span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </div>

                        {isExpanded ? (
                          <ul className="list-disc list-inside space-y-0.5 text-zinc-300 pt-1 text-[10px] leading-relaxed">
                            {reasons.map((r, ri) => (
                              <li key={ri}>{r}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-zinc-400 truncate text-[10px] mt-0.5">
                            {reasons[0]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action: Send to Studio */}
                    <button
                      type="button"
                      onClick={() => onSelectGarmentForTryOn(item)}
                      className="w-full py-1.5 rounded btn-violet-accent text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm active:scale-98"
                    >
                      <span>Try On in Studio</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
