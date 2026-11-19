import React, { useState } from 'react';
import { Sparkles, Tag, Lightbulb, CheckSquare, Copy, Check, FileJson } from 'lucide-react';
import { BedrockAnalysis, AnalysisResponse } from '../types';

interface InsightsPanelProps {
  analysis: BedrockAnalysis;
  fullResponse?: AnalysisResponse;
  onSelectTopic?: (topic: string) => void;
  selectedTopic?: string | null;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  analysis,
  fullResponse,
  onSelectTopic,
  selectedTopic,
}) => {
  const { summary, main_topics, insights, suggested_actions } = analysis;
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [copiedInsights, setCopiedInsights] = useState(false);

  const toggleAction = (index: number) => {
    setCompletedActions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleCopyInsights = () => {
    const insightsContent =
      `EXECUTIVE SUMMARY:\n${summary}\n\n` +
      `KEY OBSERVATIONS & INSIGHTS:\n${insights.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}\n\n` +
      `RECOMMENDED ACTIONS:\n${suggested_actions.map((act, i) => `${i + 1}. ${act}`).join('\n')}`;

    navigator.clipboard.writeText(insightsContent);
    setCopiedInsights(true);
    setTimeout(() => setCopiedInsights(false), 2000);
  };

  const handleCopyReport = () => {
    const reportText =
      `COMMUNITY PULSE AI REPORT\n` +
      `=========================\n\n` +
      `EXECUTIVE SUMMARY:\n${summary}\n\n` +
      `MAIN TOPICS:\n${main_topics.map((t) => `- ${t}`).join('\n')}\n\n` +
      `KEY INSIGHTS:\n${insights.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}\n\n` +
      `SUGGESTED ACTIONS:\n${suggested_actions.map((act, i) => `${i + 1}. ${act}`).join('\n')}\n`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    if (!fullResponse) return;
    const blob = new Blob([JSON.stringify(fullResponse, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `community-pulse-analysis-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl dark:shadow-2xl space-y-6 transition-colors print-clean print-border">
      
      {/* Header with GenAI Badge and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Generative Analysis & Action Plan
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20">
              Bedrock Nova Lite
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Synthesized via Amazon Bedrock Converse API with structured JSON output
          </p>
        </div>

        {/* Export & Copy Tools */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap no-print">
          {/* Dedicated Copy Insights Button */}
          <button
            onClick={handleCopyInsights}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 transition-colors shadow-xs cursor-pointer"
            title="Copy AI summary and insights to clipboard for external reporting tools (Jira, Slack, Notion)"
          >
            {copiedInsights ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
            <span>{copiedInsights ? 'Copied Insights!' : 'Copy Insights'}</span>
          </button>

          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Copy Full Report Text to Clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          {fullResponse && (
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              title="Download Full JSON Payload"
            >
              <FileJson className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Export JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Narrative Executive Summary */}
      <div className="bg-purple-50/70 dark:bg-gradient-to-r dark:from-purple-950/20 dark:via-slate-900 dark:to-indigo-950/20 border border-purple-200 dark:border-purple-500/20 rounded-xl p-4.5 print-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          Executive Summary
        </h3>
        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
          {summary}
        </p>
      </div>

      {/* 2. Quick-Filter Themes & Main Topics (Applies keyword filter to comments) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Identified Themes & Quick-Filter Tags
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Click any theme tag to automatically filter the comment list below to matching feedback
            </p>
          </div>

          {selectedTopic && (
            <button
              onClick={() => onSelectTopic && onSelectTopic('')}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer no-print font-medium"
            >
              Clear filter ({selectedTopic})
            </button>
          )}
        </div>

        {/* Dynamic theme tag list extracted from summary and main topics */}
        <div className="flex flex-wrap gap-2 pt-1">
          {Array.from(
            new Set([
              ...main_topics,
              ...[
                'Cleanliness',
                'Maintenance',
                'Parking',
                'Restrooms',
                'Events',
                'Safety',
                'Staff',
                'Playground',
                'Lighting',
                'Facilities',
                'Community',
                'Noise',
                'Trails',
              ].filter(
                (term) =>
                  summary.toLowerCase().includes(term.toLowerCase()) &&
                  !main_topics.some((t) => t.toLowerCase().includes(term.toLowerCase()))
              ),
            ])
          ).map((topic, i) => {
            const isSelected = selectedTopic?.toLowerCase() === topic.toLowerCase();
            return (
              <button
                key={i}
                onClick={() => {
                  const target = isSelected ? '' : topic;
                  if (onSelectTopic) onSelectTopic(target);
                  if (target) {
                    const el = document.getElementById('comments-section');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }
                }}
                className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                    : 'bg-slate-100 dark:bg-slate-950/70 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-300'
                }`}
                title={`Filter comments list by "${topic}"`}
              >
                <span>#{topic}</span>
                {isSelected && <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded">Active Filter</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Key Insights (Numbered List) */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          Key Insights & Data Observations
        </h3>

        <div className="grid gap-2.5">
          {insights.map((insight, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 transition-colors print-page-break-avoid"
            >
              <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 font-mono text-[11px] font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {insight}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Suggested Actions (Actionable Checklist) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Suggested Actions for Community Managers
          </h3>
          <span className="text-[11px] text-slate-500">
            {Object.values(completedActions).filter(Boolean).length} of {suggested_actions.length} initiated
          </span>
        </div>

        <div className="grid gap-2.5">
          {suggested_actions.map((action, i) => {
            const isDone = !!completedActions[i];
            return (
              <div
                key={i}
                onClick={() => toggleAction(i)}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none print-page-break-avoid ${
                  isDone
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all flex-shrink-0 mt-0.5 ${
                    isDone
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <p
                    className={`text-xs leading-relaxed ${
                      isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {action}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
