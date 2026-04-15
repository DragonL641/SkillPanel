import { useState, useCallback } from 'react';
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

  const loadSummary = useCallback(() => fetchSummary().then(setSummary), []);

  const loadCustomSkills = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const d = await fetchCustomSkills();
      setTree(d.tree);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || '加载失败');
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
      setError(getErrorMessage(err) || (enable ? '启用失败' : '禁用失败'));
    }
  };

  const handleBatchToggle = async (paths: string[], enable: boolean) => {
    setError(null);
    try {
      const result = enable ? await batchEnableSkills(paths) : await batchDisableSkills(paths);
      if (result.failed.length > 0) {
        setError(`${result.failed.length} 个 skill 操作失败`);
      }
      await loadCustomSkills(true);
      await loadSummary();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || '批量操作失败');
    }
  };

  const handleDeleteSkill = async (skillPath: string) => {
    setError(null);
    try {
      await deleteSkill(skillPath);
      await loadCustomSkills(true);
      await loadSummary();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || '删除失败');
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
