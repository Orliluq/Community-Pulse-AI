import React from 'react';
import { Activity, Cpu, Server, Code2, Settings2, Sparkles, CheckCircle2, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  currentTab: 'analysis' | 'architecture' | 'code';
  onTabChange: (tab: 'analysis' | 'architecture' | 'code') => void;
  onOpenSettings: () => void;
  isUsingCustomApi: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenSettings,
  isUsingCustomApi,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-30 transition-colors no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Community Pulse AI
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-3 h-3" /> AWS Serverless
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              SageMaker RoBERTa Sentiment + Amazon Bedrock Nova Lite Generative Insights
            </p>
          </div>
        </div>

        {/* Navigation Tabs & Theme Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <nav className="flex items-center p-1 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 rounded-xl">
            <button
              onClick={() => onTabChange('analysis')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'analysis'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Pulse Analysis
            </button>

            <button
              onClick={() => onTabChange('architecture')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'architecture'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              AWS Architecture
            </button>

            <button
              onClick={() => onTabChange('code')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'code'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Code & CDK
            </button>
          </nav>

          {/* Theme Toggle Button (Light/Dark Mode) */}
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>

          {/* Endpoint Mode Indicator & Settings */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
            title="Configure API Gateway Endpoint"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">
              {isUsingCustomApi ? 'Custom API Gateway' : 'Built-in Engine'}
            </span>
            <span className={`w-2 h-2 rounded-full ${isUsingCustomApi ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-indigo-500'}`} />
          </button>
        </div>

      </div>

      {/* Micro Status Bar */}
      <div className="bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800/60 px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active AWS Pipeline:
          </span>
          <span className="text-slate-600 dark:text-slate-400">
            SageMaker: <code className="text-amber-600 dark:text-amber-400/90 font-mono">cardiffnlp/twitter-roberta-base-sentiment</code> (Serverless 3GB)
          </span>
          <span className="hidden md:inline text-slate-300 dark:text-slate-600">•</span>
          <span className="text-slate-600 dark:text-slate-400">
            Bedrock: <code className="text-purple-600 dark:text-purple-400 font-mono">amazon.nova-lite-v1:0</code> (Converse API)
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>Region: <span className="font-mono text-slate-700 dark:text-slate-300">us-east-2</span></span>
        </div>
      </div>
    </header>
  );
};
