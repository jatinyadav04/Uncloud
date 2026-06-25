'use client';
import React, { useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { AdjustPlanResult } from '@/services/api';

interface Props { userId: string; riskClass: number | null; onPlanUpdated: () => void; }

export default function AdaptivePlanCard({ userId, riskClass, onPlanUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdjustPlanResult | null>(null);
  const [error, setError] = useState('');

  if (riskClass === null) return null;

  const handleAdjust = async () => {
    setLoading(true); setError('');
    try {
      const api = (await import('@/services/api')).default;
      const res = await api.adjustPlan(userId);
      setResult(res);
      if (res.adjustment_needed) onPlanUpdated();
    } catch (e: any) {
      setError(e.message || 'Failed to adjust plan.');
    } finally { setLoading(false); }
  };

  if (riskClass === 0) {
    return (
      <Card className="border-2 border-green-300 bg-green-50 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold text-green-700">Your plan is on track. No changes needed.</p>
            <p className="text-sm text-green-600">Keep logging daily to maintain your low-risk status.</p>
          </div>
        </div>
      </Card>
    );
  }

  const bgClass = riskClass === 1 ? 'border-yellow-300 bg-yellow-50' : 'border-red-300 bg-red-50';
  const textClass = riskClass === 1 ? 'text-yellow-800' : 'text-red-800';

  return (
    <Card className={`border-2 ${bgClass} mb-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className={`font-bold text-lg ${textClass} flex items-center gap-2`}>
            {riskClass === 1 ? '⚠️ Plan Adjustment Recommended' : '🚨 Plan Adjustment Needed'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {riskClass === 1
              ? 'Your medium risk suggests slowing your reduction pace would help.'
              : 'Your high risk means freezing this week and extending your plan is strongly advised.'}
          </p>
        </div>
        <Button onClick={handleAdjust} isLoading={loading} variant="primary"
          className="whitespace-nowrap bg-gradient-to-r from-primary to-secondary">
          Adjust My Plan
        </Button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      {result?.adjustment_needed && (
        <div className="mt-4 bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-600 font-bold">✓ Plan Updated</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              +{result.weeks_added} week{result.weeks_added !== 1 ? 's' : ''} added
            </span>
          </div>
          <p className="text-sm text-gray-700">{result.reason}</p>
        </div>
      )}
    </Card>
  );
}
