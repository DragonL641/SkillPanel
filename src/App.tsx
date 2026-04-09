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
} from './api/client';

export default function App() {
  const [tab, setTab] = useState<'custom' | 'plugin'>('custom');
  const [summary, setSummary] = useState<any>(null);
  const [tree, setTree] = useState<any[]>([]);
  const [plugins, setPlugins] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [configOpen, setConfigOpen] = useState(false);

  const loadSummary = useCallback(() => fetchSummary().then(setSummary), []);
  const loadCustomSkills = useCallback(
    () => fetchCustomSkills().then((d) => setTree(d.tree)),
    [],
  );
  const loadPluginSkills = useCallback(
    () => fetchPluginSkills().then((d) => setPlugins(d.plugins)),
    [],
  );

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (tab === 'custom') loadCustomSkills();
    else loadPluginSkills();
  }, [tab]);

  const handleToggleSkill = async (skillPath: string, enable: boolean) => {
    if (enable) await enableSkill(skillPath);
    else await disableSkill(skillPath);
    await loadCustomSkills();
    await loadSummary();
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
        {tab === 'custom' && (
          <DirTree nodes={tree} onToggle={handleToggleSkill} filter={search} />
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
