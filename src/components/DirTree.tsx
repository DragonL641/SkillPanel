import { useState } from 'react';
import SkillCard from './SkillCard';

interface SkillMeta {
  name: string;
  description: string;
  enabled: boolean;
  hash: string;
  absolutePath?: string;
}

interface TreeNode {
  type: 'dir' | 'skill';
  name: string;
  path: string;
  children?: TreeNode[];
  skill?: SkillMeta;
}

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
  const [expanded, setExpanded] = useState(false);

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

  // Dir node — same visual style as PluginPanel
  const childCount = countSkills(node);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span
          className={`text-xs transition-transform duration-200 ${
            expanded ? 'rotate-90' : ''
          }`}
        >
          ▶
        </span>
        <span className="text-sm font-medium text-gray-800">
          {node.name}/
        </span>
        <span className="text-xs text-gray-400">({childCount})</span>
        <span className="ml-auto flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onBatchToggle?.(collectSkillPaths(node), true); }}
            className="text-xs text-blue-400 hover:text-blue-600 transition-colors"
          >
            全部启用
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onBatchToggle?.(collectSkillPaths(node), false); }}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            全部禁用
          </button>
        </span>
      </button>
      {expanded && (
        <div className="flex flex-col gap-2 p-3">
          {node.children?.map((child) => (
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
    </div>
  );
}

export default function DirTree({ nodes, onToggle, onBatchToggle, onDelete, filter }: Props) {
  if (!nodes.length) {
    return (
      <div className="text-gray-400 text-sm py-8 text-center">
        暂无自定义 skills
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-4">
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
