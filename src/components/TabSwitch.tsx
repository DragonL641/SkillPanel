import { FolderCode, Puzzle } from 'lucide-react';

interface Props {
  active: 'custom' | 'plugin';
  onChange: (tab: 'custom' | 'plugin') => void;
}

const tabs: { key: 'custom' | 'plugin'; label: string; icon: typeof FolderCode }[] = [
  { key: 'custom', label: '自定义技能', icon: FolderCode },
  { key: 'plugin', label: '插件管理', icon: Puzzle },
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
