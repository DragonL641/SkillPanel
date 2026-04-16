import { Globe, Folder } from 'lucide-react';
import type { ProjectSkillsResponse } from '../types';

interface Props {
  projectName: string;
  skills: ProjectSkillsResponse;
  onToggle: (path: string, enable: boolean) => void;
  onAddClick: () => void;
}

export default function ProjectSkillView({ projectName, skills, onToggle, onAddClick }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-light rounded-[var(--radius-sm)]">
          <Folder size={14} className="text-accent" />
          <span className="text-xs font-semibold text-accent">{projectName}</span>
        </div>
        <h2 className="text-base font-semibold text-fg-primary">已生效技能</h2>
        <span className="px-2 py-0.5 bg-surface-tertiary rounded-full text-[11px] font-medium text-fg-secondary">
          {(skills.globalSkills?.length || 0) + (skills.projectSkills?.length || 0)} 个技能
        </span>
        <div className="flex-1" />
        <button
          onClick={onAddClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-fg-inverse rounded-[var(--radius-md)] text-xs font-medium hover:bg-accent-hover transition-colors"
        >
          添加技能
        </button>
      </div>

      {/* Global Skills Section */}
      {skills.globalSkills && skills.globalSkills.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-fg-muted" />
            <span className="text-[13px] font-semibold text-fg-secondary">全局技能（只读）</span>
            <span className="text-[11px] text-fg-muted">{skills.globalSkills.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {skills.globalSkills.map((skill) => (
              <div
                key={skill.path}
                className="flex flex-col gap-2 p-3 bg-surface-primary rounded-[var(--radius-lg)] border border-success"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-fg-primary">{skill.name}</span>
                  <div className="flex-1" />
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-success-light rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    <span className="text-[9px] font-semibold text-success">全局</span>
                  </span>
                </div>
                {skill.description && (
                  <p className="text-[11px] text-fg-secondary leading-relaxed line-clamp-2">{skill.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Skills Section */}
      {skills.projectSkills && skills.projectSkills.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Folder size={14} className="text-accent" />
            <span className="text-[13px] font-semibold text-fg-primary">项目级技能</span>
            <span className="text-[11px] text-fg-muted">{skills.projectSkills.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {skills.projectSkills.map((skill) => (
              <div
                key={skill.path}
                className="flex flex-col gap-2 p-3 bg-surface-primary rounded-[var(--radius-lg)] border border-accent"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-fg-primary">{skill.name}</span>
                  <div className="flex-1" />
                  <button
                    onClick={() => onToggle(skill.path, false)}
                    className="text-fg-muted hover:text-danger transition-colors"
                    aria-label={`删除项目技能 ${skill.name}`}
                  >
                    <span className="text-xs">×</span>
                  </button>
                </div>
                {skill.description && (
                  <p className="text-[11px] text-fg-secondary leading-relaxed line-clamp-2">{skill.description}</p>
                )}
                <div className="flex items-center gap-1.5">
                  <div className="relative w-9 h-5 rounded-full bg-accent transition-colors">
                    <span className="absolute top-0.5 left-[18px] w-4 h-4 rounded-full bg-fg-inverse transition-transform" />
                  </div>
                  <span className="text-[11px] text-success font-medium">已启用</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!skills.globalSkills || skills.globalSkills.length === 0) &&
        (!skills.projectSkills || skills.projectSkills.length === 0) && (
        <div className="text-fg-muted text-sm text-center py-8">
          暂无已生效技能
        </div>
      )}
    </div>
  );
}
