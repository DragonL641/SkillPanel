import { useState, useEffect, useCallback } from 'react';
import { Search, Settings, RefreshCw } from 'lucide-react';
import TabSwitch, { type TabKey } from './components/TabSwitch';
import StatsRow from './components/StatsRow';
import DirTree from './components/DirTree';
import PluginPanel from './components/PluginPanel';
import ConfigModal from './components/ConfigModal';
import ProjectSidebar from './components/ProjectSidebar';
import ProjectSkillView from './components/ProjectSkillView';
import AddSkillModal from './components/AddSkillModal';
import { useSkills } from './hooks/useSkills';
import { usePlugins } from './hooks/usePlugins';
import { useProjects } from './hooks/useProjects';
import { fetchConfig } from './api/client';

export default function App() {
  const [tab, setTab] = useState<TabKey>('global');
  const [search, setSearch] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [apiConfigDetected, setApiConfigDetected] = useState(false);
  const [addSkillModalOpen, setAddSkillModalOpen] = useState(false);

  const {
    tree, summary, loading: skillsLoading, error,
    loadCustomSkills, loadSummary,
    handleToggleSkill, handleBatchToggle, handleDeleteSkill,
    clearError,
  } = useSkills();

  const { plugins, loadPlugins } = usePlugins();

  const {
    projects, selectedProject, projectSkills, loading: projectsLoading,
    loadProjects, loadProjectSkills, setSelectedProject,
    addProject, removeProject, toggleProjectSkill,
  } = useProjects();

  // Fetch config on mount
  useEffect(() => {
    fetchConfig()
      .then((data) => setApiConfigDetected(data.apiConfigDetected))
      .catch(() => setApiConfigDetected(false));
  }, []);

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (tab === 'global') loadCustomSkills(false);
    else if (tab === 'plugin') loadPlugins(false);
    else if (tab === 'project') loadProjects();
  }, [tab]);

  // Load project skills when selected project changes
  useEffect(() => {
    if (tab === 'project' && selectedProject) {
      loadProjectSkills(selectedProject);
    }
  }, [tab, selectedProject]);

  const handleSelectProject = useCallback((name: string) => {
    setSelectedProject(name);
  }, [setSelectedProject]);

  const handleRefresh = async () => {
    if (tab === 'global') await loadCustomSkills(true);
    else if (tab === 'plugin') await loadPlugins(true);
    else if (tab === 'project') {
      await loadProjects();
      if (selectedProject) await loadProjectSkills(selectedProject);
    }
    await loadSummary();
  };

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

        {/* Search — only shown on global/plugin tabs where it filters content */}
        {tab !== 'project' && (
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
        )}

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
      {tab !== 'project' && (
        <main className="px-8 py-6 flex flex-col gap-6">
          {/* Error */}
          {error && (
            <div className="bg-danger-light border border-danger/20 text-danger text-sm px-4 py-2.5 rounded-[var(--radius-lg)] flex items-center justify-between">
              <span>{error}</span>
              <button onClick={clearError} aria-label="关闭错误提示" className="text-danger/60 hover:text-danger ml-2 text-lg">&times;</button>
            </div>
          )}

          {/* Stats — only relevant on global tab */}
          {tab === 'global' && <StatsRow data={summary} />}

          {/* Loading */}
          {skillsLoading && (
            <div className="text-fg-muted text-sm py-4 text-center">加载中...</div>
          )}

          {/* Content */}
          {!skillsLoading && tab === 'global' && (
            <DirTree nodes={tree} onToggle={handleToggleSkill} onBatchToggle={handleBatchToggle} onDelete={handleDeleteSkill} filter={search} />
          )}
          {!skillsLoading && tab === 'plugin' && <PluginPanel plugins={plugins} filter={search} apiConfigDetected={apiConfigDetected} />}
        </main>
      )}

      {/* Project Tab — full height sidebar + content */}
      {tab === 'project' && (
        <div className="flex" style={{ height: 'calc(100vh - 65px)' }}>
          <ProjectSidebar
            projects={projects}
            selected={selectedProject}
            onSelect={handleSelectProject}
            onAdd={addProject}
            onRemove={removeProject}
            loading={projectsLoading}
          />

          {/* Right content */}
          <div className="flex-1 overflow-y-auto">
            {selectedProject && projectSkills ? (
              <ProjectSkillView
                projectName={selectedProject}
                skills={projectSkills}
                onToggle={toggleProjectSkill}
                onAddClick={() => setAddSkillModalOpen(true)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-fg-muted text-sm">
                {projects.length === 0 ? '请先添加项目' : '请选择一个项目'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Skill Modal */}
      {selectedProject && (
        <AddSkillModal
          open={addSkillModalOpen}
          projectName={selectedProject}
          enabledPaths={new Set([
            ...(projectSkills?.globalSkills ?? []).map(s => s.path),
            ...(projectSkills?.projectSkills ?? []).map(s => s.path),
          ])}
          onClose={() => setAddSkillModalOpen(false)}
          onAdded={() => {
            loadProjectSkills(selectedProject);
            loadProjects();
          }}
        />
      )}

      {/* Config Modal */}
      <ConfigModal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        onSaved={handleRefresh}
      />
    </div>
  );
}
