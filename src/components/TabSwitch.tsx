interface Props {
  active: 'custom' | 'plugin';
  onChange: (tab: 'custom' | 'plugin') => void;
}

const tabs: { key: 'custom' | 'plugin'; label: string }[] = [
  { key: 'custom', label: '自定义 Skills' },
  { key: 'plugin', label: '插件 Skills' },
];

export default function TabSwitch({ active, onChange }: Props) {
  return (
    <div className="flex border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            active === tab.key
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
