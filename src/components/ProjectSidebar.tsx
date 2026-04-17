import { useState } from 'react';
import { Folder, FolderOpen, Plus, X } from 'lucide-react';
import DirPicker from './DirPicker';
import { pickFolder } from '../api/client';
import type { ProjectInfo } from '../types';

interface Props {
  projects: ProjectInfo[];
  selected: string | null;
  onSelect: (name: string) => void;
  onAdd: (path: string) => Promise<void>;
  onRemove: (name: string) => Promise<void>;
  loading?: boolean;
}

export default function ProjectSidebar({ projects, selected, onSelect, onAdd, onRemove, loading }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    try {
      const result = await pickFolder('选择项目目录');
      if (result.path) {
        setAdding(true);
        try {
          await onAdd(result.path);
        } finally {
          setAdding(false);
        }
      }
      return;
    } catch {
      // 原生对话框不可用，降级到 web 浏览器
    }
    setPickerOpen(true);
  };

  const handlePick = async (path: string) => {
    if (!path) return;
    setAdding(true);
    try {
      await onAdd(path);
      setPickerOpen(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <aside className="w-[260px] shrink-0 bg-surface-primary border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5">
        <span className="text-sm font-semibold text-fg-primary">项目列表</span>
        <button
          onClick={handleAdd}
          disabled={adding}
          className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-md)] border border-border hover:bg-surface-hover transition-colors disabled:opacity-50"
          aria-label="添加项目"
        >
          <Plus size={14} className="text-fg-secondary" />
          <span className="text-[11px] font-medium text-fg-secondary">添加</span>
        </button>
      </div>

      {/* Dir picker for adding project */}
      {pickerOpen && (
        <div className="px-4 pb-3">
          <DirPicker
            value=""
            onChange={handlePick}
            label="项目路径"
            hint={adding ? '添加中...' : '选择项目根目录'}
          />
        </div>
      )}

      {/* Project list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
        {projects.map((project) => {
          const isActive = selected === project.name;
          return (
            <div
              key={project.name}
              onClick={() => onSelect(project.name)}
              className={`flex flex-col gap-2 p-3 rounded-[var(--radius-md)] cursor-pointer transition-colors border ${
                isActive
                  ? 'bg-accent-light border-accent'
                  : 'bg-surface-primary border-border hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center gap-2">
                {isActive ? (
                  <FolderOpen size={14} className="text-accent shrink-0" />
                ) : (
                  <Folder size={14} className="text-fg-secondary shrink-0" />
                )}
                <span className="text-[13px] font-semibold text-fg-primary truncate">{project.name}</span>
                <div className="flex-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(project.name); }}
                  className="text-fg-muted hover:text-danger transition-colors"
                  aria-label={`删除项目 ${project.name}`}
                >
                  <X size={12} />
                </button>
              </div>
              <span className="text-[10px] font-mono text-fg-muted truncate pl-[22px]">{project.path}</span>
              <div className="flex items-center gap-1.5 pl-[22px]">
                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-accent' : 'bg-success'}`} />
                <span className="text-[11px] text-fg-secondary">
                  {project.projectEnabledCount} 项目级 + {project.globalEnabledCount} 全局
                </span>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && !loading && (
          <div className="text-fg-muted text-xs text-center py-8">
            暂无项目
          </div>
        )}

        {loading && (
          <div className="text-fg-muted text-xs text-center py-4">加载中...</div>
        )}
      </div>
    </aside>
  );
}
