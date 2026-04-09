import AnalysisPanel from './AnalysisPanel';

interface SkillMeta {
  name: string;
  description: string;
  enabled: boolean;
  absolutePath?: string;
}

interface Props {
  skill: SkillMeta;
  path: string;
  source: 'custom' | 'plugin';
  onToggle?: (path: string, enable: boolean) => void;
  onDelete?: (path: string) => void;
}

export default function SkillCard({ skill, path, source, onToggle, onDelete }: Props) {
  const isPlugin = source === 'plugin';

  const statusBadge = isPlugin ? null : skill.enabled ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600">
      已启用
    </span>
  ) : (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
      未启用
    </span>
  );

  const actionButton = !isPlugin && (
    <span className="flex items-center gap-2">
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
      <button
        onClick={() => {
          if (window.confirm(`确定删除 Skill「${skill.name}」？此操作不可撤销。`)) {
            onDelete?.(path);
          }
        }}
        className="text-xs px-2 py-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
      >
        删除
      </button>
    </span>
  );

  const borderClass = !isPlugin && skill.enabled
    ? 'border-green-500 border-2'
    : 'border-gray-200 border';

  return (
    <div className={`bg-white rounded-lg ${borderClass} p-4 hover:shadow-sm transition-shadow`}>
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

      {skill.absolutePath && (
        <p className="text-[10px] text-gray-400 mt-1 font-mono truncate">
          {skill.absolutePath}
        </p>
      )}

      <AnalysisPanel source={source} name={skill.name} />
    </div>
  );
}
