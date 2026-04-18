import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { PluginInfo } from '../types';
import { getErrorMessage } from '../utils/getErrorMessage';
import { fetchPluginSkills } from '../api/client';

export function usePlugins() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const loadPlugins = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const d = await fetchPluginSkills();
      setPlugins(d.plugins);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || t('skill.loadFailed'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  return { plugins, loading, error, loadPlugins };
}
