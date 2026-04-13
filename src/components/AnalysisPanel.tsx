import { useState, useImperativeHandle, forwardRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { fetchAnalysis, triggerAnalysis } from '../api/client';

const MIN_LOADING_MS = 500;

interface Props {
  source: 'custom' | 'plugin';
  name: string;
  /** Notify parent of loading state changes */
  onLoadingChange?: (loading: boolean) => void;
}

export interface AnalysisPanelHandle {
  triggerAnalysis: () => void;
}

const AnalysisPanel = forwardRef<AnalysisPanelHandle, Props>(function AnalysisPanel({ source, name, onLoadingChange }, ref) {
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    onLoadingChange?.(true);
    setError(null);
    const start = Date.now();
    try {
      const data = await triggerAnalysis(source, name);
      // Ensure loading state is visible for at least MIN_LOADING_MS
      const remaining = MIN_LOADING_MS - (Date.now() - start);
      if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
      setSummary(data.summary);
      setAnalyzedAt(data.analyzedAt);
    } catch (err: any) {
      setError(err.message || '分析失败');
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  useImperativeHandle(ref, () => ({
    triggerAnalysis: () => {
      setExpanded(true);
      // Defer to next tick so React commits loading UI before the async work begins
      setTimeout(handleAnalyze, 0);
    },
  }));

  const handleExpand = async () => {
    if (!expanded) {
      setExpanded(true);
      if (!loaded) {
        try {
          const data = await fetchAnalysis(source, name);
          if (data.summary) {
            setSummary(data.summary);
            setAnalyzedAt(data.analyzedAt);
          }
          setLoaded(true);
        } catch {
          setLoaded(true);
        }
      }
    } else {
      setExpanded(false);
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={handleExpand}
        className="flex items-center gap-1 text-[11px] text-fg-muted hover:text-accent transition-colors mt-1"
      >
        <ChevronRight size={12} className="transition-transform" />
        原理分析
      </button>
    );
  }

  return (
    <div className="bg-surface-secondary rounded-[var(--radius-md)] border border-border text-sm mt-1 p-3">
      <button
        onClick={handleExpand}
        className="flex items-center gap-1 text-[11px] text-fg-muted hover:text-accent transition-colors mb-2"
      >
        <ChevronRight size={12} className="rotate-90 transition-transform" />
        收起分析
      </button>

      {loading && (
        <div className="text-fg-muted text-xs py-2">
          正在分析，请稍候...
        </div>
      )}

      {!loading && summary && (
        <div>
          <p className="text-fg-primary text-xs leading-relaxed whitespace-pre-wrap">
            {summary}
          </p>
          {analyzedAt && (
            <p className="text-fg-muted text-[10px] mt-1 font-mono">
              分析时间: {new Date(analyzedAt).toLocaleString()}
            </p>
          )}
          <button
            onClick={handleAnalyze}
            className="text-[11px] text-accent hover:text-accent-hover transition-colors mt-2"
          >
            重新分析
          </button>
        </div>
      )}

      {!loading && error && (
        <div className="text-danger text-xs py-1">{error}</div>
      )}

      {!loading && !summary && !error && (
        <div className="flex items-center gap-2 py-1">
          <span className="text-fg-muted text-xs">未分析</span>
          <button
            onClick={handleAnalyze}
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            开始分析
          </button>
        </div>
      )}
    </div>
  );
});

export default AnalysisPanel;
