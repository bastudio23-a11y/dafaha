import React, { useEffect, useState } from 'react';
import {
  Users,
  Ear,
  Check,
  Clock,
  Sparkles,
  Trophy,
  Flame,
  Star,
  Target,
  ArrowUp,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import { Avatar, AVATAR_COLORS } from '../utils/avatars.tsx';
import { CircularTimer } from './CircularTimer.tsx';
import { sound } from '../utils/audio.ts';
import type { GameState, AudienceMember, LeaderboardEntry } from '../types.ts';

interface AudienceViewProps {
  uid: string;
  state: GameState;
  audience: AudienceMember[];
  leaderboard?: LeaderboardEntry[];
  onJoinAudience: (name: string, av: number) => void;
  onVote: (a: number | null, b: number | null) => void;
  myVote?: { a: number; b: number };
}

const KAHOOT_STYLES = [
  { letter: 'أ', shape: '▲', bg: 'bg-[#e5484d]', border: 'border-[#e5484d]', text: 'text-white' },
  { letter: 'ب', shape: '◆', bg: 'bg-[#2fa3bf]', border: 'border-[#2fa3bf]', text: 'text-white' },
  { letter: 'ج', shape: '●', bg: 'bg-[#f2c14e]', border: 'border-[#f2c14e]', text: 'text-[#0b0f2a]' },
  { letter: 'د', shape: '■', bg: 'bg-[#1f9d73]', border: 'border-[#1f9d73]', text: 'text-white' },
];

export const AudienceView: React.FC<AudienceViewProps> = ({
  uid,
  state,
  audience,
  leaderboard = [],
  onJoinAudience,
  onVote,
  myVote,
}) => {
  const [name, setName] = useState<string>(() => {
    try {
      return localStorage.getItem('audience_name') || '';
    } catch {
      return '';
    }
  });
  const [selectedAv, setSelectedAv] = useState<number>(() => {
    try {
      const v = localStorage.getItem('audience_av');
      return v ? parseInt(v, 10) : Math.floor(Math.random() * 8);
    } catch {
      return 1;
    }
  });

  const me = audience.find((a) => a.id === uid);

  const [localVoteA, setLocalVoteA] = useState<number | null>(myVote && myVote.a >= 0 ? myVote.a : null);
  const [localVoteB, setLocalVoteB] = useState<number | null>(myVote && myVote.b >= 0 ? myVote.b : null);

  // Reset local choices for each new round and restore acknowledged votes on reload.
  useEffect(() => {
    setLocalVoteA(myVote && myVote.a >= 0 ? myVote.a : null);
    setLocalVoteB(myVote && myVote.b >= 0 ? myVote.b : null);
  }, [state.round, myVote?.a, myVote?.b]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    const finalName = name.trim() || 'لاعب الجمهور';
    try {
      localStorage.setItem('audience_name', finalName);
      localStorage.setItem('audience_av', String(selectedAv));
    } catch {
      // ignore
    }
    onJoinAudience(finalName, selectedAv);
  };

  const selectVote = (sideIdx: number, optIdx: number) => {
    sound.playVote();
    if (sideIdx === 0) {
      setLocalVoteA(optIdx);
      onVote(optIdx, localVoteB);
    } else {
      setLocalVoteB(optIdx);
      onVote(localVoteA, optIdx);
    }
  };

  // Not yet registered in audience
  if (!me) {
    return (
      <div className="max-w-md mx-auto py-4 px-4 select-none text-center">
        <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-tr from-[#f2c14e] to-[#e5a824] text-[#0b0f2a] flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 animate-pulse">
          <Users size={32} />
        </div>
        <h2 className="text-2xl font-black mb-1 text-[#0b0f2a] dark:text-white">
          انضم لتحدّي الجمهور!
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-4">
          اكتب اسمك واجمع النقاط لتتصدر الترتيب! 🏆
        </p>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="text-right">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              اسمك في اللعبة:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: البطل فهد..."
              maxLength={20}
              className="w-full text-center text-lg font-bold py-3 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151a40] text-[#0b0f2a] dark:text-white focus:border-[#4eaab8] outline-none shadow-inner"
            />
          </div>

          <div className="text-right">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
              اختر صورتك الرمزية:
            </label>
            <div className="grid grid-cols-4 gap-2.5 max-w-[280px] mx-auto">
              {AVATAR_COLORS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setSelectedAv(idx);
                  }}
                  className={`p-1 rounded-full transition-transform active:scale-95 ${
                    selectedAv === idx
                      ? 'ring-4 ring-[#4eaab8] scale-110 shadow-lg'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <Avatar index={idx} size={50} />
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-2xl font-black text-white bg-gradient-to-r from-[#4eaab8] to-[#2fa3bf] shadow-lg shadow-[#4eaab8]/25 hover:opacity-95 active:scale-95 transition-all text-lg"
          >
            ادخل للمنافسة 🚀
          </button>
        </form>
      </div>
    );
  }

  // Lobby Phase
  if (state.phase === 'lobby' || !state.cur) {
    return (
      <div className="max-w-md mx-auto text-center py-6 px-4 select-none">
        <div className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-[#4eaab8] p-1 shadow-md">
          <Avatar index={me.av} size={72} />
        </div>
        <h2 className="text-2xl font-black mb-1 text-[#0b0f2a] dark:text-white">
          أهلاً {me.name}!
        </h2>
        <div className="inline-block bg-[#f2c14e]/20 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold mb-4">
          نقاطك الحالية: {me.points || 0} ⭐
        </div>
        <div className="bg-white dark:bg-[#151a40] rounded-2xl p-6 shadow-md border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-center gap-2 text-[#4eaab8] font-bold mb-2">
            <Clock size={20} className="animate-spin" />
            <span>بانتظار بدء الجولة...</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            شاهد الشاشة الكبيرة واستعد للتصويت السريع لكسب أعلى النقاط!
          </p>
        </div>
      </div>
    );
  }

  // Secret & Explain phases
  if (state.phase === 'secret' || state.phase === 'explain') {
    return (
      <div className="max-w-md mx-auto text-center py-6 px-4 select-none animate-fade">
        <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-gradient-to-br from-[#4eaab8] to-[#2fa3bf] text-white flex items-center justify-center shadow-xl animate-pulse">
          <Ear size={38} />
        </div>
        <h2 className="text-2xl font-black mb-2 text-[#0b0f2a] dark:text-white">
          اسمع الشرح بتركيز!
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-xs mx-auto">
          كل ما عرفت المهارة أسرع وصوت بدقة، راح تكسب نقاط أعلى وتتصدر اللوحة!
        </p>

        <div className="grid grid-cols-2 gap-3 text-right">
          <div className="p-3.5 bg-white dark:bg-[#151a40] rounded-2xl border-t-4 border-[#4eaab8] shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Avatar index={state.avs[0]} size={28} />
              <span className="font-bold text-xs text-[#4eaab8]">{state.names[0]}</span>
            </div>
            <p className="text-[11px] text-slate-400">يشرح مهارته الأولى...</p>
          </div>

          <div className="p-3.5 bg-white dark:bg-[#151a40] rounded-2xl border-t-4 border-[#0b0f2a] dark:border-slate-500 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Avatar index={state.avs[1]} size={28} />
              <span className="font-bold text-xs text-[#0b0f2a] dark:text-white">{state.names[1]}</span>
            </div>
            <p className="text-[11px] text-slate-400">يشرح مهارته الثانية...</p>
          </div>
        </div>
      </div>
    );
  }

  // Voting Phase (Kahoot style cards)
  if (state.phase === 'vote' && state.cur) {
    const bothChosen = localVoteA !== null && localVoteB !== null;

    return (
      <div className="max-w-md mx-auto py-2 px-3 select-none text-center animate-fade">
        <CircularTimer endsAt={state.endsAt} totalDuration={state.durationSeconds} />

        <div className="mb-3">
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black shadow-sm ${
            bothChosen
              ? 'bg-[#1f9d73] text-white animate-bounce'
              : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300'
          }`}>
            {bothChosen ? <Check size={16} /> : <Sparkles size={16} />}
            <span>{bothChosen ? 'تم قفل خياراتك! بانتظار النتائج...' : 'اختر مهارة كل متحدّي بسرعة:'}</span>
          </span>
        </div>

        {/* Challenger 1 Options */}
        <div className="mb-4 bg-white dark:bg-[#151a40] rounded-2xl p-3.5 shadow-md border-2 border-[#4eaab8]/40 border-t-4 border-t-[#4eaab8] text-right">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Avatar index={state.avs[0]} size={28} />
              <span className="font-extrabold text-sm text-[#4eaab8]">{state.names[0]}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-bold">وش مهارته؟</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {state.cur[0].opts.map((opt, k) => {
              const style = KAHOOT_STYLES[k];
              const isSelected = localVoteA === k;

              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => selectVote(0, k)}
                  className={`p-3 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-sm min-h-[70px] ${
                    isSelected
                      ? `${style.bg} ${style.text} ring-4 ring-offset-2 ring-[#4eaab8] scale-102`
                      : `${style.bg} ${style.text} opacity-85 hover:opacity-100`
                  }`}
                >
                  <span className="text-lg opacity-90">{style.shape}</span>
                  <span className="text-xs sm:text-sm text-center leading-tight line-clamp-2">{opt}</span>
                  {isSelected && <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full mt-0.5">تم الاختيار ✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Challenger 2 Options */}
        <div className="mb-3 bg-white dark:bg-[#151a40] rounded-2xl p-3.5 shadow-md border-2 border-slate-200 dark:border-slate-800 border-t-4 border-t-[#0b0f2a] dark:border-t-slate-400 text-right">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Avatar index={state.avs[1]} size={28} />
              <span className="font-extrabold text-sm text-[#0b0f2a] dark:text-white">{state.names[1]}</span>
            </div>
            <span className="text-[11px] text-slate-400 font-bold">وش مهارته؟</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {state.cur[1].opts.map((opt, k) => {
              const style = KAHOOT_STYLES[k];
              const isSelected = localVoteB === k;

              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => selectVote(1, k)}
                  className={`p-3 rounded-2xl font-black text-sm flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-sm min-h-[70px] ${
                    isSelected
                      ? `${style.bg} ${style.text} ring-4 ring-offset-2 ring-[#0b0f2a] dark:ring-white scale-102`
                      : `${style.bg} ${style.text} opacity-85 hover:opacity-100`
                  }`}
                >
                  <span className="text-lg opacity-90">{style.shape}</span>
                  <span className="text-xs sm:text-sm text-center leading-tight line-clamp-2">{opt}</span>
                  {isSelected && <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full mt-0.5">تم الاختيار ✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Results Phase: Kahoot-style winner reveal!
  if (state.phase === 'results' && state.cur) {
    const correctA = localVoteA === state.cur[0].ans;
    const correctB = localVoteB === state.cur[1].ans;
    const correctCount = (correctA ? 1 : 0) + (correctB ? 1 : 0);

    // Sort audience by points to determine live rank
    const audienceRankings = [...audience].sort((a, b) => (b.points || 0) - (a.points || 0));
    const myRankIdx = audienceRankings.findIndex((a) => a.id === uid);
    const myRank = myRankIdx !== -1 ? myRankIdx + 1 : 1;

    // Top 3 audience members in room
    const top3Audience = audienceRankings.slice(0, 3);

    return (
      <div className="max-w-md mx-auto py-2 px-3 select-none text-center animate-fade">
        {/* Kahoot Verdict Card */}
        <div
          className={`rounded-3xl p-5 mb-4 text-white shadow-xl transition-all ${
            correctCount === 2
              ? 'bg-gradient-to-b from-[#1f9d73] to-[#147a57] border-2 border-[#1f9d73]'
              : correctCount === 1
              ? 'bg-gradient-to-b from-[#4eaab8] to-[#2fa3bf] border-2 border-[#4eaab8]'
              : 'bg-gradient-to-b from-[#e5484d] to-[#b32b30] border-2 border-[#e5484d]'
          }`}
        >
          <div className="text-4xl mb-1">
            {correctCount === 2 ? '🎉' : correctCount === 1 ? '👏' : '💔'}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black mb-1 drop-shadow">
            {correctCount === 2
              ? 'إجابة صحيحة بالكامل!'
              : correctCount === 1
              ? 'عرفت مهارة واحد منهم!'
              : 'للأسف لم توفّق!'}
          </h2>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white font-black text-sm my-1">
            <span>+{me.lastPointsEarned || (correctCount * 100)} نقطة</span>
            <Star size={14} className="fill-white" />
          </div>

          {me.streak && me.streak > 1 ? (
            <div className="flex items-center justify-center gap-1 text-xs font-bold text-amber-200 mt-1">
              <Flame size={14} className="fill-amber-300" />
              <span>سلسلة إجابات متتالية: {me.streak} 🔥</span>
            </div>
          ) : null}
        </div>

        {/* Kahoot Rank & Standings Card */}
        <div className="bg-white dark:bg-[#151a40] rounded-3xl p-4 mb-4 shadow-md border-2 border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-semibold">ترتيبك المباشر:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black text-[#4eaab8]">
                  المركز #{myRank}
                </span>
                <span className="text-xs text-slate-400">من {audience.length || 1}</span>
              </div>
            </div>

            <div className="text-left">
              <span className="text-xs text-slate-400 block font-semibold">مجموع نقاطك:</span>
              <span className="text-2xl font-black text-[#f2c14e]">
                {me.points || 0}
              </span>
            </div>
          </div>

          {/* Mini Room Podium / Top 3 Kahoot Leaders */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <h4 className="text-xs font-bold text-slate-400 mb-2 flex items-center justify-center gap-1">
              <Trophy size={13} className="text-[#f2c14e]" />
              <span>المتصدرين في الغرفة الآن:</span>
            </h4>

            <div className="space-y-1.5">
              {top3Audience.map((topPlayer, idx) => {
                const isMe = topPlayer.id === uid;
                return (
                  <div
                    key={topPlayer.id}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold ${
                      isMe
                        ? 'bg-[#4eaab8]/20 border border-[#4eaab8] text-[#0b0f2a] dark:text-white'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                        idx === 0 ? 'bg-[#f2c14e] text-black' : idx === 1 ? 'bg-slate-300 text-black' : 'bg-amber-700 text-white'
                      }`}>
                        {idx + 1}
                      </span>
                      <Avatar index={topPlayer.av} size={22} />
                      <span className="truncate max-w-[120px]">{topPlayer.name} {isMe ? '(أنت)' : ''}</span>
                    </div>
                    <span className="text-[#4eaab8] font-black">{topPlayer.points || 0} نقطة</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Skills Details */}
        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3 text-right text-xs space-y-1.5 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">مهارة {state.names[0]}:</span>
            <span className="font-black text-[#1f9d73]">{state.cur[0].skill} {correctA ? '✓' : ''}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">مهارة {state.names[1]}:</span>
            <span className="font-black text-[#1f9d73]">{state.cur[1].skill} {correctB ? '✓' : ''}</span>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          استعد! الجولة القادمة ستبدأ على شاشة العرض...
        </p>
      </div>
    );
  }

  return null;
};
