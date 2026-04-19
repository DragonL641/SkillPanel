import { useState, useEffect, useCallback } from 'react';
import { Search, Settings, RefreshCw, Folder, Tag, CheckSquare } from 'lucide-react';
import TabSwitch, { type TabKey } from './components/TabSwitch';
import StatsRow from './components/StatsRow';
import DirTree from './components/DirTree';
import GroupView from './components/GroupView';
import BatchActionBar from './components/BatchActionBar';
import PluginPanel from './components/PluginPanel';
import ConfigModal from './components/ConfigModal';
import ProjectSidebar from './components/ProjectSidebar';
import ProjectSkillView from './components/ProjectSkillView';
import AddSkillModal from './components/AddSkillModal';
import SkillDetailModal from './components/SkillDetailModal';
import AnalysisModal from './components/AnalysisModal';
import LangSwitch from './components/LangSwitch';
import { useTranslation } from 'react-i18next';
import { useSkills } from './hooks/useSkills';
import { usePlugins } from './hooks/usePlugins';
import { useProjects } from './hooks/useProjects';
import { useGroups } from './hooks/useGroups';
import { fetchConfig } from './api/client';

export default function App() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('global');
  const [search, setSearch] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [apiConfigDetected, setApiConfigDetected] = useState(false);
  const [addSkillModalOpen, setAddSkillModalOpen] = useState(false);

  const [detailSkill, setDetailSkill] = useState<{ name: string; path: string } | null>(null);
  const [analysisSkill, setAnalysisSkill] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'folder' | 'group'>('folder');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

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

  const {
    groupedSkills, loading: groupsLoading,
    loadGroups, createGroup, updateGroup, deleteGroup, addSkills: addGroupSkillsAction, removeSkills: removeGroupSkillsAction,
  } = useGroups();

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

  // Load groups when switching to group view
  useEffect(() => {
    if (tab === 'global' && viewMode === 'group') {
      loadGroups(true);
    }
  }, [tab, viewMode]);

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

  // Find skill name from tree by path
  function findSkillName(skillPath: string): string {
    function search(nodes: typeof tree): string | undefined {
      for (const node of nodes) {
        if (node.path === skillPath && node.skill) return node.skill.name;
        if (node.children) {
          const found = search(node.children);
          if (found) return found;
        }
      }
    }
    return search(tree) || skillPath;
  }

  const handleDetail = useCallback((skillPath: string) => {
    setDetailSkill({ name: findSkillName(skillPath), path: skillPath });
  }, [tree]);

  const handleAnalyze = useCallback((skillPath: string) => {
    setAnalysisSkill(findSkillName(skillPath));
  }, [tree]);

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
            placeholder={t('app.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('app.searchLabel')}
            className="text-[13px] bg-transparent focus:outline-none w-full text-fg-primary placeholder:text-fg-muted"
          />
        </div>
        )}

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          aria-label={t('app.refresh')}
          className="p-2 text-fg-secondary hover:text-fg-primary hover:bg-surface-hover rounded-[var(--radius-md)] transition-colors"
        >
          <RefreshCw size={18} />
        </button>

        {/* Language */}
        <LangSwitch />

        {/* Config */}
        <button
          onClick={() => setConfigOpen(true)}
          aria-label={t('app.settings')}
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
              <button onClick={clearError} aria-label={t('app.closeError')} className="text-danger/60 hover:text-danger ml-2 text-lg">&times;</button>
            </div>
          )}

          {/* Stats — only relevant on global tab */}
          {tab === 'global' && <StatsRow data={summary} />}

          {/* View Toggle - only on global tab */}
          {tab === 'global' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-surface-tertiary rounded-[var(--radius-md)] p-0.5">
                <button
                  onClick={() => setViewMode('folder')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors ${viewMode === 'folder' ? 'bg-accent text-fg-inverse' : 'text-fg-secondary'}`}
                >
                  <Folder size={12} /> {t('group.folder')}
                </button>
                <button
                  onClick={() => setViewMode('group')}
                  className={`flex items-center gap-1 px-3 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors ${viewMode === 'group' ? 'bg-accent text-fg-inverse' : 'text-fg-secondary'}`}
                >
                  <Tag size={12} /> {t('group.group')}
                </button>
              </div>
              <div className="flex-1" />
              <button
                onClick={() => { setBatchMode(!batchMode); setSelectedSkills(new Set()); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-[var(--radius-sm)] border transition-colors ${batchMode ? 'border-accent text-accent bg-accent-light' : 'border-border text-fg-secondary'}`}
              >
                <CheckSquare size={14} /> {t('group.batchManage')}
              </button>
            </div>
          )}

          {/* Loading */}
          {skillsLoading && (
            <div className="text-fg-muted text-sm py-4 text-center">{t('app.loading')}</div>
          )}

          {/* Content */}
          {!skillsLoading && tab === 'global' && viewMode === 'folder' && (
            <DirTree nodes={tree} onToggle={handleToggleSkill} onBatchToggle={handleBatchToggle} onDelete={handleDeleteSkill} onDetail={handleDetail} onAnalyze={handleAnalyze} filter={search} />
          )}
          {!skillsLoading && tab === 'global' && viewMode === 'group' && (
            <GroupView
              groupedSkills={groupedSkills}
              tree={tree}
              onToggle={handleToggleSkill}
              onDelete={handleDeleteSkill}
              onDetail={handleDetail}
              onAnalyze={handleAnalyze}
              filter={search}
              batchMode={batchMode}
              selectedSkills={selectedSkills}
              onToggleSelect={(path) => {
                setSelectedSkills(prev => {
                  const next = new Set(prev);
                  if (next.has(path)) next.delete(path); else next.add(path);
                  return next;
                });
              }}
              onRenameGroup={async (id, name) => { await updateGroup(id, { name }); }}
              onChangeColor={async (id, color) => { await updateGroup(id, { color }); }}
              onDeleteGroup={async (id) => { await deleteGroup(id); }}
            />
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
                {projects.length === 0 ? t('app.addProjectFirst') : t('app.selectProject')}
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

      {/* Skill Detail Modal */}
      {detailSkill && (
        <SkillDetailModal
          open={!!detailSkill}
          name={detailSkill.name}
          skillPath={detailSkill.path}
          onClose={() => setDetailSkill(null)}
        />
      )}

      {/* Analysis Modal */}
      {analysisSkill && (
        <AnalysisModal
          open={!!analysisSkill}
          name={analysisSkill}
          onClose={() => setAnalysisSkill(null)}
        />
      )}

      {/* Batch Action Bar */}
      {tab === 'global' && batchMode && selectedSkills.size > 0 && (
        <BatchActionBar
          selectedCount={selectedSkills.size}
          groups={groupedSkills?.groups || []}
          onMoveToGroup={async (groupId) => {
            await addGroupSkillsAction(groupId, [...selectedSkills]);
            setSelectedSkills(new Set());
            loadCustomSkills(true);
          }}
          onNewGroup={async (name, color) => {
            const group = await createGroup(name, color);
            await addGroupSkillsAction(group.id, [...selectedSkills]);
            setSelectedSkills(new Set());
            loadCustomSkills(true);
          }}
          onRemoveFromGroups={async () => {
            for (const g of groupedSkills?.groups || []) {
              const toRemove = g.skills.filter(s => selectedSkills.has(s));
              if (toRemove.length > 0) await removeGroupSkillsAction(g.id, toRemove);
            }
            setSelectedSkills(new Set());
            loadCustomSkills(true);
          }}
        />
      )}
    </div>
  );
}
