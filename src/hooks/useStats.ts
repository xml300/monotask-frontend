import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { CompletionSeriesPoint, StatsSummary, TimeStatsBreakdown } from '../lib/types';

export function useStats(
  range: '7d' | '30d' | '90d' = '7d',
  timeGroupBy: 'list' | 'tag' | 'day' = 'list'
) {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [completions, setCompletions] = useState<CompletionSeriesPoint[]>([]);
  const [timeStats, setTimeStats] = useState<TimeStatsBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [s, c, t] = await Promise.all([
        api.getStatsSummary(),
        api.getStatsCompletions(range, 'day'),
        api.getStatsTime(timeGroupBy),
      ]);
      setSummary(s);
      setCompletions(c);
      setTimeStats(t);
    } finally {
      setLoading(false);
    }
  }, [range, timeGroupBy]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { summary, completions, timeStats, loading, refresh };
}
