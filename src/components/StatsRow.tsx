import { useTranslation } from 'react-i18next';
import type { Summary } from '../types';

interface Props {
  data: Summary | null;
}

export default function StatsRow({ data }: Props) {
  const { t } = useTranslation();

  const stats = data
    ? [
        { label: t('stats.customSkills'), value: String(data.customTotal), sub: t('stats.customCount', { count: data.customTotal }) },
        { label: t('stats.enabled'), value: String(data.customEnabled), sub: t('stats.enabledRate', { rate: data.customTotal ? Math.round((data.customEnabled / data.customTotal) * 100) : 0 }), accent: 'text-success' },
        { label: t('stats.pluginSkills'), value: String(data.pluginTotal), sub: t('stats.fromPlugins') },
        { label: t('stats.total'), value: String(data.grandTotal), sub: t('stats.totalDesc') },
      ]
    : [
        { label: t('stats.customSkills'), value: '-', sub: '' },
        { label: t('stats.enabled'), value: '-', sub: '' },
        { label: t('stats.pluginSkills'), value: '-', sub: '' },
        { label: t('stats.total'), value: '-', sub: '' },
      ];

  return (
    <div className="flex flex-wrap gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex-1 min-w-[140px] flex flex-col gap-2 p-5 bg-surface-primary rounded-[var(--radius-lg)] border border-border"
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
