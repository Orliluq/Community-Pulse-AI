import { AnalysisResponse, SentimentLabel } from '../types';

export function downloadAnalysisCsv(
  analysis: AnalysisResponse,
  filterLowConfidence = false,
  confidenceThreshold = 0.70,
  categoryFilter: SentimentLabel | 'all' = 'all'
) {
  const timestamp = new Date().toISOString();
  const dateFormatted = new Date().toLocaleString();

  // Filter comments by category if specified
  const targetComments =
    categoryFilter === 'all'
      ? analysis.comments
      : analysis.comments.filter((c) => c.label === categoryFilter);

  let csvContent = '';

  // 1. Metadata & Summary Header
  csvContent += '==================================================\n';
  csvContent += 'COMMUNITY PULSE AI - SENTIMENT ANALYSIS REPORT\n';
  csvContent += '==================================================\n';
  csvContent += `"Generated At","${dateFormatted}"\n`;
  csvContent += `"Category Filter Applied","${
    categoryFilter === 'all' ? 'All Categories' : categoryFilter.toUpperCase()
  }"\n`;
  csvContent += `"Comments In This Export",${targetComments.length} of ${analysis.total_comments}\n`;
  csvContent += `"Total Comments Analyzed (Full Dataset)",${analysis.total_comments}\n`;
  csvContent += `"Positive Count",${analysis.positive_count},"${analysis.positive_pct}%"\n`;
  csvContent += `"Neutral Count",${analysis.neutral_count},"${analysis.neutral_pct}%"\n`;
  csvContent += `"Negative Count",${analysis.negative_count},"${analysis.negative_pct}%"\n`;
  csvContent += `"Net Sentiment Score",${Math.round(analysis.positive_pct - analysis.negative_pct)} pts\n`;
  csvContent += `"Confidence Threshold Filter Applied",${
    filterLowConfidence ? `YES (Threshold: ${(confidenceThreshold * 100).toFixed(0)}%)` : 'NO'
  }\n`;
  csvContent += `"Executive Summary","${analysis.summary.replace(/"/g, '""')}"\n`;
  csvContent += `"Main Topics","${analysis.main_topics.join('; ')}"\n\n`;

  // 2. Comments Table Header
  csvContent += 'Comment #,Sentiment Label,Confidence Score (%),Confidence Rating,Comment Text\n';

  // 3. Comments Rows
  targetComments.forEach((c, index) => {
    const isBelowThreshold = c.score < confidenceThreshold;
    const rating = isBelowThreshold
      ? 'Low Confidence (<' + (confidenceThreshold * 100).toFixed(0) + '%)'
      : 'High Confidence';

    const safeText = `"${c.text.replace(/"/g, '""')}"`;
    const scorePct = (c.score * 100).toFixed(2) + '%';

    csvContent += `${index + 1},${c.label},${scorePct},${rating},${safeText}\n`;
  });

  // 4. Trigger file download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const catPrefix = categoryFilter !== 'all' ? `${categoryFilter}-` : '';
  link.href = url;
  link.download = `community-pulse-${catPrefix}analysis-${timestamp.slice(0, 10)}-${Date.now()
    .toString()
    .slice(-4)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
