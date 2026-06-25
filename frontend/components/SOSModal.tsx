'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SOSModalProps { onClose: () => void; }

const PHASES = [
  { label: 'Inhale',  duration: 4, color: 'bg-blue-400',   ring: 'ring-blue-300' },
  { label: 'Hold',    duration: 4, color: 'bg-purple-400', ring: 'ring-purple-300' },
  { label: 'Exhale',  duration: 4, color: 'bg-green-400',  ring: 'ring-green-300' },
];
const TOTAL_SECONDS = 5 * 60;
const TIPS = [
  { emoji: '💧', text: 'Drink a full glass of cold water right now.' },
  { emoji: '🚶', text: 'Walk to another room and back 5 times.' },
  { emoji: '📱', text: 'Text someone you trust — right now.' },
];

export default function SOSModal({ onClose }: SOSModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseSeconds, setPhaseSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(() => {
    setSecondsLeft(s => Math.max(0, s - 1));
    setPhaseSeconds(ps => {
      const next = ps + 1;
      if (next >= PHASES[phaseIdx].duration) {
        setPhaseIdx(pi => (pi + 1) % PHASES.length);
        return 0;
      }
      return next;
    });
  }, [phaseIdx]);

  useEffect(() => {
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [tick]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const phase = PHASES[phaseIdx];
  const progress = phaseSeconds / phase.duration;
  const circumference = 2 * Math.PI * 54;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center p-8 gap-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-1">🚨 Craving SOS</h2>
          <p className="text-gray-500 text-sm">Follow the breathing guide. This craving will pass.</p>
        </div>

        {/* Countdown timer */}
        <div className="text-4xl font-mono font-bold text-primary">{mins}:{secs}</div>

        {/* Breathing circle */}
        <div className="relative flex items-center justify-center">
          <svg width="128" height="128" className="rotate-[-90deg]">
            <circle cx="64" cy="64" r="54" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
              cx="64" cy="64" r="54" fill="none"
              stroke={phase.label === 'Inhale' ? '#60a5fa' : phase.label === 'Hold' ? '#a78bfa' : '#4ade80'}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-xl font-bold text-gray-800">{phase.label}</span>
            <span className="text-sm text-gray-500">{phase.duration - phaseSeconds}s</span>
          </div>
        </div>

        {/* Distraction tips */}
        <div className="w-full space-y-2">
          {TIPS.map((tip, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-2xl">{tip.emoji}</span>
              <p className="text-sm text-gray-700">{tip.text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg shadow hover:opacity-90 transition"
        >
          I got through it ✓
        </button>
      </div>
    </div>
  );
}
