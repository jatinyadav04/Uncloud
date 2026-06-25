'use client';
import React, { useEffect, useState } from 'react';
import Card from './ui/Card';
import { WeeklySummaryResult } from '@/services/api';

interface Props { userId: string; }

const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function WeeklySummaryCard({ userId }: Props) {
  const [data, setData] = useState<WeeklySummaryResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const api = (await import('@/services/api')).default;
        setData(await api.getWeeklySummary(userId));
      } catch (e: any) { setError(e.message); }
    })();
  }, [userId]);

  if (error) return null;
  if (!data) return null;

  const moodEmoji = (label: string | null) =>
    ({ Great: '😄', Good: '🙂', Okay: '😐', Bad: '😟', Terrible: '😣' }[label ?? ''] ?? '😐');

  return (
    <Card className="mb-6 bg-white border border-gray-200">
      {/* Health milestone banner */}
      {data.health_milestone && (
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
          <span className="text-2xl">💚</span>
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">Health Milestone — Day {data.days_on_plan}</p>
            <p className="text-sm text-gray-700">{data.health_milestone}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-primary flex items-center gap-2">📊 Weekly Summary</h2>
        <span className="text-xs text-gray-400">{data.days_logged} day{data.days_logged !== 1 ? 's' : ''} logged</span>
      </div>

      {/* Hero: money saved */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
        <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Money Saved This Week</p>
        <p className="text-4xl font-bold text-green-700">${data.money_saved.toFixed(2)}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {[
          { icon: '🚬', label: 'Avg / Day', value: `${data.avg_cigarettes_per_day}` },
          { icon: '🏆', label: 'Best Day', value: `${data.best_day.cigarettes} cigs (${fmt(data.best_day.date)})` },
          { icon: '📉', label: 'Worst Day', value: `${data.worst_day.cigarettes} cigs (${fmt(data.worst_day.date)})` },
          { icon: '☁️', label: 'Nicotine', value: `${data.total_nicotine_mg} mg` },
          { icon: data.avg_mood_label ? moodEmoji(data.avg_mood_label) : '😐', label: 'Avg Mood', value: data.avg_mood_label ?? '—' },
          { icon: '🔥', label: 'Avg Craving', value: data.avg_craving != null ? `${data.avg_craving}/10` : '—' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-50 rounded-xl p-3 flex flex-col items-center text-center">
            <span className="text-xl mb-1">{stat.icon}</span>
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-sm font-bold text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
