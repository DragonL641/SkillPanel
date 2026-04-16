import { useState, useEffect } from 'react';
import { Search, Settings, RefreshCw } from 'lucide-react';
import TabSwitch from './components/TabSwitch';
import StatsRow from './components/StatsRow';
import DirTree from './components/DirTree';
import PluginPanel from './components/PluginPanel';
import ConfigModal from './components/ConfigModal';
import SetupWizard from './components/SetupWizard';
import { useSkills } from './hooks/useSkills';
import { usePlugins } from './hooks/usePlugins';
import { fetchConfig } from './api/client';
import type { AppConfigResponse } from './types';

export default function App() {
  const [tab, setTab] = useState<'custom' | 'plugin'>('custom');
  const [search, setSearch] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [apiConfigDetected, setApiConfigDetected] = useState(false);
  const [initialConfig, setInitialConfig] = useState<AppConfigResponse | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  const {
    tree, summary, loading: skillsLoading, error,
    loadCustomSkills, loadSummary,
    handleToggleSkill, handleBatchToggle, handleDeleteSkill,
    clearError,
  } = useSkills();

  const { plugins, loadPlugins } = usePlugins();

  // Fetch config on mount, detect first-run state
  useEffect(() => {
    fetchConfig()
      .then((data) => {
        setApiConfigDetected(data.apiConfigDetected);
        setConfigured(data.configured);
        if (!data.configured) setInitialConfig(data);
      })
      .catch(() => setApiConfigDetected(false));
  }, []);

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (tab === 'custom') loadCustomSkills(false);
    else loadPlugins(false);
  }, [tab]);

  const handleRefresh = async () => {
    if (tab === 'custom') await loadCustomSkills(true);
    else await loadPlugins(true);
    await loadSummary();
  };

  // Show setup wizard on first run
  if (configured === false && initialConfig) {
    return (
      <SetupWizard
        initialConfig={initialConfig}
        onComplete={() => {
          setConfigured(true);
          setInitialConfig(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Header */}
      <header className="bg-surface-primary border-b border-border px-8 py-4 flex flex-wrap items-center gap-2 sm:gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent rounded-[var(--radius-md)]" />
          <span className="text-lg font-bold text-fg-primary">SkillPanel</span>
        </div>

        {/* Tabs */}
        <TabSwitch active={tab} onChange={setTab} />

        <div className="flex-1" />

        {/* Search */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-surface-primary border border-border rounded-[var(--radius-md)] w-full sm:w-[300px]">
          <Search size={16} className="text-fg-muted shrink-0" />
          <input
            type="text"
            placeholder="搜索技能..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="搜索技能"
            className="text-[13px] bg-transparent focus:outline-none w-full text-fg-primary placeholder:text-fg-muted"
          />
        </div>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          aria-label="刷新"
          className="p-2 text-fg-secondary hover:text-fg-primary hover:bg-surface-hover rounded-[var(--radius-md)] transition-colors"
        >
          <RefreshCw size={18} />
        </button>

        {/* Config */}
        <button
          onClick={() => setConfigOpen(true)}
          aria-label="设置"
          className="p-2 text-fg-secondary hover:text-fg-primary hover:bg-surface-hover rounded-[var(--radius-md)] transition-colors"
        >
          <Settings size={18} />
        </button>
      </header>

      {/* Main Content */}
      <main className="px-8 py-6 flex flex-col gap-6">
        {/* Error */}
        {error && (
          <div className="bg-danger-light border border-danger/20 text-danger text-sm px-4 py-2.5 rounded-[var(--radius-lg)] flex items-center justify-between">
            <span>{error}</span>
            <button onClick={clearError} aria-label="关闭错误提示" className="text-danger/60 hover:text-danger ml-2 text-lg">&times;</button>
          </div>
        )}

        {/* Stats */}
        <StatsRow data={summary} />

        {/* Loading */}
        {skillsLoading && (
          <div className="text-fg-muted text-sm py-4 text-center">加载中...</div>
        )}

        {/* Content */}
        {!skillsLoading && tab === 'custom' && (
          <DirTree nodes={tree} onToggle={handleToggleSkill} onBatchToggle={handleBatchToggle} onDelete={handleDeleteSkill} filter={search} />
        )}
        {!skillsLoading && tab === 'plugin' && <PluginPanel plugins={plugins} filter={search} apiConfigDetected={apiConfigDetected} />}
      </main>

      {/* Config Modal */}
      <ConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSaved={handleRefresh}
      />
    </div>
  );
}
