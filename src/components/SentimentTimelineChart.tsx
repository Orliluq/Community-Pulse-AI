import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp, Clock, History, RotateCcw, FileJson, Download } from 'lucide-react';
import { AnalysisSessionPoint } from '../types';

interface SentimentTimelineChartProps {
  history: AnalysisSessionPoint[];
  onClearHistory: () => void;
  theme?: 'dark' | 'light';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  theme?: 'dark' | 'light';
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, theme = 'dark' }) => {
  if (active && payload && payload.length) {
    const data: AnalysisSessionPoint = payload[0].payload;
    const isDark = theme === 'dark';

    return (
      <div
        className={`p-3 rounded-xl shadow-xl backdrop-blur-xs text-xs space-y-1.5 font-mono border ${
          isDark
            ? 'bg-slate-900/95 border-slate-700 text-slate-200'
            : 'bg-white/95 border-slate-300 text-slate-800'
        }`}
      >
        <div
          className={`font-sans font-bold border-b pb-1 flex items-center justify-between gap-4 ${
            isDark ? 'border-slate-800 text-slate-200' : 'border-slate-200 text-slate-900'
          }`}
        >
          <span>{data.batchName || 'Analysis Run'}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{data.timeLabel}</span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          Total Comments: {data.totalComments}
        </div>
        <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
          <span>Positive:</span>
          <span className="font-bold">{data.positivePct}%</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-amber-600 dark:text-amber-400">
          <span>Neutral:</span>
          <span className="font-bold">{data.neutralPct}%</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-rose-600 dark:text-rose-400">
          <span>Negative:</span>
          <span className="font-bold">{data.negativePct}%</span>
        </div>
        <div
          className={`flex items-center justify-between gap-3 border-t pt-1 ${
            isDark
              ? 'border-slate-800 text-indigo-400'
              : 'border-slate-200 text-indigo-600'
          }`}
        >
          <span>Net Sentiment:</span>
          <span className="font-bold">{data.netScore > 0 ? `+${data.netScore}` : data.netScore} pts</span>
        </div>
      </div>
    );
  }
  return null;
};

export const SentimentTimelineChart: React.FC<SentimentTimelineChartProps> = ({
  history,
  onClearHistory,
  theme = 'dark',
}) => {
  if (history.length === 0) return null;

  const handleDownloadHistoryJson = () => {
    const exportData = {
      project: 'Community Pulse AI',
      exportTimestamp: new Date().toISOString(),
      exportDateFormatted: new Date().toLocaleString(),
      totalRunsRecorded: history.length,
      historySummary: {
        firstRun: history[0]?.timeLabel,
        lastRun: history[history.length - 1]?.timeLabel,
        latestPositivePct: history[history.length - 1]?.positivePct,
        latestNeutralPct: history[history.length - 1]?.neutralPct,
        latestNegativePct: history[history.length - 1]?.negativePct,
        latestNetScore: history[history.length - 1]?.netScore,
      },
      sessionRuns: history,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `community-pulse-session-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#1e293b' : '#e2e8f0';
  const axisStroke = isDark ? '#64748b' : '#94a3b8';
  const lineStroke = isDark ? '#334155' : '#cbd5e1';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl dark:shadow-2xl space-y-4 transition-colors print-clean print-border">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Session Sentiment Distribution Timeline
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tracking Positive, Neutral, and Negative distributions across session runs ({history.length}{' '}
            {history.length === 1 ? 'batch' : 'batches'} recorded)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap no-print">
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Active Session
          </span>

          {/* Download History JSON Button */}
          <button
            onClick={handleDownloadHistoryJson}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors shadow-xs cursor-pointer"
            title="Download multi-session timeline history as JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Download History (JSON)</span>
          </button>

          {history.length > 1 && (
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Reset Timeline History"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Info notice when only 1 run exists */}
      {history.length === 1 && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-xs text-indigo-800 dark:text-indigo-300 flex items-center gap-2 no-print">
          <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
          <span>
            First analysis run recorded. Select a different preset or enter custom comments above and click <strong>"Analyze with AWS"</strong> to visualize multi-run trends over time.
          </span>
        </div>
      )}

      {/* Recharts Line Graph */}
      <div className="w-full h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 10, right: 20, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
            <XAxis
              dataKey="timeLabel"
              stroke={axisStroke}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: lineStroke }}
            />
            <YAxis
              stroke={axisStroke}
              fontSize={11}
              domain={[0, 100]}
              tickLine={false}
              axisLine={{ stroke: lineStroke }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip theme={theme} />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="positivePct"
              name="Positive %"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#10b981', stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="neutralPct"
              name="Neutral %"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#f59e0b', stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="negativePct"
              name="Negative %"
              stroke="#f43f5e"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#f43f5e', stroke: isDark ? '#0f172a' : '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Session Runs Table displaying manual titles and metrics */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span>Recorded Session Runs & Custom Titles</span>
          <span className="text-[11px] text-slate-500 font-normal">
            Hover over chart points or see runs below
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {history.map((run, idx) => {
            const isLatest = idx === history.length - 1;
            return (
              <div
                key={run.id || idx}
                className={`p-2.5 rounded-xl border transition-all text-xs space-y-1 ${
                  isLatest
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-500/30'
                    : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white truncate" title={run.batchName}>
                    {run.batchName || `Run #${idx + 1}`}
                  </span>
                  <span
                    className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md ${
                      run.netScore > 0
                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : run.netScore < 0
                        ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {run.netScore > 0 ? `+${run.netScore}` : run.netScore} pts
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>{run.timeLabel}</span>
                  <span>{run.totalComments} comments</span>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono pt-0.5">
                  <span className="text-emerald-600 dark:text-emerald-400">{run.positivePct}% Pos</span>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400">{run.neutralPct}% Neu</span>
                  <span>•</span>
                  <span className="text-rose-600 dark:text-rose-400">{run.negativePct}% Neg</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
