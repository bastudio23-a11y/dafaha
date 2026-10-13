import React from 'react';
import { Volume2, VolumeX, Moon, Sun, Users, Mic, Monitor, Lock, Check, Trophy, AlertTriangle } from 'lucide-react';
import { sound } from '../utils/audio.ts';
import { Avatar } from '../utils/avatars.tsx';
import { DafahLogo } from './DafahLogo.tsx';
import type { GamePhase, PlayerRole } from '../types.ts';

interface HeaderBarProps {
  role: PlayerRole;
  userName?: string;
  userAv?: number;
  phase: GamePhase;
  round: number;
  names: [string, string];
  avs: [number, number];
  wins: [number, number];
  soundEnabled: boolean;
  onToggleSound: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onChangeRole: () => void;
  onOpenLeaderboard: () => void;
  onOpenReport?: () => void;
  onLockHost?: () => void;
}

const STEPS: { id: GamePhase; label: string; icon: React.ReactNode }[] = [
  { id: 'secret', label: 'الكلمة', icon: <Lock size={15} /> },
  { id: 'explain', label: 'الشرح', icon: <Mic size={15} /> },
  { id: 'vote', label: 'التصويت', icon: <Check size={15} /> },
  { id: 'results', label: 'النتيجة', icon: <Trophy size={15} /> },
];

export const HeaderBar: React.FC<HeaderBarProps> = ({
  role,
  userName,
  userAv,
  phase,
  round,
  names,
  avs,
  wins,
  soundEnabled,
  onToggleSound,
  isDark,
  onToggleTheme,
  onChangeRole,
  onOpenLeaderboard,
  onOpenReport,
  onLockHost,
}) => {
  const currentStepIdx = STEPS.findIndex((s) => s.id === phase);

  return (
    <header className="w-full max-w-4xl mx-auto mb-4 select-none">
      {/* Top action row */}
      <div className="flex items-center justify-between gap-2 px-2 py-1">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-[#1b1730] p-1 flex items-center justify-center shadow-md border border-amber-500/30">
            <DafahLogo size={32} variant="icon" />
          </div>
          <div className="flex flex-col text-right">
            <span className="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-[#122b64] via-[#2fa3bf] to-[#4eaab8] dark:from-[#9fd8e2] dark:to-white bg-clip-text text-transparent leading-none">
              تحدي المهارة مع دفعة
            </span>
            <span className="text-[10px] font-extrabold text-[#48bce6] mt-0.5">
              دُفـعـة · Dafah
            </span>
          </div>
        </div>

        {/* Right utility buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Leaderboard button */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenLeaderboard();
            }}
            title="لوحة المتصدرين"
            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/10 to-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-sm hover:scale-105 active:scale-95 transition-all"
          >
            <Trophy size={16} className="text-[#f2c14e]" />
            <span className="hidden sm:inline">المتصدرين</span>
          </button>

          {/* Report Issue button */}
          {onOpenReport && (
            <button
              onClick={() => {
                sound.playClick();
                onOpenReport();
              }}
              title="الإبلاغ عن مشكلة (Bassamas101@gmail.com)"
              className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-colors"
            >
              <AlertTriangle size={18} />
            </button>
          )}

          {/* Lock host button */}
          {role === 'host' && onLockHost && (
            <button
              onClick={() => {
                sound.playClick();
                onLockHost();
              }}
              title="قفل شاشة الأدمن"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Lock size={17} />
            </button>
          )}

          {/* Active Role indicator */}
          <button
            onClick={onChangeRole}
            title="تغيير الدور"
            className="flex items-center gap-2 bg-white dark:bg-[#151a40] px-3 py-1.5 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-semibold hover:border-[#4eaab8] transition-colors"
          >
            {userAv !== undefined ? (
              <Avatar index={userAv} size={22} />
            ) : role === 'host' ? (
              <Monitor size={16} className="text-[#4eaab8]" />
            ) : role === 'challenger' ? (
              <Mic size={16} className="text-[#4eaab8]" />
            ) : (
              <Users size={16} className="text-[#4eaab8]" />
            )}
            <span className="text-[#0b0f2a] dark:text-white">
              {role === 'host'
                ? 'المقدّم'
                : userName || (role === 'challenger' ? 'متحدّي' : 'جمهور')}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">تبديل</span>
          </button>

          {/* Sound toggle */}
          <button
            onClick={() => {
              sound.playClick();
              onToggleSound();
            }}
            title={soundEnabled ? 'كتم الصوت' : 'تشغيل الصوت'}
            className="p-2 rounded-xl bg-white dark:bg-[#151a40] shadow-sm border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#4eaab8] transition-colors"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => {
              sound.playClick();
              onToggleTheme();
            }}
            title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
            className="p-2 rounded-xl bg-white dark:bg-[#151a40] shadow-sm border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#4eaab8] transition-colors"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Steps & Score when in active game */}
      {round > 0 && (
        <div className="mt-3">
          {/* Step progression */}
          <div className="flex gap-1.5 sm:gap-2 mb-3">
            {STEPS.map((s, idx) => {
              const isDone = currentStepIdx > idx;
              const isCur = currentStepIdx === idx;
              return (
                <div
                  key={s.id}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    isCur
                      ? 'bg-gradient-to-r from-[#4eaab8] to-[#2fa3bf] text-white shadow-md shadow-[#4eaab8]/30 -translate-y-0.5'
                      : isDone
                      ? 'bg-white dark:bg-[#151a40] text-[#4eaab8] border border-[#4eaab8]/40'
                      : 'bg-white/60 dark:bg-[#151a40]/60 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {s.icon}
                  <span className="hidden xs:inline">{s.label}</span>
                </div>
              );
            })}
          </div>

          {/* Score header */}
          <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-[#151a40] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            {/* Right Challenger */}
            <div className="flex items-center gap-2 text-right">
              <Avatar index={avs[0]} size={28} />
              <div>
                <span className="text-xs text-slate-400 block font-normal">الأيمن</span>
                <span className="font-bold text-sm text-[#4eaab8]">{names[0]}</span>
              </div>
              <span className="bg-[#4eaab8]/15 text-[#4eaab8] font-black px-2.5 py-0.5 rounded-lg text-lg ml-1">
                {wins[0]}
              </span>
            </div>

            {/* Round info */}
            <div className="text-center px-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 block">
                الجولة
              </span>
              <span className="font-black text-base text-[#0b0f2a] dark:text-white">
                #{round}
              </span>
            </div>

            {/* Left Challenger */}
            <div className="flex items-center gap-2 text-left">
              <span className="bg-[#0b0f2a]/10 dark:bg-white/10 text-[#0b0f2a] dark:text-white font-black px-2.5 py-0.5 rounded-lg text-lg mr-1">
                {wins[1]}
              </span>
              <div>
                <span className="text-xs text-slate-400 block font-normal">الأيسر</span>
                <span className="font-bold text-sm text-[#0b0f2a] dark:text-slate-200">
                  {names[1]}
                </span>
              </div>
              <Avatar index={avs[1]} size={28} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
