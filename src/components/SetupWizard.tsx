import { useState } from 'react';
import { FolderCheck, ArrowRight } from 'lucide-react';
import DirPicker from './DirPicker';
import { saveConfig, fetchConfig } from '../api/client';
import type { AppConfigResponse } from '../types';

interface Props {
  initialConfig: AppConfigResponse;
  onComplete: (config: AppConfigResponse) => void;
}

export default function SetupWizard({ initialConfig, onComplete }: Props) {
  const [claudeRootDir, setClaudeRootDir] = useState(initialConfig.claudeRootDir ?? '');
  const [customSkillDir, setCustomSkillDir] = useState(initialConfig.customSkillDir || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!customSkillDir) {
      setError('请选择自定义 Skill 仓库目录');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveConfig({ claudeRootDir, customSkillDir });
      const updated = await fetchConfig();
      onComplete(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface-primary border border-border rounded-[var(--radius-lg)] shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-[var(--radius-md)] flex items-center justify-center">
              <FolderCheck size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-fg-primary">欢迎使用 SkillPanel</h1>
              <p className="text-xs text-fg-muted mt-0.5">完成以下配置即可开始管理你的 Claude Code Skills</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Claude Code dir — pre-filled, user can change */}
          <DirPicker
            value={claudeRootDir}
            onChange={setClaudeRootDir}
            label="Claude Code 目录"
            hint="默认 ~/.claude，如果你的 Claude Code 安装在其他位置，请修改"
          />

          {/* Custom skill dir — required */}
          <DirPicker
            value={customSkillDir}
            onChange={setCustomSkillDir}
            label="自定义 Skill 仓库目录（必填）"
            hint="选择存放自定义 Skill 的目录"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-secondary border-t border-border">
          {error && (
            <p className="text-xs text-danger mb-3">{error}</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !customSkillDir}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-[var(--radius-md)] transition-colors"
          >
            {saving ? '保存中...' : <>完成配置 <ArrowRight size={15} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
