import { useTranslation } from 'react-i18next';
import { FolderCode, FolderTree, Puzzle } from 'lucide-react';

export type TabKey = 'global' | 'project' | 'plugin';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const tabKeys: { key: TabKey; labelKey: string; icon: typeof FolderCode }[] = [
  { key: 'global', labelKey: 'tab.global', icon: FolderCode },
  { key: 'project', labelKey: 'tab.project', icon: FolderTree },
  { key: 'plugin', labelKey: 'tab.plugin', icon: Puzzle },
];

export default function TabSwitch({ active, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-1 p-1 bg-surface-tertiary rounded-[var(--radius-md)]">
      {tabKeys.map((tab) => {
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
            {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
