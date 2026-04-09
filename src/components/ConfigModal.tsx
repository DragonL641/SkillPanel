import { useState, useEffect } from 'react';
import { fetchConfig, saveConfig } from '../api/client';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface Config {
  customSkillDir?: string;
  claudeSkillsDir?: string;
  port?: number;
  anthropicApiKey?: string;
}

export default function ConfigModal({ open, onClose, onSaved }: Props) {
  const [config, setConfig] = useState<Config>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchConfig()
        .then((data) => setConfig(data))
        .catch((err) => console.error('Failed to load config:', err));
    }
  }, [open]);

  if (!open) return null;

  const handleChange = (field: keyof Config, value: string | number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveConfig(config);
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save config:', err);
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
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-4">配置</h2>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              自定义 Skill 目录
            </label>
            <input
              type="text"
              value={config.customSkillDir ?? ''}
              onChange={(e) => handleChange('customSkillDir', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Claude Skills 目录
            </label>
            <input
              type="text"
              value={config.claudeSkillsDir ?? ''}
              onChange={(e) => handleChange('claudeSkillsDir', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              端口
            </label>
            <input
              type="number"
              value={config.port ?? ''}
              onChange={(e) => handleChange('port', Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anthropic API Key
            </label>
            <input
              type="password"
              value={config.anthropicApiKey ?? ''}
              onChange={(e) => handleChange('anthropicApiKey', e.target.value)}
              placeholder="sk-ant-..."
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 rounded hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
