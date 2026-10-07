import React, { useState } from 'react';
import {
  Trophy,
  Medal,
  Flame,
  Target,
  Sparkles,
  X,
  RotateCcw,
  Users,
  Mic,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { Avatar } from '../utils/avatars.tsx';
import { sound } from '../utils/audio.ts';
import type { LeaderboardEntry } from '../types.ts';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
  isHost?: boolean;
  onResetLeaderboard?: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  leaderboard,
  currentUserId,
  isHost,
  onResetLeaderboard,
}) => {
  const [tab, setTab] = useState<'challenger' | 'audience'>('challenger');
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  if (!isOpen) return null;

  const challengers = leaderboard
    .filter((e) => e.role === 'challenger')
    .sort((a, b) => b.points - a.points || b.wins - a.wins || b.votesEarned - a.votesEarned);

  const audience = leaderboard
    .filter((e) => e.role === 'audience')
    .sort((a, b) => b.points - a.points || b.correctGuesses - a.correctGuesses);

  const list = tab === 'challenger' ? challengers : audience;

  const top1 = list[0];
  const top2 = list[1];
  const top3 = list[2];
  const rest = list.slice(3);

  const handleReset = () => {
    sound.playClick();
    if (onResetLeaderboard) {
      onResetLeaderboard();
      setConfirmReset(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade select-none">
      <div className="bg-white dark:bg-[#151a40] text-[#0b0f2a] dark:text-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f2c14e] to-[#e5a824] text-[#0b0f2a] flex items-center justify-center shadow-md shadow-amber-500/20">
              <Trophy size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                <span>لوحة المتصدرين</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#f2c14e]/20 text-amber-700 dark:text-amber-300 font-bold">
                  مباشر
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                ترتيب النجوم وأبطال التخمين طوال الجولات
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-4 pt-3 pb-1 flex gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <button
            onClick={() => {
              sound.playClick();
              setTab('challenger');
            }}
            className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              tab === 'challenger'
                ? 'bg-gradient-to-r from-[#4eaab8] to-[#2fa3bf] text-white shadow-md shadow-[#4eaab8]/20'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Mic size={16} />
            <span>نجوم التحدّي ({challengers.length})</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setTab('audience');
            }}
            className={`flex-1 py-2.5 px-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              tab === 'audience'
                ? 'bg-gradient-to-r from-[#4eaab8] to-[#2fa3bf] text-white shadow-md shadow-[#4eaab8]/20'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users size={16} />
            <span>عباقرة الجمهور ({audience.length})</span>
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {list.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 rounded-full mx-auto bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                <Sparkles size={30} />
              </div>
              <h3 className="font-bold text-base mb-1 text-slate-700 dark:text-slate-300">
                لا توجد نقاط مسجلة حتى الآن
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                ستبدأ اللوحة في احتساب النتائج والنقاط والأوسمة فور انتهاء الجولة الأولى من التحدّي!
              </p>
            </div>
          ) : (
            <>
              {/* Podium View for Top 3 */}
              <div className="flex items-end justify-center gap-2 sm:gap-3 pt-3 pb-5 px-1 border-b border-slate-100 dark:border-slate-800">
                {/* 2nd Place */}
                {top2 ? (
                  <div className="flex-1 flex flex-col items-center text-center">
                    <div className="relative mb-1">
                      <Avatar index={top2.av} size={48} />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-300 text-slate-800 text-xs font-black flex items-center justify-center shadow-sm">
                        2
                      </span>
                    </div>
                    <span className="font-bold text-xs truncate max-w-[90px] block">
                      {top2.name}
                    </span>
                    <span className="text-[11px] font-black text-[#4eaab8]">
                      {top2.points} نقطة
                    </span>
                    <div className="w-full h-16 bg-slate-100 dark:bg-slate-800 rounded-t-xl mt-2 flex flex-col items-center justify-center text-[10px] text-slate-400">
                      <Medal size={16} className="text-slate-400 mb-0.5" />
                      <span>المركز الثاني</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}

                {/* 1st Place */}
                {top1 && (
                  <div className="flex-1 flex flex-col items-center text-center scale-105 z-10">
                    <div className="relative mb-1">
                      <Avatar index={top1.av} size={58} />
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[#f2c14e] animate-bounce">
                        👑
                      </span>
                      <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#f2c14e] text-[#0b0f2a] text-xs font-black flex items-center justify-center shadow-md">
                        1
                      </span>
                    </div>
                    <span className="font-extrabold text-sm truncate max-w-[100px] block text-[#0b0f2a] dark:text-white">
                      {top1.name}
                    </span>
                    <span className="text-xs font-black text-[#f2c14e] flex items-center gap-0.5">
                      <Star size={12} className="fill-[#f2c14e]" />
                      <span>{top1.points} نقطة</span>
                    </span>
                    <div className="w-full h-22 bg-gradient-to-t from-amber-500/20 to-amber-500/10 dark:from-amber-500/30 dark:to-amber-500/10 rounded-t-2xl mt-2 border-t-2 border-amber-400 flex flex-col items-center justify-center text-[11px] font-bold text-amber-600 dark:text-amber-300 shadow-sm">
                      <Trophy size={18} className="text-[#f2c14e] mb-0.5" />
                      <span>البطل الأول</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {top3 ? (
                  <div className="flex-1 flex flex-col items-center text-center">
                    <div className="relative mb-1">
                      <Avatar index={top3.av} size={48} />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-700 text-white text-xs font-black flex items-center justify-center shadow-sm">
                        3
                      </span>
                    </div>
                    <span className="font-bold text-xs truncate max-w-[90px] block">
                      {top3.name}
                    </span>
                    <span className="text-[11px] font-black text-[#4eaab8]">
                      {top3.points} نقطة
                    </span>
                    <div className="w-full h-12 bg-slate-100 dark:bg-slate-800 rounded-t-xl mt-2 flex flex-col items-center justify-center text-[10px] text-slate-400">
                      <Medal size={16} className="text-amber-700 mb-0.5" />
                      <span>المركز الثالث</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}
              </div>

              {/* All Entries List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 mb-2">
                  قائمة الترتيب الكاملة:
                </h4>

                {list.map((entry, index) => {
                  const isMe = entry.id === currentUserId;
                  const rank = index + 1;

                  return (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 text-right ${
                        isMe
                          ? 'bg-[#4eaab8]/15 border-[#4eaab8] shadow-sm'
                          : 'bg-white dark:bg-[#151a40] border-slate-100 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      {/* Rank & User details */}
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center ${
                            rank === 1
                              ? 'bg-[#f2c14e] text-[#0b0f2a]'
                              : rank === 2
                              ? 'bg-slate-300 text-slate-800'
                              : rank === 3
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {rank}
                        </span>

                        <Avatar index={entry.av} size={36} />

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-[#0b0f2a] dark:text-white">
                              {entry.name}
                            </span>
                            {isMe && (
                              <span className="text-[10px] font-bold bg-[#4eaab8] text-white px-1.5 py-0.2 rounded-full">
                                أنت
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            {tab === 'challenger' ? (
                              <>
                                <span className="flex items-center gap-0.5">
                                  <Trophy size={11} className="text-[#f2c14e]" />
                                  <span>{entry.wins} فوز</span>
                                </span>
                                <span>·</span>
                                <span>{entry.votesEarned} صوت جمهور</span>
                              </>
                            ) : (
                              <>
                                <span className="flex items-center gap-0.5">
                                  <Target size={11} className="text-[#1f9d73]" />
                                  <span>{entry.correctGuesses} تخمين صحيح</span>
                                </span>
                                {entry.streak > 1 && (
                                  <>
                                    <span>·</span>
                                    <span className="flex items-center gap-0.5 text-amber-500">
                                      <Flame size={11} />
                                      <span>سلسلة {entry.streak}</span>
                                    </span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-left">
                        <span className="text-base font-black text-[#4eaab8] block">
                          {entry.points}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal -mt-0.5">
                          نقطة
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer with Reset button for Host */}
        {isHost && (
          <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              تحكم المقدّم: تصفير النقاط لبطولة جديدة
            </span>

            {confirmReset ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500 font-bold">متأكد؟</span>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition-colors"
                >
                  نعم، تصفير
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg"
              >
                <RotateCcw size={14} />
                <span>تصفير المتصدرين</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
