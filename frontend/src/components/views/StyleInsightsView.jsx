import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  Shirt,
  BookmarkCheck,
  LayoutGrid,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Info,
  Clock,
  Layers
} from 'lucide-react';
import { computeWardrobeInsights } from '../../services/storage';
import { fetchWardrobe, fetchSavedLooks } from '../../services/api';

const API_HOST = 'http://localhost:8000';

const CATEGORY_LABELS = {
  upper_body: 'Upper-body',
  lower_body: 'Lower-body',
  dresses: 'Dresses',
  unknown: 'Unknown',
};

const CATEGORY_COLORS = {
  upper_body: 'bg-violet-500',
  lower_body: 'bg-purple-500',
  dresses: 'bg-fuchsia-500',
  unknown: 'bg-zinc-500',
};

// Simple horizontal bar
function BarRow({ label, count, maxCount, colorClass = 'bg-violet-500' }) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-zinc-300 truncate max-w-[150px]">{label}</span>
        <span className="text-zinc-500 font-mono">{count}</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, colorClass = 'text-violet-400' }) {
  return (
    <div className="atelier-card p-3 flex items-center space-x-3">
      <div className="w-8 h-8 rounded bg-zinc-800/80 border border-zinc-700 flex items-center justify-center flex-shrink-0">
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>
      <div>
        <p className={`text-lg font-bold font-mono ${colorClass}`}>{value}</p>
        <p className="text-[10px] text-zinc-500 leading-tight">{label}</p>
        {sub && <p className="text-[9px] text-zinc-600 font-mono">{sub}</p>}
      </div>
    </div>
  );
}

export const StyleInsightsView = () => {
  const [insights, setInsights] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [dataSource, setDataSource] = useState('localStorage');

  const refresh = async () => {
    let wardrobeItems = await fetchWardrobe();
    let savedLooks = await fetchSavedLooks();

    if (savedLooks && savedLooks.length > 0) {
      savedLooks = savedLooks.map((item) => ({
        id: item.id,
        resultImage: item.result_url?.startsWith('http') ? item.result_url : `${API_HOST}${item.result_url}`,
        category: item.category,
        description: item.description,
        executionTime: item.execution_time,
        timestamp: item.created_at,
      }));
    }

    if (wardrobeItems && wardrobeItems.length > 0) {
      setDataSource('Server SQLite & Storage');
      setInsights(computeWardrobeInsights(wardrobeItems, savedLooks));
    } else {
      setDataSource('Local Browser Cache');
      setInsights(computeWardrobeInsights(null, savedLooks));
    }
    setLastRefresh(new Date());
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex-1 h-full min-h-0 bg-[#09090B] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-12 flex-shrink-0 border-b border-[#27272A] px-4 flex items-center justify-between bg-[#0E0E12]">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-display text-lg tracking-wider text-white uppercase leading-none">
              STYLE INSIGHTS
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono leading-none mt-0.5">
              DATA-DRIVEN WARDROBE ANALYSIS · NO FABRICATED METRICS
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-white text-xs flex items-center space-x-1.5 transition-colors"
          title="Refresh insights"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Honest disclosure banner */}
      <div className="px-4 py-1.5 bg-[#121217] border-b border-[#1E1E24] flex items-center space-x-2 text-[11px] text-zinc-400 font-mono flex-shrink-0">
        <Info className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
        <span>
          All statistics are calculated directly from your local wardrobe data. Empty states appear when insufficient data exists. No values are fabricated.
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 p-4 overflow-y-auto">
        {!insights ? (
          <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
            Loading insights…
          </div>
        ) : !insights.hasData ? (
          /* Empty state */
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-800 rounded-lg max-w-md mx-auto mt-8">
            <BarChart2 className="w-12 h-12 text-zinc-700 mb-3" />
            <h3 className="text-zinc-300 font-semibold text-sm mb-1">No Wardrobe Data Yet</h3>
            <p className="text-zinc-500 text-xs max-w-sm">
              Add garments to your wardrobe to see category distribution, color analysis, and style patterns. Generate try-ons to see usage history.
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl">

            {/* Summary Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                icon={Shirt}
                label="Wardrobe Items"
                value={insights.totalItems}
                colorClass="text-violet-400"
              />
              <StatCard
                icon={BookmarkCheck}
                label="Try-On Results"
                value={insights.totalLooks}
                colorClass="text-emerald-400"
              />
              <StatCard
                icon={LayoutGrid}
                label="Saved Outfits"
                value={insights.totalOutfits}
                colorClass="text-purple-400"
              />
              <StatCard
                icon={Clock}
                label="Avg. Gen. Time"
                value={insights.avgExecTime ? `${insights.avgExecTime}s` : 'N/A'}
                sub={insights.avgExecTime ? 'Replicate Cloud GPU' : 'No generations yet'}
                colorClass="text-amber-400"
              />
            </div>

            {/* Category Distribution */}
            <div className="atelier-panel p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-zinc-500" />
                <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Category Distribution
                </h2>
              </div>
              {Object.entries(insights.categoryCount).length === 0 ? (
                <p className="text-[11px] text-zinc-600">No category data available.</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(insights.categoryCount)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => (
                      <BarRow
                        key={cat}
                        label={CATEGORY_LABELS[cat] || cat}
                        count={count}
                        maxCount={insights.totalItems}
                        colorClass={CATEGORY_COLORS[cat] || 'bg-zinc-500'}
                      />
                    ))}
                </div>
              )}
            </div>

            {/* Color & Style Analysis — 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Color Distribution */}
              <div className="atelier-panel p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-violet-500 to-rose-500" />
                  <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Color Palette
                  </h2>
                </div>
                {insights.topColors.length === 0 ? (
                  <p className="text-[11px] text-zinc-600">No color data available.</p>
                ) : (
                  <div className="space-y-2.5">
                    {insights.topColors.map(({ color, count }, idx) => (
                      <BarRow
                        key={color}
                        label={color}
                        count={count}
                        maxCount={insights.topColors[0]?.count || 1}
                        colorClass={
                          idx === 0 ? 'bg-violet-500'
                          : idx === 1 ? 'bg-purple-400'
                          : idx === 2 ? 'bg-fuchsia-500'
                          : 'bg-zinc-500'
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Style Distribution */}
              <div className="atelier-panel p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                  <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Style Breakdown
                  </h2>
                </div>
                {Object.entries(insights.styleCount).length === 0 ? (
                  <p className="text-[11px] text-zinc-600">No style data available.</p>
                ) : (
                  <div className="space-y-2.5">
                    {Object.entries(insights.styleCount)
                      .sort(([, a], [, b]) => b - a)
                      .map(([style, count], idx) => (
                        <BarRow
                          key={style}
                          label={style}
                          count={count}
                          maxCount={Math.max(...Object.values(insights.styleCount))}
                          colorClass={
                            idx === 0 ? 'bg-violet-500'
                            : idx === 1 ? 'bg-indigo-500'
                            : 'bg-zinc-600'
                          }
                        />
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Wardrobe Gap Analysis */}
            {insights.gaps.length > 0 && (
              <div className="atelier-panel p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Wardrobe Gaps
                  </h2>
                </div>
                <div className="space-y-1.5">
                  {insights.gaps.map((gap, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-[11px] text-amber-300/80">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">▸</span>
                      <span>{gap}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Try-On History */}
            {insights.looks.length > 0 && (
              <div className="atelier-panel p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <h2 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Recent Try-On History
                  </h2>
                  <span className="text-[10px] text-zinc-600 font-mono ml-auto">Actual results only</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {insights.looks.slice(0, 8).map((look) => (
                    <div key={look.id} className="atelier-card p-1.5 space-y-1">
                      {look.resultImage ? (
                        <div className="aspect-[3/4] w-full rounded overflow-hidden bg-black">
                          <img
                            src={look.resultImage}
                            alt="Saved Look"
                            className="w-full h-full object-contain"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[3/4] w-full rounded bg-zinc-800 flex items-center justify-center">
                          <BookmarkCheck className="w-4 h-4 text-zinc-700" />
                        </div>
                      )}
                      <div className="text-[9px] font-mono text-zinc-500 truncate">
                        {look.category?.replace('_', ' ') || 'VTON'}
                      </div>
                      <div className="text-[9px] font-mono text-zinc-600">
                        {new Date(look.timestamp).toLocaleDateString()}
                      </div>
                      {look.executionTime && (
                        <div className="text-[9px] font-mono text-zinc-600">
                          {look.executionTime.toFixed(1)}s gen
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last refresh timestamp */}
            <p className="text-[10px] text-zinc-700 font-mono text-right">
              Last refreshed: {lastRefresh.toLocaleTimeString()} — Data source: {dataSource}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
