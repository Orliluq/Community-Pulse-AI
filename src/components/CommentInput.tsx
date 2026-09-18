import React, { useState, useRef } from 'react';
import { Sparkles, UploadCloud, FileText, Trash2, ArrowRight, Layers, AlertCircle } from 'lucide-react';
import { DEFAULT_SAMPLE_COMMENTS, PRESET_SCENARIOS } from '../data/sampleComments';

interface CommentInputProps {
  onAnalyze: (comments: string[]) => void;
  isLoading: boolean;
}

export const CommentInput: React.FC<CommentInputProps> = ({ onAnalyze, isLoading }) => {
  const [text, setText] = useState<string>(DEFAULT_SAMPLE_COMMENTS.join('\n'));
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse lines into clean comments
  const parsedComments = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const commentCount = parsedComments.length;
  const isOverLimit = commentCount > 50;

  const handleAnalyze = () => {
    setError(null);
    if (commentCount === 0) {
      setError('Please enter or load at least 1 comment to analyze.');
      return;
    }
    if (isOverLimit) {
      setError(`Too many comments (${commentCount}). Maximum allowed is 50 comments per batch.`);
      return;
    }
    onAnalyze(parsedComments);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isLoading && commentCount > 0 && !isOverLimit) {
        handleAnalyze();
      }
    }
  };

  React.useEffect(() => {
    const handleGlobalTrigger = () => {
      if (!isLoading && commentCount > 0 && !isOverLimit) {
        handleAnalyze();
      }
    };
    window.addEventListener('community-pulse:trigger-analyze', handleGlobalTrigger);
    return () => {
      window.removeEventListener('community-pulse:trigger-analyze', handleGlobalTrigger);
    };
  }, [isLoading, commentCount, isOverLimit, parsedComments]);

  const handleLoadSample = (sample: string[]) => {
    setText(sample.join('\n'));
    setError(null);
  };

  const handleClear = () => {
    setText('');
    setError(null);
  };

  // CSV Parsing
  const processCsvContent = (content: string) => {
    const lines = content.split(/\r\n|\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setError('The uploaded CSV file is empty.');
      return;
    }

    const firstLine = lines[0].toLowerCase();
    let comments: string[] = [];

    if (firstLine.includes('comment')) {
      // Header present, find column index
      const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
      const commentIdx = headers.findIndex((h) => h === 'comment' || h.includes('comment'));

      for (let i = 1; i < lines.length; i++) {
        const rawLine = lines[i];
        if (!rawLine) continue;
        const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
        const cols: string[] = [];
        let match;
        while ((match = regex.exec(rawLine)) !== null) {
          cols.push(match[1] !== undefined ? match[1] : match[2]);
        }
        const val = (cols[commentIdx >= 0 ? commentIdx : 0] || '').trim();
        if (val) comments.push(val);
      }
    } else {
      comments = lines.map((l) => l.replace(/^["']|["']$/g, '').trim()).filter(Boolean);
    }

    if (comments.length === 0) {
      setError('Could not find valid comments in the uploaded file.');
      return;
    }

    setText(comments.slice(0, 50).join('\n'));
    setError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processCsvContent(content);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type.includes('csv') || file.type.includes('text'))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processCsvContent(content);
      };
      reader.readAsText(file);
    } else {
      setError('Please drop a valid .csv file.');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors no-print">
      {/* Top Header & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Input Community Feedback
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Type or paste comments (one per line), or upload a <code className="text-slate-700 dark:text-slate-300 font-mono">comments.csv</code> file.
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/60 p-1 border border-slate-200 dark:border-slate-800 rounded-xl">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 px-2 font-medium flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Presets:
            </span>
            {PRESET_SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => handleLoadSample(scenario.comments)}
                className="px-2.5 py-1 text-xs rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors font-medium cursor-pointer"
                title={scenario.description}
              >
                {scenario.id === 'full-sample' ? 'Sample CSV (15)' : scenario.id === 'parks-positive' ? 'Parks' : 'Roads'}
              </button>
            ))}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Upload CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Textarea with Drag and Drop */}
      <div
        className={`mt-4 relative rounded-xl border transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
            : 'border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={7}
          placeholder="Paste citizen feedback comments here, one per line...&#10;Example:&#10;The new community park is absolutely wonderful!&#10;Traffic on Main Street is terrible and needs urgent attention."
          className="w-full bg-transparent px-4 py-3.5 text-sm text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none resize-y font-normal leading-relaxed"
        />

        {/* Floating Quick Drop Hint */}
        {isDragging && (
          <div className="absolute inset-0 bg-indigo-900/80 backdrop-blur-xs flex flex-col items-center justify-center rounded-xl pointer-events-none text-indigo-100">
            <UploadCloud className="w-8 h-8 mb-2 text-indigo-300 animate-bounce" />
            <p className="text-sm font-semibold">Drop CSV file to load comments</p>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Footer controls & Submit */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <span
            className={`px-2.5 py-1 rounded-lg font-mono font-medium ${
              isOverLimit
                ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60'
            }`}
          >
            {commentCount} / 50 comments
          </span>
          <span className="text-slate-500 hidden sm:inline">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px]">Enter</kbd> to analyze
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleClear}
            disabled={isLoading || !text}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>

          <button
            onClick={handleAnalyze}
            disabled={isLoading || commentCount === 0 || isOverLimit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing Pipeline...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>Analyze with AWS</span>
                <ArrowRight className="w-4 h-4 text-indigo-200" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
