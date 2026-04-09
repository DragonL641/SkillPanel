import { useState } from 'react';
import SkillCard from './SkillCard';
import { checkPluginUpdate } from '../api/client';

interface PluginSkill {
  name: string;
  description: string;
  path: string;
}

interface PluginInfo {
  name: string;
  displayName: string;
  installPath: string;
  version: string;
  lastUpdated: string;
  skills: PluginSkill[];
}

interface Props {
  plugins: PluginInfo[];
  filter?: string;
}

type UpdateStatus = { hasUpdate: boolean; behindBy: number } | { error: string } | null;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('zh-CN');
  } catch {
    return iso;
  }
}

function PluginHeader({ plugin, isOpen, onToggle }: {
  plugin: PluginInfo;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(null);
  const [isGitRepo, setIsGitRepo] = useState<boolean | null>(null);

  const handleCheckUpdate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setChecking(true);
    setUpdateStatus(null);
    try {
      const result = await checkPluginUpdate(plugin.name);
      setIsGitRepo(result.isGitRepo ?? true);
      if (result.error) {
        setUpdateStatus({ error: result.error });
      } else {
        setUpdateStatus({ hasUpdate: result.hasUpdate, behindBy: result.behindBy });
      }
    } catch (err: any) {
      setUpdateStatus({ error: err.message || '检查失败' });
    } finally {
      setChecking(false);
    }
  };

  const versionLabel = plugin.version !== 'unknown'
    ? `v${plugin.version}`
    : '';
  const dateLabel = plugin.lastUpdated
    ? formatDate(plugin.lastUpdated)
    : '';

  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
    >
      <span className={`text-xs transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
        ▶
      </span>
      <span className="text-sm font-medium text-gray-800">{plugin.displayName}</span>
      <span className="text-xs text-gray-400">({plugin.skills.length})</span>
      {versionLabel && (
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{versionLabel}</span>
      )}
      <span className="ml-auto flex items-center gap-2">
        {updateStatus && !('error' in updateStatus) && !updateStatus.hasUpdate && (
          <span className="text-xs text-green-500">已是最新 ✓</span>
        )}
        {updateStatus && !('error' in updateStatus) && updateStatus.hasUpdate && (
          <span className="text-xs text-amber-500">落后 {updateStatus.behindBy} 个 commit</span>
        )}
        {updateStatus && 'error' in updateStatus && (
          <span className="text-xs text-red-400">{updateStatus.error}</span>
        )}
        {(isGitRepo === null || isGitRepo === true) && (
          <button
            onClick={handleCheckUpdate}
            disabled={checking}
            className="text-xs text-gray-400 hover:text-blue-500 disabled:opacity-50 transition-colors"
          >
            {checking ? '检查中...' : '检查更新'}
          </button>
        )}
        {dateLabel && (
          <span className="text-[10px] text-gray-400">{dateLabel}</span>
        )}
      </span>
    </button>
  );
}

export default function PluginPanel({ plugins, filter }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (pluginName: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(pluginName)) {
        next.delete(pluginName);
      } else {
        next.add(pluginName);
      }
      return next;
    });
  };

  const normalizedFilter = (filter || '').toLowerCase().trim();

  const filteredPlugins = normalizedFilter
    ? plugins.filter((plugin) => {
        if (plugin.displayName.toLowerCase().includes(normalizedFilter)) return true;
        return plugin.skills.some(
          (s) =>
            s.name.toLowerCase().includes(normalizedFilter) ||
            s.description.toLowerCase().includes(normalizedFilter),
        );
      })
    : plugins;

  if (filteredPlugins.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
        {normalizedFilter ? '没有匹配的插件' : '暂无已安装的插件'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {filteredPlugins.map((plugin) => {
        const isOpen = expanded.has(plugin.name);
        return (
          <div key={plugin.name} className="border border-gray-200 rounded-lg overflow-hidden">
            <PluginHeader plugin={plugin} isOpen={isOpen} onToggle={() => toggleExpand(plugin.name)} />
            {isOpen && (
              <div className="flex flex-col">
                {plugin.skills.map((skill) => (
                  <SkillCard
                    key={`${plugin.name}/${skill.path}`}
                    skill={{
                      name: skill.name,
                      description: skill.description,
                      enabled: true,
                    }}
                    path={skill.path}
                    source="plugin"
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
