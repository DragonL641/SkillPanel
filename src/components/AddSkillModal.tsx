import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { fetchCustomSkills, batchEnableProjectSkills } from '../api/client';
import type { TreeNode } from '../types';

interface Props {
  open: boolean;
  projectName: string;
  enabledPaths: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddSkillModal({ open, projectName, enabledPaths, onClose, onAdded }: Props) {
  const { t } = useTranslation();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setSelected(new Set());
      setError(null);
      fetchCustomSkills()
        .then(data => setTree(data.tree))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open]);

  if (!open) return null;

  // Flatten tree, filter out already-enabled skills
  const allSkills: Array<{ name: string; path: string; description: string; dirName: string }> = [];
  for (const dir of tree) {
    if (dir.children) {
      for (const child of dir.children) {
        if (child.type === 'skill' && child.skill && !enabledPaths.has(child.path)) {
          allSkills.push({
            name: child.skill.name,
            path: child.path,
            description: child.skill.description,
            dirName: dir.name,
          });
        }
      }
    }
  }

  const toggleSelect = (path: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await batchEnableProjectSkills(projectName, [...selected]);
      if (result.failed && result.failed.length > 0) {
        setError(t('addSkill.batchFailed', { count: result.failed.length, paths: result.failed.map(f => f.path).join(', ') }));
      } else {
        onAdded();
        onClose();
      }
    } catch (err) {
      setError(t('addSkill.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-surface-primary rounded-[var(--radius-xl)] shadow-[0_4px_24px_rgba(0,0,0,0.1)] w-full max-w-[600px] max-h-[80vh] mx-4 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center px-6 py-4 border-b border-border">
          <h3 className="text-base font-bold text-fg-primary">{t('addSkill.title', { name: projectName })}</h3>
          <div className="flex-1" />
          <button onClick={onClose} className="text-fg-secondary hover:text-fg-primary">
            <X size={18} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-3 px-3 py-2 bg-danger-light text-danger text-xs rounded-[var(--radius-md)] flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-danger font-bold ml-2">×</button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
          {loading && <div className="text-fg-muted text-sm text-center py-4">{t('addSkill.loading')}</div>}
          {!loading && allSkills.length === 0 && (
            <div className="text-fg-muted text-sm text-center py-4">{t('addSkill.allAdded')}</div>
          )}
          {!loading && allSkills.map(skill => (
            <label
              key={skill.path}
              className="flex items-center gap-3 p-3 bg-surface-primary border border-border rounded-[var(--radius-md)] hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(skill.path)}
                onChange={() => toggleSelect(skill.path)}
                className="w-4 h-4 shrink-0 accent-[var(--color-accent)]"
              />
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[13px] font-medium text-fg-primary">{skill.name}</span>
                {skill.description && (
                  <span className="text-[11px] text-fg-secondary line-clamp-1">{skill.description}</span>
                )}
                <span className="text-[10px] text-fg-muted">{skill.dirName}</span>
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        {!loading && allSkills.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <span className="text-xs text-fg-muted">
              {selected.size > 0 ? t('addSkill.selected', { count: selected.size }) : t('addSkill.selectPrompt')}
            </span>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0 || submitting}
              className="px-4 py-1.5 bg-accent text-fg-inverse rounded-[var(--radius-md)] text-xs font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? t('addSkill.adding') : t('addSkill.confirm')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
