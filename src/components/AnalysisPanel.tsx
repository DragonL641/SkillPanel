import { useState } from 'react';
import { fetchAnalysis, triggerAnalysis } from '../api/client';

interface Props {
  source: 'custom' | 'plugin';
  name: string;
}

export default function AnalysisPanel({ source, name }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExpand = async () => {
    if (!expanded) {
      setExpanded(true);
      if (!loaded) {
        try {
          const data = await fetchAnalysis(source, name);
          if (data.summary) {
            setSummary(data.summary);
            setAnalyzedAt(data.analyzedAt);
          }
          setLoaded(true);
        } catch {
          setLoaded(true);
        }
      }
    } else {
      setExpanded(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const data = await triggerAnalysis(source, name);
      setSummary(data.summary);
      setAnalyzedAt(data.analyzedAt);
    } catch {
      // error state
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={handleExpand}
        className="text-xs text-gray-400 hover:text-blue-500 transition-colors mt-2"
      >
        {'\u25B6'} 原理分析
      </button>
    );
  }

  return (
    <div className="bg-gray-50 rounded border border-gray-100 text-sm mt-2 p-3">
      <button
        onClick={handleExpand}
        className="text-xs text-gray-400 hover:text-blue-500 transition-colors mb-2"
      >
        {'\u25BC'} 原理分析
      </button>

      {loading && (
        <div className="text-gray-400 text-xs py-2">
          正在分析，请稍候...
        </div>
      )}

      {!loading && summary && (
        <div>
          <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-wrap">
            {summary}
          </p>
          {analyzedAt && (
            <p className="text-gray-300 text-[10px] mt-1">
              分析时间: {new Date(analyzedAt).toLocaleString()}
            </p>
          )}
          <button
            onClick={handleAnalyze}
            className="text-xs text-blue-400 hover:text-blue-600 transition-colors mt-2"
          >
            [重新分析]
          </button>
        </div>
      )}

      {!loading && !summary && (
        <div className="flex items-center gap-2 py-1">
          <span className="text-gray-400 text-xs">未分析</span>
          <button
            onClick={handleAnalyze}
            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
          >
            分析
          </button>
        </div>
      )}
    </div>
  );
}
