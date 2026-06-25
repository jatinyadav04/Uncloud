'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { RelapseRiskResult, AdjustPlanSimpleResult } from '@/services/api';

// ── Risk config ────────────────────────────────────────────────────────────
const RISK_CONFIG = {
  0: {
    label: 'Low Risk',
    emoji: '✅',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-400',
    dotColor: 'bg-green-500',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    message: "You're doing great! Your habits over the past week suggest a low chance of relapse. Keep up the momentum.",
    tips: [
      'Continue logging daily to maintain your streak',
      'Reward yourself for staying on track this week',
      'Share your progress with a friend or support group',
    ],
  },
  1: {
    label: 'Medium Risk',
    emoji: '⚠️',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    dotColor: 'bg-yellow-500',
    badgeBg: 'bg-yellow-100',
    badgeText: 'text-yellow-800',
    message: "You're at moderate risk. Some factors from this week need attention — small changes now can prevent a relapse.",
    tips: [
      'Try a 5-minute breathing exercise when cravings hit',
      'Improve sleep quality — aim for 7–8 hours tonight',
      'Identify and avoid your top stress triggers today',
    ],
  },
  2: {
    label: 'High Risk',
    emoji: '🚨',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-400',
    dotColor: 'bg-red-500',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    message: "Your risk level is high based on this week's data. Please reach out to the Support Assistant or a counselor right away.",
    tips: [
      'Open the Support Assistant tab and talk to the AI now',
      'Call a quit-smoking helpline for immediate support',
      'Remove cigarettes and triggers from your environment',
    ],
  },
} as const;

// ── Sub-components ─────────────────────────────────────────────────────────
const ProbabilityBar: React.FC<{ label: string; value: number; barClass: string }> = ({ label, value, barClass }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="font-bold text-gray-800">{(value * 100).toFixed(1)}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div className={`h-3 rounded-full transition-all duration-700 ${barClass}`}
        style={{ width: `${(value * 100).toFixed(1)}%` }} />
    </div>
  </div>
);

// ── Plan update button + success state ─────────────────────────────────────
function UpdatePlanButton({ userId, riskClass }: { userId: string; riskClass: 1 | 2 }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<AdjustPlanSimpleResult | null>(null);
  const [alreadyAdjusted, setAlreadyAdjusted] = useState(false);
  const [err, setErr] = useState('');

  const handleUpdate = async () => {
    setLoading(true); setErr('');
    try {
      const api = (await import('@/services/api')).default;
      const res = await api.adjustPlanSimple(userId);
      if ((res as any).already_adjusted) {
        setAlreadyAdjusted(true);
      } else {
        setDone(res);
      }
    } catch (e: any) {
      setErr(e.message || 'Failed to update plan. Please try again.');
    } finally { setLoading(false); }
  };

  // Already adjusted — show soft info message, hide button
  if (alreadyAdjusted) {
    return (
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-start gap-2">
        <span className="text-gray-400 text-base mt-0.5">ℹ️</span>
        <p className="text-sm text-gray-500">
          Plan already updated for this assessment. Log new data and re-analyze for a fresh check.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-green-600 text-lg">✓</span>
          <span className="font-bold text-green-700">
            Plan updated — {done.weeks_added} week{done.weeks_added !== 1 ? 's' : ''} added.
          </span>
        </div>
        <p className="text-sm text-gray-600">{done.reason}</p>
        {done.frozen_week && (
          <p className="text-xs text-amber-600 mt-1">
            ⏸ This week&apos;s target has been frozen to give you extra time.
          </p>
        )}
      </div>
    );
  }

  const btnClass = riskClass === 1
    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
    : 'bg-red-500 hover:bg-red-600 text-white';

  return (
    <div className="mt-4">
      {err && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{err}</p>
      )}
      <button
        onClick={handleUpdate}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm shadow transition disabled:opacity-60 ${btnClass}`}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Updating plan…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Update My Plan
          </>
        )}
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function RelapseRiskPage() {
  const [userId, setUserId] = useState('');
  const [result, setResult] = useState<RelapseRiskResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('cleanslate_user_id');
    if (stored) setUserId(stored);
  }, []);

  const handleAnalyze = async () => {
    if (!userId) { setError('No user session found. Please sign in from the home page.'); return; }
    setError(''); setResult(null); setIsLoading(true);
    try {
      const api = (await import('@/services/api')).default;
      const prediction = await api.getUserRelapseRisk(userId);
      setResult(prediction);
      setTimeout(() => document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      setError(err.message || 'Failed to get prediction. Make sure you have logged at least one day of data.');
    } finally { setIsLoading(false); }
  };

  const riskConfig = result ? RISK_CONFIG[result.relapse_risk_class as 0 | 1 | 2] : null;
  const confidence = result
    ? (result.probabilities[result.relapse_risk_label as keyof typeof result.probabilities] * 100).toFixed(1)
    : null;

  return (
    <MainLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
            <span className="text-2xl">🧠</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Relapse Risk Assessment</h1>
          <p className="text-gray-600 max-w-xl mx-auto">
            Our ML model analyses your last 7 days of logged data — cigarettes smoked, sleep, mood,
            cravings, and stress — to predict your current relapse risk. No manual input needed.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: how it works + trigger button */}
          <Card variant="default" className="shadow-md flex flex-col">
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              How the Assessment Works
            </h2>

            <div className="space-y-4 flex-1">
              {[
                { icon: '🚬', label: 'Nicotine Intake', desc: 'Derived from your cigarette count × your cigarette type (mg per cigarette). Never entered manually.' },
                { icon: '😴', label: 'Sleep Hours', desc: 'Average sleep you logged over the past 7 days.' },
                { icon: '😊', label: 'Mood Score', desc: 'Your daily mood entries converted to a 1–5 numeric scale and averaged.' },
                { icon: '🔥', label: 'Craving Level', desc: 'Average craving intensity you reported each day.' },
                { icon: '😤', label: 'Stress Level', desc: 'Average stress level from your daily logs.' },
                { icon: '📋', label: 'Logging Consistency', desc: 'Number of days you logged ÷ 7. Logging every day gives the most accurate result.' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>
            )}

            <div className="flex gap-3 mt-6">
              <Button onClick={handleAnalyze} isLoading={isLoading} fullWidth
                className="bg-gradient-to-r from-primary to-secondary">
                {!isLoading && (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Analyse My Week
                  </span>
                )}
              </Button>
              {result && (
                <Button variant="outline" onClick={() => setResult(null)} className="px-4">Reset</Button>
              )}
            </div>
          </Card>

          {/* Right: result card or info */}
          <div className="flex flex-col gap-6">
            {result && riskConfig ? (
              <div id="result-section">
                <Card className={`border-2 ${riskConfig.border} ${riskConfig.bg} shadow-md`}>
                  {/* Risk badge */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${riskConfig.badgeBg} ${riskConfig.badgeText} flex items-center gap-1.5`}>
                      <span>{riskConfig.emoji}</span>
                      <span>{riskConfig.label}</span>
                    </span>
                  </div>

                  {/* Confidence bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 font-medium">Confidence</span>
                      <span className={`font-bold ${riskConfig.color}`}>{confidence}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full transition-all duration-700 ${riskConfig.dotColor}`}
                        style={{ width: `${confidence}%` }} />
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-5">{riskConfig.message}</p>

                  {/* Probability breakdown */}
                  <div className="space-y-3 mb-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Probability Breakdown</p>
                    <ProbabilityBar label="Low Risk"    value={result.probabilities['Low-risk']}    barClass="bg-green-500" />
                    <ProbabilityBar label="Medium Risk" value={result.probabilities['Medium-risk']} barClass="bg-yellow-500" />
                    <ProbabilityBar label="High Risk"   value={result.probabilities['High-risk']}   barClass="bg-red-500" />
                  </div>

                  {/* Tips */}
                  <div className="bg-white/70 rounded-lg p-4 mb-2">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Recommended Actions</p>
                    <ul className="space-y-2">
                      {riskConfig.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-primary mt-0.5">•</span>{tip}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Update My Plan button — only for medium/high */}
                  {(result.relapse_risk_class === 1 || result.relapse_risk_class === 2) && userId && (
                    <UpdatePlanButton userId={userId} riskClass={result.relapse_risk_class as 1 | 2} />
                  )}

                  {/* Data warning */}
                  {result.data_warning && (
                    <p className="mt-4 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      ⚠️ {result.data_warning}
                    </p>
                  )}

                  {/* Biometric signals card */}
                  {result.biometric_signals && (
                    <div className="mt-4 bg-white rounded-xl border border-blue-100 p-4">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <span>📊</span> Body Stats (7-day avg)
                      </p>
                      {result.biometric_risk_note && (
                        <div className="mb-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700 flex items-start gap-1.5">
                          <span>⚠️</span>
                          <span>{result.biometric_risk_note}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { icon: '❤️', label: 'Heart Rate', value: result.biometric_signals.avg_heart_rate, unit: 'bpm' },
                          { icon: '💤', label: 'Resting HR', value: result.biometric_signals.avg_resting_heart_rate, unit: 'bpm' },
                          { icon: '📈', label: 'HRV', value: result.biometric_signals.avg_hrv, unit: 'ms' },
                          { icon: '🚶', label: 'Steps', value: result.biometric_signals.avg_steps, unit: '/day' },
                          { icon: '⚡', label: 'Active Min', value: result.biometric_signals.avg_active_minutes, unit: 'min' },
                        ].filter(s => s.value !== null).map(stat => (
                          <div key={stat.label} className="bg-blue-50 rounded-lg px-3 py-2 flex items-center gap-2">
                            <span className="text-base">{stat.icon}</span>
                            <div>
                              <p className="text-xs text-gray-500">{stat.label}</p>
                              <p className="text-sm font-bold text-gray-800">{stat.value} <span className="text-xs font-normal text-gray-400">{stat.unit}</span></p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2 text-right">Based on {result.biometric_signals.days_with_data} days with body data</p>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-4 text-right">
                    Based on {result.days_used} day{result.days_used !== 1 ? 's' : ''} · Model: {result.model_used}
                  </p>
                </Card>
              </div>
            ) : (
              <Card variant="accent" className="shadow-md">
                <h3 className="font-bold text-primary mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Before You Start
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Make sure you&apos;ve been logging your daily data (cigarettes, sleep, mood, cravings, stress)
                  in the dashboard. The more days you&apos;ve logged, the more accurate your assessment will be.
                </p>
                <div className="space-y-3">
                  {[
                    { icon: '📊', title: 'Fully Automatic', desc: 'No manual input — the model reads your existing logs' },
                    { icon: '⚡', title: 'Instant Results', desc: 'Get your risk score and personalised tips in seconds' },
                    { icon: '📅', title: 'Best with 7 Days', desc: 'Log every day for the most accurate prediction' },
                  ].map(item => (
                    <div key={item.title} className="flex items-start gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                        <p className="text-xs text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Risk scale legend */}
            <Card variant="default" className="shadow-sm">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Risk Scale Guide</h3>
              <div className="space-y-2">
                {([
                  { label: 'Low Risk',    desc: 'Habits are healthy — keep going',       color: 'bg-green-500' },
                  { label: 'Medium Risk', desc: 'Some factors need attention',            color: 'bg-yellow-500' },
                  { label: 'High Risk',   desc: 'Immediate support recommended',          color: 'bg-red-500' },
                ] as const).map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${item.color}`} />
                    <span className="text-sm font-medium text-gray-800">{item.label}</span>
                    <span className="text-xs text-gray-500">— {item.desc}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-8">
          This tool is for informational purposes only and does not replace professional medical advice.
          If you are struggling, please consult a healthcare provider.
        </p>
      </div>
    </MainLayout>
  );
}
