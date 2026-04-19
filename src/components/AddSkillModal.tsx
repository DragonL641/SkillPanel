import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Folder, Tag } from 'lucide-react';
import { fetchCustomSkills, batchEnableProjectSkills, fetchGroups } from '../api/client';
import type { TreeNode, GroupedSkills } from '../types';

interface Props {
  open: boolean;
  projectName: string;
  enabledPaths: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}

/** Recursively flatten all skills from tree */
function flattenSkills(tree: TreeNode[]): Array<{ name: string; path: string; description: string }> {
  const result: Array<{ name: string; path: string; description: string }> = [];
  function walk(nodes: TreeNode[]) {
    for (const node of nodes) {
      if (node.type === 'skill' && node.skill) {
        result.push({
          name: node.skill.name,
          path: node.path,
          description: node.skill.description,
        });
      }
      if (node.children) walk(node.children);
    }
  }
  walk(tree);
  return result;
}

export default function AddSkillModal({ open, projectName, enabledPaths, onClose, onAdded }: Props) {
  const { t } = useTranslation();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'folder' | 'group'>('folder');
  const [groupedSkills, setGroupedSkills] = useState<GroupedSkills | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setSelected(new Set());
      setError(null);
      setViewMode('folder');
      fetchCustomSkills()
        .then(data => setTree(data.tree))
        .catch(console.error)
        .finally(() => setLoading(false));
      fetchGroups()
        .then(data => setGroupedSkills(data))
        .catch(() => setGroupedSkills(null));
    }
  }, [open]);

  if (!open) return null;

  // Flatten all skills recursively, filter out already-enabled
  const allSkills = flattenSkills(tree).filter(s => !enabledPaths.has(s.path));

  // Build group-organized skill map
  const skillsByGroup: Map<string, Array<{ name: string; path: string; description: string; groupName: string; groupColor: string }>> = new Map();
  const groupedSkillPaths = new Set<string>();

  if (groupedSkills) {
    for (const group of groupedSkills.groups) {
      const groupSkills: Array<{ name: string; path: string; description: string; groupName: string; groupColor: string }> = [];
      for (const skillPath of group.skills) {
        const skill = allSkills.find(s => s.path === skillPath);
        if (skill) {
          groupSkills.push({ ...skill, groupName: group.name, groupColor: group.color });
          groupedSkillPaths.add(skillPath);
        }
      }
      skillsByGroup.set(group.id, groupSkills);
    }
    // Other group
    const otherSkills = allSkills.filter(s => !groupedSkillPaths.has(s.path));
    if (otherSkills.length > 0) {
      skillsByGroup.set('__other__', otherSkills.map(s => ({ ...s, groupName: '', groupColor: '' })));
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

  // Sort by dir for folder view
  const skillsByDir = new Map<string, typeof allSkills>();
  for (const skill of allSkills) {
    const parts = skill.path.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    if (!skillsByDir.has(dir)) skillsByDir.set(dir, []);
    skillsByDir.get(dir)!.push(skill);
  }

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

        {/* View Toggle */}
        {!loading && allSkills.length > 0 && (
          <div className="flex items-center gap-1 px-6 pt-3">
            <div className="flex items-center gap-1 bg-surface-tertiary rounded-[var(--radius-md)] p-0.5">
              <button
                onClick={() => setViewMode('folder')}
                className={`flex items-center gap-1 px-3 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors ${viewMode === 'folder' ? 'bg-accent text-fg-inverse' : 'text-fg-secondary'}`}
              >
                <Folder size={12} /> {t('group.folder')}
              </button>
              <button
                onClick={() => setViewMode('group')}
                className={`flex items-center gap-1 px-3 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors ${viewMode === 'group' ? 'bg-accent text-fg-inverse' : 'text-fg-secondary'}`}
              >
                <Tag size={12} /> {t('group.group')}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
          {loading && <div className="text-fg-muted text-sm text-center py-4">{t('addSkill.loading')}</div>}
          {!loading && allSkills.length === 0 && (
            <div className="text-fg-muted text-sm text-center py-4">{t('addSkill.allAdded')}</div>
          )}

          {/* Folder view */}
          {!loading && viewMode === 'folder' && allSkills.map(skill => (
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
                <span className="text-[10px] text-fg-muted">{skill.path.split('/').slice(0, -1).join('/') || '/'}</span>
              </div>
            </label>
          ))}

          {/* Group view */}
          {!loading && viewMode === 'group' && groupedSkills && (() => {
            const sections: Array<{ key: string; name: string; color: string; skills: Array<{ name: string; path: string; description: string; groupName: string; groupColor: string }> }> = [];
            for (const group of groupedSkills.groups) {
              const gs = skillsByGroup.get(group.id);
              if (gs && gs.length > 0) {
                sections.push({ key: group.id, name: group.name, color: group.color, skills: gs });
              }
            }
            const other = skillsByGroup.get('__other__');
            if (other && other.length > 0) {
              sections.push({ key: '__other__', name: t('group.other'), color: '#888888', skills: other });
            }
            return sections.map(section => (
              <div key={section.key} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: section.color }} />
                  <span className="text-[12px] font-semibold text-fg-primary">{section.name}</span>
                  <span className="text-[10px] text-fg-muted">({section.skills.length})</span>
                </div>
                {section.skills.map(skill => (
                  <label
                    key={skill.path}
                    className="flex items-center gap-3 p-3 ml-4 bg-surface-primary border border-border rounded-[var(--radius-md)] hover:bg-surface-hover transition-colors cursor-pointer"
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
                    </div>
                    {skill.groupName && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                        style={{ backgroundColor: `${skill.groupColor}20`, color: skill.groupColor }}
                      >
                        {skill.groupName}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            ));
          })()}
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
