import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Scan,
  Users,
  Mic,
  Play,
  RotateCcw,
  Home,
  Trophy,
  Equal,
  Sparkles,
  Lock,
  Lightbulb,
  Clock,
  Eye,
  EyeOff,
  Check,
  Plus,
  UserCheck,
  UserX,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { Avatar } from '../utils/avatars.tsx';
import { QRCodeDisplay } from './QRCodeDisplay.tsx';
import { CircularTimer } from './CircularTimer.tsx';
import { DafahLogo } from './DafahLogo.tsx';
import { sound } from '../utils/audio.ts';
import type {
  GameState,
  Player,
  AudienceMember,
  VoteRecord,
  PlayerRegistration,
  ChallengerSide,
} from '../types.ts';

interface HostViewProps {
  state: GameState;
  players: Player[];
  audience: AudienceMember[];
  votes: VoteRecord[];
  manual: [number[], number[]];
  registrations?: PlayerRegistration[];
  onStartGame: (names: [string, string], avs: [number, number], duration: number) => void;
  onNextRound: () => void;
  onSetPhase: (phase: any, duration?: number) => void;
  onManualVote: (sideIdx: number, optIdx: number, delta: number) => void;
  onFinishRound: () => void;
  onResetPlayers: () => void;
  onResetGame: () => void;
  onOpenLeaderboard?: () => void;
  onApproveRegistration?: (reg: PlayerRegistration, side?: ChallengerSide) => void;
  onRejectRegistration?: (regId: string, role?: string) => void;
  onApproveAllRegistrations?: (list: PlayerRegistration[]) => void;
  onSwapChallengers?: () => void;
}

const OPTION_LETTERS = ['أ', 'ب', 'ج', 'د'];

export const HostView: React.FC<HostViewProps> = ({
  state,
  players,
  audience,
  votes,
  manual,
  registrations = [],
  onStartGame,
  onNextRound,
  onSetPhase,
  onManualVote,
  onFinishRound,
  onResetPlayers,
  onResetGame,
  onOpenLeaderboard,
  onApproveRegistration,
  onRejectRegistration,
  onApproveAllRegistrations,
  onSwapChallengers,
}) => {
  const [localName0, setLocalName0] = useState<string>('المتحدّي الأيمن');
  const [localName1, setLocalName1] = useState<string>('المتحدّي الأيسر');
  const [roundDuration, setRoundDuration] = useState<number>(15);
  const [showSecretOnScreen, setShowSecretOnScreen] = useState<boolean>(false);

  // URLs for QR codes
  const [challengerUrl, setChallengerUrl] = useState<string>('');
  const [audienceUrl, setAudienceUrl] = useState<string>('');
  const [registerUrl, setRegisterUrl] = useState<string>('');

  useEffect(() => {
    try {
      const base = window.location.origin + window.location.pathname;
      const regUrl = new URL(base);
      regUrl.searchParams.set('page', 'register');
      setRegisterUrl(regUrl.toString());

      const cUrl = new URL(base);
      cUrl.searchParams.set('role', 'challenger');
      setChallengerUrl(cUrl.toString());

      const aUrl = new URL(base);
      aUrl.searchParams.set('role', 'audience');
      setAudienceUrl(aUrl.toString());
    } catch {
      // fallback
    }
  }, []);

  // Launch confetti on results phase
  useEffect(() => {
    if (state.phase === 'results') {
      sound.playVictory();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#4eaab8', '#2fa3bf', '#f2c14e', '#1f9d73'],
      });
    }
  }, [state.phase, state.round]);

  const rightSlot = players.find((p) => p.side === 'r');
  const leftSlot = players.find((p) => p.side === 'l');

  const countForOpt = (sideIdx: number, optIdx: number): number => {
    const key = sideIdx === 0 ? 'a' : 'b';
    const autoVotes = votes.filter((v) => v.r === state.round && v[key] === optIdx).length;
    const manVotes = manual[sideIdx]?.[optIdx] || 0;
    return autoVotes + manVotes;
  };

  const handleStart = () => {
    sound.playClick();
    const finalNames: [string, string] = [
      rightSlot?.name || localName0.trim() || 'المتحدّي الأيمن',
      leftSlot?.name || localName1.trim() || 'المتحدّي الأيسر',
    ];
    const finalAvs: [number, number] = [
      rightSlot?.av ?? 0,
      leftSlot?.av ?? 1,
    ];
    onStartGame(finalNames, finalAvs, roundDuration);
  };

  // 1. Lobby Phase
  if (state.phase === 'lobby') {
    const canStart = (rightSlot && leftSlot) || localName0.trim().length > 0;

    return (
      <div className="max-w-4xl mx-auto py-2 px-2 select-none">
        <div className="text-center mb-6">
          <div className="inline-block p-4 sm:p-5 bg-white dark:bg-[#151a40] rounded-3xl shadow-xl border-2 border-slate-100 dark:border-slate-800 mb-3 hover:scale-105 transition-transform">
            <DafahLogo size={62} variant="full" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-1.5 bg-gradient-to-r from-[#122b64] via-[#2fa3bf] to-[#4eaab8] dark:from-[#9fd8e2] dark:to-white bg-clip-text text-transparent">
            مين المتحدّيين اليوم؟
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto">
            امسحوا الباركود للتسجيل، وسيظهر كل اسم في لوحة الأدمن لتأكيد دخوله للعبة!
          </p>
        </div>

        {/* Waiting Room & Approvals Section */}
        {(() => {
          const pending = registrations.filter((r) => r.status === 'pending');
          return (
            <div className="bg-white dark:bg-[#151a40] rounded-3xl p-5 shadow-lg border-2 border-amber-500/40 mb-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                    <UserCheck size={20} />
                  </div>
                  <div className="text-right">
                    <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                      <span>طلبات الانضمام والتأكيد</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950">
                        {pending.length} بانتظار الموافقة
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      يمكنك تأكيد اللاعبين لدخول اللعبة أو حذف أي شخص
                    </p>
                  </div>
                </div>

                {pending.length > 0 && onApproveAllRegistrations && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      onApproveAllRegistrations(pending);
                    }}
                    className="py-2 px-4 rounded-xl font-black text-xs sm:text-sm bg-[#1f9d73] hover:bg-[#1a8360] text-white flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <CheckCheck size={16} />
                    <span>قبول الكل ({pending.length}) ✓</span>
                  </button>
                )}
              </div>

              {pending.length === 0 ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  لا توجد طلبات جديدة معلقة. اطلب من اللاعبين مسح باركود التسجيل للانضمام!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {pending.map((reg) => (
                    <div
                      key={reg.id}
                      className="p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between gap-2 shadow-sm"
                    >
                      <div className="flex items-center gap-2 text-right overflow-hidden">
                        <Avatar index={reg.av} size={36} />
                        <div className="truncate">
                          <span className="font-extrabold text-sm block truncate text-[#0b0f2a] dark:text-white">
                            {reg.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold block">
                            {reg.role === 'challenger' ? 'طلب: متحدّي 🎤' : 'طلب: جمهور 👥'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {reg.role === 'challenger' ? (
                          <>
                            <button
                              onClick={() => {
                                sound.playClick();
                                onApproveRegistration?.(reg, 'r');
                              }}
                              title="قبول كمتحدّي أيمن"
                              className="px-2 py-1 rounded-lg bg-[#4eaab8] hover:bg-[#3d96a4] text-white font-bold text-[11px]"
                            >
                              يمين
                            </button>
                            <button
                              onClick={() => {
                                sound.playClick();
                                onApproveRegistration?.(reg, 'l');
                              }}
                              title="قبول كمتحدّي أيسر"
                              className="px-2 py-1 rounded-lg bg-[#0b0f2a] hover:bg-slate-700 text-white font-bold text-[11px]"
                            >
                              يسار
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              sound.playClick();
                              onApproveRegistration?.(reg);
                            }}
                            title="تأكيد الدخول"
                            className="p-1.5 rounded-lg bg-[#1f9d73] hover:bg-[#19815e] text-white"
                          >
                            <Check size={16} />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            sound.playClick();
                            onRejectRegistration?.(reg.id, reg.role);
                          }}
                          title="حذف / رفض"
                          className="p-1.5 rounded-lg bg-red-500/15 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <UserX size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Challenger Status Slots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Right Challenger */}
          <div className="bg-white dark:bg-[#151a40] rounded-3xl p-5 shadow-md border-2 border-[#4eaab8]/40 border-t-8 border-t-[#4eaab8] text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center bg-[#4eaab8]/15">
              {rightSlot ? (
                <Avatar index={rightSlot.av} size={58} />
              ) : (
                <Mic size={28} className="text-[#4eaab8]" />
              )}
            </div>
            <h3 className="font-extrabold text-xl text-[#4eaab8] mb-1">
              المتحدّي الأيمن
            </h3>
            {rightSlot ? (
              <div className="flex items-center justify-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1f9d73]/15 text-[#1f9d73] text-sm font-bold">
                  <Check size={16} />
                  <span>{rightSlot.name} (جاهز)</span>
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    onRejectRegistration?.(rightSlot.id, 'challenger');
                  }}
                  title="حذف هذا المتحدّي"
                  className="p-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block mb-1">
                  امسح الباركود أو اكتب الاسم يدوياً:
                </span>
                <input
                  type="text"
                  value={localName0}
                  onChange={(e) => setLocalName0(e.target.value)}
                  placeholder="اسم المتحدّي الأيمن"
                  className="w-full max-w-[200px] mx-auto text-center font-bold text-sm py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[#0b0f2a] dark:text-white outline-none"
                />
              </div>
            )}
          </div>

          {/* Left Challenger */}
          <div className="bg-white dark:bg-[#151a40] rounded-3xl p-5 shadow-md border-2 border-slate-300 dark:border-slate-700 border-t-8 border-t-[#0b0f2a] dark:border-t-slate-300 text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              {leftSlot ? (
                <Avatar index={leftSlot.av} size={58} />
              ) : (
                <Mic size={28} className="text-[#0b0f2a] dark:text-white" />
              )}
            </div>
            <h3 className="font-extrabold text-xl text-[#0b0f2a] dark:text-white mb-1">
              المتحدّي الأيسر
            </h3>
            {leftSlot ? (
              <div className="flex items-center justify-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1f9d73]/15 text-[#1f9d73] text-sm font-bold">
                  <Check size={16} />
                  <span>{leftSlot.name} (جاهز)</span>
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    onRejectRegistration?.(leftSlot.id, 'challenger');
                  }}
                  title="حذف هذا المتحدّي"
                  className="p-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block mb-1">
                  امسح الباركود أو اكتب الاسم يدوياً:
                </span>
                <input
                  type="text"
                  value={localName1}
                  onChange={(e) => setLocalName1(e.target.value)}
                  placeholder="اسم المتحدّي الأيسر"
                  className="w-full max-w-[200px] mx-auto text-center font-bold text-sm py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[#0b0f2a] dark:text-white outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Main Registration QR Code Card */}
        <div className="bg-gradient-to-br from-white to-[#4eaab8]/5 dark:from-[#151a40] dark:to-[#1a204d] rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-[#4eaab8]/40 mb-6 text-center select-none">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-[#4eaab8]/20 text-[#2fa3bf] dark:text-[#4eaab8] mb-2.5">
                <Sparkles size={14} />
                <span>الباركود الرئيسي لتسجيل المتسابقين والجمهور</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-2 text-[#0b0f2a] dark:text-white font-['Tajawal']">
                امسحوا الباركود للتسجيل والدخول للعبة 📱
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed max-w-md">
                وجّه كاميرا جوالك إلى الباركود، اكتب اسمك واختر صورتك ودورك (متحدّي أو جمهور).
                ستصل أسماؤكم إلى شاشة الأدمن هنا لتأكيد دخولكم أو حذف أي شخص!
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    const urlToCopy = registerUrl || `${window.location.origin}${window.location.pathname}?page=register`;
                    try {
                      navigator.clipboard.writeText(urlToCopy);
                    } catch {
                      // fallback
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-[#4eaab8] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <span>📋 نسخ رابط التسجيل المباشر</span>
                </button>
                <span className="text-[11px] text-slate-400">امسح بالكاميرا للتسجيل الفوري</span>
              </div>
            </div>

            <div className="shrink-0 p-3 bg-white dark:bg-[#0e1230] rounded-2xl shadow-lg border-2 border-[#4eaab8]/30">
              <QRCodeDisplay
                url={registerUrl || `${window.location.origin}${window.location.pathname}?page=register`}
                title="📲 باركود التسجيل المباشر"
                color="#4eaab8"
              />
            </div>
          </div>
        </div>

        {/* Connected Audience Wall */}
        <div className="bg-white dark:bg-[#151a40] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 mb-6 text-center">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Users size={18} className="text-[#4eaab8]" />
              <span>الجمهور المنضم والمعتمد:</span>
            </span>
            <span className="bg-[#4eaab8]/15 text-[#4eaab8] font-black text-sm px-2.5 py-0.5 rounded-full">
              {audience.length} مصوّت
            </span>
          </div>

          {audience.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">
              بانتظار مسح الجمهور للباركود وتسجيل أسمائهم...
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 justify-center max-h-36 overflow-y-auto p-1">
              {audience.map((a) => (
                <div
                  key={a.id}
                  className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 pl-2 pr-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-semibold group shadow-sm"
                >
                  <Avatar index={a.av} size={22} />
                  <span>{a.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      onRejectRegistration?.(a.id, 'audience');
                    }}
                    title="حذف هذا الشخص"
                    className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voting duration setting */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Clock size={16} />
            <span>مدة التصويت:</span>
          </span>
          {[15, 30, 45].map((secs) => (
            <button
              key={secs}
              onClick={() => {
                sound.playClick();
                setRoundDuration(secs);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                roundDuration === secs
                  ? 'bg-[#4eaab8] text-white shadow-md'
                  : 'bg-white dark:bg-[#151a40] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {secs} ثانية
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full sm:w-auto min-w-[220px] py-3.5 px-8 bg-gradient-to-r from-[#4eaab8] to-[#2fa3bf] text-white rounded-2xl font-black text-lg shadow-xl shadow-[#4eaab8]/30 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Play size={22} className="fill-white" />
            <span>ابدأ اللعبة</span>
          </button>

          {(rightSlot || leftSlot) && (
            <button
              onClick={() => {
                sound.playClick();
                onResetPlayers();
              }}
              className="py-3 px-5 bg-white dark:bg-[#151a40] text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm shadow-sm border border-slate-200 dark:border-slate-700 hover:text-red-500 transition-colors flex items-center gap-2"
            >
              <RotateCcw size={16} />
              <span>تصفير المتحدّيين</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Secret Phase
  if (state.phase === 'secret') {
    return (
      <div className="max-w-2xl mx-auto py-6 px-3 text-center select-none animate-fade">
        <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-tr from-[#4eaab8] to-[#2fa3bf] text-white flex items-center justify-center shadow-xl shadow-[#4eaab8]/25 mb-4">
          <Lock size={38} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black mb-2 text-[#0b0f2a] dark:text-white">
          الكلمات السرّية جاهزة!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base mb-6 max-w-md mx-auto">
          المتحدّيان يفتحان جوالاتهما ويضغطان على بطاقتهما السرّية لرؤية المهارة… والجمهور يغمّض عينيه!
        </p>

        {/* Option to reveal on host screen for single device play */}
        <div className="mb-8">
          <button
            onClick={() => {
              sound.playClick();
              setShowSecretOnScreen(!showSecretOnScreen);
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-[#151a40] px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm hover:text-[#4eaab8]"
          >
            {showSecretOnScreen ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{showSecretOnScreen ? 'إخفاء الكلمات السرّية' : 'كشف الكلمات للمتحدّيين هنا على الشاشة'}</span>
          </button>

          {showSecretOnScreen && state.cur && (
            <div className="grid grid-cols-2 gap-4 mt-4 text-center">
              <div className="p-4 rounded-2xl bg-[#4eaab8]/15 border-2 border-[#4eaab8]">
                <span className="text-xs text-[#4eaab8] font-bold block mb-1">
                  مهارة {state.names[0]}:
                </span>
                <span className="text-2xl font-black text-[#0b0f2a] dark:text-white">
                  {state.cur[0].skill}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0b0f2a]/10 dark:bg-white/10 border-2 border-slate-400">
                <span className="text-xs text-slate-500 dark:text-slate-300 font-bold block mb-1">
                  مهارة {state.names[1]}:
                </span>
                <span className="text-2xl font-black text-[#0b0f2a] dark:text-white">
                  {state.cur[1].skill}
                </span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onSetPhase('explain');
          }}
          className="py-4 px-8 bg-gradient-to-r from-[#4eaab8] to-[#2fa3bf] text-white rounded-2xl font-black text-xl shadow-xl shadow-[#4eaab8]/30 hover:opacity-95 active:scale-95 transition-all inline-flex items-center gap-2"
        >
          <Mic size={24} />
          <span>جاهزين؟ ابدأ الشرح!</span>
        </button>
      </div>
    );
  }

  // 3. Explain Phase
  if (state.phase === 'explain') {
    return (
      <div className="max-w-2xl mx-auto py-6 px-3 text-center select-none animate-fade">
        <div className="w-20 h-20 rounded-full mx-auto bg-gradient-to-tr from-[#f2c14e] to-[#e5a824] text-[#0b0f2a] flex items-center justify-center shadow-xl shadow-amber-500/20 mb-4 animate-bounce">
          <Lightbulb size={40} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black mb-2 text-[#0b0f2a] dark:text-white">
          وقت الشرح والإبداع!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base mb-6 max-w-md mx-auto">
          المتحدّيان يشرحان مهاراتهما بالتناوب أمام الجميع بدون ذكر اسم المهارة أو أحرفها.
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
          <div className="p-4 bg-white dark:bg-[#151a40] rounded-2xl border-t-4 border-[#4eaab8] shadow-md">
            <Avatar index={state.avs[0]} size={42} />
            <h4 className="font-bold text-base mt-2 text-[#4eaab8]">{state.names[0]}</h4>
            <span className="text-xs text-slate-400">يشرح أولاً</span>
          </div>
          <div className="p-4 bg-white dark:bg-[#151a40] rounded-2xl border-t-4 border-[#0b0f2a] dark:border-slate-400 shadow-md">
            <Avatar index={state.avs[1]} size={42} />
            <h4 className="font-bold text-base mt-2 text-[#0b0f2a] dark:text-white">{state.names[1]}</h4>
            <span className="text-xs text-slate-400">يشرح ثانياً</span>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onSetPhase('vote', state.durationSeconds || roundDuration || 15);
          }}
          className="py-4 px-8 bg-gradient-to-r from-[#4eaab8] to-[#2fa3bf] text-white rounded-2xl font-black text-xl shadow-xl shadow-[#4eaab8]/30 hover:opacity-95 active:scale-95 transition-all inline-flex items-center gap-2"
        >
          <Clock size={24} />
          <span>ابدأ التصويت ({state.durationSeconds || roundDuration} ثانية)</span>
        </button>
      </div>
    );
  }

  // 4. Voting Phase
  if (state.phase === 'vote' && state.cur) {
    const totalMobileVotes = votes.filter((v) => v.r === state.round).length;

    return (
      <div className="max-w-4xl mx-auto py-2 px-2 select-none animate-fade">
        {/* Timer */}
        <CircularTimer
          endsAt={state.endsAt}
          totalDuration={state.durationSeconds}
          onTimeUp={onFinishRound}
        />

        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold bg-white dark:bg-[#151a40] px-4 py-1.5 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
            <Users size={16} className="text-[#4eaab8]" />
            <span>أصوات الجوالات المباشرة: <b className="text-[#4eaab8] text-base">{totalMobileVotes}</b></span>
            <span className="text-slate-400">·</span>
            <span className="text-xs text-slate-400">تقدر تضيف أصوات يدوية بالضغط على أي خيار</span>
          </span>
        </div>

        {/* Two Panels for Challengers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Challenger 0 */}
          <div className="bg-white dark:bg-[#151a40] rounded-3xl p-4 shadow-md border-2 border-[#4eaab8]/40 border-t-8 border-t-[#4eaab8]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Avatar index={state.avs[0]} size={36} />
                <h3 className="font-extrabold text-lg text-[#4eaab8]">
                  {state.names[0]}
                </h3>
              </div>
              <span className="text-xs text-slate-400">اضغط لإضافة صوت +1</span>
            </div>

            <div className="space-y-2">
              {state.cur[0].opts.map((opt, k) => {
                const count = countForOpt(0, k);
                return (
                  <button
                    key={k}
                    onClick={() => {
                      sound.playClick();
                      onManualVote(0, k, 1);
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-[#4eaab8]/15 border border-slate-200 dark:border-slate-700 hover:border-[#4eaab8] transition-all flex items-center justify-between text-right active:scale-[0.98] group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-[#4eaab8]/15 text-[#4eaab8] font-bold text-sm flex items-center justify-center">
                        {OPTION_LETTERS[k]}
                      </span>
                      <span className="font-bold text-base text-[#0b0f2a] dark:text-white">
                        {opt}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="bg-[#4eaab8] text-white font-black text-sm px-3 py-1 rounded-xl shadow-sm min-w-[36px] text-center">
                        {count}
                      </span>
                      <Plus size={16} className="text-slate-400 group-hover:text-[#4eaab8] opacity-50 group-hover:opacity-100" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Challenger 1 */}
          <div className="bg-white dark:bg-[#151a40] rounded-3xl p-4 shadow-md border-2 border-slate-200 dark:border-slate-700 border-t-8 border-t-[#0b0f2a] dark:border-t-slate-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Avatar index={state.avs[1]} size={36} />
                <h3 className="font-extrabold text-lg text-[#0b0f2a] dark:text-white">
                  {state.names[1]}
                </h3>
              </div>
              <span className="text-xs text-slate-400">اضغط لإضافة صوت +1</span>
            </div>

            <div className="space-y-2">
              {state.cur[1].opts.map((opt, k) => {
                const count = countForOpt(1, k);
                return (
                  <button
                    key={k}
                    onClick={() => {
                      sound.playClick();
                      onManualVote(1, k, 1);
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 hover:border-slate-400 transition-all flex items-center justify-between text-right active:scale-[0.98] group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center">
                        {OPTION_LETTERS[k]}
                      </span>
                      <span className="font-bold text-base text-[#0b0f2a] dark:text-white">
                        {opt}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="bg-[#0b0f2a] dark:bg-[#2fa3bf] text-white font-black text-sm px-3 py-1 rounded-xl shadow-sm min-w-[36px] text-center">
                        {count}
                      </span>
                      <Plus size={16} className="text-slate-400 group-hover:text-slate-200 opacity-50 group-hover:opacity-100" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* End voting early button */}
        <div className="text-center">
          <button
            onClick={() => {
              sound.playClick();
              onFinishRound();
            }}
            className="py-2.5 px-6 rounded-xl font-bold text-sm bg-white dark:bg-[#151a40] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-[#4eaab8] transition-colors"
          >
            إنهاء التصويت وعرض النتيجة الآن
          </button>
        </div>
      </div>
    );
  }

  // 5. Results Phase
  if (state.phase === 'results' && state.cur) {
    const isWinner = state.win >= 0;
    const t0 = state.tally?.t0 || [0, 0, 0, 0];
    const t1 = state.tally?.t1 || [0, 0, 0, 0];
    const tot0 = t0.reduce((a, b) => a + b, 0) || 1;
    const tot1 = t1.reduce((a, b) => a + b, 0) || 1;

    return (
      <div className="max-w-4xl mx-auto py-2 px-2 select-none animate-fade">
        {/* Victory Card */}
        <div
          className={`bg-white dark:bg-[#151a40] rounded-3xl p-6 shadow-xl text-center mb-6 border-2 transition-all ${
            isWinner
              ? 'border-[#1f9d73] shadow-[#1f9d73]/15'
              : 'border-slate-300 dark:border-slate-700'
          }`}
        >
          <div className="relative inline-block mb-2">
            {isWinner ? (
              <div className="relative animate-bounce">
                <Avatar index={state.avs[state.win]} size={88} />
                <span className="absolute -bottom-2 -right-2 bg-[#f2c14e] text-[#0b0f2a] p-2 rounded-full shadow-md">
                  <Trophy size={20} />
                </span>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full mx-auto bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                <Equal size={32} />
              </div>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-black mb-1.5 text-[#0b0f2a] dark:text-white">
            {state.msg}
          </h2>

          <div className="flex items-center justify-center gap-4 text-sm font-bold text-slate-500 dark:text-slate-400">
            <span>
              {state.names[0]}: <b className="text-[#4eaab8] text-base">{state.sc[0]}</b> صوت صحيح
            </span>
            <span>·</span>
            <span>
              {state.names[1]}: <b className="text-[#0b0f2a] dark:text-white text-base">{state.sc[1]}</b> صوت صحيح
            </span>
          </div>
        </div>

        {/* Full Breakdown Panels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Challenger 0 Breakdown */}
          <div className="bg-white dark:bg-[#151a40] rounded-3xl p-4 shadow-md border-2 border-[#4eaab8]/40 border-t-8 border-t-[#4eaab8]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Avatar index={state.avs[0]} size={36} />
                <h3 className="font-extrabold text-lg text-[#4eaab8]">
                  {state.names[0]}
                </h3>
              </div>
              <span className="text-xs font-bold text-[#1f9d73] bg-[#1f9d73]/10 px-2 py-0.5 rounded-full">
                {t0[state.cur[0].ans]} صوت للمهارة الصحيحة
              </span>
            </div>

            <div className="space-y-2">
              {state.cur[0].opts.map((opt, k) => {
                const isCorrect = k === state.cur![0].ans;
                const count = t0[k] || 0;
                const pct = Math.round((count / tot0) * 100);

                return (
                  <div
                    key={k}
                    className={`relative overflow-hidden p-3 rounded-2xl border transition-all flex items-center justify-between text-right ${
                      isCorrect
                        ? 'bg-[#1f9d73] text-white border-[#1f9d73] shadow-md font-bold'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 opacity-60'
                    }`}
                  >
                    {/* Fill bar for non-correct */}
                    {!isCorrect && (
                      <div
                        className="absolute inset-y-0 right-0 bg-[#4eaab8]/15 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    )}

                    <div className="relative flex items-center gap-2.5 z-10">
                      <span className={`w-8 h-8 rounded-xl font-bold text-sm flex items-center justify-center ${
                        isCorrect ? 'bg-white text-[#1f9d73]' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}>
                        {OPTION_LETTERS[k]}
                      </span>
                      <span className="text-base font-bold">{opt}</span>
                    </div>

                    <div className="relative flex items-center gap-2 z-10 font-bold">
                      <span className="text-sm">{pct}%</span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-sm font-black ${
                        isCorrect ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
                      }`}>
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Challenger 1 Breakdown */}
          <div className="bg-white dark:bg-[#151a40] rounded-3xl p-4 shadow-md border-2 border-slate-200 dark:border-slate-700 border-t-8 border-t-[#0b0f2a] dark:border-t-slate-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Avatar index={state.avs[1]} size={36} />
                <h3 className="font-extrabold text-lg text-[#0b0f2a] dark:text-white">
                  {state.names[1]}
                </h3>
              </div>
              <span className="text-xs font-bold text-[#1f9d73] bg-[#1f9d73]/10 px-2 py-0.5 rounded-full">
                {t1[state.cur[1].ans]} صوت للمهارة الصحيحة
              </span>
            </div>

            <div className="space-y-2">
              {state.cur[1].opts.map((opt, k) => {
                const isCorrect = k === state.cur![1].ans;
                const count = t1[k] || 0;
                const pct = Math.round((count / tot1) * 100);

                return (
                  <div
                    key={k}
                    className={`relative overflow-hidden p-3 rounded-2xl border transition-all flex items-center justify-between text-right ${
                      isCorrect
                        ? 'bg-[#1f9d73] text-white border-[#1f9d73] shadow-md font-bold'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 opacity-60'
                    }`}
                  >
                    {!isCorrect && (
                      <div
                        className="absolute inset-y-0 right-0 bg-[#0b0f2a]/10 dark:bg-white/10 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    )}

                    <div className="relative flex items-center gap-2.5 z-10">
                      <span className={`w-8 h-8 rounded-xl font-bold text-sm flex items-center justify-center ${
                        isCorrect ? 'bg-white text-[#1f9d73]' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}>
                        {OPTION_LETTERS[k]}
                      </span>
                      <span className="text-base font-bold">{opt}</span>
                    </div>

                    <div className="relative flex items-center gap-2 z-10 font-bold">
                      <span className="text-sm">{pct}%</span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-sm font-black ${
                        isCorrect ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
                      }`}>
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              sound.playClick();
              onNextRound();
            }}
            className="w-full sm:w-auto min-w-[180px] py-3.5 px-6 bg-gradient-to-r from-[#4eaab8] to-[#2fa3bf] text-white rounded-2xl font-black text-lg shadow-xl shadow-[#4eaab8]/30 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={20} />
            <span>جولة جديدة (نفس المتحدّيين)</span>
          </button>

          {state.round >= 1 && onSwapChallengers && (
            <button
              onClick={() => {
                sound.playClick();
                onSwapChallengers();
              }}
              className="w-full sm:w-auto min-w-[200px] py-3.5 px-6 bg-gradient-to-r from-[#f2c14e] to-[#e5a824] text-[#0b0f2a] rounded-2xl font-black text-lg shadow-xl shadow-amber-500/25 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Scan size={20} />
              <span>متحدّيان جديدان (باركود التسجيل)</span>
            </button>
          )}

          {onOpenLeaderboard && (
            <button
              onClick={() => {
                sound.playClick();
                onOpenLeaderboard();
              }}
              className="w-full sm:w-auto py-3.5 px-6 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/60 rounded-2xl font-bold text-base shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Trophy size={20} className="text-[#f2c14e]" />
              <span>لوحة المتصدرين</span>
            </button>
          )}

          <button
            onClick={() => {
              sound.playClick();
              onResetGame();
            }}
            className="w-full sm:w-auto py-3.5 px-6 bg-white dark:bg-[#151a40] text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-base shadow-sm border border-slate-200 dark:border-slate-700 hover:border-slate-400 transition-colors flex items-center justify-center gap-2"
          >
            <Home size={18} />
            <span>العودة للبداية</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
