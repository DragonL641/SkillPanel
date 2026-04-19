import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, Folder, FolderPlus, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchConfig, saveConfig, pickFolder, detectApiConfig } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';
import type { AppConfig, AppConfigResponse } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function ConfigModal({ open, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<AppConfig>({});
  const [apiConfigDetected, setApiConfigDetected] = useState(false);
  const [apiModel, setApiModel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pickingDir, setPickingDir] = useState(false);
  const [detecting, setDetecting] = useState(false);
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
            customSkillDirs: data.customSkillDirs,
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

  const handleDetect = async () => {
    if (!config.claudeRootDir?.trim()) return;
    setDetecting(true);
    try {
      const data = await detectApiConfig(config.claudeRootDir);
      setApiConfigDetected(data.apiConfigDetected);
      setApiModel(data.apiModel);
    } catch { /* ignore */ }
    finally { setDetecting(false); }
  };

  const removeDir = (index: number) => {
    const dirs = [...(config.customSkillDirs || [])];
    dirs.splice(index, 1);
    setConfig((prev) => ({ ...prev, customSkillDirs: dirs }));
  };

  const handleAddDir = async () => {
    setPickingDir(true);
    try {
      const result = await pickFolder(t('config.selectDir'));
      if (result.path) {
        const dirs = [...(config.customSkillDirs || [])];
        if (!dirs.includes(result.path)) {
          dirs.push(result.path);
          setConfig((prev) => ({ ...prev, customSkillDirs: dirs }));
        }
      }
    } catch {
      // Native dialog unavailable
    } finally {
      setPickingDir(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload: AppConfig = {
        ...config,
        customSkillDir: config.customSkillDirs?.[0] || '',
      };
      const data: AppConfigResponse = await saveConfig(payload);
      setApiConfigDetected(data.apiConfigDetected);
      setApiModel(data.apiModel);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err) || t('config.saveFailed'));
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
          <h2 className="text-lg font-bold text-fg-primary">{t('config.title')}</h2>
          <div className="flex-1" />
          <button onClick={onClose} aria-label={t('config.close')} className="p-1.5 text-fg-secondary hover:text-fg-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-fg-primary">{t('config.claudeDir')}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.claudeRootDir ?? ''}
                onChange={(e) => handleChange('claudeRootDir', e.target.value)}
                placeholder={t('config.claudeDirPlaceholder')}
                className="flex-1 px-3.5 py-2.5 text-[13px] bg-surface-primary border border-border rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-mono"
              />
              <button
                onClick={handleDetect}
                disabled={detecting || !config.claudeRootDir?.trim()}
                className="px-3 py-2.5 text-[13px] font-medium text-accent bg-accent-light border border-accent/20 rounded-[var(--radius-md)] hover:bg-accent/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={14} className={detecting ? 'animate-spin' : ''} />
                {t('config.detect', { defaultValue: 'Sync' })}
              </button>
            </div>
            <p className="text-[11px] text-fg-muted">{t('config.claudeDirHint')}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-fg-primary">{t('config.customDir')}</label>
            <p className="text-[11px] text-fg-muted">{t('config.customDirHint')}</p>
            <div className="flex flex-col gap-2">
              {(config.customSkillDirs || []).map((dir, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-surface-primary border border-border rounded-[var(--radius-md)]">
                  <Folder size={14} className="text-fg-muted shrink-0" />
                  <span className="text-[13px] font-mono text-fg-primary flex-1 truncate">{dir}</span>
                  <button onClick={() => removeDir(i)} className="text-fg-muted hover:text-danger transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button onClick={handleAddDir} disabled={pickingDir} className="flex items-center justify-center gap-1.5 py-2 border border-dashed border-border rounded-[var(--radius-md)] text-accent hover:bg-accent-light transition-colors disabled:opacity-50">
                <FolderPlus size={14} />
                <span className="text-[12px] font-medium">{pickingDir ? t('config.picking', { defaultValue: 'Opening...' }) : t('config.addDir')}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-fg-primary">{t('config.port')}</label>
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
                {apiConfigDetected ? t('config.apiDetected') : t('config.apiNotDetected')}
              </span>
            </div>
            {apiConfigDetected && apiModel && (
              <span className="font-mono text-xs text-fg-secondary">{t('config.model', { model: apiModel })}</span>
            )}
            {!apiConfigDetected && (
              <span className="text-xs text-fg-secondary">{t('config.analysisUnavailable')}</span>
            )}
            <p className="text-[11px] text-fg-muted">
              {t('config.apiSource', { dir: config.claudeRootDir || '~/.claude' })}
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
            {t('skill.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-[13px] font-semibold text-fg-inverse bg-accent rounded-[var(--radius-md)] hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {saving ? t('config.saving') : t('config.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
