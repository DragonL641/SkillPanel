import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TreeNode, Summary } from '../types';
import { getErrorMessage } from '../utils/getErrorMessage';
import {
  fetchCustomSkills,
  fetchSummary,
  enableSkill,
  disableSkill,
  deleteSkill,
  batchEnableSkills,
  batchDisableSkills,
} from '../api/client';

export function useSkills() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const loadSummary = useCallback(() => fetchSummary().then(setSummary), []);

  const loadCustomSkills = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const d = await fetchCustomSkills();
      setTree(d.tree);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || t('skill.loadFailed'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const handleToggleSkill = async (skillPath: string, enable: boolean) => {
    setError(null);
    try {
      if (enable) await enableSkill(skillPath);
      else await disableSkill(skillPath);
      await loadCustomSkills(true);
      await loadSummary();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || (enable ? t('skill.enableFailed') : t('skill.disableFailed')));
    }
  };

  const handleBatchToggle = async (paths: string[], enable: boolean) => {
    setError(null);
    try {
      const result = enable ? await batchEnableSkills(paths) : await batchDisableSkills(paths);
      if (result.failed.length > 0) {
        setError(t('skill.batchFailed', { count: result.failed.length }));
      }
      await loadCustomSkills(true);
      await loadSummary();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || t('skill.batchFailedFallback'));
    }
  };

  const handleDeleteSkill = async (skillPath: string) => {
    setError(null);
    try {
      await deleteSkill(skillPath);
      await loadCustomSkills(true);
      await loadSummary();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || t('skill.deleteFailed'));
    }
  };

  const clearError = useCallback(() => setError(null), []);

  return {
    tree, summary, loading, error,
    loadCustomSkills, loadSummary,
    handleToggleSkill, handleBatchToggle, handleDeleteSkill,
    clearError,
  };
}
