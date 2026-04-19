import { useState, useEffect, useCallback } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchAnalysis, triggerAnalysis } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';

interface Props {
  open: boolean;
  name: string;
  onClose: () => void;
}

export default function AnalysisModal({ open, name, onClose }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { t, i18n } = useTranslation();

  const getLang = useCallback(() => i18n.language === 'en' ? 'en' : 'zh', [i18n.language]);

  // Fetch cached analysis when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSummary(null);
    setAnalyzedAt(null);
    fetchAnalysis('custom', name, getLang())
      .then(data => {
        if (!cancelled && data.summary) {
          setSummary(data.summary);
          setAnalyzedAt(data.analyzedAt);
        }
      })
      .catch(err => { if (!cancelled) setError(getErrorMessage(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, name, getLang]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const data = await triggerAnalysis('custom', name, getLang());
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
      setAnalyzing(false);
    }
  }, [name, t, getLang]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-surface-primary rounded-[var(--radius-xl)] shadow-[0_4px_24px_rgba(0,0,0,0.1)] w-[520px] max-h-[600px] flex flex-col overflow-hidden mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border shrink-0">
          <Sparkles size={16} className="text-accent" />
          <span className="text-lg font-bold text-fg-primary truncate">{name}</span>
          <span className="text-fg-muted text-xs">·</span>
          <span className="text-fg-muted text-xs">{t('analysis.title')}</span>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="p-1.5 text-fg-secondary hover:text-fg-primary hover:bg-surface-hover rounded-[var(--radius-md)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="text-fg-muted text-sm py-8 text-center">{t('app.loading')}</div>
          )}

          {!loading && error && (
            <div className="text-danger text-sm py-4">{error}</div>
          )}

          {!loading && !error && summary && (
            <div className="space-y-3">
              <div className="prose prose-xs prose-neutral max-w-none [&_h1]:text-sm [&_h1]:text-fg-primary [&_h2]:text-[13px] [&_h2]:text-fg-primary [&_h3]:text-xs [&_h3]:text-fg-primary [&_p]:text-[12px] [&_p]:leading-relaxed [&_p]:text-fg-secondary [&_li]:text-[12px] [&_li]:text-fg-secondary [&_code]:text-[11px] [&_code]:text-fg-primary [&_pre]:bg-surface-tertiary [&_pre]:rounded-[var(--radius-md)] [&_pre]:p-3 [&_pre]:text-[11px] [&_a]:text-accent [&_blockquote]:text-fg-secondary [&_table]:w-full [&_table]:text-[12px] [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-surface-tertiary [&_th]:text-fg-primary [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:text-fg-secondary">
                <Markdown remarkPlugins={[remarkGfm]}>{summary}</Markdown>
              </div>
              {analyzedAt && (
                <p className="text-fg-muted text-[10px] font-mono">
                  {t('analysis.timestamp', { date: new Date(analyzedAt).toLocaleString(i18n.language) })}
                </p>
              )}
            </div>
          )}

          {!loading && !error && !summary && (
            <div className="text-fg-muted text-sm py-8 text-center">{t('analysis.notAnalyzed')}</div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 shrink-0 flex items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-accent border border-border rounded-[var(--radius-md)] transition-colors ${analyzing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent-light'}`}
          >
            <Sparkles size={12} className={analyzing ? 'animate-pulse' : ''} />
            {analyzing ? t('skill.analyzing') : (summary ? t('analysis.reanalyze') : t('analysis.startAnalysis'))}
          </button>
        </div>
      </div>
    </div>
  );
}
