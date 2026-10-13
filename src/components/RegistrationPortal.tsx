import React, { useState } from 'react';
import {
  Users,
  Mic,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Avatar, AVATAR_COLORS } from '../utils/avatars.tsx';
import { DafahLogo } from './DafahLogo.tsx';
import { sound } from '../utils/audio.ts';
import type { PlayerRegistration, ChallengerSide } from '../types.ts';

interface RegistrationPortalProps {
  uid: string;
  registration?: PlayerRegistration;
  defaultRole?: 'audience' | 'challenger';
  onRegister: (reg: PlayerRegistration) => void;
  onReRequest?: () => void;
  onContinueToGame: () => void;
}

export const RegistrationPortal: React.FC<RegistrationPortalProps> = ({
  uid,
  registration,
  defaultRole = 'audience',
  onRegister,
  onReRequest,
  onContinueToGame,
}) => {
  const [name, setName] = useState<string>(() => {
    try {
      return localStorage.getItem('player_reg_name') || '';
    } catch {
      return '';
    }
  });

  const [selectedAv, setSelectedAv] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('player_reg_av');
      return stored ? parseInt(stored, 10) : Math.floor(Math.random() * 8);
    } catch {
      return 1;
    }
  });

  const [rolePreference, setRolePreference] = useState<'audience' | 'challenger'>(defaultRole);
  const [sidePreference, setSidePreference] = useState<ChallengerSide>('r');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    const finalName = (name.trim() || 'لاعب جديد')
      .replace(/[<>{}\/\\`]/g, '')
      .slice(0, 24);
    try {
      localStorage.setItem('player_reg_name', finalName);
      localStorage.setItem('player_reg_av', String(selectedAv));
    } catch {
      // ignore
    }

    const regData: PlayerRegistration = {
      id: uid,
      name: finalName,
      av: selectedAv,
      role: rolePreference,
      side: rolePreference === 'challenger' ? sidePreference : undefined,
      status: 'pending',
      createdAt: Date.now(),
    };

    onRegister(regData);
  };

  // State 1: Already Approved!
  if (registration && registration.status === 'approved') {
    return (
      <div className="max-w-md mx-auto py-8 px-4 text-center select-none animate-fade">
        <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-emerald-500/15 text-emerald-500 flex items-center justify-center border-4 border-emerald-500/30 shadow-lg shadow-emerald-500/20">
          <CheckCircle2 size={46} />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black mb-2 text-[#0b0f2a] dark:text-white">
          تم قبولك من قِبل الأدمن! 🎉
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          أهلاً بك <b>{registration.name}</b>، تم اعتماد دخولك إلى اللعبة بنجاح.
        </p>

        <div className="p-4 bg-white dark:bg-[#151a40] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md mb-6 inline-flex items-center gap-3">
          <Avatar index={registration.av} size={48} />
          <div className="text-right">
            <span className="font-bold text-base block text-[#0b0f2a] dark:text-white">
              {registration.name}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
              {registration.role === 'challenger' ? 'متحدّي معتمد 🎤' : 'جمهور مصوّت معتمد 👥'}
            </span>
          </div>
        </div>

        <div>
          <button
            onClick={() => {
              sound.playVictory();
              onContinueToGame();
            }}
            className="w-full py-4 px-6 bg-gradient-to-r from-[#4eaab8] to-[#2fa3bf] text-white rounded-2xl font-black text-lg shadow-xl shadow-[#4eaab8]/30 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>الدخول للعبة الآن</span>
            <ArrowRight size={20} className="rtl:rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  // State 2: Waiting / Pending Admin Approval
  if (registration && registration.status === 'pending') {
    return (
      <div className="max-w-md mx-auto py-8 px-4 text-center select-none animate-fade">
        <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-amber-500/15 text-amber-500 flex items-center justify-center border-4 border-amber-500/30 shadow-lg shadow-amber-500/20 animate-pulse">
          <Clock size={44} />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black mb-2 text-[#0b0f2a] dark:text-white">
          طلبك بانتظار موافقة الأدمن ⏳
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs mx-auto">
          تم إرسال اسمك لشاشة العرض الرئيسية. بمجرد أن يؤكد الأدمن دخولك، ستفتح اللعبة معك تلقائياً!
        </p>

        {/* Registered preview card */}
        <div className="bg-white dark:bg-[#151a40] rounded-3xl p-5 border-2 border-slate-100 dark:border-slate-800 shadow-xl mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar index={registration.av} size={46} />
              <div className="text-right">
                <span className="font-extrabold text-base block text-[#0b0f2a] dark:text-white">
                  {registration.name}
                </span>
                <span className="text-xs text-slate-400">
                  {registration.role === 'challenger' ? 'طلب: متحدّي 🎤' : 'طلب: جمهور 👥'}
                </span>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              قيد الانتظار
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={16} className="text-[#4eaab8]" />
            <span>نظام التحقق مفعل من شاشة المقدّم</span>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Rejected by Admin
  if (registration && registration.status === 'rejected') {
    return (
      <div className="max-w-md mx-auto py-8 px-4 text-center select-none animate-fade">
        <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-red-500/15 text-red-500 flex items-center justify-center border-4 border-red-500/30 shadow-lg">
          <XCircle size={44} />
        </div>

        <h2 className="text-2xl font-black mb-2 text-[#0b0f2a] dark:text-white">
          تم رفض الطلب أو حذفه
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          قام الأدمن بإزالة طلبك من شاشة العرض. يمكنك تعديل بياناتك وإعادة الإرسال.
        </p>

        {onReRequest && (
          <button
            onClick={() => {
              sound.playClick();
              onReRequest();
            }}
            className="w-full py-3.5 px-6 bg-slate-800 text-white rounded-2xl font-bold text-base hover:bg-slate-700 transition-colors"
          >
            إعادة إرسال طلب جديد
          </button>
        )}
      </div>
    );
  }

  // State 4: Registration Form (Initial)
  return (
    <div className="max-w-md mx-auto py-4 px-4 select-none text-center animate-fade">
      {/* Brand mark */}
      <div className="mb-3">
        <div className="inline-block p-3 bg-white dark:bg-[#151a40] rounded-2xl shadow-md border border-slate-100 dark:border-slate-800">
          <DafahLogo size={48} variant="full" />
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-black mb-1 bg-gradient-to-r from-[#122b64] via-[#2fa3bf] to-[#4eaab8] dark:from-[#9fd8e2] dark:to-white bg-clip-text text-transparent">
        تسجيل الدخول للتحدّي
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-5">
        سجّل اسمك وصورتك لتظهر في شاشة الأدمن ويؤكد دخولك للعبة!
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        {/* Name input */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            اسمك في اللعبة:
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اكتب اسمك هنا..."
            maxLength={25}
            className="w-full text-center text-lg font-bold py-3 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151a40] text-[#0b0f2a] dark:text-white focus:border-[#4eaab8] outline-none shadow-sm"
          />
        </div>

        {/* Avatar selection */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
            اختر شخصيتك:
          </label>
          <div className="grid grid-cols-4 gap-2 max-w-[260px] mx-auto">
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
                    ? 'ring-4 ring-[#4eaab8] scale-110 shadow-md'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Avatar index={idx} size={46} />
              </button>
            ))}
          </div>
        </div>

        {/* Role Preference */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
            تبي تشارك كـ:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setRolePreference('audience');
              }}
              className={`p-3 rounded-2xl border-2 text-right transition-all flex flex-col gap-1 ${
                rolePreference === 'audience'
                  ? 'border-[#4eaab8] bg-[#4eaab8]/10 text-[#0b0f2a] dark:text-white font-black shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151a40] text-slate-500'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Users size={16} className="text-[#4eaab8]" />
                <span className="text-sm">جمهور (تصويت)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">
                تخمين المهارة وجمع النقاط
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setRolePreference('challenger');
              }}
              className={`p-3 rounded-2xl border-2 text-right transition-all flex flex-col gap-1 ${
                rolePreference === 'challenger'
                  ? 'border-[#4eaab8] bg-[#4eaab8]/10 text-[#0b0f2a] dark:text-white font-black shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151a40] text-slate-500'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Mic size={16} className="text-[#4eaab8]" />
                <span className="text-sm">متحدّي (شرح)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">
                شرح المهارات على المسرح
              </span>
            </button>
          </div>
        </div>

        {rolePreference === 'challenger' && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-400 mb-1.5">
              موقع التحدي المفضل:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSidePreference('r')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                  sidePreference === 'r'
                    ? 'bg-[#4eaab8] text-white border-[#4eaab8]'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                المتحدّي الأيمن
              </button>
              <button
                type="button"
                onClick={() => setSidePreference('l')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border ${
                  sidePreference === 'l'
                    ? 'bg-[#4eaab8] text-white border-[#4eaab8]'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}
              >
                المتحدّي الأيسر
              </button>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-4 px-6 bg-gradient-to-r from-[#4eaab8] to-[#2fa3bf] text-white rounded-2xl font-black text-base shadow-xl shadow-[#4eaab8]/25 hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
        >
          <Sparkles size={18} />
          <span>إرسال طلب الدخول للأدمن 🚀</span>
        </button>
      </form>
    </div>
  );
};
