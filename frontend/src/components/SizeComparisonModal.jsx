import React, { useState, useEffect } from 'react';
import {
  Ruler,
  X,
  AlertCircle,
  CheckCircle2,
  Info,
  ArrowRight,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { requestSizeComparison } from '../services/api';
import { getUserPreferences } from '../services/storage';

export const SizeComparisonModal = ({
  isOpen,
  onClose,
  garment,
  onOpenProfile,
}) => {
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userPrefs, setUserPrefs] = useState(null);

  useEffect(() => {
    if (!isOpen || !garment) return;

    const prefs = getUserPreferences();
    setUserPrefs(prefs);

    const runComparison = async () => {
      setIsLoading(true);
      const custMeas = {
        chest: prefs.bodyMeasurements?.chest ? parseFloat(prefs.bodyMeasurements.chest) : null,
        waist: prefs.bodyMeasurements?.waist ? parseFloat(prefs.bodyMeasurements.waist) : null,
        hip: prefs.bodyMeasurements?.hip ? parseFloat(prefs.bodyMeasurements.hip) : null,
        unit: prefs.bodyMeasurements?.unit || 'cm',
      };

      const garmMeas = {
        chest: garment.meas_chest ?? null,
        waist: garment.meas_waist ?? null,
        hip: garment.meas_hip ?? null,
        length: garment.meas_length ?? null,
        unit: garment.meas_unit || 'cm',
      };

      let heightContext = null;
      if (prefs.heightValue) {
        heightContext = {
          value: prefs.heightValue,
          unit: prefs.heightUnit || 'cm',
        };
      }

      try {
        const res = await requestSizeComparison({
          customer_measurements: custMeas,
          garment_measurements: garmMeas,
          garment_category: garment.category || 'upper_body',
          garment_size: garment.size || 'M',
          customer_height: heightContext,
        });
        setComparison(res);
      } catch (err) {
        // Fallback local calculation
        setComparison({
          conclusive: false,
          summary: 'Comparison inconclusive: Insufficient measurement data.',
          comparisons: [],
          disclaimer: 'This size comparison evaluates provided physical dimensions only. Height is visual context and not a substitute for body circumference.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    runComparison();
  }, [isOpen, garment]);

  if (!isOpen || !garment) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'tight':
      case 'snug':
        return 'bg-amber-950/80 border-amber-800/60 text-amber-300';
      case 'fitted':
      case 'regular':
        return 'bg-emerald-950/80 border-emerald-800/60 text-emerald-300';
      case 'relaxed':
      case 'oversized':
        return 'bg-violet-950/80 border-violet-800/60 text-violet-300';
      default:
        return 'bg-zinc-800 border-zinc-700 text-zinc-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#121216] border border-[#27272A] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
        
        {/* Header */}
        <div className="h-12 px-4 border-b border-[#27272A] flex items-center justify-between bg-[#16161D]">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
              <Ruler className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-sm tracking-wider text-white uppercase leading-none">
                CLOTHING SIZE COMPARISON
              </h2>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                {garment.name} · Tag Size: {garment.size || 'M'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Honest Disclosure Banner */}
        <div className="px-4 py-2 bg-[#101015] border-b border-zinc-800/80 flex items-start space-x-2 text-[11px] text-zinc-400">
          <Info className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-zinc-300 font-medium">Transparent Dimensional Analysis</p>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Compares supplied physical measurements only. Does NOT guarantee fit or influence IDM-VTON neural try-on synthesis (Studio fit preview is applied separately after generation). Customer height is visual context and never a substitute for body measurements.
            </p>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          
          {/* Customer Height Context */}
          {userPrefs?.heightValue && (
            <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-mono text-[11px]">Customer Stature Context</span>
              <span className="font-mono text-violet-300 font-semibold">
                {userPrefs.heightValue} {userPrefs.heightUnit || 'cm'}
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-zinc-500 text-xs font-mono">
              Analyzing supplied garment and customer measurements…
            </div>
          ) : comparison?.conclusive ? (
            /* Conclusive Comparison Table */
            <div className="space-y-3">
              <div className="p-3 rounded bg-zinc-900/40 border border-zinc-800/80">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Fit Evaluation
                </span>
                <p className="text-xs text-zinc-200 leading-relaxed">
                  {comparison.summary}
                </p>
              </div>

              <div className="border border-zinc-800 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#18181F] text-zinc-400 text-[10px] uppercase font-mono border-b border-zinc-800">
                      <th className="py-2 px-3">Area</th>
                      <th className="py-2 px-2 text-right">Body</th>
                      <th className="py-2 px-2 text-right">Garment</th>
                      <th className="py-2 px-2 text-right">Ease Delta</th>
                      <th className="py-2 px-3">Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {comparison.comparisons.map((c, idx) => (
                      <tr key={idx} className="hover:bg-zinc-900/30">
                        <td className="py-2 px-3 font-medium text-white">{c.dimension}</td>
                        <td className="py-2 px-2 text-right font-mono text-zinc-300">{c.customer_cm} cm</td>
                        <td className="py-2 px-2 text-right font-mono text-zinc-300">{c.garment_cm} cm</td>
                        <td className="py-2 px-2 text-right font-mono font-semibold">
                          <span className={c.delta_cm >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {c.delta_cm >= 0 ? `+${c.delta_cm}` : c.delta_cm} cm
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusBadge(c.status)}`}>
                            {c.label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {comparison.length_info && (
                <div className="p-2.5 rounded bg-zinc-900/40 border border-zinc-800 text-xs flex items-center justify-between">
                  <span className="text-zinc-400">Garment Vertical Length:</span>
                  <span className="font-mono text-white font-medium">{comparison.length_info.garment_length_cm} cm</span>
                </div>
              )}
            </div>
          ) : (
            /* Inconclusive State */
            <div className="p-6 text-center border border-dashed border-zinc-800 rounded-lg space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500/80 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-zinc-200">Comparison Inconclusive</h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Insufficient matching dimensional measurements are available. To enable transparent sizing comparison, add your chest, waist, or hip measurements in Profile and specify garment dimensions in Wardrobe.
                </p>
              </div>

              <div className="pt-2">
                {onOpenProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenProfile();
                    }}
                    className="py-1.5 px-3 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium inline-flex items-center space-x-1.5 transition-colors"
                  >
                    <span>Add Body Measurements in Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-11 px-4 border-t border-[#27272A] bg-[#141418] flex items-center justify-between text-xs">
          <span className="text-[10px] text-zinc-500 font-mono">
            {comparison?.conclusive ? 'Measured dimensions comparison' : 'Missing measurement data'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1 px-3 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
