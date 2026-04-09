import AnalysisPanel from './AnalysisPanel';

interface SkillMeta {
  name: string;
  description: string;
  enabled: boolean;
}

interface Props {
  skill: SkillMeta;
  path: string;
  source: 'custom' | 'plugin';
  onToggle?: (path: string, enable: boolean) => void;
}

export default function SkillCard({ skill, path, source, onToggle }: Props) {
  const isPlugin = source === 'plugin';

  const statusBadge = isPlugin ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
      只读
    </span>
  ) : skill.enabled ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600">
      已启用
    </span>
  ) : (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
      未启用
    </span>
  );

  const actionButton = !isPlugin && (
    <button
      onClick={() => onToggle?.(path, !skill.enabled)}
      className={`text-xs px-3 py-1 rounded transition-colors ${
        skill.enabled
          ? 'text-gray-500 hover:bg-gray-100 hover:text-red-500'
          : 'text-blue-500 hover:bg-blue-50'
      }`}
    >
      {skill.enabled ? '禁用' : '启用'}
    </button>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-800">
            {skill.name}
          </span>
          {statusBadge}
        </div>
        {actionButton}
      </div>

      {skill.description && (
        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
          {skill.description}
        </p>
      )}

      <AnalysisPanel source={source} name={skill.name} />
    </div>
  );
}
