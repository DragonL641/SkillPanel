import { useState, useEffect } from 'react';
import { fetchSummary } from './api/client';
import TabSwitch from './components/TabSwitch';
import SummaryBar from './components/SummaryBar';

export default function App() {
  const [tab, setTab] = useState<'custom' | 'plugin'>('custom');
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    try {
      const data = await fetchSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  }

  function handleRefresh() {
    loadSummary();
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-bold text-gray-800">SkillPanel</h1>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="搜索 skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            刷新
          </button>
          <button className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
            配置
          </button>
        </div>
      </header>

      {/* Tabs */}
      <TabSwitch active={tab} onChange={setTab} />

      {/* Main Content */}
      <main className="flex-1 p-4">
        {tab === 'custom' ? (
          <p className="text-gray-500">自定义 Skills 内容（待实现）</p>
        ) : (
          <p className="text-gray-500">插件 Skills 内容（待实现）</p>
        )}
      </main>

      {/* Summary Bar */}
      <SummaryBar data={summary} />
    </div>
  );
}
