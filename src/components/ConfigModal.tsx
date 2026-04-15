import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import { fetchConfig, saveConfig } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import type { AppConfig, AppConfigResponse } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function ConfigModal({ open, onClose, onSaved }: Props) {
  const [config, setConfig] = useState<AppConfig>({});
  const [apiConfigDetected, setApiConfigDetected] = useState(false);
  const [apiModel, setApiModel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      fetchConfig()
        .then((data: AppConfigResponse) => {
          setConfig({
            claudeRootDir: data.claudeRootDir,
            customSkillDir: data.customSkillDir,
            port: data.port,
          });
          setApiConfigDetected(data.apiConfigDetected);
          setApiModel(data.apiModel);
        })
        .catch((err) => console.error('Failed to load config:', err));
    }
  }, [open]);

  // Escape key + focus trap
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Focus first focusable element
    requestAnimationFrame(() => {
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.[0]?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleChange = (field: keyof AppConfig, value: string | number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const data: AppConfigResponse = await saveConfig(config);
      setApiConfigDetected(data.apiConfigDetected);
      setApiModel(data.apiModel);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err) || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="bg-surface-primary rounded-[var(--radius-xl)] shadow-[0_4px_24px_rgba(0,0,0,0.1)] w-full max-w-[500px] mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center px-6 py-5 border-b border-border">
          <h2 className="text-lg font-bold text-fg-primary">配置</h2>
          <div className="flex-1" />
          <button onClick={onClose} aria-label="关闭" className="p-1.5 text-fg-secondary hover:text-fg-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-fg-primary">Claude Code 目录</label>
            <input
              type="text"
              value={config.claudeRootDir ?? ''}
              onChange={(e) => handleChange('claudeRootDir', e.target.value)}
              placeholder="~/.claude"
              className="w-full px-3.5 py-2.5 text-[13px] bg-surface-primary border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-mono"
            />
            <p className="text-[11px] text-fg-muted">skills/ 和 plugins/ 目录将从此自动推导</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-fg-primary">自定义 Skill 仓库目录</label>
            <input
              type="text"
              value={config.customSkillDir ?? ''}
              onChange={(e) => handleChange('customSkillDir', e.target.value)}
              className="w-full px-3.5 py-2.5 text-[13px] bg-surface-primary border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-fg-primary">端口</label>
            <input
              type="number"
              value={config.port ?? ''}
              onChange={(e) => handleChange('port', Number(e.target.value))}
              className="w-[200px] px-3.5 py-2.5 text-[13px] bg-surface-primary border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-mono"
            />
          </div>

          {/* API Status */}
          <div className={`flex flex-col gap-2 p-4 rounded-[var(--radius-lg)] ${apiConfigDetected ? 'bg-success-light' : 'bg-warning-light'}`}>
            <div className="flex items-center gap-2">
              {apiConfigDetected ? (
                <CheckCircle size={16} className="text-success" />
              ) : (
                <AlertTriangle size={16} className="text-warning" />
              )}
              <span className={`text-[13px] font-semibold ${apiConfigDetected ? 'text-success' : 'text-warning'}`}>
                {apiConfigDetected ? 'API 配置已检测到' : 'API 配置未检测到'}
              </span>
            </div>
            {apiConfigDetected && apiModel && (
              <span className="font-mono text-xs text-fg-secondary">模型: {apiModel}</span>
            )}
            {!apiConfigDetected && (
              <span className="text-xs text-fg-secondary">分析功能不可用</span>
            )}
            <p className="text-[11px] text-fg-muted">
              从 {config.claudeRootDir || '~/.claude'}/settings.json 自动读取
            </p>
          </div>

          {saveError && (
            <div className="text-danger text-sm">{saveError}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-fg-primary bg-surface-primary border border-border rounded-[var(--radius-md)] hover:bg-surface-hover transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[13px] font-semibold text-fg-inverse bg-accent rounded-[var(--radius-md)] hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
}
