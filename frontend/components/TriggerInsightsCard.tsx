'use client';
import React, { useEffect, useState } from 'react';
import Card from './ui/Card';
import { TriggerAnalysisResult } from '@/services/api';

interface Props { userId: string; }

export default function TriggerInsightsCard({ userId }: Props) {
  const [data, setData] = useState<TriggerAnalysisResult | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const api = (await import('@/services/api')).default;
        setData(await api.getTriggerAnalysis(userId));
      } catch { /* silent */ }
    })();
  }, [userId]);

  if (!data) return null;

  if (!data.enough_data) {
    return (
      <Card className="mb-6 bg-white border border-gray-200">
        <h2 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">🎯 Trigger Insights</h2>
        <p className="text-sm text-gray-500">
          Log your triggers for <span className="font-semibold">5 days</span> to unlock your personal trigger insights.
          <span className="text-primary ml-1">({data.logs_with_triggers}/5 done)</span>
        </p>
      </Card>
    );
  }

  return (
    <Card className="mb-6 bg-white border border-gray-200">
      <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">🎯 Trigger Insights</h2>

      {/* Top triggers banner */}
      {data.top_triggers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-sm text-amber-800">
            <span className="font-bold">Your top triggers: </span>
            {data.top_triggers.join(', ')} — be extra cautious in these situations.
          </p>
        </div>
      )}

      {/* Bar chart */}
      <div className="space-y-2">
        {data.trigger_counts.map(tc => (
          <div key={tc.trigger}>
            <div className="flex justify-between text-xs text-gray-600 mb-0.5">
              <span className="font-medium">{tc.trigger}</span>
              <span>{tc.percentage}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                style={{ width: `${tc.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
