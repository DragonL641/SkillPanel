import { useState, useEffect, useCallback } from 'react';
import { Search, Settings, RefreshCw } from 'lucide-react';
import TabSwitch from './components/TabSwitch';
import StatsRow from './components/StatsRow';
import DirTree from './components/DirTree';
import PluginPanel from './components/PluginPanel';
import ConfigModal from './components/ConfigModal';
import type { TreeNode, PluginInfo, Summary } from './types';
import {
  fetchCustomSkills,
  fetchPluginSkills,
  fetchSummary,
  enableSkill,
  disableSkill,
  deleteSkill,
  batchEnableSkills,
  batchDisableSkills,
} from './api/client';

export default function App() {
  const [tab, setTab] = useState<'custom' | 'plugin'>('custom');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [search, setSearch] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(() => fetchSummary().then(setSummary), []);

  const loadCustomSkills = useCallback(async (silent = false) => {
    if (!silent) setInitialLoading(true);
    setError(null);
    try {
      const d = await fetchCustomSkills();
      setTree(d.tree);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      if (!silent) setInitialLoading(false);
    }
  }, []);

  const loadPluginSkills = useCallback(async (silent = false) => {
    if (!silent) setInitialLoading(true);
    setError(null);
    try {
      const d = await fetchPluginSkills();
      setPlugins(d.plugins);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      if (!silent) setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (tab === 'custom') loadCustomSkills(false);
    else loadPluginSkills(false);
  }, [tab]);

  const handleToggleSkill = async (skillPath: string, enable: boolean) => {
    setError(null);
    try {
      if (enable) await enableSkill(skillPath);
      else await disableSkill(skillPath);
      await loadCustomSkills(true);
      await loadSummary();
    } catch (err: any) {
      setError(err.message || (enable ? '启用失败' : '禁用失败'));
    }
  };

  const handleBatchToggle = async (paths: string[], enable: boolean) => {
    setError(null);
    try {
      const result = enable ? await batchEnableSkills(paths) : await batchDisableSkills(paths);
      if (result.failed.length > 0) {
        setError(`${result.failed.length} 个 skill 操作失败`);
      }
      await loadCustomSkills(true);
      await loadSummary();
    } catch (err: any) {
      setError(err.message || '批量操作失败');
    }
  };

  const handleDeleteSkill = async (skillPath: string) => {
    setError(null);
    try {
      await deleteSkill(skillPath);
      await loadCustomSkills(true);
      await loadSummary();
    } catch (err: any) {
      setError(err.message || '删除失败');
    }
  };

  const handleRefresh = async () => {
    if (tab === 'custom') await loadCustomSkills(true);
    else await loadPluginSkills(true);
    await loadSummary();
  };

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Header */}
      <header className="bg-surface-primary border-b border-border px-8 py-4 flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent rounded-[var(--radius-md)]" />
          <span className="text-lg font-bold text-fg-primary">SkillPanel</span>
        </div>

        {/* Tabs */}
        <TabSwitch active={tab} onChange={setTab} />

        <div className="flex-1" />

        {/* Search */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-surface-primary border border-border rounded-[var(--radius-md)] w-[300px]">
          <Search size={16} className="text-fg-muted shrink-0" />
          <input
            type="text"
            placeholder="搜索技能..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-[13px] bg-transparent focus:outline-none w-full text-fg-primary placeholder:text-fg-muted"
          />
        </div>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          className="p-2 text-fg-secondary hover:text-fg-primary hover:bg-surface-hover rounded-[var(--radius-md)] transition-colors"
        >
          <RefreshCw size={18} />
        </button>

        {/* Config */}
        <button
          onClick={() => setConfigOpen(true)}
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
            <button onClick={() => setError(null)} className="text-danger/60 hover:text-danger ml-2 text-lg">&times;</button>
          </div>
        )}

        {/* Stats */}
        <StatsRow data={summary} />

        {/* Loading */}
        {initialLoading && (
          <div className="text-fg-muted text-sm py-4 text-center">加载中...</div>
        )}

        {/* Content */}
        {!initialLoading && tab === 'custom' && (
          <DirTree nodes={tree} onToggle={handleToggleSkill} onBatchToggle={handleBatchToggle} onDelete={handleDeleteSkill} filter={search} />
        )}
        {!initialLoading && tab === 'plugin' && <PluginPanel plugins={plugins} filter={search} />}
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
