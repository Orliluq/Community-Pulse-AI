import React, { useState } from 'react';
import { X, Globe, Cpu, Check, AlertCircle, Sliders, ShieldAlert, Sparkles } from 'lucide-react';
import { AppSettings } from '../types';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [url, setUrl] = useState(settings.customApiUrl);
  const [mode, setMode] = useState<'builtin' | 'custom'>(settings.customApiUrl ? 'custom' : 'builtin');
  const [filterLowConfidence, setFilterLowConfidence] = useState(settings.filterLowConfidence);
  const [confidenceThreshold, setConfidenceThreshold] = useState(settings.confidenceThreshold);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      customApiUrl: mode === 'builtin' ? '' : url.trim(),
      filterLowConfidence,
      confidenceThreshold,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs no-print">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
            <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Application & Inference Settings
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Low Confidence Filter & Threshold Slider */}
        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label
                htmlFor="confidence-filter-toggle"
                className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                Filter Low-Confidence Sentiment Results
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Exclude comments whose SageMaker classification score is below threshold
              </p>
            </div>
            
            {/* Toggle Switch */}
            <button
              id="confidence-filter-toggle"
              type="button"
              role="switch"
              aria-checked={filterLowConfidence}
              onClick={() => setFilterLowConfidence(!filterLowConfidence)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                filterLowConfidence ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  filterLowConfidence ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Slider Control */}
          <div
            className={`space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 transition-opacity ${
              filterLowConfidence ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-700 dark:text-slate-300 font-medium">Confidence Score Threshold:</span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20">
                {Math.round(confidenceThreshold * 100)}% ({confidenceThreshold.toFixed(2)})
              </span>
            </div>

            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              disabled={!filterLowConfidence}
              className="w-full accent-indigo-600 dark:accent-indigo-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none"
            />

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>50% (Permissive)</span>
              <span>70% (Recommended)</span>
              <span>95% (High Precision)</span>
            </div>
            
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Comments scoring below <span className="font-mono text-amber-700 dark:text-amber-300">{Math.round(confidenceThreshold * 100)}%</span> will be flagged and hidden from the filtered breakdown.
            </p>
          </div>
        </div>

        {/* 2. Execution Mode Selection */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pipeline Execution Engine
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setMode('builtin')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                mode === 'builtin'
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 text-slate-900 dark:text-white'
                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between font-semibold text-xs text-indigo-700 dark:text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" /> Built-in Engine
                </span>
                {mode === 'builtin' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Zero AWS setup needed. RoBERTa 3-class tokenizer & Bedrock Converse logic directly.
              </p>
            </div>

            <div
              onClick={() => setMode('custom')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                mode === 'custom'
                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-500 text-slate-900 dark:text-white'
                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between font-semibold text-xs text-indigo-700 dark:text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4" /> Custom AWS API
                </span>
                {mode === 'custom' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Direct live HTTP calls to your deployed Amazon API Gateway endpoint URL.
              </p>
            </div>
          </div>
        </div>

        {/* Custom API Endpoint Input */}
        {mode === 'custom' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>API Gateway Endpoint URL</span>
              <span className="text-[11px] text-slate-500">Must support POST /analyze</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://abc123xyz.execute-api.us-east-2.amazonaws.com/prod"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <span>Copy from <code className="text-slate-700 dark:text-slate-300">CommunityPulseStack.ApiEndpointUrl</code> output.</span>
            </div>
          </div>
        )}

        {/* Global Keyboard Shortcut Information */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5">
          <div className="font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Global Keyboard Shortcuts:
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
            <div><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">Ctrl/Cmd + Enter</kbd>: Trigger Analysis</div>
            <div><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">Esc</kbd>: Close Modals</div>
            <div><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">Alt + 1 / 2 / 3</kbd>: Switch Views</div>
            <div><kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">Alt + S</kbd>: Open Settings</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            Save Settings
          </button>
        </div>

      </div>
    </div>
  );
};
