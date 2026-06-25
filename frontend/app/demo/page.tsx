'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Scenario = 'on_track' | 'struggling' | 'relapsing';

const SCENARIO_CONFIG: Record<Scenario, { label: string; emoji: string; desc: string; color: string; border: string; bg: string }> = {
  on_track: {
    label: 'On Track',
    emoji: '✅',
    desc: 'Low cravings, good sleep, staying within plan target → should produce Low risk',
    color: 'text-green-700',
    border: 'border-green-300',
    bg: 'bg-green-50',
  },
  struggling: {
    label: 'Struggling',
    emoji: '⚠️',
    desc: 'Moderate cravings, slightly over target, disrupted sleep → should produce Medium risk',
    color: 'text-yellow-700',
    border: 'border-yellow-300',
    bg: 'bg-yellow-50',
  },
  relapsing: {
    label: 'Relapsing',
    emoji: '🚨',
    desc: 'High cravings, far over target, poor sleep, high stress → should produce High risk',
    color: 'text-red-700',
    border: 'border-red-300',
    bg: 'bg-red-50',
  },
};

export default function DemoPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [scenario, setScenario] = useState<Scenario>('on_track');
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    const stored = localStorage.getItem('cleanslate_user_id');
    if (stored) setUserId(stored);
  }, []);

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
  };

  const handleSeed = async () => {
    if (!userId) { showMsg('No user session found. Please sign in first.', 'error'); return; }
    setSeeding(true); setMessage('');
    try {
      const api = (await import('@/services/api')).default;
      await api.seedDemoData(userId, scenario);
      showMsg(`7 days of "${SCENARIO_CONFIG[scenario].label}" data loaded. You can now analyze relapse risk.`, 'success');
    } catch (e: any) {
      showMsg(e.message || 'Failed to seed data.', 'error');
    } finally { setSeeding(false); }
  };

  const handleClear = async () => {
    if (!userId) { showMsg('No user session found. Please sign in first.', 'error'); return; }
    setClearing(true); setMessage('');
    try {
      const api = (await import('@/services/api')).default;
      await api.clearLogs(userId);
      showMsg('All logs cleared. Ready for a fresh demo.', 'success');
    } catch (e: any) {
      showMsg(e.message || 'Failed to clear logs.', 'error');
    } finally { setClearing(false); }
  };

  const cfg = SCENARIO_CONFIG[scenario];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 mb-4">
            <span className="text-2xl">🎬</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Demo Control Panel</h1>
          <p className="text-sm text-gray-500">For presentation purposes only — not visible in the sidebar</p>
          {userId && (
            <p className="text-xs text-purple-500 mt-1 font-mono">User: {userId.slice(0, 8)}…</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          {/* Scenario selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Select Scenario</label>
            <div className="space-y-2">
              {(Object.keys(SCENARIO_CONFIG) as Scenario[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScenario(s)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                    scenario === s
                      ? `${SCENARIO_CONFIG[s].border} ${SCENARIO_CONFIG[s].bg}`
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl mt-0.5">{SCENARIO_CONFIG[s].emoji}</span>
                  <div>
                    <p className={`font-semibold text-sm ${scenario === s ? SCENARIO_CONFIG[s].color : 'text-gray-700'}`}>
                      {SCENARIO_CONFIG[s].label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{SCENARIO_CONFIG[s].desc}</p>
                  </div>
                  {scenario === s && (
                    <span className="ml-auto text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full self-center">
                      Selected
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Seed button */}
          <button
            onClick={handleSeed}
            disabled={seeding || clearing}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold text-base shadow-md hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {seeding ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Seeding data…
              </>
            ) : (
              <>🌱 Seed This Week&apos;s Data</>
            )}
          </button>

          {/* Success / error message */}
          {message && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-2 ${
              messageType === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              <span>{messageType === 'success' ? '✓' : '✗'}</span>
              <span>{message}</span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Clear logs */}
          <button
            onClick={handleClear}
            disabled={seeding || clearing}
            className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {clearing ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Clearing…
              </>
            ) : (
              <>🗑 Clear All Logs</>
            )}
          </button>

          {/* Navigation buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 transition flex items-center justify-center gap-1.5"
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => router.push('/relapse-risk')}
              className="py-2.5 rounded-xl bg-purple-800 text-white font-semibold text-sm hover:bg-purple-900 transition flex items-center justify-center gap-1.5"
            >
              🧠 Relapse Risk
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Access this page at <span className="font-mono">/demo</span> — not linked in the sidebar
        </p>
      </div>
    </div>
  );
}
