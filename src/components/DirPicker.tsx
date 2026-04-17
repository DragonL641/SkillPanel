import { useState, useEffect } from 'react';
import { Folder, ChevronRight, ArrowUp, Check } from 'lucide-react';
import { fetchDirList, pickFolder, type BrowseResult } from '../api/client';
import { getErrorMessage } from '../utils/getErrorMessage';

interface Props {
  value: string;
  onChange: (path: string) => void;
  label: string;
  hint?: string;
  optional?: boolean;
}

export default function DirPicker({ value, onChange, label, hint, optional }: Props) {
  const [browsing, setBrowsing] = useState(false);
  const [dir, setDir] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDir = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDirList(path);
      setDir(result);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || '无法加载目录');
    } finally {
      setLoading(false);
    }
  };

  const handleBrowse = async () => {
    try {
      const result = await pickFolder(label);
      if (result.path) {
        onChange(result.path);
      }
      // User cancelled or selected — either way, done
      return;
    } catch {
      // Native dialog unavailable (headless, SSH, etc.) — fallback to web browser
    }
    // Fallback: open web-based directory browser
    setBrowsing(true);
    loadDir(value || '~');
  };

  const navigateTo = (name: string) => {
    const newPath = `${dir!.path}/${name}`;
    loadDir(newPath);
  };

  const goUp = () => {
    if (dir?.parent) loadDir(dir.parent);
  };

  const selectCurrent = () => {
    if (dir) {
      onChange(dir.path);
      setBrowsing(false);
    }
  };

  if (!browsing) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-fg-primary">{label}</label>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3.5 py-2.5 text-[13px] bg-surface-primary border border-border rounded-[var(--radius-md)] font-mono text-fg-secondary truncate">
            {value || '未选择'}
          </div>
          <button
            onClick={handleBrowse}
            className="px-3 py-2.5 text-[13px] font-medium text-fg-primary bg-surface-primary border border-border rounded-[var(--radius-md)] hover:bg-surface-hover transition-colors shrink-0"
          >
            浏览
          </button>
          {value && (
            <button
              onClick={() => onChange('')}
              className="text-xs text-fg-muted hover:text-danger transition-colors shrink-0"
            >
              清除
            </button>
          )}
        </div>
        {hint && <p className="text-[11px] text-fg-muted">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-medium text-fg-primary">{label}</label>
        <button onClick={() => setBrowsing(false)} className="text-xs text-fg-muted hover:text-fg-primary transition-colors">
          关闭
        </button>
      </div>

      <div className="border border-border rounded-[var(--radius-md)] overflow-hidden">
        {/* Path breadcrumb */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-secondary border-b border-border text-xs font-mono text-fg-secondary">
          <Folder size={12} className="text-fg-muted shrink-0" />
          <span className="truncate">{dir?.path || '...'}</span>
        </div>

        {/* Navigation */}
        <div className="px-2 py-1 border-b border-border">
          {dir?.parent && (
            <button
              onClick={goUp}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-fg-secondary hover:bg-surface-hover rounded transition-colors"
            >
              <ArrowUp size={12} />
              <span>返回上级</span>
            </button>
          )}
        </div>

        {/* Directory list */}
        <div className="max-h-[200px] overflow-y-auto">
          {loading && (
            <div className="px-3 py-4 text-xs text-fg-muted text-center">加载中...</div>
          )}
          {error && (
            <div className="px-3 py-4 text-xs text-danger text-center">{error}</div>
          )}
          {!loading && !error && dir?.entries.length === 0 && (
            <div className="px-3 py-4 text-xs text-fg-muted text-center">此目录下没有子目录</div>
          )}
          {!loading && !error && dir?.entries.map((entry) => (
            <button
              key={entry.name}
              onClick={() => navigateTo(entry.name)}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-fg-primary hover:bg-surface-hover transition-colors"
            >
              <Folder size={13} className="text-fg-muted shrink-0" />
              <span className="truncate">{entry.name}</span>
              <ChevronRight size={12} className="text-fg-muted ml-auto shrink-0" />
            </button>
          ))}
        </div>

        {/* Select button */}
        <div className="px-3 py-2 border-t border-border bg-surface-secondary">
          <button
            onClick={selectCurrent}
            className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors"
          >
            <Check size={13} />
            选择当前目录
          </button>
        </div>
      </div>
      {hint && <p className="text-[11px] text-fg-muted">{hint}</p>}
    </div>
  );
}
