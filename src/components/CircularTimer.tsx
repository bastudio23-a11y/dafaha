import React, { useEffect, useState } from 'react';
import { sound } from '../utils/audio.ts';

interface CircularTimerProps {
  endsAt: number;
  totalDuration?: number;
  onTimeUp?: () => void;
  className?: string;
}

export const CircularTimer: React.FC<CircularTimerProps> = ({
  endsAt,
  totalDuration = 15,
  onTimeUp,
  className = '',
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [totalMs] = useState<number>(totalDuration * 1000);

  useEffect(() => {
    let fired = false;
    let lastSecond = -1;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = Math.max(0, endsAt - now);
      const secs = Math.ceil(diffMs / 1000);

      setRemainingSeconds(secs);

      // Play tick sound for last 5 seconds
      if (secs <= 5 && secs > 0 && secs !== lastSecond) {
        lastSecond = secs;
        sound.playTick();
      }

      if (diffMs <= 0 && !fired) {
        fired = true;
        sound.playBuzzer();
        if (onTimeUp) {
          onTimeUp();
        }
      }
    }, 150);

    return () => clearInterval(interval);
  }, [endsAt, totalDuration, onTimeUp]);

  const progress = Math.max(0, Math.min(1, (endsAt - Date.now()) / totalMs));
  const strokeDashoffset = 377 * (1 - progress);
  const isHot = remainingSeconds <= 5 && remainingSeconds > 0;

  return (
    <div className={`relative w-36 h-36 mx-auto my-3 flex items-center justify-center ${className}`}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
        <defs>
          <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isHot ? '#e5484d' : '#4eaab8'} />
            <stop offset="100%" stopColor={isHot ? '#dc2626' : '#2fa3bf'} />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx="70"
          cy="70"
          r="60"
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-slate-800"
          strokeWidth="11"
        />

        {/* Dynamic progress ring */}
        <circle
          cx="70"
          cy="70"
          r="60"
          fill="none"
          stroke="url(#timerGrad)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray="377"
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.2s linear, stroke 0.3s ease' }}
        />
      </svg>

      {/* Central counter */}
      <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
        <span
          className={`font-black text-4xl sm:text-5xl tracking-tighter transition-all ${
            isHot ? 'text-[#e5484d] scale-110 animate-pulse' : 'text-[#0b0f2a] dark:text-white'
          }`}
        >
          {remainingSeconds}
        </span>
        <span className="text-[11px] font-semibold text-slate-400 -mt-1">
          {remainingSeconds === 1 ? 'ثانية' : 'ثواني'}
        </span>
      </div>
    </div>
  );
};
