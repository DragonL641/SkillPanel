import { useState, useRef } from 'react';
import { Sparkles, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AnalysisPanel, { type AnalysisPanelHandle } from './AnalysisPanel';
import type { SkillMeta } from '../types';

type SkillCardMeta = Pick<SkillMeta, 'name' | 'description' | 'enabled' | 'absolutePath'>;

interface Props {
  skill: SkillCardMeta;
  path: string;
  source: 'custom' | 'plugin';
  onToggle?: (path: string, enable: boolean) => void;
  onDelete?: (path: string) => void;
}

export default function SkillCard({ skill, path, source, onToggle, onDelete }: Props) {
  const isPlugin = source === 'plugin';
  const [analyzing, setAnalyzing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const analysisRef = useRef<AnalysisPanelHandle>(null);
  const { t } = useTranslation();

  return (
    <div className={`flex flex-col gap-3 p-4 bg-surface-primary rounded-[var(--radius-lg)] border transition-shadow hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${!isPlugin && skill.enabled ? 'border-success' : 'border-border'}`}>
      {/* Top: name + badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-fg-primary">{skill.name}</span>
          {!isPlugin && (
            skill.enabled ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-success-light text-success text-[10px] font-semibold rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                {t('skill.enabled')}
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-surface-tertiary text-fg-muted text-[10px] font-medium rounded-full">
                {t('skill.disabled')}
              </span>
            )
          )}
        </div>
      </div>

      {/* Description */}
      {skill.description && (
        <p className="text-xs text-fg-secondary leading-relaxed line-clamp-2">
          {skill.description}
        </p>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-2">
        {!isPlugin && onToggle && (
          <button
            onClick={() => onToggle(path, !skill.enabled)}
            role="switch"
            aria-checked={skill.enabled}
            aria-label={skill.enabled ? t('skill.disableAria') : t('skill.enableAria')}
            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${skill.enabled ? 'bg-accent' : 'bg-border'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-fg-inverse transition-transform ${skill.enabled ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        )}
        <button
          onClick={() => analysisRef.current?.triggerAnalysis()}
          disabled={analyzing}
          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-accent border border-border rounded-[var(--radius-md)] transition-colors shrink-0 ${analyzing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent-light'}`}
        >
          <Sparkles size={12} className={analyzing ? 'animate-pulse' : ''} />
          {analyzing ? t('skill.analyzing') : t('skill.analyze')}
        </button>
        <div className="flex-1" />
        {!isPlugin && onDelete && (
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label={t('skill.deleteAria')}
            className="p-1.5 text-danger rounded-[var(--radius-md)] hover:bg-danger-light transition-colors shrink-0"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-danger">{t('skill.confirmDelete', { name: skill.name })}</span>
          <button
            onClick={() => { onDelete?.(path); setConfirmDelete(false); }}
            className="px-2 py-1 text-white bg-danger rounded hover:bg-red-600 transition-colors"
          >
            {t('skill.deleteLabel')}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-2 py-1 text-fg-secondary border border-border rounded hover:bg-surface-hover transition-colors"
          >
            {t('skill.cancel')}
          </button>
        </div>
      )}

      {/* Analysis panel */}
      <AnalysisPanel ref={analysisRef} source={source} name={skill.name} onLoadingChange={setAnalyzing} />
    </div>
  );
}
