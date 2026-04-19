import { useTranslation } from 'react-i18next';
import GroupSection from './GroupSection';
import type { TreeNode, GroupedSkills } from '../types';

interface Props {
  groupedSkills: GroupedSkills | null;
  tree: TreeNode[];
  onToggle: (path: string, enable: boolean) => void;
  onDelete?: (path: string) => void;
  onDetail?: (path: string) => void;
  onAnalyze?: (path: string) => void;
  filter?: string;
  batchMode?: boolean;
  selectedSkills?: Set<string>;
  onToggleSelect?: (path: string) => void;
  onRenameGroup?: (groupId: string, newName: string) => void;
  onChangeColor?: (groupId: string, newColor: string) => void;
  onDeleteGroup?: (groupId: string) => void;
}

export default function GroupView({
  groupedSkills,
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

  if (!groupedSkills) {
    return (
      <div className="text-fg-muted text-sm py-8 text-center">
        {t('app.loading')}
      </div>
    );
  }

  const allGroups = [
    ...groupedSkills.groups,
    groupedSkills.other,
  ];

  // Check if any section has visible skills (after filter)
  const hasVisible = allGroups.some(g => {
    if (!filter) return g.skills.length > 0;
    return g.skills.some(path => {
      const f = filter.toLowerCase();
      function findSkill(nodes: TreeNode[]): TreeNode | undefined {
        for (const n of nodes) {
          if (n.path === path && n.type === 'skill') return n;
          if (n.children) { const r = findSkill(n.children); if (r) return r; }
        }
        return undefined;
      }
      const node = findSkill(tree);
      if (!node?.skill) return false;
      return node.skill.name.toLowerCase().includes(f) || node.skill.description.toLowerCase().includes(f);
    });
  });

  if (!hasVisible) {
    return (
      <div className="text-fg-muted text-sm py-8 text-center">
        {t('dirTree.empty')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groupedSkills.groups.map(group => (
        <GroupSection
          key={group.id}
          group={group}
          tree={tree}
          onToggle={onToggle}
          onDelete={onDelete}
          onDetail={onDetail}
          onAnalyze={onAnalyze}
          filter={filter}
          batchMode={batchMode}
          selectedSkills={selectedSkills}
          onToggleSelect={onToggleSelect}
          onRenameGroup={onRenameGroup}
          onChangeColor={onChangeColor}
          onDeleteGroup={onDeleteGroup}
        />
      ))}
      <GroupSection
        group={groupedSkills.other}
        isOther
        tree={tree}
        onToggle={onToggle}
        onDelete={onDelete}
        onDetail={onDetail}
        onAnalyze={onAnalyze}
        filter={filter}
        batchMode={batchMode}
        selectedSkills={selectedSkills}
        onToggleSelect={onToggleSelect}
      />
    </div>
  );
}
