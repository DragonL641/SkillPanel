import { FolderCode, FolderTree, Puzzle } from 'lucide-react';

export type TabKey = 'global' | 'project' | 'plugin';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const tabs: { key: TabKey; label: string; icon: typeof FolderCode }[] = [
  { key: 'global', label: '全局 Skill 管理', icon: FolderCode },
  { key: 'project', label: '项目级 Skill 管理', icon: FolderTree },
  { key: 'plugin', label: '插件技能管理', icon: Puzzle },
];

export default function TabSwitch({ active, onChange }: Props) {
  return (
    <div className="flex gap-1 p-1 bg-surface-tertiary rounded-[var(--radius-md)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-[var(--radius-sm)] transition-all ${
              isActive
                ? 'bg-surface-primary text-fg-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                : 'text-fg-secondary hover:text-fg-primary'
            }`}
          >
            <Icon size={14} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
