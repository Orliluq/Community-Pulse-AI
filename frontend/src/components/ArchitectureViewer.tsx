import React, { useState } from 'react';
import { Server, Cpu, Sparkles, Activity, ShieldCheck, DollarSign, Database, Terminal, CheckCircle2, ChevronRight, Copy, Check } from 'lucide-react';

export const ArchitectureViewer: React.FC = () => {
  const [activeService, setActiveService] = useState<'all' | 'apigw' | 'lambda' | 'sagemaker' | 'bedrock' | 'cloudwatch'>('all');
  const [copiedCurl, setCopiedCurl] = useState(false);

  const sampleCurl = `curl -X POST "https://abc123xyz.execute-api.us-east-2.amazonaws.com/prod/analyze" \\
  -H "Content-Type: application/json" \\
  -d '{
    "comments": [
      "The new community park is absolutely wonderful! My kids love playing there.",
      "The trash collection schedule is very confusing and inconsistent.",
      "The library hours are okay, but it would be great if they opened earlier."
    ]
  }'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(sampleCurl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl dark:shadow-2xl space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Community Pulse AI — AWS Architecture & Data Flow
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                Region: us-east-2
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hybrid pipeline marrying specialized Machine Learning (SageMaker) with Generative AI (Bedrock Converse)
            </p>
          </div>

          <button
            onClick={copyCurl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors self-start md:self-auto cursor-pointer"
          >
            {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copiedCurl ? 'Copied curl!' : 'Copy curl Command'}</span>
          </button>
        </div>

        {/* Interactive Architecture Flow Diagram */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800/80 overflow-x-auto">
          <div className="min-w-[760px] flex items-center justify-between gap-2 text-xs">
            
            {/* Step 1: User / Browser */}
            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/70 p-3 rounded-xl text-center space-y-1 shadow-xs">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">Client</div>
              <div className="font-bold text-slate-800 dark:text-slate-200">React 19 + Tailwind</div>
              <div className="text-[11px] text-slate-500 font-mono">POST /analyze (JSON)</div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

            {/* Step 2: Amazon API Gateway */}
            <div className="flex-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 p-3 rounded-xl text-center space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">Ingress</div>
              <div className="font-bold text-amber-900 dark:text-amber-200">Amazon API Gateway</div>
              <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80">REST API + CORS</div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

            {/* Step 3: AWS Lambda Orchestrator */}
            <div className="flex-1 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30 p-3 rounded-xl text-center space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">Orchestrator</div>
              <div className="font-bold text-indigo-900 dark:text-indigo-200">AWS Lambda (Node.js)</div>
              <div className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80">Batching & Parsing</div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />

            {/* Step 4: Split to ML & GenAI */}
            <div className="flex-2 flex flex-col gap-2">
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 p-2.5 rounded-xl text-center">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">ML Classification</span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">3GB RAM / Scale-to-0</span>
                </div>
                <div className="font-bold text-emerald-900 dark:text-emerald-200 text-xs mt-0.5">SageMaker Serverless (RoBERTa)</div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/30 p-2.5 rounded-xl text-center">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400">Generative AI</span>
                  <span className="text-[10px] text-purple-700 dark:text-purple-400 font-mono">Converse API</span>
                </div>
                <div className="font-bold text-purple-900 dark:text-purple-200 text-xs mt-0.5">Amazon Bedrock Nova Lite</div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Grid of Key Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Card 1: CardiffNLP RoBERTa on SageMaker */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 transition-colors shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">SageMaker Serverless Inference</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Runs HuggingFace <code className="text-emerald-700 dark:text-emerald-300 font-mono">cardiffnlp/twitter-roberta-base-sentiment-latest</code> with 3GB serverless memory. Automatically scales down to zero when idle for maximum cost efficiency.
          </p>
          <div className="pt-1 text-[11px] text-emerald-700 dark:text-emerald-400/90 font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Scale-to-zero serverless
          </div>
        </div>

        {/* Card 2: Amazon Bedrock Nova Lite */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 transition-colors shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Amazon Bedrock Nova Lite</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Uses the low-latency Bedrock Converse API with enforced JSON schema output to produce executive summaries, key trends, and concrete action points for community teams.
          </p>
          <div className="pt-1 text-[11px] text-purple-700 dark:text-purple-400/90 font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> amazon.nova-lite-v1:0
          </div>
        </div>

        {/* Card 3: CloudWatch & X-Ray Observability */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 transition-colors shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Activity className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Full-Stack Observability</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Includes CloudWatch Logs and Metrics for request latencies, cold start monitoring, and token consumption tracking across both SageMaker and Bedrock services.
          </p>
          <div className="pt-1 text-[11px] text-amber-700 dark:text-amber-400/90 font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> CloudWatch Alarms & Metrics
          </div>
        </div>

      </div>

    </div>
  );
};
