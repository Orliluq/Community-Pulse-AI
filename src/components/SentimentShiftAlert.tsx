import React, { useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, ArrowUpRight, ArrowDownRight, X, Info } from 'lucide-react';
import { AnalysisSessionPoint } from '../types';

interface SentimentShiftAlertProps {
  currentNetScore: number;
  currentTotal: number;
  previousRuns: AnalysisSessionPoint[];
}

export const SentimentShiftAlert: React.FC<SentimentShiftAlertProps> = ({
  currentNetScore,
  currentTotal,
  previousRuns,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // We need at least 1 prior run to compute historical average and detect shift
  if (previousRuns.length === 0 || isDismissed) {
    return null;
  }

  const avgHistoricalNetScore = Math.round(
    previousRuns.reduce((sum, run) => sum + run.netScore, 0) / previousRuns.length
  );

  const netDeviation = currentNetScore - avgHistoricalNetScore;
  const absDeviation = Math.abs(netDeviation);

  // Define threshold for "Significant Deviation": e.g. 10 or more points
  const isSignificant = absDeviation >= 10;

  if (!isSignificant) {
    return null;
  }

  const isPositiveShift = netDeviation > 0;

  return (
    <div
      className={`rounded-2xl p-4.5 border transition-all duration-200 relative shadow-md no-print ${
        isPositiveShift
          ? 'bg-emerald-50/90 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-500/40 text-emerald-950 dark:text-emerald-100'
          : 'bg-rose-50/90 dark:bg-rose-950/25 border-rose-300 dark:border-rose-500/40 text-rose-950 dark:text-rose-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Icon Badge */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${
              isPositiveShift
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
            }`}
          >
            {isPositiveShift ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </div>

          {/* Alert Content */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isPositiveShift
                    ? 'bg-emerald-200/60 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                    : 'bg-rose-200/60 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/30'
                }`}
              >
                Sentiment Shift Alert
              </span>

              <span className="text-xs font-semibold">
                {isPositiveShift
                  ? `Positive Surge: +${absDeviation} Net Points vs. Historical Average`
                  : `Negative Drop: -${absDeviation} Net Points vs. Historical Average`}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 max-w-3xl">
              Current analysis scored{' '}
              <strong className="font-mono">
                {currentNetScore > 0 ? `+${currentNetScore}` : currentNetScore} pts
              </strong>{' '}
              net sentiment across {currentTotal} comments, deviating by{' '}
              <strong className={isPositiveShift ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {isPositiveShift ? `+${absDeviation}` : `-${absDeviation}`} pts
              </strong>{' '}
              from the baseline average of{' '}
              <span className="font-mono">
                {avgHistoricalNetScore > 0 ? `+${avgHistoricalNetScore}` : avgHistoricalNetScore} pts
              </span>{' '}
              ({previousRuns.length} prior recorded {previousRuns.length === 1 ? 'batch' : 'batches'}).
            </p>

            <div className="pt-1 flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 flex-wrap">
              <span className="flex items-center gap-1 font-medium">
                {isPositiveShift ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                )}
                Baseline Net: {avgHistoricalNetScore > 0 ? `+${avgHistoricalNetScore}` : avgHistoricalNetScore} pts
              </span>
              <span>•</span>
              <span>Current Net: {currentNetScore > 0 ? `+${currentNetScore}` : currentNetScore} pts</span>
              <span>•</span>
              <span className="italic">
                {isPositiveShift
                  ? 'High community satisfaction detected. Great time to promote new features.'
                  : 'Noticeable customer friction detected. Review negative comment themes below.'}
              </span>
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title="Dismiss Alert"
          aria-label="Dismiss Alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
