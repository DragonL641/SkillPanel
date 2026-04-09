import { useState } from 'react';
import SkillCard from './SkillCard';

interface SkillMeta {
  name: string;
  description: string;
  enabled: boolean;
  hash: string;
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
  filter?: string;
}

function nodeMatches(node: TreeNode, filter: string): boolean {
  if (node.type === 'skill') {
    const nameMatch = node.skill?.name.toLowerCase().includes(filter.toLowerCase());
    const descMatch = node.skill?.description.toLowerCase().includes(filter.toLowerCase());
    return !!(nameMatch || descMatch);
  }
  // Dir node: matches if any child matches
  return (node.children ?? []).some((child) => nodeMatches(child, filter));
}

function TreeNodeItem({
  node,
  onToggle,
  filter,
}: {
  node: TreeNode;
  onToggle: (path: string, enable: boolean) => void;
  filter?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  // Apply filter
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
        }}
        path={node.path}
        source="custom"
        onToggle={onToggle}
      />
    );
  }

  // Dir node
  const childCount = node.children?.length ?? 0;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 py-1 transition-colors"
      >
        <span className="text-[10px]">{expanded ? '\u25BC' : '\u25B6'}</span>
        <span className="font-medium">{node.name}/</span>
        <span className="text-gray-300 text-xs">({childCount})</span>
      </button>
      {expanded && (
        <div className="ml-4 flex flex-col gap-2 mt-1">
          {node.children?.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              onToggle={onToggle}
              filter={filter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DirTree({ nodes, onToggle, filter }: Props) {
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
          filter={filter}
        />
      ))}
    </div>
  );
}
