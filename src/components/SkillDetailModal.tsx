import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchSkillContent } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';

interface Props {
  open: boolean;
  name: string;
  skillPath: string;
  onClose: () => void;
}

export default function SkillDetailModal({ open, name, skillPath, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const { t } = useTranslation();

  // Fetch SKILL.md content when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingContent(true);
    setContentError(null);
    setContent(null);
    fetchSkillContent(skillPath)
      .then(data => { if (!cancelled) setContent(data.content); })
      .catch(err => { if (!cancelled) setContentError(getErrorMessage(err)); })
      .finally(() => { if (!cancelled) setLoadingContent(false); });
    return () => { cancelled = true; };
  }, [open, skillPath]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-surface-primary rounded-[var(--radius-xl)] shadow-[0_4px_24px_rgba(0,0,0,0.1)] w-[720px] h-[740px] flex flex-col overflow-hidden mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border shrink-0">
          <span className="text-lg font-bold text-fg-primary truncate">{name}</span>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="p-1.5 text-fg-secondary hover:text-fg-primary hover:bg-surface-hover rounded-[var(--radius-md)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* SKILL.md content — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <span className="text-[11px] font-mono text-fg-muted tracking-wide">SKILL.md</span>
          {loadingContent && (
            <div className="text-fg-muted text-sm py-8 text-center">{t('app.loading')}</div>
          )}
          {contentError && (
            <div className="text-danger text-sm py-8 text-center">{contentError}</div>
          )}
          {content && (
            <div className="prose prose-xs prose-neutral max-w-none [&_h1]:text-sm [&_h1]:text-fg-primary [&_h2]:text-[13px] [&_h2]:text-fg-primary [&_h3]:text-xs [&_h3]:text-fg-primary [&_p]:text-[12px] [&_p]:leading-relaxed [&_p]:text-fg-secondary [&_li]:text-[12px] [&_li]:text-fg-secondary [&_code]:text-[11px] [&_code]:text-fg-primary [&_pre]:bg-surface-tertiary [&_pre]:rounded-[var(--radius-md)] [&_pre]:p-3 [&_pre]:text-[11px] [&_a]:text-accent [&_blockquote]:text-fg-secondary [&_table]:w-full [&_table]:text-[12px] [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-surface-tertiary [&_th]:text-fg-primary [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:text-fg-secondary">
              <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
