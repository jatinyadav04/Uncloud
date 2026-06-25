'use client';
import React, { useEffect, useState } from 'react';
import Card from './ui/Card';
import { BadgesResult } from '@/services/api';

interface Props { userId: string; }

export default function BadgesCard({ userId }: Props) {
  const [data, setData] = useState<BadgesResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const api = (await import('@/services/api')).default;
        setData(await api.getBadges(userId));
      } catch { /* silent */ }
    })();
  }, [userId]);

  if (!data) return null;

  const earnedNames = new Set(data.earned_badges.map(b => b.name));

  return (
    <Card className="mb-6 bg-white border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-primary flex items-center gap-2">🏆 Badges & Streaks</h2>
        <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
          <span className="text-lg">🔥</span>
          <span className="font-bold text-orange-600">{data.current_streak}</span>
          <span className="text-xs text-orange-500">day streak</span>
        </div>
      </div>

      {data.longest_streak > 0 && (
        <p className="text-xs text-gray-500 mb-4">
          Longest streak: <span className="font-semibold text-primary">{data.longest_streak} days</span>
        </p>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {data.all_badges.map(badge => {
          const earned = earnedNames.has(badge.name);
          const earnedEntry = data.earned_badges.find(b => b.name === badge.name);
          return (
            <div key={badge.name}
              className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all
                ${earned
                  ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-primary/30 shadow-sm'
                  : 'bg-gray-50 border-gray-200 opacity-50 grayscale'}`}>
              <span className="text-2xl mb-1">{badge.emoji}</span>
              <p className="text-xs font-semibold text-gray-700 leading-tight">{badge.name}</p>
              {earned && earnedEntry && (
                <p className="text-[10px] text-primary mt-1">{earnedEntry.date_earned}</p>
              )}
              {!earned && (
                <p className="text-[10px] text-gray-400 mt-1">{badge.days}d streak</p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
