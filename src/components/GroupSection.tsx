import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Pencil } from 'lucide-react';
import SkillCard from './SkillCard';
import GroupEditDropdown from './GroupEditDropdown';
import type { TreeNode, SkillGroup } from '../types';

interface Props {
  group: SkillGroup | { name: string; color: string; skills: string[] };
  isOther?: boolean;
  tree: TreeNode[];
  onToggle: (path: string, enable: boolean) => void;
  onDelete?: (path: string) => void;
  onDetail?: (path: string) => void;
  onAnalyze?: (path: string) => void;
  filter?: string;
  batchMode?: boolean;
  selectedSkills?: Set<string>;
  onToggleSelect?: (path: string) => void;
  onEditGroup?: (groupId: string) => void;
  onRenameGroup?: (groupId: string, newName: string) => void;
  onChangeColor?: (groupId: string, newColor: string) => void;
  onDeleteGroup?: (groupId: string) => void;
}

/** Recursively find a skill node by path in the tree */
function findSkillInTree(tree: TreeNode[], path: string): TreeNode | undefined {
  for (const node of tree) {
    if (node.path === path && node.type === 'skill') return node;
    if (node.children) {
      const found = findSkillInTree(node.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

export default function GroupSection({
  group,
  isOther,
  tree,
  onToggle,
  onDelete,
  onDetail,
  onAnalyze,
  filter,
  batchMode,
  selectedSkills,
  onToggleSelect,
  onRenameGroup,
  onChangeColor,
  onDeleteGroup,
}: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const groupId = 'id' in group ? group.id : undefined;

  // Resolve skill metadata from tree
  const skills = group.skills
    .map(path => {
      const node = findSkillInTree(tree, path);
      if (!node || !node.skill) return null;
      // Apply filter
      if (filter) {
        const f = filter.toLowerCase();
        const nameMatch = node.skill.name.toLowerCase().includes(f);
        const descMatch = node.skill.description.toLowerCase().includes(f);
        if (!nameMatch && !descMatch) return null;
      }
      return { node, path };
    })
    .filter(Boolean) as Array<{ node: TreeNode; path: string }>;

  if (filter && skills.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="flex items-center gap-1">
          <ChevronRight
            size={16}
            className={`text-fg-muted transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: isOther ? '#888888' : group.color }}
          />
          <span className={`text-base font-semibold ${isOther ? 'text-fg-muted' : 'text-fg-primary'}`}>
            {group.name}
          </span>
        </button>
        <span className="flex items-center px-2 py-0.5 bg-surface-tertiary rounded-full text-[11px] font-medium text-fg-secondary">
          {t('dirTree.skillCount', { count: skills.length })}
        </span>
        {!isOther && groupId && (
          <div className="relative">
            <button
              onClick={() => setEditOpen(!editOpen)}
              className="p-1 text-fg-muted hover:text-fg-primary hover:bg-surface-hover rounded-[var(--radius-md)] transition-colors"
            >
              <Pencil size={14} />
            </button>
            {editOpen && (
              <GroupEditDropdown
                group={{ id: groupId, name: group.name, color: group.color, skills: group.skills }}
                onClose={() => setEditOpen(false)}
                onRename={async (newName) => { await onRenameGroup?.(groupId, newName); setEditOpen(false); }}
                onChangeColor={async (newColor) => { await onChangeColor?.(groupId, newColor); setEditOpen(false); }}
                onDelete={async () => { await onDeleteGroup?.(groupId); setEditOpen(false); }}
              />
            )}
          </div>
        )}
      </div>

      {/* Skills Grid */}
      {expanded && (
        skills.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map(({ node, path }) => (
              <div key={path} className="relative">
                {batchMode && (
                  <label className="absolute top-3 left-3 z-10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSkills?.has(path) ?? false}
                      onChange={() => onToggleSelect?.(path)}
                      className="w-4 h-4 accent-[var(--color-accent)]"
                    />
                  </label>
                )}
                <div className={batchMode && selectedSkills?.has(path) ? 'ring-2 ring-accent rounded-[var(--radius-lg)]' : ''}>
                  <SkillCard
                    skill={{
                      name: node.skill!.name,
                      description: node.skill!.description,
                      enabled: node.skill!.enabled,
                      absolutePath: node.skill!.absolutePath,
                    }}
                    path={path}
                    source="custom"
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onDetail={onDetail}
                    onAnalyze={onAnalyze}
                    groupLabel={isOther ? undefined : { name: group.name, color: group.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-fg-muted text-sm py-4 text-center">
            {t('group.emptyGroup')}
          </div>
        )
      )}
    </div>
  );
}
