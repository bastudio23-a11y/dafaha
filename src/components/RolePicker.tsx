import React from 'react';
import { Monitor, Mic, Users, Smartphone, Play } from 'lucide-react';
import { sound } from '../utils/audio.ts';
import { DafahLogo } from './DafahLogo.tsx';
import type { PlayerRole } from '../types.ts';

interface RolePickerProps {
  onSelectRole: (role: PlayerRole) => void;
  onQuickLocalPlay: () => void;
  onOpenLeaderboard?: () => void;
  onOpenReport?: () => void;
}

export const RolePicker: React.FC<RolePickerProps> = ({
  onSelectRole,
  onQuickLocalPlay,
  onOpenLeaderboard,
  onOpenReport,
}) => {
  return (
    <div className="max-w-md mx-auto py-6 px-4 text-center select-none">
      {/* Golden Owl Logo Hero Badge */}
      <div className="relative inline-block mb-4">
        <div className="px-6 py-5 bg-[#1b1730] dark:bg-[#120f24] rounded-3xl shadow-2xl border-2 border-amber-500/30 transition-all hover:scale-105">
          <DafahLogo size={70} variant="full" />
        </div>
      </div>

      <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-1.5 tracking-wide bg-gradient-to-r from-[#122b64] via-[#2fa3bf] to-[#4eaab8] dark:from-[#9fd8e2] dark:to-white bg-clip-text text-transparent drop-shadow-sm font-['Tajawal']">
        تحــــدي المــهـــارة مع دُفــعـة
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
        لعبة تفاعلية وتنافس بين المتحديين و الجمهور مع التصويت. اختر كيف تبي تشارك:
      </p>

      {/* Role Options */}
      <div className="space-y-3.5 mb-8 text-right">
        {/* Host */}
        <button
          onClick={() => {
            sound.playClick();
            onSelectRole('host');
          }}
          className="w-full bg-white dark:bg-[#151a40] p-4 rounded-2xl shadow-md border-2 border-slate-100 dark:border-slate-800 hover:border-[#4eaab8] dark:hover:border-[#4eaab8] transition-all flex items-center gap-4 text-right group active:scale-[0.98]"
        >
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#4eaab8] to-[#2fa3bf] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#4eaab8]/30 group-hover:scale-105 transition-transform">
            <Monitor size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-[#0b0f2a] dark:text-white group-hover:text-[#4eaab8] transition-colors">
              شاشة العرض (المقدّم)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              للشاشة الكبيرة أو التلفزيون للتحكم الكامل وعرض النتائج
            </p>
          </div>
        </button>

        {/* Challenger */}
        <button
          onClick={() => {
            sound.playClick();
            onSelectRole('challenger');
          }}
          className="w-full bg-white dark:bg-[#151a40] p-4 rounded-2xl shadow-md border-2 border-slate-100 dark:border-slate-800 hover:border-[#4eaab8] dark:hover:border-[#4eaab8] transition-all flex items-center gap-4 text-right group active:scale-[0.98]"
        >
          <div className="w-13 h-13 rounded-2xl bg-[#0b0f2a] text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
            <Mic size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-[#0b0f2a] dark:text-white group-hover:text-[#4eaab8] transition-colors">
              متحدّي (يمين أو يسار)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              للانضمام بجوالك ورؤية مهارتك السرّية وشرحها للجمهور
            </p>
          </div>
        </button>

        {/* Audience */}
        <button
          onClick={() => {
            sound.playClick();
            onSelectRole('audience');
          }}
          className="w-full bg-white dark:bg-[#151a40] p-4 rounded-2xl shadow-md border-2 border-slate-100 dark:border-slate-800 hover:border-[#4eaab8] dark:hover:border-[#4eaab8] transition-all flex items-center gap-4 text-right group active:scale-[0.98]"
        >
          <div className="w-13 h-13 rounded-2xl bg-[#f2c14e] text-[#0b0f2a] flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
            <Users size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-[#0b0f2a] dark:text-white group-hover:text-[#4eaab8] transition-colors">
              جمهور (مصوّت)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              للانضمام بجوالك والاستماع للشرح والتصويت على المهارة
            </p>
          </div>
        </button>
      </div>

      {/* Quick local single-device play */}
      <div className="p-4 bg-slate-100/70 dark:bg-[#151a40]/60 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-2 text-[#4eaab8] font-bold text-sm">
          <Smartphone size={16} />
          <span>تلعبون من نفس الجهاز أو الشاشة؟</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          تقدر تبدأ مباشرة وتسجل المتحدّيين يدوياً وتحسب الأصوات بالضغط على الخيارات
        </p>
        <button
          onClick={() => {
            sound.playClick();
            onQuickLocalPlay();
          }}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-[#4eaab8] to-[#2fa3bf] text-white rounded-xl font-bold text-sm shadow-md shadow-[#4eaab8]/20 flex items-center justify-center gap-2 hover:opacity-95 active:scale-95 transition-all"
        >
          <Play size={16} />
          <span>بدء لعب محلي سريع</span>
        </button>
      </div>

      {/* Bottom utility links: Leaderboard */}
      {onOpenLeaderboard && (
        <div className="mt-5">
          <button
            onClick={() => {
              sound.playClick();
              onOpenLeaderboard();
            }}
            className="w-full py-2.5 px-4 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/50 rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <span>🏆</span>
            <span>مشاهدة لوحة المتصدرين</span>
          </button>
        </div>
      )}
    </div>
  );
};
