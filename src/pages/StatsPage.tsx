import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Clock, Flame, Layers } from 'lucide-react';
import { useStats } from '../hooks/useStats';
import { formatDuration } from '../lib/utils';
import { Select } from '../components/ui/Input';

export function StatsPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [timeGroupBy, setTimeGroupBy] = useState<'list' | 'tag' | 'day'>('list');
  const { summary, completions, timeStats, loading } = useStats(range, timeGroupBy);

  const maxCompletion = Math.max(1, ...completions.map((c) => c.count));
  const maxTime = Math.max(1, ...(timeStats?.breakdown.map((b) => b.seconds) ?? [1]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Completion velocity, streaks, and tracked focus time.
          </p>
        </div>
        <Select
          aria-label="Date range"
          value={range}
          onChange={(e) => setRange(e.target.value as '7d' | '30d' | '90d')}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </Select>
      </div>

      {/* Summary Metrics */}
      {loading || !summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-line bg-surface-subtle" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Completion Rate</span>
              <CheckCircle2 className="h-4 w-4 text-status-success" />
            </div>
            <p className="mt-2 font-mono text-2xl font-semibold text-ink">
              {summary.completionRate}%
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              {summary.completed} of {summary.total} tasks
            </p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Active Tasks</span>
              <Layers className="h-4 w-4 text-ink-secondary" />
            </div>
            <p className="mt-2 font-mono text-2xl font-semibold text-ink">{summary.active}</p>
            <p className="mt-0.5 text-[11px] text-ink-muted">{summary.dueToday} due today</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Overdue</span>
              <AlertTriangle className="h-4 w-4 text-status-danger" />
            </div>
            <p className="mt-2 font-mono text-2xl font-semibold text-status-danger">
              {summary.overdue}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">Needs attention</p>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>Streak</span>
              <Flame className="h-4 w-4 text-status-warning" />
            </div>
            <p className="mt-2 font-mono text-2xl font-semibold text-ink">
              {summary.currentStreakDays}d
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              Longest: {summary.longestStreakDays} days
            </p>
          </div>
        </div>
      )}

      {/* Completions Chart */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">Completions Over Time</h2>
            <p className="text-xs text-ink-muted">Tasks completed per day</p>
          </div>
        </div>

        <div className="flex h-44 items-end gap-2">
          {completions.map((point, idx) => {
            const pct = Math.max(6, Math.round((point.count / maxCompletion) * 100));
            return (
              <div key={point.period} className="flex flex-1 flex-col items-center gap-2">
                <span className="font-mono text-[10px] text-ink-muted">{point.count}</span>
                <div className="flex h-32 w-full items-end rounded-md bg-surface-subtle p-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ duration: 0.35, delay: idx * 0.03 }}
                    className="w-full rounded-sm bg-ink"
                  />
                </div>
                <span className="truncate font-mono text-[10px] text-ink-muted">
                  {point.period}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Time Breakdown */}
      <section className="rounded-2xl border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-ink-secondary" />
            <div>
              <h2 className="text-sm font-semibold text-ink">Tracked Time</h2>
              <p className="text-xs text-ink-muted">
                Total logged: {formatDuration(timeStats?.totalSeconds ?? 0)}
              </p>
            </div>
          </div>
          <Select
            aria-label="Group time by"
            value={timeGroupBy}
            onChange={(e) => setTimeGroupBy(e.target.value as 'list' | 'tag' | 'day')}
          >
            <option value="list">By List</option>
            <option value="tag">By Tag</option>
            <option value="day">By Day</option>
          </Select>
        </div>

        {!timeStats || timeStats.breakdown.length === 0 ? (
          <p className="py-8 text-center text-xs text-ink-muted">
            Start a timer inside any task to see tracked time here.
          </p>
        ) : (
          <div className="space-y-3">
            {timeStats.breakdown.map((row) => (
              <div key={row.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">{row.label}</span>
                  <span className="font-mono text-ink-secondary">{formatDuration(row.seconds)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-subtle">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round((row.seconds / maxTime) * 100)}%` }}
                    transition={{ duration: 0.35 }}
                    className="h-full rounded-full bg-ink"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
