import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, RefreshCw, Sparkles } from 'lucide-react';
import { checkPluginUpdate } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import AnalysisPanel, { type AnalysisPanelHandle } from './AnalysisPanel';
import type { PluginSkill, PluginInfo } from '../types';

interface Props {
  plugins: PluginInfo[];
  filter?: string;
  apiConfigDetected?: boolean;
}

type UpdateStatus = { hasUpdate: boolean; behindBy: number } | { error: string } | null;

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale);
  } catch {
    return iso;
  }
}

export default function PluginPanel({ plugins, filter, apiConfigDetected }: Props) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (pluginName: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(pluginName)) next.delete(pluginName);
      else next.add(pluginName);
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
      <div className="flex items-center justify-center py-12 text-fg-muted text-sm">
        {normalizedFilter ? t('plugin.noMatch') : t('plugin.noPlugins')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {filteredPlugins.map((plugin) => (
        <PluginCard key={plugin.name} plugin={plugin} isOpen={expanded.has(plugin.name)} onToggle={() => toggleExpand(plugin.name)} apiConfigDetected={apiConfigDetected} />
      ))}
    </div>
  );
}

function PluginCard({ plugin, isOpen, onToggle, apiConfigDetected }: { plugin: PluginInfo; isOpen: boolean; onToggle: () => void; apiConfigDetected?: boolean }) {
  const { t, i18n } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(null);
  const [isGitRepo, setIsGitRepo] = useState<boolean | null>(null);
  const contentId = `plugin-content-${plugin.name}`;

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
    } catch (err: unknown) {
      setUpdateStatus({ error: getErrorMessage(err) || t('plugin.checkFailed') });
    } finally {
      setChecking(false);
    }
  };

  const versionLabel = plugin.version !== 'unknown' ? `v${plugin.version}` : '';
  const dateLabel = plugin.lastUpdated ? formatDate(plugin.lastUpdated, i18n.language) : '';

  return (
    <div className="bg-surface-primary rounded-[var(--radius-lg)] border border-border overflow-hidden">
      {/* Plugin Header */}
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-hover transition-colors text-left"
      >
        <ChevronDown size={16} className={`text-fg-muted transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} />
        <span className="text-sm font-semibold text-fg-primary">{plugin.displayName}</span>
        <span className="text-xs text-fg-secondary">({plugin.skills.length})</span>
        {versionLabel && (
          <span className="px-1.5 py-0.5 bg-surface-tertiary rounded-full text-[10px] font-medium text-fg-muted font-mono">
            {versionLabel}
          </span>
        )}
        <div className="flex-1" />
        {dateLabel && (
          <span className="font-mono text-[10px] text-fg-muted">{dateLabel}</span>
        )}
        {updateStatus && !('error' in updateStatus) && !updateStatus.hasUpdate && (
          <span className="text-xs text-success font-medium">{t('plugin.upToDate')}</span>
        )}
        {updateStatus && !('error' in updateStatus) && updateStatus.hasUpdate && (
          <span className="text-xs text-warning">{t('plugin.behind', { count: updateStatus.behindBy })}</span>
        )}
        {updateStatus && 'error' in updateStatus && (
          <span className="text-xs text-danger">{updateStatus.error}</span>
        )}
        {(isGitRepo === null || isGitRepo === true) && (
          <span
            onClick={handleCheckUpdate}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-fg-secondary border border-border rounded-[var(--radius-md)] hover:bg-surface-hover transition-colors"
          >
            <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
            {checking ? t('plugin.checking') : t('plugin.checkUpdate')}
          </span>
        )}
      </button>

      {/* Plugin Skills */}
      {isOpen && (
        <div id={contentId} className="flex flex-col gap-2.5 px-4 pb-4">
          {plugin.skills.map((skill) => (
            <PluginSkillRow key={`${plugin.name}/${skill.path}`} skill={skill} pluginName={plugin.name} apiConfigDetected={apiConfigDetected} />
          ))}
        </div>
      )}
    </div>
  );
}

function PluginSkillRow({ skill, pluginName, apiConfigDetected }: { skill: PluginSkill; pluginName: string; apiConfigDetected?: boolean }) {
  const { t } = useTranslation();
  const [analyzing, setAnalyzing] = useState(false);
  const analysisRef = useRef<AnalysisPanelHandle>(null);

  return (
    <div className="px-3 py-2.5 bg-surface-secondary rounded-[var(--radius-md)]">
      <div className="flex items-center gap-2.5">
        <span className="text-[13px] font-medium text-fg-primary">{skill.name}</span>
        <span className="flex-1 text-xs text-fg-secondary truncate">{skill.description}</span>
        {apiConfigDetected && (
          <button
            onClick={() => analysisRef.current?.triggerAnalysis()}
            disabled={analyzing}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-accent border border-border rounded-[var(--radius-md)] transition-colors shrink-0 ${analyzing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent-light cursor-pointer'}`}
          >
            <Sparkles size={11} className={analyzing ? 'animate-pulse' : ''} />
            {analyzing ? t('skill.analyzing') : t('skill.analyze')}
          </button>
        )}
      </div>
      {apiConfigDetected && (
        <AnalysisPanel ref={analysisRef} source="plugin" name={skill.name} onLoadingChange={setAnalyzing} />
      )}
    </div>
  );
}
