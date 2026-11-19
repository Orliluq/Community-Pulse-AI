import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CommentInput } from './components/CommentInput';
import { SentimentSummary } from './components/SentimentSummary';
import { SentimentTimelineChart } from './components/SentimentTimelineChart';
import { SentimentShiftAlert } from './components/SentimentShiftAlert';
import { InsightsPanel } from './components/InsightsPanel';
import { CommentList } from './components/CommentList';
import { ArchitectureViewer } from './components/ArchitectureViewer';
import { CodeExplorer } from './components/CodeExplorer';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { AnalysisResponse, AnalysisSessionPoint, AppSettings } from './types';
import { DEFAULT_SAMPLE_COMMENTS } from './data/sampleComments';
import { processCommentsPipeline } from './utils/sentimentEngine';
import { downloadAnalysisCsv } from './utils/csvExport';
import { AlertTriangle, RefreshCw, Download, Sliders, Printer, Bookmark } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'analysis' | 'architecture' | 'code'>('analysis');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('cp_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const [settings, setSettings] = useState<AppSettings>({
    customApiUrl: '',
    filterLowConfidence: false,
    confidenceThreshold: 0.70,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

  // Load sessionHistory and currentRunTitle from localStorage to persist across refreshes
  const [sessionHistory, setSessionHistory] = useState<AnalysisSessionPoint[]>(() => {
    try {
      const saved = localStorage.getItem('cp_session_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved session history from localStorage', e);
    }
    return [];
  });

  const [currentRunTitle, setCurrentRunTitle] = useState<string>(() => {
    return localStorage.getItem('cp_current_run_title') || 'Initial Survey (15 comments)';
  });

  // Sync theme with document element for Tailwind CSS dark mode variants
  useEffect(() => {
    localStorage.setItem('cp_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Periodic and reactive localStorage persistence for sessionHistory and currentRunTitle
  useEffect(() => {
    try {
      localStorage.setItem('cp_session_history', JSON.stringify(sessionHistory));
      localStorage.setItem('cp_current_run_title', currentRunTitle);
    } catch (e) {
      console.warn('Failed to save session state to localStorage', e);
    }

    // Periodic background timer (every 4 seconds) to guarantee persistence
    const intervalId = setInterval(() => {
      try {
        localStorage.setItem('cp_session_history', JSON.stringify(sessionHistory));
        localStorage.setItem('cp_current_run_title', currentRunTitle);
      } catch (e) {
        // Silently catch quota or serialization issues
      }
    }, 4000);

    const handleBeforeUnload = () => {
      try {
        localStorage.setItem('cp_session_history', JSON.stringify(sessionHistory));
        localStorage.setItem('cp_current_run_title', currentRunTitle);
      } catch (e) {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionHistory, currentRunTitle]);

  const appendToHistory = useCallback((res: AnalysisResponse, label?: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const runName = label || `Analysis Run #${sessionHistory.length + 1}`;
    setSessionHistory((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: now.toISOString(),
        timeLabel: `${timeStr} (#${prev.length + 1})`,
        totalComments: res.total_comments,
        positivePct: res.positive_pct,
        neutralPct: res.neutral_pct,
        negativePct: res.negative_pct,
        netScore: Math.round(res.positive_pct - res.negative_pct),
        batchName: runName,
      },
    ]);
  }, [sessionHistory.length]);

  // Update manual title for current analysis run and sync with session history
  const handleUpdateRunTitle = (newTitle: string) => {
    setCurrentRunTitle(newTitle);
    setSessionHistory((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const lastIdx = copy.length - 1;
      copy[lastIdx] = {
        ...copy[lastIdx],
        batchName: newTitle || `Analysis Run #${lastIdx + 1}`,
      };
      return copy;
    });
  };

  // Run initial analysis automatically on mount with the 15-comment dataset
  useEffect(() => {
    let isMounted = true;
    async function runInitialAnalysis() {
      try {
        setIsLoading(true);
        const res = await processCommentsPipeline(DEFAULT_SAMPLE_COMMENTS, settings.customApiUrl);
        if (isMounted) {
          setAnalysisResult(res);
          // Only append to history if there is no pre-existing saved history from previous session
          setSessionHistory((prev) => {
            if (prev.length === 0) {
              const initialLabel = 'Initial Survey (15 comments)';
              const now = new Date();
              const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return [
                {
                  id: `${Date.now()}`,
                  timestamp: now.toISOString(),
                  timeLabel: `${timeStr} (#1)`,
                  totalComments: res.total_comments,
                  positivePct: res.positive_pct,
                  neutralPct: res.neutral_pct,
                  negativePct: res.negative_pct,
                  netScore: Math.round(res.positive_pct - res.negative_pct),
                  batchName: initialLabel,
                },
              ];
            }
            return prev;
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to process initial comments');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    runInitialAnalysis();
    return () => {
      isMounted = false;
    };
  }, []);

  // Global Keyboard Shortcuts (Ctrl+Enter, Esc, Alt+1/2/3, Alt+S)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Trigger Analysis: Ctrl+Enter or Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('community-pulse:trigger-analyze'));
      }
      // Close Modal: Escape
      else if (e.key === 'Escape') {
        setIsSettingsOpen(false);
      }
      // Tab switching: Alt + 1/2/3
      else if (e.altKey && e.key === '1') {
        e.preventDefault();
        setCurrentTab('analysis');
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        setCurrentTab('architecture');
      } else if (e.altKey && e.key === '3') {
        e.preventDefault();
        setCurrentTab('code');
      }
      // Open Settings: Alt + S
      else if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setIsSettingsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleAnalyze = async (comments: string[]) => {
    setIsLoading(true);
    setError(null);
    setSelectedTopic(null);

    const runLabel = `Batch (${comments.length} comments)`;
    setCurrentRunTitle(runLabel);

    try {
      const res = await processCommentsPipeline(comments, settings.customApiUrl);
      setAnalysisResult(res);
      appendToHistory(res, runLabel);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. If using an AWS endpoint, ensure CORS and SageMaker endpoint are warm.');
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk Delete Comments and recalculate sentiment stats
  const handleDeleteComments = (indicesToDelete: number[]) => {
    if (!analysisResult) return;

    const remaining = analysisResult.comments.filter((_, idx) => !indicesToDelete.includes(idx));
    const total = remaining.length;
    const pos = remaining.filter((c) => c.label === 'positive').length;
    const neu = remaining.filter((c) => c.label === 'neutral').length;
    const neg = remaining.filter((c) => c.label === 'negative').length;
    const posPct = total > 0 ? Math.round((pos / total) * 100) : 0;
    const neuPct = total > 0 ? Math.round((neu / total) * 100) : 0;
    const negPct = total > 0 ? Math.round((neg / total) * 100) : 0;
    const netScore = Math.round(posPct - negPct);

    const updated: AnalysisResponse = {
      ...analysisResult,
      comments: remaining,
      total_comments: total,
      positive_count: pos,
      neutral_count: neu,
      negative_count: neg,
      positive_pct: posPct,
      neutral_pct: neuPct,
      negative_pct: negPct,
    };

    setAnalysisResult(updated);

    // Update current active run in sessionHistory
    setSessionHistory((prev) => {
      if (prev.length === 0) return prev;
      const copy = [...prev];
      const lastIdx = copy.length - 1;
      copy[lastIdx] = {
        ...copy[lastIdx],
        totalComments: total,
        positivePct: posPct,
        neutralPct: neuPct,
        negativePct: negPct,
        netScore,
      };
      return copy;
    });
  };

  const handleDownloadCsv = () => {
    if (!analysisResult) return;
    downloadAnalysisCsv(
      analysisResult,
      settings.filterLowConfidence,
      settings.confidenceThreshold,
      'all'
    );
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Identify previous run for trend comparison
  const previousRun = sessionHistory.length > 1 ? sessionHistory[sessionHistory.length - 2] : null;

  return (
    <div
      className={`min-h-screen ${
        theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      } flex flex-col antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200`}
    >
      {/* Navigation Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isUsingCustomApi={!!settings.customApiUrl}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Printable Official Document Header (Visible ONLY during print) */}
        {analysisResult && (
          <div className="print-only mb-6 border-b-2 border-slate-400 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Community Pulse AI</h1>
                <p className="text-sm text-slate-700 font-medium">Executive Sentiment Analysis & AI Intelligence Report</p>
                <p className="text-xs text-slate-500 mt-1">
                  Run Note: <strong>{currentRunTitle}</strong> • Generated: {new Date().toLocaleString()} • Pipeline: CardiffNLP RoBERTa on SageMaker + Amazon Bedrock Nova Lite
                </p>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Report Metrics</div>
                <div className="text-base font-bold text-indigo-800">{analysisResult.total_comments} Total Comments</div>
                <div className="text-xs text-slate-700 font-semibold">
                  Net Sentiment Score:{' '}
                  <span className="font-mono">
                    {Math.round(analysisResult.positive_pct - analysisResult.negative_pct) > 0
                      ? `+${Math.round(analysisResult.positive_pct - analysisResult.negative_pct)}`
                      : Math.round(analysisResult.positive_pct - analysisResult.negative_pct)}{' '}
                    pts
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: Pulse Analysis */}
        {currentTab === 'analysis' && (
          <div className="space-y-8">
            
            {/* Input Section (Hidden in print) */}
            <section aria-label="Input Feedback Section">
              <CommentInput onAnalyze={handleAnalyze} isLoading={isLoading} />
            </section>

            {/* Error Banner */}
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-sm flex items-start justify-between gap-3 no-print">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-rose-900 dark:text-rose-200">Analysis Request Failed</h4>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">{error}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAnalyze(DEFAULT_SAMPLE_COMMENTS)}
                  className="flex items-center gap-1 text-xs text-rose-700 dark:text-rose-200 hover:text-rose-900 dark:hover:text-white font-medium bg-rose-500/20 px-2.5 py-1.5 rounded-lg border border-rose-500/30 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Default
                </button>
              </div>
            )}

            {/* Loading Indicator for Cold Start */}
            {isLoading && !analysisResult && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3 shadow-xl">
                <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Running AWS Pipeline Inference...</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Evaluating comments with SageMaker RoBERTa text classifier and invoking Bedrock Converse API for structured community insights.
                </p>
              </div>
            )}

            {/* Analysis Output Dashboard */}
            {analysisResult && (
              <div className="space-y-8">
                
                {/* Sentiment Shift Alert Banner (when current net score deviates significantly from prior history) */}
                {sessionHistory.length > 1 && (
                  <SentimentShiftAlert
                    currentNetScore={Math.round(analysisResult.positive_pct - analysisResult.negative_pct)}
                    currentTotal={analysisResult.total_comments}
                    previousRuns={sessionHistory.slice(0, -1)}
                  />
                )}

                {/* Manual Note / Run Title Input Field (Displayed in Timeline) */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
                  <div className="flex items-center gap-2.5 flex-1 max-w-2xl">
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 flex-shrink-0">
                      <Bookmark className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <label
                        htmlFor="run-title-input"
                        className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                      >
                        Analysis Run Title / Note
                      </label>
                      <input
                        id="run-title-input"
                        type="text"
                        value={currentRunTitle}
                        onChange={(e) => handleUpdateRunTitle(e.target.value)}
                        placeholder="Add a manual title or note (e.g. 'Q3 Town Hall Feedback', 'Release 2.4 Retro')..."
                        className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 self-end sm:self-auto font-mono">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>Syncs with Session History Timeline & LocalStorage</span>
                  </div>
                </div>

                {/* Action Toolbar above results */}
                <div className="flex items-center justify-between gap-3 flex-wrap no-print">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Analysis Complete & Active</span>
                    {settings.filterLowConfidence && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/20 text-[11px] font-mono">
                        Low-Confidence Filter: &lt;{Math.round(settings.confidenceThreshold * 100)}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Print Report Button */}
                    <button
                      onClick={handlePrintReport}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors shadow-xs cursor-pointer"
                      title="Print or export current sentiment analysis report to PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Print Report</span>
                    </button>

                    {/* Settings Modal Button */}
                    <button
                      onClick={() => setIsSettingsOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 transition-colors cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Threshold Settings</span>
                    </button>

                    {/* CSV Download Button */}
                    <button
                      onClick={handleDownloadCsv}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 transition-colors shadow-xs cursor-pointer"
                      title="Download sentiment analysis results as CSV file"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Download CSV</span>
                    </button>
                  </div>
                </div>

                {/* 1. Sentiment Stats Overview with Trend Indicators comparing with previous historical run */}
                <section aria-label="Sentiment Stats Overview">
                  <SentimentSummary stats={analysisResult} previousRun={previousRun} />
                </section>

                {/* 2. Recharts Line Graph: Multi-Analysis Session Timeline */}
                <section aria-label="Session Sentiment Distribution Timeline">
                  <SentimentTimelineChart
                    history={sessionHistory}
                    theme={theme}
                    onClearHistory={() => {
                      if (analysisResult) {
                        setSessionHistory([
                          {
                            id: `${Date.now()}`,
                            timestamp: new Date().toISOString(),
                            timeLabel: 'Current Run',
                            totalComments: analysisResult.total_comments,
                            positivePct: analysisResult.positive_pct,
                            neutralPct: analysisResult.neutral_pct,
                            negativePct: analysisResult.negative_pct,
                            netScore: Math.round(analysisResult.positive_pct - analysisResult.negative_pct),
                            batchName: currentRunTitle || 'Latest Analysis',
                          },
                        ]);
                      }
                    }}
                  />
                </section>

                {/* 3. Bedrock Generative Insights Panel with Quick-Filter Tags */}
                <section aria-label="Generative Insights Panel">
                  <InsightsPanel
                    analysis={analysisResult}
                    fullResponse={analysisResult}
                    selectedTopic={selectedTopic}
                    onSelectTopic={setSelectedTopic}
                  />
                </section>

                {/* 4. Per-Comment Scored List with Theme Filter, Bulk Delete, Category Grouping & Category CSV Export */}
                <section aria-label="Per Comment Classification">
                  <CommentList
                    comments={analysisResult.comments}
                    fullAnalysis={analysisResult}
                    filterLowConfidence={settings.filterLowConfidence}
                    confidenceThreshold={settings.confidenceThreshold}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onDeleteComments={handleDeleteComments}
                    activeThemeFilter={selectedTopic}
                    onClearThemeFilter={() => setSelectedTopic(null)}
                  />
                </section>

              </div>
            )}

          </div>
        )}

        {/* TAB 2: AWS Architecture & Data Flow */}
        {currentTab === 'architecture' && (
          <section aria-label="AWS Architecture & Topology">
            <ArchitectureViewer />
          </section>
        )}

        {/* TAB 3: Code & CDK Infrastructure */}
        {currentTab === 'code' && (
          <section aria-label="Code and CDK Explorer">
            <CodeExplorer />
          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950/60 py-6 text-center text-xs text-slate-500 no-print transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-400">Community Pulse AI</span> — Machine Learning & Generative AI on AWS
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>Amazon SageMaker Serverless</span>
            <span>•</span>
            <span>Amazon Bedrock Nova Lite</span>
            <span>•</span>
            <span>AWS Lambda & API Gateway</span>
          </div>
        </div>
      </footer>

      {/* Settings Modal with Confidence Threshold Slider & Toggle */}
      <ApiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
      />

    </div>
  );
}
