export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface CommentResult {
  text: string;
  label: SentimentLabel;
  score: number;
}

export interface SentimentStats {
  total_comments: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
}

export interface BedrockAnalysis {
  summary: string;
  main_topics: string[];
  insights: string[];
  suggested_actions: string[];
}

export interface AnalysisResponse extends SentimentStats, BedrockAnalysis {
  comments: CommentResult[];
}

export interface PipelineStep {
  name: string;
  service: string;
  durationMs: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  details: string;
}

export interface ExecutionLog {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  service: string;
}

export interface AnalysisSessionPoint {
  id: string;
  timestamp: string;
  timeLabel: string;
  totalComments: number;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  netScore: number;
  batchName: string;
}

export interface AppSettings {
  customApiUrl: string;
  filterLowConfidence: boolean;
  confidenceThreshold: number; // e.g. 0.70
}
