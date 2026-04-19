import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Palette, Trash2, Check, X } from 'lucide-react';
import type { SkillGroup } from '../types';

const PRESET_COLORS = ['#4A9FD8', '#F59E0B', '#22C55E', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

interface Props {
  group: SkillGroup;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
  onChangeColor: (newColor: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function GroupEditDropdown({ group, onClose, onRename, onChangeColor, onDelete }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'menu' | 'rename' | 'color' | 'confirmDelete'>('menu');
  const [renameValue, setRenameValue] = useState(group.name);
  const [loading, setLoading] = useState(false);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleRename = async () => {
    if (!renameValue.trim() || renameValue.trim() === group.name) { setMode('menu'); return; }
    setLoading(true);
    try { await onRename(renameValue.trim()); } finally { setLoading(false); }
  };

  const handleChangeColor = async (color: string) => {
    if (color === group.color) { setMode('menu'); return; }
    setLoading(true);
    try { await onChangeColor(color); } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    setLoading(true);
    try { await onDelete(); } finally { setLoading(false); }
  };

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 bg-surface-primary border border-border rounded-[var(--radius-lg)] shadow-[0_4px_16px_rgba(0,0,0,0.1)] w-52 overflow-hidden"
    >
      {mode === 'menu' && (
        <div className="py-1">
          <button
            onClick={() => setMode('rename')}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-fg-primary hover:bg-surface-hover transition-colors"
          >
            <Pencil size={14} className="text-fg-muted" />
            {t('group.rename')}
          </button>
          <button
            onClick={() => setMode('color')}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-fg-primary hover:bg-surface-hover transition-colors"
          >
            <Palette size={14} className="text-fg-muted" />
            {t('group.changeColor')}
          </button>
          <button
            onClick={() => setMode('confirmDelete')}
            className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-danger hover:bg-danger-light transition-colors"
          >
            <Trash2 size={14} />
            {t('group.deleteGroup')}
          </button>
        </div>
      )}

      {mode === 'rename' && (
        <div className="p-3 flex flex-col gap-2">
          <span className="text-[11px] font-medium text-fg-secondary">{t('group.rename')}</span>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              className="flex-1 text-[12px] px-2 py-1 border border-border rounded-[var(--radius-sm)] bg-transparent text-fg-primary focus:outline-none focus:border-accent"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setMode('menu'); }}
            />
            <button onClick={handleRename} disabled={loading} className="p-1 text-accent hover:bg-accent-light rounded transition-colors">
              <Check size={14} />
            </button>
            <button onClick={() => setMode('menu')} className="p-1 text-fg-muted hover:text-fg-primary rounded transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {mode === 'color' && (
        <div className="p-3 flex flex-col gap-2">
          <span className="text-[11px] font-medium text-fg-secondary">{t('group.changeColor')}</span>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => handleChangeColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${group.color === c ? 'border-fg-primary scale-110' : 'border-transparent hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}

      {mode === 'confirmDelete' && (
        <div className="p-3 flex flex-col gap-2">
          <span className="text-[12px] text-fg-primary">{t('group.confirmDelete', { name: group.name })}</span>
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setMode('menu')}
              className="px-2.5 py-1 text-[11px] text-fg-secondary border border-border rounded-[var(--radius-sm)] hover:bg-surface-hover transition-colors"
            >
              {t('skill.cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-2.5 py-1 text-[11px] text-fg-inverse bg-danger rounded-[var(--radius-sm)] hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {t('group.deleteGroup')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
