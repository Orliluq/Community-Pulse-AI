import React, { useState } from 'react';
import {
  Search,
  Smile,
  Meh,
  Frown,
  Download,
  Filter,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  X,
  Trash2,
  CheckSquare,
  Square,
  Layers,
  List,
  Check,
  Tag,
} from 'lucide-react';
import { CommentResult, SentimentLabel, AnalysisResponse } from '../types';
import { downloadAnalysisCsv } from '../utils/csvExport';

interface CommentListProps {
  comments: CommentResult[];
  fullAnalysis?: AnalysisResponse;
  filterLowConfidence?: boolean;
  confidenceThreshold?: number;
  onOpenSettings?: () => void;
  onDeleteComments?: (indicesToDelete: number[]) => void;
  activeThemeFilter?: string | null;
  onClearThemeFilter?: () => void;
}

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  fullAnalysis,
  filterLowConfidence = false,
  confidenceThreshold = 0.70,
  onOpenSettings,
  onDeleteComments,
  activeThemeFilter = null,
  onClearThemeFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLabel, setFilterLabel] = useState<SentimentLabel | 'all'>('all');
  const [exportCategory, setExportCategory] = useState<SentimentLabel | 'all'>('all');
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('flat');
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});
  const [overrideFilter, setOverrideFilter] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Attach original indices so operations map precisely to the parent array
  const indexedComments = comments.map((comment, index) => ({
    ...comment,
    originalIndex: index,
  }));

  // Low confidence metrics
  const lowConfidenceCount = comments.filter((c) => c.score < confidenceThreshold).length;
  const isFilteringActive = filterLowConfidence && !overrideFilter;

  // Filtered comments with search, category tabs, and activeThemeFilter
  const trimmedSearch = searchTerm.trim().toLowerCase();
  const themeKeyword = activeThemeFilter ? activeThemeFilter.trim().toLowerCase() : '';

  const filteredComments = indexedComments.filter((c) => {
    const textLower = c.text.toLowerCase();
    const matchesSearch = trimmedSearch === '' || textLower.includes(trimmedSearch);
    const matchesTheme =
      themeKeyword === '' ||
      textLower.includes(themeKeyword) ||
      themeKeyword.split(' ').some((word) => word.length > 2 && textLower.includes(word));
    const matchesFilter = filterLabel === 'all' || c.label === filterLabel;
    const matchesConfidence = isFilteringActive ? c.score >= confidenceThreshold : true;
    return matchesSearch && matchesTheme && matchesFilter && matchesConfidence;
  });

  // Category counts for visual badges
  const positiveCount = indexedComments.filter((c) => c.label === 'positive').length;
  const neutralCount = indexedComments.filter((c) => c.label === 'neutral').length;
  const negativeCount = indexedComments.filter((c) => c.label === 'negative').length;

  // Selection handlers
  const handleToggleSelect = (index: number) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIndices = filteredComments.map((c) => c.originalIndex);
    const allSelected = visibleIndices.every((idx) => selectedIndices.includes(idx));
    if (allSelected) {
      setSelectedIndices((prev) => prev.filter((idx) => !visibleIndices.includes(idx)));
    } else {
      setSelectedIndices((prev) => Array.from(new Set([...prev, ...visibleIndices])));
    }
  };

  const handleSelectCategory = (category: SentimentLabel) => {
    const categoryIndices = filteredComments
      .filter((c) => c.label === category)
      .map((c) => c.originalIndex);
    const allCatSelected = categoryIndices.every((idx) => selectedIndices.includes(idx));
    if (allCatSelected) {
      setSelectedIndices((prev) => prev.filter((idx) => !categoryIndices.includes(idx)));
    } else {
      setSelectedIndices((prev) => Array.from(new Set([...prev, ...categoryIndices])));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIndices.length === 0 || !onDeleteComments) return;
    onDeleteComments(selectedIndices);
    setSelectedIndices([]);
  };

  const handleDeleteSingle = (originalIndex: number) => {
    if (!onDeleteComments) return;
    onDeleteComments([originalIndex]);
    setSelectedIndices((prev) => prev.filter((idx) => idx !== originalIndex));
  };

  const handleExportCsv = (categoryToExport: SentimentLabel | 'all' = exportCategory) => {
    if (fullAnalysis) {
      downloadAnalysisCsv(fullAnalysis, isFilteringActive, confidenceThreshold, categoryToExport);
    } else {
      const targetList =
        categoryToExport === 'all'
          ? comments
          : comments.filter((c) => c.label === categoryToExport);

      const header = 'index,comment,sentiment,confidence_score\n';
      const rows = targetList
        .map((c, i) => `${i + 1},"${c.text.replace(/"/g, '""')}",${c.label},${c.score}`)
        .join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const prefix = categoryToExport !== 'all' ? `${categoryToExport}-` : '';
      link.href = url;
      link.download = `community-pulse-${prefix}comments-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const getLabelConfig = (label: SentimentLabel) => {
    switch (label) {
      case 'positive':
        return {
          icon: <Smile className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
          badgeClass:
            'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20',
          barClass: 'bg-emerald-500',
          textClass: 'text-emerald-700 dark:text-emerald-400',
        };
      case 'negative':
        return {
          icon: <Frown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
          badgeClass:
            'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20',
          barClass: 'bg-rose-500',
          textClass: 'text-rose-700 dark:text-rose-400',
        };
      case 'neutral':
      default:
        return {
          icon: <Meh className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
          badgeClass:
            'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20',
          barClass: 'bg-amber-500',
          textClass: 'text-amber-700 dark:text-amber-400',
        };
    }
  };

  // Helper to highlight search term or theme within comment text
  const renderHighlightedText = (text: string) => {
    const highlightTarget = trimmedSearch || (activeThemeFilter ? activeThemeFilter.toLowerCase() : '');
    if (!highlightTarget) return text;
    const parts = text.split(new RegExp(`(${highlightTarget})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlightTarget ? (
            <mark
              key={i}
              className="bg-amber-200 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 px-0.5 rounded font-semibold"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Render a single comment card
  const renderCommentCard = (
    comment: CommentResult & { originalIndex: number },
    displayIdx: number
  ) => {
    const config = getLabelConfig(comment.label);
    const isExpanded = !!expandedIndices[comment.originalIndex];
    const isLong = comment.text.length > 140;
    const isLowConf = comment.score < confidenceThreshold;
    const isSelected = selectedIndices.includes(comment.originalIndex);

    return (
      <div
        key={comment.originalIndex}
        className={`border rounded-xl p-3.5 transition-all space-y-2 print-page-break-avoid ${
          isSelected
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs'
            : isLowConf && filterLowConfidence
            ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/10'
            : 'bg-slate-50/60 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: Checkbox, Index badge and highlighted text */}
          <div className="flex items-start gap-3 flex-1">
            {/* Checkbox for Bulk Delete */}
            <button
              onClick={() => handleToggleSelect(comment.originalIndex)}
              className="mt-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex-shrink-0 cursor-pointer no-print"
              title={isSelected ? 'Deselect comment' : 'Select comment for bulk action'}
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>

            <span className="text-[10px] font-mono text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0">
              #{displayIdx + 1}
            </span>

            <div className="flex-1">
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                {isExpanded || !isLong
                  ? renderHighlightedText(comment.text)
                  : renderHighlightedText(`${comment.text.slice(0, 140)}...`)}
              </p>
              {isLong && (
                <button
                  onClick={() =>
                    setExpandedIndices((prev) => ({
                      ...prev,
                      [comment.originalIndex]: !prev[comment.originalIndex],
                    }))
                  }
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 mt-1 font-medium cursor-pointer no-print"
                >
                  {isExpanded ? (
                    <>
                      Show less <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      Read full comment <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right: Actions, Sentiment Badge & Score Meter */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 min-w-[130px]">
            <div className="flex items-center gap-1.5">
              {isLowConf && (
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                  title={`Confidence score is below ${Math.round(confidenceThreshold * 100)}% threshold`}
                >
                  Low Conf
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${config.badgeClass}`}
              >
                {config.icon}
                {comment.label}
              </span>

              {/* Individual Delete Button */}
              {onDeleteComments && (
                <button
                  onClick={() => handleDeleteSingle(comment.originalIndex)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer no-print"
                  title="Remove this comment from analysis"
                  aria-label="Remove comment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Confidence Meter */}
            <div className="w-full flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800">
                <div
                  className={`h-full ${config.barClass} rounded-full transition-all`}
                  style={{ width: `${Math.round(comment.score * 100)}%` }}
                />
              </div>
              <span className={`font-semibold ${config.textClass}`}>
                {(comment.score * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isAllVisibleSelected =
    filteredComments.length > 0 &&
    filteredComments.every((c) => selectedIndices.includes(c.originalIndex));

  // Category subsets for grouped view
  const positiveGroup = filteredComments.filter((c) => c.label === 'positive');
  const neutralGroup = filteredComments.filter((c) => c.label === 'neutral');
  const negativeGroup = filteredComments.filter((c) => c.label === 'negative');

  return (
    <div
      id="comments-section"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl dark:shadow-2xl space-y-5 transition-colors print-clean print-border"
    >
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Per-Comment Sentiment Breakdown
            </h2>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {filteredComments.length} of {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Category grouping, multi-select bulk delete, confidence ratings, and category CSV export
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto no-print">
          {/* View Mode Toggle: Flat List vs Grouped */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'flat'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Standard flat list view"
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Group comments by detected sentiment category (Positive, Neutral, Negative)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Grouped</span>
            </button>
          </div>

          {/* Enhanced CSV Export with Category Filter Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <select
              value={exportCategory}
              onChange={(e) => setExportCategory(e.target.value as SentimentLabel | 'all')}
              className="text-xs bg-transparent text-slate-700 dark:text-slate-300 px-2 py-1 focus:outline-none cursor-pointer font-medium"
              title="Select category to export to CSV"
            >
              <option value="all" className="dark:bg-slate-900">All Categories</option>
              <option value="positive" className="dark:bg-slate-900">Positive Only</option>
              <option value="neutral" className="dark:bg-slate-900">Neutral Only</option>
              <option value="negative" className="dark:bg-slate-900">Negative Only</option>
            </select>

            <button
              onClick={() => handleExportCsv(exportCategory)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs cursor-pointer"
              title={`Download CSV file of ${exportCategory === 'all' ? 'all' : exportCategory} comments`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Low Confidence Filter Status Banner */}
      {filterLowConfidence && lowConfidenceCount > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>
              {isFilteringActive ? (
                <>
                  Filtering out <strong>{lowConfidenceCount}</strong>{' '}
                  {lowConfidenceCount === 1 ? 'comment' : 'comments'} below the{' '}
                  <strong>{Math.round(confidenceThreshold * 100)}%</strong> confidence threshold.
                </>
              ) : (
                <>Showing all comments including {lowConfidenceCount} below threshold.</>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setOverrideFilter(!overrideFilter)}
              className="text-[11px] underline hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
            >
              {overrideFilter ? 'Hide low-confidence again' : 'Show all anyway'}
            </button>
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="text-[11px] bg-amber-200/50 dark:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-500/30 hover:bg-amber-200 dark:hover:bg-amber-500/30 font-medium cursor-pointer"
              >
                Adjust threshold
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk Delete Action Bar (Appears when comments are selected) */}
      {selectedIndices.length > 0 && onDeleteComments && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 rounded-xl flex items-center justify-between gap-3 flex-wrap no-print">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span>
              <strong>{selectedIndices.length}</strong>{' '}
              {selectedIndices.length === 1 ? 'comment' : 'comments'} selected
            </span>
            <button
              onClick={() => setSelectedIndices([])}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 underline cursor-pointer ml-1 font-normal"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
              title="Remove selected comments and recalculate summary statistics"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Delete ({selectedIndices.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Theme Filter Banner */}
      {activeThemeFilter && (
        <div className="flex items-center justify-between p-2.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 no-print">
          <div className="flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>
              Filtered by Identified Theme: <strong className="underline">#{activeThemeFilter}</strong>
            </span>
          </div>
          {onClearThemeFilter && (
            <button
              onClick={onClearThemeFilter}
              className="flex items-center gap-1 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 hover:text-indigo-950 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear theme filter
            </button>
          )}
        </div>
      )}

      {/* Search Bar & Tabbed Sentiment Sorting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-lg">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeThemeFilter
                ? `Search within theme #${activeThemeFilter}...`
                : "Search comments by keyword (e.g. 'park', 'clean', 'delay')..."
            }
            className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5 rounded"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tabbed Sorting with Visual Sentiment Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setFilterLabel('all')}
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterLabel === 'all'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>All</span>
            <span className="text-[10px] opacity-80 font-mono">({comments.length})</span>
          </button>

          <button
            onClick={() => setFilterLabel('positive')}
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterLabel === 'positive'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
            }`}
          >
            <Smile className="w-3 h-3" />
            <span>Positive</span>
            <span className="text-[10px] opacity-80 font-mono">({positiveCount})</span>
          </button>

          <button
            onClick={() => setFilterLabel('neutral')}
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterLabel === 'neutral'
                ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-900/40'
            }`}
          >
            <Meh className="w-3 h-3" />
            <span>Neutral</span>
            <span className="text-[10px] opacity-80 font-mono">({neutralCount})</span>
          </button>

          <button
            onClick={() => setFilterLabel('negative')}
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filterLabel === 'negative'
                ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-900/40'
            }`}
          >
            <Frown className="w-3 h-3" />
            <span>Negative</span>
            <span className="text-[10px] opacity-80 font-mono">({negativeCount})</span>
          </button>
        </div>
      </div>

      {/* Select All Visible & Search Details Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 flex-wrap gap-2 no-print">
        <div className="flex items-center gap-3">
          {onDeleteComments && filteredComments.length > 0 && (
            <button
              onClick={handleSelectAllVisible}
              className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium cursor-pointer"
            >
              {isAllVisibleSelected ? (
                <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>
                {isAllVisibleSelected ? 'Deselect all visible' : 'Select all visible'}
              </span>
            </button>
          )}

          {searchTerm && (
            <span>
              Matching search: <strong className="text-slate-800 dark:text-slate-200">"{searchTerm}"</strong>
            </span>
          )}
        </div>

        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Clear keyword search
          </button>
        )}
      </div>

      {/* Comments List Content */}
      <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
        {filteredComments.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs space-y-2">
            <p>No comments match your search or filter criteria.</p>
            {(searchTerm || activeThemeFilter) && (
              <div className="flex items-center justify-center gap-3">
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
                  >
                    Clear search
                  </button>
                )}
                {activeThemeFilter && onClearThemeFilter && (
                  <button
                    onClick={onClearThemeFilter}
                    className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
                  >
                    Clear theme filter
                  </button>
                )}
              </div>
            )}
          </div>
        ) : viewMode === 'grouped' ? (
          /* GROUPED BY CATEGORY VIEW */
          <div className="space-y-6">
            
            {/* 1. Positive Feedback Group */}
            {positiveGroup.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      <Smile className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      Positive Sentiment Category
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-200/60 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold">
                      {positiveGroup.length} {positiveGroup.length === 1 ? 'comment' : 'comments'} (
                      {comments.length > 0 ? Math.round((positiveGroup.length / comments.length) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportCsv('positive')}
                      className="text-[11px] text-emerald-700 dark:text-emerald-300 hover:underline font-medium cursor-pointer no-print flex items-center gap-1"
                      title="Download CSV of positive comments only"
                    >
                      <Download className="w-3 h-3" /> CSV
                    </button>
                    {onDeleteComments && (
                      <button
                        onClick={() => handleSelectCategory('positive')}
                        className="text-[11px] text-emerald-700 dark:text-emerald-300 hover:underline font-medium cursor-pointer no-print"
                      >
                        {positiveGroup.every((c) => selectedIndices.includes(c.originalIndex))
                          ? 'Deselect category'
                          : 'Select all'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pl-1">
                  {positiveGroup.map((c, i) => renderCommentCard(c, i))}
                </div>
              </div>
            )}

            {/* 2. Neutral Feedback Group */}
            {neutralGroup.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                      <Meh className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                      Neutral Sentiment Category
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold">
                      {neutralGroup.length} {neutralGroup.length === 1 ? 'comment' : 'comments'} (
                      {comments.length > 0 ? Math.round((neutralGroup.length / comments.length) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportCsv('neutral')}
                      className="text-[11px] text-amber-700 dark:text-amber-300 hover:underline font-medium cursor-pointer no-print flex items-center gap-1"
                      title="Download CSV of neutral comments only"
                    >
                      <Download className="w-3 h-3" /> CSV
                    </button>
                    {onDeleteComments && (
                      <button
                        onClick={() => handleSelectCategory('neutral')}
                        className="text-[11px] text-amber-700 dark:text-amber-300 hover:underline font-medium cursor-pointer no-print"
                      >
                        {neutralGroup.every((c) => selectedIndices.includes(c.originalIndex))
                          ? 'Deselect category'
                          : 'Select all'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pl-1">
                  {neutralGroup.map((c, i) => renderCommentCard(c, i))}
                </div>
              </div>
            )}

            {/* 3. Negative Feedback Group */}
            {negativeGroup.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">
                      <Frown className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                      Negative Sentiment Category
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-200/60 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-semibold">
                      {negativeGroup.length} {negativeGroup.length === 1 ? 'comment' : 'comments'} (
                      {comments.length > 0 ? Math.round((negativeGroup.length / comments.length) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportCsv('negative')}
                      className="text-[11px] text-rose-700 dark:text-rose-300 hover:underline font-medium cursor-pointer no-print flex items-center gap-1"
                      title="Download CSV of negative comments only"
                    >
                      <Download className="w-3 h-3" /> CSV
                    </button>
                    {onDeleteComments && (
                      <button
                        onClick={() => handleSelectCategory('negative')}
                        className="text-[11px] text-rose-700 dark:text-rose-300 hover:underline font-medium cursor-pointer no-print"
                      >
                        {negativeGroup.every((c) => selectedIndices.includes(c.originalIndex))
                          ? 'Deselect category'
                          : 'Select all'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pl-1">
                  {negativeGroup.map((c, i) => renderCommentCard(c, i))}
                </div>
              </div>
            )}

          </div>
        ) : (
          /* STANDARD FLAT LIST VIEW */
          <div className="space-y-2.5">
            {filteredComments.map((comment, index) => renderCommentCard(comment, index))}
          </div>
        )}
      </div>

    </div>
  );
};
