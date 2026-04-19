import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus } from 'lucide-react';
import type { SkillGroup } from '../types';

const PRESET_COLORS = ['#4A9FD8', '#F59E0B', '#22C55E', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

interface Props {
  selectedCount: number;
  groups: SkillGroup[];
  onMoveToGroup: (groupId: string) => Promise<void>;
  onNewGroup: (name: string, color: string) => Promise<void>;
  onRemoveFromGroups: () => Promise<void>;
}

export default function BatchActionBar({ selectedCount, groups, onMoveToGroup, onNewGroup, onRemoveFromGroups }: Props) {
  const { t } = useTranslation();
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await onNewGroup(newName.trim(), newColor);
      setNewName('');
      setShowNewGroup(false);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (groupId: string) => {
    setLoading(true);
    try {
      await onMoveToGroup(groupId);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      await onRemoveFromGroups();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-primary border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.08)] px-8 py-3">
      <div className="flex items-center gap-3 max-w-[1200px] mx-auto">
        {/* Left: count */}
        <span className="text-sm font-medium text-fg-primary">
          {t('group.selected', { count: selectedCount })}
        </span>

        <div className="flex-1" />

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Existing group buttons */}
          {groups.map(g => (
            <button
              key={g.id}
              onClick={() => handleMove(g.id)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-border rounded-[var(--radius-md)] hover:bg-surface-hover transition-colors disabled:opacity-50"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
              {t('group.moveTo')} {g.name}
            </button>
          ))}

          {/* New group */}
          {!showNewGroup ? (
            <button
              onClick={() => setShowNewGroup(true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-accent border border-accent rounded-[var(--radius-md)] hover:bg-accent-light transition-colors disabled:opacity-50"
            >
              <Plus size={14} />
              {t('group.newGroup')}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-primary border border-border rounded-[var(--radius-md)]">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={t('group.groupName')}
                className="w-24 text-[12px] bg-transparent focus:outline-none text-fg-primary placeholder:text-fg-muted"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNewGroup(false); }}
              />
              <div className="flex items-center gap-1">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-4 h-4 rounded-full border-2 transition-transform ${newColor === c ? 'border-fg-primary scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || loading}
                className="px-2 py-0.5 text-[11px] font-medium bg-accent text-fg-inverse rounded-[var(--radius-sm)] hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {t('group.createGroup')}
              </button>
              <button onClick={() => setShowNewGroup(false)} className="text-fg-muted hover:text-fg-primary">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Remove from groups */}
          {groups.length > 0 && (
            <button
              onClick={handleRemove}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-fg-muted border border-border rounded-[var(--radius-md)] hover:text-danger hover:border-danger transition-colors disabled:opacity-50"
            >
              {t('group.removeGroup')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
