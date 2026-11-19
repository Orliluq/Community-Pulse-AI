import React from 'react';
import {
  Smile,
  Meh,
  Frown,
  Users,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { motion } from 'motion/react';
import { SentimentStats, AnalysisSessionPoint } from '../types';

interface SentimentSummaryProps {
  stats: SentimentStats;
  previousRun?: AnalysisSessionPoint | null;
}

export const SentimentSummary: React.FC<SentimentSummaryProps> = ({ stats, previousRun }) => {
  const {
    total_comments,
    positive_count,
    neutral_count,
    negative_count,
    positive_pct,
    neutral_pct,
    negative_pct,
  } = stats;

  // Net Sentiment Score (-100 to +100)
  const netScore = Math.round(positive_pct - negative_pct);

  // Calculate deltas against the previous historical run
  const hasHistory = !!previousRun;
  const posDelta = hasHistory ? Math.round(positive_pct - previousRun.positivePct) : 0;
  const neuDelta = hasHistory ? Math.round(neutral_pct - previousRun.neutralPct) : 0;
  const negDelta = hasHistory ? Math.round(negative_pct - previousRun.negativePct) : 0;
  const netDelta = hasHistory ? netScore - previousRun.netScore : 0;
  const countDelta = hasHistory ? total_comments - previousRun.totalComments : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl dark:shadow-2xl space-y-6 transition-colors print-clean print-border">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Sentiment Classification Overview
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            CardiffNLP Twitter-RoBERTa 3-Class Sentiment Inference (SageMaker Serverless)
          </p>
        </div>

        {/* Net Sentiment Metric with trend comparison */}
        <motion.div
          key={`net-${total_comments}-${netScore}`}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 self-start sm:self-auto"
        >
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Net Sentiment:</span>
          <span
            className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
              netScore > 15
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                : netScore < -15
                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
            }`}
          >
            {netScore > 0 ? `+${netScore}` : netScore} pts
          </span>

          {/* Historical Net Score Trend Indicator */}
          {hasHistory ? (
            <span
              className={`inline-flex items-center gap-0.5 text-[11px] font-mono font-semibold pl-1 border-l border-slate-300 dark:border-slate-700 ${
                netDelta > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : netDelta < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-500'
              }`}
              title={`Net Score changed by ${netDelta > 0 ? `+${netDelta}` : netDelta} pts compared to previous run (${previousRun.batchName || 'previous batch'})`}
            >
              {netDelta > 0 ? (
                <ArrowUp className="w-3 h-3" />
              ) : netDelta < 0 ? (
                <ArrowDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {netDelta > 0 ? `+${netDelta}` : netDelta} pts vs prev
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 pl-1 border-l border-slate-300 dark:border-slate-700 font-mono">
              Baseline
            </span>
          )}
        </motion.div>
      </div>

      {/* 4 Primary Stats Cards with Entrance Animations & Trend Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Total Comments */}
        <motion.div
          key={`total-${total_comments}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0 }}
          className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Total Comments</span>
            <Users className="w-4 h-4 text-slate-400 dark:text-slate-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{total_comments}</span>
            <span className="text-xs text-slate-500 ml-1">in batch</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>100% evaluated</span>
            {hasHistory && (
              <span className="font-mono text-[10px] text-slate-500">
                {countDelta > 0 ? `+${countDelta}` : countDelta} vs prev
              </span>
            )}
          </div>
        </motion.div>

        {/* Positive Comments with Trend Indicator */}
        <motion.div
          key={`pos-${total_comments}-${positive_count}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <span>Positive</span>
            <Smile className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">{positive_count}</span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400/90 font-mono">({positive_pct}%)</span>

            {/* Trend Indicator Arrow */}
            {hasHistory && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold ml-auto ${
                  posDelta > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : posDelta < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500'
                }`}
                title={`Positive share changed by ${posDelta > 0 ? `+${posDelta}` : posDelta}% vs previous run`}
              >
                {posDelta > 0 ? (
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : posDelta < 0 ? (
                  <ArrowDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
                {posDelta > 0 ? `+${posDelta}%` : `${posDelta}%`}
              </span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-emerald-700/80 dark:text-emerald-400/70 flex items-center justify-between">
            <span>Favorable sentiment</span>
            {hasHistory && (
              <span className="text-[10px] opacity-75 font-mono">
                {posDelta >= 0 ? 'Improved' : 'Declined'}
              </span>
            )}
          </div>
        </motion.div>

        {/* Neutral Comments with Trend Indicator */}
        <motion.div
          key={`neu-${total_comments}-${neutral_count}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 flex flex-col justify-between hover:border-amber-300 dark:hover:border-amber-500/50 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-semibold">
            <span>Neutral</span>
            <Meh className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-300 font-mono">{neutral_count}</span>
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400/90 font-mono">({neutral_pct}%)</span>

            {/* Trend Indicator Arrow */}
            {hasHistory && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold ml-auto ${
                  neuDelta > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : neuDelta < 0
                    ? 'text-amber-600/80 dark:text-amber-400/80'
                    : 'text-slate-500'
                }`}
                title={`Neutral share changed by ${neuDelta > 0 ? `+${neuDelta}` : neuDelta}% vs previous run`}
              >
                {neuDelta > 0 ? (
                  <ArrowUp className="w-3.5 h-3.5" />
                ) : neuDelta < 0 ? (
                  <ArrowDown className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
                {neuDelta > 0 ? `+${neuDelta}%` : `${neuDelta}%`}
              </span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-amber-700/80 dark:text-amber-400/70 flex items-center justify-between">
            <span>Constructive / factual</span>
            {hasHistory && (
              <span className="text-[10px] opacity-75 font-mono">
                {neuDelta === 0 ? 'Steady' : `${Math.abs(neuDelta)}% shift`}
              </span>
            )}
          </div>
        </motion.div>

        {/* Negative Comments with Trend Indicator */}
        <motion.div
          key={`neg-${total_comments}-${negative_count}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.24 }}
          className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4 flex flex-col justify-between hover:border-rose-300 dark:hover:border-rose-500/50 transition-colors shadow-xs"
        >
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-semibold">
            <span>Negative</span>
            <Frown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-bold text-rose-700 dark:text-rose-300 font-mono">{negative_count}</span>
            <span className="text-sm font-semibold text-rose-600 dark:text-rose-400/90 font-mono">({negative_pct}%)</span>

            {/* Trend Indicator Arrow (Note: Lower negative percentage is an improvement!) */}
            {hasHistory && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold ml-auto ${
                  negDelta < 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : negDelta > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500'
                }`}
                title={`Negative share changed by ${negDelta > 0 ? `+${negDelta}` : negDelta}% vs previous run`}
              >
                {negDelta > 0 ? (
                  <ArrowUp className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                ) : negDelta < 0 ? (
                  <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
                {negDelta > 0 ? `+${negDelta}%` : `${negDelta}%`}
              </span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-rose-700/80 dark:text-rose-400/70 flex items-center justify-between">
            <span>Critical feedback</span>
            {hasHistory && (
              <span
                className={`text-[10px] font-mono ${
                  negDelta < 0
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : negDelta > 0
                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                    : 'opacity-75'
                }`}
              >
                {negDelta < 0 ? 'Improvement (Down)' : negDelta > 0 ? 'Increase (Up)' : 'Unchanged'}
              </span>
            )}
          </div>
        </motion.div>

      </div>

      {/* Segmented Distribution Bar */}
      <motion.div
        key={`bar-${total_comments}-${positive_pct}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        className="space-y-2 pt-2"
      >
        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
          <span>Sentiment Distribution</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Positive: {positive_pct}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Neutral: {neutral_pct}%
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Negative: {negative_pct}%
            </span>
          </div>
        </div>

        <div className="h-3 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden flex border border-slate-200 dark:border-slate-800 p-0.5">
          {positive_pct > 0 && (
            <div
              style={{ width: `${positive_pct}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-l-full transition-all duration-700 ease-out"
              title={`Positive: ${positive_pct}% (${positive_count})`}
            />
          )}
          {neutral_pct > 0 && (
            <div
              style={{ width: `${neutral_pct}%` }}
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700 ease-out"
              title={`Neutral: ${neutral_pct}% (${neutral_count})`}
            />
          )}
          {negative_pct > 0 && (
            <div
              style={{ width: `${negative_pct}%` }}
              className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-r-full transition-all duration-700 ease-out"
              title={`Negative: ${negative_pct}% (${negative_count})`}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
};
