import { useState, useEffect } from 'react';
import { FileText, Trash2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SkillMeta } from '../types';

type SkillCardMeta = Pick<SkillMeta, 'name' | 'description' | 'enabled' | 'absolutePath'>;

interface Props {
  skill: SkillCardMeta;
  path: string;
  source: 'custom' | 'plugin';
  onToggle?: (path: string, enable: boolean) => void;
  onDelete?: (path: string) => void;
  onDetail?: (path: string) => void;
  onAnalyze?: (path: string) => void;
  groupLabel?: { name: string; color: string };
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export default function SkillCard({ skill, path, source, onToggle, onDelete, onDetail, onAnalyze, groupLabel, selectable, selected, onSelect }: Props) {
  const isPlugin = source === 'plugin';
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { t } = useTranslation();

  // Escape key to close delete confirmation dialog
  useEffect(() => {
    if (!confirmDelete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmDelete(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [confirmDelete]);

  return (
    <div className={`relative flex flex-col gap-3 p-4 bg-surface-primary rounded-[var(--radius-lg)] border transition-shadow hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${!isPlugin && skill.enabled ? 'border-success' : 'border-border'} ${selectable && selected ? 'ring-2 ring-accent' : ''}`}>
      {/* Checkbox overlay for selectable mode */}
      {selectable && (
        <label className="absolute top-3 left-3 cursor-pointer z-10">
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={() => onSelect?.()}
            className="w-4 h-4 accent-[var(--color-accent)]"
          />
        </label>
      )}
      {/* Top: name + badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-fg-primary truncate" title={skill.name}>{skill.name}</span>
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
      <div className="min-h-[2.5rem]">
        {skill.description && (
          <p className="text-xs text-fg-secondary leading-relaxed line-clamp-2">
            {skill.description}
          </p>
        )}
      </div>

      {/* Group label badge */}
      {groupLabel && (
        <span
          className="self-start text-[9px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: `${groupLabel.color}20`, color: groupLabel.color }}
        >
          {groupLabel.name}
        </span>
      )}

      {/* Actions row */}
      <div className="mt-auto flex items-center gap-2">
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
        <div className="flex-1" />
        {!isPlugin && onAnalyze && (
          <div className="relative group">
            <button
              onClick={() => onAnalyze(path)}
              aria-label={t('skill.analyzeAria')}
              className="p-1.5 text-accent rounded-[var(--radius-md)] hover:bg-accent-light transition-colors shrink-0"
            >
              <Sparkles size={14} />
            </button>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[10px] text-fg-inverse bg-fg-primary rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              {t('skill.analyzeAria')}
            </span>
          </div>
        )}
        {!isPlugin && onDetail && (
          <div className="relative group">
            <button
              onClick={() => onDetail(path)}
              aria-label={t('skill.detailAria')}
              className="p-1.5 text-accent rounded-[var(--radius-md)] hover:bg-accent-light transition-colors shrink-0"
            >
              <FileText size={14} />
            </button>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[10px] text-fg-inverse bg-fg-primary rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              {t('skill.detailAria')}
            </span>
          </div>
        )}
        {!isPlugin && onDelete && (
          <div className="relative group">
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label={t('skill.deleteAria')}
              className="p-1.5 text-danger rounded-[var(--radius-md)] hover:bg-danger-light transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[10px] text-fg-inverse bg-fg-primary rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
              {t('skill.deleteAria')}
            </span>
          </div>
        )}
      </div>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="bg-surface-primary rounded-[var(--radius-lg)] shadow-[0_4px_24px_rgba(0,0,0,0.1)] p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-fg-primary mb-4">
              {t('skill.confirmDelete', { name: skill.name })}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 text-sm text-fg-secondary border border-border rounded-[var(--radius-md)] hover:bg-surface-hover transition-colors"
              >
                {t('skill.cancel')}
              </button>
              <button
                onClick={() => { onDelete?.(path); setConfirmDelete(false); }}
                className="px-3 py-1.5 text-sm text-white bg-danger rounded-[var(--radius-md)] hover:bg-red-600 transition-colors"
              >
                {t('skill.deleteLabel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
