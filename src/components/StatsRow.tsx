interface Summary {
  customTotal: number;
  customEnabled: number;
  pluginTotal: number;
  grandTotal: number;
}

interface Props {
  data: Summary | null;
}

interface StatItem {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}

export default function StatsRow({ data }: Props) {
  const stats: StatItem[] = data
    ? [
        { label: '自定义技能', value: String(data.customTotal), sub: `共 ${data.customTotal} 个自定义技能` },
        { label: '已启用', value: String(data.customEnabled), sub: `${data.customTotal ? Math.round((data.customEnabled / data.customTotal) * 100) : 0}% 启用率`, accent: 'text-success' },
        { label: '插件技能', value: String(data.pluginTotal), sub: '来自已安装插件' },
        { label: '总计', value: String(data.grandTotal), sub: '所有技能总数' },
      ]
    : [
        { label: '自定义技能', value: '-', sub: '' },
        { label: '已启用', value: '-', sub: '' },
        { label: '插件技能', value: '-', sub: '' },
        { label: '总计', value: '-', sub: '' },
      ];

  return (
    <div className="flex gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex-1 flex flex-col gap-2 p-5 bg-surface-primary rounded-[var(--radius-lg)] border border-border"
        >
          <span className="text-xs font-medium text-fg-secondary">{stat.label}</span>
          <span className={`font-mono text-3xl font-bold text-fg-primary ${stat.accent ?? ''}`}>
            {stat.value}
          </span>
          {stat.sub && <span className="text-[11px] text-fg-muted">{stat.sub}</span>}
        </div>
      ))}
    </div>
  );
}
