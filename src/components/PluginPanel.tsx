import { useState } from 'react';
import SkillCard from './SkillCard';

interface PluginSkill {
  name: string;
  description: string;
  path: string;
}

interface PluginInfo {
  name: string;
  displayName: string;
  skills: PluginSkill[];
}

interface Props {
  plugins: PluginInfo[];
  filter?: string;
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
            <button
              onClick={() => toggleExpand(plugin.name)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span
                className={`text-xs transition-transform duration-200 ${
                  isOpen ? 'rotate-90' : ''
                }`}
              >
                ▶
              </span>
              <span className="text-sm font-medium text-gray-800">
                {plugin.displayName}
              </span>
              <span className="text-xs text-gray-400">({plugin.skills.length})</span>
              <span className="ml-auto text-xs text-gray-400">只读</span>
            </button>
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
