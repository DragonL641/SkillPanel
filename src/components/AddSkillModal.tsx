import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { fetchCustomSkills, enableProjectSkill } from '../api/client';
import type { TreeNode } from '../types';

interface Props {
  open: boolean;
  projectName: string;
  onClose: () => void;
  onAdded: () => void;
}

export default function AddSkillModal({ open, projectName, onClose, onAdded }: Props) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchCustomSkills()
        .then(data => setTree(data.tree))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open]);

  if (!open) return null;

  const handleAdd = async (skillPath: string) => {
    setAdding(skillPath);
    try {
      await enableProjectSkill(projectName, skillPath);
      onAdded();
    } catch (err) {
      console.error('Failed to add skill:', err);
    } finally {
      setAdding(null);
    }
  };

  // Flatten tree to get all skills
  const allSkills: Array<{ name: string; path: string; description: string; dirName: string }> = [];
  for (const dir of tree) {
    if (dir.children) {
      for (const child of dir.children) {
        if (child.type === 'skill' && child.skill) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-surface-primary rounded-[var(--radius-xl)] shadow-[0_4px_24px_rgba(0,0,0,0.1)] w-full max-w-[600px] max-h-[80vh] mx-4 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center px-6 py-4 border-b border-border">
          <h3 className="text-base font-bold text-fg-primary">添加技能到「{projectName}」</h3>
          <div className="flex-1" />
          <button onClick={onClose} className="text-fg-secondary hover:text-fg-primary">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
          {loading && <div className="text-fg-muted text-sm text-center py-4">加载中...</div>}
          {!loading && allSkills.length === 0 && (
            <div className="text-fg-muted text-sm text-center py-4">暂无可添加的技能</div>
          )}
          {!loading && allSkills.map(skill => (
            <div
              key={skill.path}
              className="flex items-center gap-3 p-3 bg-surface-primary border border-border rounded-[var(--radius-md)] hover:bg-surface-hover transition-colors"
            >
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[13px] font-medium text-fg-primary">{skill.name}</span>
                {skill.description && (
                  <span className="text-[11px] text-fg-secondary line-clamp-1">{skill.description}</span>
                )}
                <span className="text-[10px] text-fg-muted">{skill.dirName}</span>
              </div>
              <button
                onClick={() => handleAdd(skill.path)}
                disabled={adding === skill.path}
                className="px-2.5 py-1 text-[11px] font-medium text-accent border border-border rounded-[var(--radius-md)] hover:bg-accent-light disabled:opacity-50 transition-colors shrink-0"
              >
                {adding === skill.path ? '添加中...' : '添加'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
