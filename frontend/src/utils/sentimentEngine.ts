import { AnalysisResponse, CommentResult, SentimentLabel } from '../types';

// Lexicon for Twitter-RoBERTa 3-class sentiment estimation
const POSITIVE_PATTERNS = [
  { words: ['wonderful', 'fantastic', 'amazing', 'great', 'love', 'best', 'highlight', 'friendly', 'helpful', 'clean', 'appreciated', 'safer'], weight: 0.92 },
  { words: ['good', 'nice', 'pleased', 'enjoy', 'smooth', 'convenient', 'welcoming', 'satisfied', 'thank you', 'improvement'], weight: 0.82 },
  { words: ['effective', 'useful', 'prompt', 'favorable', 'worthwhile', 'initiative', 'benefit'], weight: 0.76 }
];

const NEGATIVE_PATTERNS = [
  { words: ['terrible', 'unbearable', 'unacceptable', 'damaged', 'frustrated', 'ignored', 'horrible', 'worst', 'danger', 'hazard'], weight: 0.94 },
  { words: ['confusing', 'inconsistent', 'slow', 'unhelpful', 'pothole', 'broken', 'complaint', 'dirty', 'poor', 'delayed', 'lost'], weight: 0.84 },
  { words: ['waiting', 'issue', 'problem', 'leak', 'noise', 'disrupted', 'failing', 'lacking', 'expensive'], weight: 0.74 }
];

const NEUTRAL_PATTERNS = [
  { words: ['okay', 'average', 'fine', 'moderate', 'acceptable', 'schedule', 'hours', 'standard', 'open', 'routine'], weight: 0.72 },
  { words: ['earlier', 'weekdays', 'could be', 'suggestion', 'note', 'might', 'sometimes', 'normal'], weight: 0.68 }
];

export function classifyCommentSentiment(text: string): { label: SentimentLabel; score: number } {
  const lower = text.toLowerCase();
  
  let posScore = 0;
  let negScore = 0;
  let neuScore = 0.15; // base prior for neutral

  for (const { words, weight } of POSITIVE_PATTERNS) {
    for (const w of words) {
      if (lower.includes(w)) {
        posScore += weight;
      }
    }
  }

  for (const { words, weight } of NEGATIVE_PATTERNS) {
    for (const w of words) {
      if (lower.includes(w)) {
        negScore += weight;
      }
    }
  }

  for (const { words, weight } of NEUTRAL_PATTERNS) {
    for (const w of words) {
      if (lower.includes(w)) {
        neuScore += weight;
      }
    }
  }

  // Negation flips or dampens
  const hasNegation = /\b(not|no|never|don't|can't|won't|isn't)\b/.test(lower);
  if (hasNegation) {
    if (posScore > 0) {
      negScore += posScore * 0.7;
      posScore *= 0.2;
    }
  }

  // Determine winner
  if (posScore > negScore && posScore > neuScore) {
    const rawConf = Math.min(0.985, 0.75 + (posScore / (posScore + negScore + neuScore + 0.5)) * 0.23);
    return { label: 'positive', score: Math.round(rawConf * 10000) / 10000 };
  } else if (negScore > posScore && negScore > neuScore) {
    const rawConf = Math.min(0.982, 0.76 + (negScore / (posScore + negScore + neuScore + 0.5)) * 0.22);
    return { label: 'negative', score: Math.round(rawConf * 10000) / 10000 };
  } else {
    const rawConf = Math.min(0.92, 0.62 + (neuScore / (posScore + negScore + neuScore + 0.5)) * 0.25);
    return { label: 'neutral', score: Math.round(rawConf * 10000) / 10000 };
  }
}

export function generateBedrockInsights(
  comments: string[],
  commentResults: CommentResult[]
): {
  summary: string;
  main_topics: string[];
  insights: string[];
  suggested_actions: string[];
} {
  const total = commentResults.length;
  const posCount = commentResults.filter(c => c.label === 'positive').length;
  const neuCount = commentResults.filter(c => c.label === 'neutral').length;
  const negCount = commentResults.filter(c => c.label === 'negative').length;

  const posPct = Math.round((posCount / total) * 100);
  const neuPct = Math.round((neuCount / total) * 100);
  const negPct = Math.round((negCount / total) * 100);

  // Topic detection
  const textJoined = comments.join(' ').toLowerCase();
  const topics: string[] = [];

  if (/park|kids|playing|benches|green|trees/.test(textJoined)) topics.push('Parks & Public Spaces');
  if (/trash|recycling|bins|sanitation|collection/.test(textJoined)) topics.push('Waste & Recycling Management');
  if (/traffic|bike|transit|bus|commute|transport/.test(textJoined)) topics.push('Transportation & Mobility');
  if (/pothole|road|street lighting|water pressure|construction|infrastructure/.test(textJoined)) topics.push('Municipal Infrastructure');
  if (/staff|office|customer service|library|center|seniors/.test(textJoined)) topics.push('Civic Facilities & Services');
  if (/internet|connectivity|network|wifi/.test(textJoined)) topics.push('Telecommunications & Utilities');
  if (/festival|market|community spirit|event/.test(textJoined)) topics.push('Community Events & Culture');

  // Ensure 3-5 topics
  if (topics.length < 3) {
    topics.push('Resident Satisfaction');
    topics.push('Public Safety & Maintenance');
  }
  const main_topics = topics.slice(0, 5);

  // Generate narrative summary
  let sentimentTone = "balanced";
  if (posPct >= 60) sentimentTone = "strongly positive";
  else if (posPct > negPct) sentimentTone = "moderately positive";
  else if (negPct >= 60) sentimentTone = "predominantly critical";
  else if (negPct > posPct) sentimentTone = "leaning negative";

  const summary = `Community sentiment across the surveyed feedback is ${sentimentTone}, with ${posPct}% positive, ${neuPct}% neutral, and ${negPct}% negative responses. Residents enthusiastically praise community-facing assets such as parks, markets, and street festivals, while voicing distinct friction regarding infrastructure maintenance, transit schedules, and administrative turnaround. Addressing critical physical infrastructure and communication transparency will yield the fastest gains in citizen trust.`;

  // Generate specific insights
  const insights: string[] = [];
  
  if (posCount > 0) {
    insights.push(
      `Recreational and cultural initiatives represent the strongest satisfaction driver (${posPct}% favorable overall), particularly communal gathering areas and neighborhood greenways.`
    );
  }
  
  if (negCount > 0) {
    insights.push(
      `Road conditions (such as pothole damage) and service unpredictability (trash collection delays and bus wait times) account for the majority of severe negative sentiment.`
    );
  }

  if (neuCount > 0) {
    insights.push(
      `${neuPct}% of comments reflect neutral feedback—primarily constructive requests for operational adjustments such as extended library hours and clearer scheduling notifications.`
    );
  }

  insights.push(
    `Perceived response time to municipal complaints appears to compound dissatisfaction, notably where residents cited unresolved issues lasting multiple weeks or months.`
  );

  if (insights.length < 4) {
    insights.push(`Feedback signals that proactive digital notifications would convert up to 20% of neutral/frustrated inquiries into positive ratings.`);
  }

  // Generate suggested actions
  const suggested_actions: string[] = [
    "Implement an automated SMS/App notification dispatch for scheduled municipal disruptions, including bin collection dates and road repairs.",
    "Prioritize rapid-response patching for high-traffic corridors and establish a public-facing pothole resolution tracker.",
    "Pilot a 1-hour early opening or extended weekend window for key public library branches to meet commuter demand.",
    "Streamline front-counter municipal services by offering digital appointment booking and pre-filled standard inquiry forms.",
    "Celebrate and maintain momentum on community parks and street festivals through regular neighborhood council spotlights."
  ];

  return {
    summary,
    main_topics,
    insights: insights.slice(0, 4),
    suggested_actions: suggested_actions.slice(0, 4),
  };
}

export async function processCommentsPipeline(
  comments: string[],
  customApiUrl?: string
): Promise<AnalysisResponse> {
  const sanitized = comments
    .map(c => c.trim())
    .filter(c => c.length > 0);

  if (sanitized.length === 0) {
    throw new Error('At least 1 comment is required for analysis.');
  }
  if (sanitized.length > 50) {
    throw new Error('Maximum 50 comments per analysis batch.');
  }

  // If custom API URL provided and valid, call the live API Gateway endpoint
  // Use the custom API URL when provided; otherwise use VITE_API_URL.
  const apiUrl = customApiUrl?.trim() || import.meta.env.VITE_API_URL;

  // If an API URL is available, call the live API Gateway endpoint.
  if (apiUrl && apiUrl.startsWith('http')) {
    const endpoint = `${apiUrl.replace(/\/$/, '')}/analyze`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments: sanitized })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `API returned HTTP ${res.status}`);
    }
    return await res.json();
  }

  // Built-in AWS pipeline emulator
  // Simulate network/inference latency realistic to serverless (approx 500ms)
  await new Promise(resolve => setTimeout(resolve, 500));

  const commentResults: CommentResult[] = sanitized.map(text => {
    const { label, score } = classifyCommentSentiment(text);
    return { text, label, score };
  });

  const total = commentResults.length;
  const posCount = commentResults.filter(c => c.label === 'positive').length;
  const neuCount = commentResults.filter(c => c.label === 'neutral').length;
  const negCount = commentResults.filter(c => c.label === 'negative').length;

  const pct = (n: number) => Math.round((n / total) * 10000) / 100;

  const bedrockData = generateBedrockInsights(sanitized, commentResults);

  return {
    total_comments: total,
    positive_count: posCount,
    neutral_count: neuCount,
    negative_count: negCount,
    positive_pct: pct(posCount),
    neutral_pct: pct(neuCount),
    negative_pct: pct(negCount),
    comments: commentResults,
    summary: bedrockData.summary,
    main_topics: bedrockData.main_topics,
    insights: bedrockData.insights,
    suggested_actions: bedrockData.suggested_actions,
  };
}
