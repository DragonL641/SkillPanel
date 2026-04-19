import { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchAnalysis, triggerAnalysis } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';

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
  const { t, i18n } = useTranslation();

  const getLang = useCallback(() => i18n.language === 'en' ? 'en' : 'zh', [i18n.language]);

  const handleAnalyze = async () => {
    if (loading) return;
    setLoading(true);
    onLoadingChange?.(true);
    setError(null);
    const start = Date.now();
    try {
      const data = await triggerAnalysis(source, name, getLang());
      const remaining = MIN_LOADING_MS - (Date.now() - start);
      if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
      setSummary(data.summary);
      setAnalyzedAt(data.analyzedAt);
    } catch (err: unknown) {
      const code = (err as any)?.code;
      if (code === 'ANALYSIS_ERROR') {
        setError(t('analysis.apiNotConfigured'));
      } else {
        setError(getErrorMessage(err) || t('analysis.failed'));
      }
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  useImperativeHandle(ref, () => ({
    triggerAnalysis: () => {
      setExpanded(true);
      setTimeout(handleAnalyze, 0);
    },
  }));

  const handleExpand = async () => {
    if (!expanded) {
      setExpanded(true);
      if (!loaded) {
        setLoading(true);
        try {
          const data = await fetchAnalysis(source, name, getLang());
          if (data.summary) {
            setSummary(data.summary);
            setAnalyzedAt(data.analyzedAt);
          }
        } catch {
          // Cache fetch failure is non-critical
        } finally {
          setLoaded(true);
          setLoading(false);
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
        {t('analysis.expand')}
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
        {t('analysis.collapse')}
      </button>

      {loading && (
        <div className="text-fg-muted text-xs py-2">
          {t('analysis.loading')}
        </div>
      )}

      {!loading && summary && (
        <div>
          <div className="prose prose-xs prose-neutral max-w-none [&_h1]:text-sm [&_h1]:text-fg-primary [&_h2]:text-[13px] [&_h2]:text-fg-primary [&_h3]:text-xs [&_h3]:text-fg-primary [&_p]:text-[12px] [&_p]:leading-relaxed [&_p]:text-fg-secondary [&_li]:text-[12px] [&_li]:text-fg-secondary [&_code]:text-[11px] [&_code]:text-fg-primary [&_pre]:bg-surface-tertiary [&_pre]:rounded-[var(--radius-md)] [&_pre]:p-3 [&_pre]:text-[11px] [&_a]:text-accent [&_blockquote]:text-fg-secondary [&_table]:w-full [&_table]:text-[12px] [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-surface-tertiary [&_th]:text-fg-primary [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:text-fg-secondary">
            <Markdown remarkPlugins={[remarkGfm]}>{summary}</Markdown>
          </div>
          {analyzedAt && (
            <p className="text-fg-muted text-[10px] mt-1 font-mono">
              {t('analysis.timestamp', { date: new Date(analyzedAt).toLocaleString(i18n.language) })}
            </p>
          )}
          <button
            onClick={handleAnalyze}
            className="text-[11px] text-accent hover:text-accent-hover transition-colors mt-2"
          >
            {t('analysis.reanalyze')}
          </button>
        </div>
      )}

      {!loading && error && (
        <div className="text-danger text-xs py-1">{error}</div>
      )}

      {!loading && !summary && !error && (
        <div className="flex items-center gap-2 py-1">
          <span className="text-fg-muted text-xs">{t('analysis.notAnalyzed')}</span>
          <button
            onClick={handleAnalyze}
            className="text-xs text-accent hover:text-accent-hover transition-colors"
          >
            {t('analysis.startAnalysis')}
          </button>
        </div>
      )}
    </div>
  );
});

export default AnalysisPanel;
