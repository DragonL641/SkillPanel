import { useState, useEffect, useCallback } from 'react';
import TabSwitch from './components/TabSwitch';
import SummaryBar from './components/SummaryBar';
import DirTree from './components/DirTree';
import PluginPanel from './components/PluginPanel';
import ConfigModal from './components/ConfigModal';
import {
  fetchCustomSkills,
  fetchPluginSkills,
  fetchSummary,
  enableSkill,
  disableSkill,
  batchEnableSkills,
  batchDisableSkills,
} from './api/client';

export default function App() {
  const [tab, setTab] = useState<'custom' | 'plugin'>('custom');
  const [summary, setSummary] = useState<any>(null);
  const [tree, setTree] = useState<any[]>([]);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(() => fetchSummary().then(setSummary), []);

  const loadCustomSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchCustomSkills();
      setTree(d.tree);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPluginSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchPluginSkills();
      setPlugins(d.plugins);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (tab === 'custom') loadCustomSkills();
    else loadPluginSkills();
  }, [tab]);

  const handleToggleSkill = async (skillPath: string, enable: boolean) => {
    setError(null);
    try {
      if (enable) await enableSkill(skillPath);
      else await disableSkill(skillPath);
      await loadCustomSkills();
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
      await loadCustomSkills();
      await loadSummary();
    } catch (err: any) {
      setError(err.message || '批量操作失败');
    }
  };

  const handleRefresh = async () => {
    if (tab === 'custom') await loadCustomSkills();
    else await loadPluginSkills();
    await loadSummary();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">SkillPanel</h1>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="搜索 skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm border border-gray-200 rounded px-3 py-1.5 w-48 focus:outline-none focus:border-blue-400"
          />
          <button
            onClick={handleRefresh}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            刷新
          </button>
          <button
            onClick={() => setConfigOpen(true)}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            配置
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 pb-20">
        <TabSwitch active={tab} onChange={setTab} />
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded mb-4 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">&times;</button>
          </div>
        )}
        {loading && (
          <div className="text-gray-400 text-sm py-4 text-center">加载中...</div>
        )}
        {tab === 'custom' && (
          <DirTree nodes={tree} onToggle={handleToggleSkill} onBatchToggle={handleBatchToggle} filter={search} />
        )}
        {tab === 'plugin' && <PluginPanel plugins={plugins} filter={search} />}
      </main>

      <SummaryBar data={summary} />

      <ConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSaved={handleRefresh}
      />
    </div>
  );
}
