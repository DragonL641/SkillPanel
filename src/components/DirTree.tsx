import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import SkillCard from './SkillCard';
import type { TreeNode } from '../types';

interface Props {
  nodes: TreeNode[];
  onToggle: (path: string, enable: boolean) => void;
  onBatchToggle?: (paths: string[], enable: boolean) => void;
  onDelete?: (path: string) => void;
  filter?: string;
}

function countSkills(node: TreeNode): number {
  if (node.type === 'skill') return 1;
  return (node.children ?? []).reduce((sum, c) => sum + countSkills(c), 0);
}

function nodeMatches(node: TreeNode, filter: string): boolean {
  if (node.type === 'skill') {
    const nameMatch = node.skill?.name.toLowerCase().includes(filter.toLowerCase());
    const descMatch = node.skill?.description.toLowerCase().includes(filter.toLowerCase());
    return !!(nameMatch || descMatch);
  }
  return (node.children ?? []).some((child) => nodeMatches(child, filter));
}

function collectSkillPaths(node: TreeNode): string[] {
  if (node.type === 'skill') return [node.path];
  return (node.children ?? []).flatMap(collectSkillPaths);
}

function TreeNodeItem({
  node,
  onToggle,
  onBatchToggle,
  onDelete,
  filter,
}: {
  node: TreeNode;
  onToggle: (path: string, enable: boolean) => void;
  onBatchToggle?: (paths: string[], enable: boolean) => void;
  onDelete?: (path: string) => void;
  filter?: string;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  if (filter && !nodeMatches(node, filter)) {
    return null;
  }

  if (node.type === 'skill') {
    return (
      <SkillCard
        skill={{
          name: node.skill!.name,
          description: node.skill!.description,
          enabled: node.skill!.enabled,
          absolutePath: node.skill!.absolutePath,
        }}
        path={node.path}
        source="custom"
        onToggle={onToggle}
        onDelete={onDelete}
      />
    );
  }

  const childCount = countSkills(node);
  const skills = (node.children ?? []).filter((c) => c.type === 'skill');
  const dirs = (node.children ?? []).filter((c) => c.type === 'dir');

  return (
    <div className="flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="flex items-center gap-1"
        >
          <ChevronRight
            size={16}
            className={`text-fg-muted transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />
          <span className="text-base font-semibold text-fg-primary">{node.name}</span>
        </button>
        <span className="flex items-center px-2 py-0.5 bg-surface-tertiary rounded-full text-[11px] font-medium text-fg-secondary">
          {t('dirTree.skillCount', { count: childCount })}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => onBatchToggle?.(collectSkillPaths(node), true)}
          className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
        >
          {t('dirTree.enableAll')}
        </button>
        <span className="text-xs text-fg-muted">|</span>
        <button
          onClick={() => onBatchToggle?.(collectSkillPaths(node), false)}
          className="text-xs font-medium text-fg-muted hover:text-danger transition-colors"
        >
          {t('dirTree.disableAll')}
        </button>
      </div>

      {/* Skills Grid */}
      {expanded && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills.map((child) => (
          <TreeNodeItem
            key={child.path}
            node={child}
            onToggle={onToggle}
            onBatchToggle={onBatchToggle}
            onDelete={onDelete}
            filter={filter}
          />
        ))}
      </div>
      )}

      {/* Nested dirs */}
      {expanded && dirs.map((child) => (
        <TreeNodeItem
          key={child.path}
          node={child}
          onToggle={onToggle}
          onBatchToggle={onBatchToggle}
          onDelete={onDelete}
          filter={filter}
        />
      ))}
    </div>
  );
}

export default function DirTree({ nodes, onToggle, onBatchToggle, onDelete, filter }: Props) {
  const { t } = useTranslation();

  if (!nodes.length) {
    return (
      <div className="text-fg-muted text-sm py-8 text-center">
        {t('dirTree.empty')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {nodes.map((node) => (
        <TreeNodeItem
          key={node.path}
          node={node}
          onToggle={onToggle}
          onBatchToggle={onBatchToggle}
          onDelete={onDelete}
          filter={filter}
        />
      ))}
    </div>
  );
}
