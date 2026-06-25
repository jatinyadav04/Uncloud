'use client';
import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend,
} from 'chart.js';
import Card from './ui/Card';
import { RiskHistoryEntry } from '@/services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props { userId: string; }

const COLORS = ['#22c55e', '#eab308', '#ef4444']; // green / yellow / red

export default function RiskTrendChart({ userId }: Props) {
  const [history, setHistory] = useState<RiskHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const api = (await import('@/services/api')).default;
        const res = await api.getRiskHistory(userId);
        setHistory(res.risk_history);
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [userId]);

  const labels = ['Low', 'Medium', 'High'];

  if (loading) return null;

  if (history.length < 2) {
    return (
      <Card className="mb-6 bg-white border border-gray-200">
        <h2 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">📈 Risk Trend</h2>
        <p className="text-sm text-gray-500">
          Run your risk assessment at least twice to see your trend.
        </p>
      </Card>
    );
  }

  const chartData = {
    labels: history.map(h => h.date),
    datasets: [{
      label: 'Risk Level',
      data: history.map(h => h.risk_class),
      backgroundColor: history.map(h => COLORS[h.risk_class]),
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0, max: 2, stepSize: 1,
        ticks: {
          callback: (v: any) => labels[v] ?? v,
        },
        title: { display: true, text: 'Risk Level' },
      },
      x: { title: { display: true, text: 'Date' } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const entry = history[ctx.dataIndex];
            return ` ${entry.risk_level} (${(entry.confidence * 100).toFixed(1)}% confidence)`;
          },
        },
      },
    },
  } as const;

  return (
    <Card className="mb-6 bg-white border border-gray-200">
      <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">📈 Risk Trend</h2>
      <div className="h-48">
        <Bar data={chartData} options={options as any} />
      </div>
      <div className="flex gap-4 mt-3 justify-center">
        {[['Low','bg-green-500'],['Medium','bg-yellow-500'],['High','bg-red-500']].map(([l,c])=>(
          <div key={l} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div className={`w-3 h-3 rounded-sm ${c}`}/>{l}
          </div>
        ))}
      </div>
    </Card>
  );
}
