import React from 'react';
import { Mic, Sparkles, CheckCircle, Clock, Smartphone, ShieldCheck } from 'lucide-react';
import { Avatar } from '../utils/avatars.tsx';
import { SecretCard } from './SecretCard.tsx';
import { CircularTimer } from './CircularTimer.tsx';
import { QRCodeDisplay } from './QRCodeDisplay.tsx';
import { sound } from '../utils/audio.ts';
import type { GameState, Player, PlayerRegistration } from '../types.ts';

interface ChallengerViewProps {
  uid: string;
  state: GameState;
  players: Player[];
  registration?: PlayerRegistration;
  registerUrl: string;
  onOpenRegisterOnDevice: () => void;
}

export const ChallengerView: React.FC<ChallengerViewProps> = ({
  uid,
  state,
  players,
  registration,
  registerUrl,
  onOpenRegisterOnDevice,
}) => {
  const me = players.find((p) => p.id === uid);
  const mySideIdx = me?.side === 'r' ? 0 : me?.side === 'l' ? 1 : -1;
  const myColor = mySideIdx === 0 ? '#4eaab8' : '#0b0f2a';

  // Not approved yet: show QR registration flow
  if (!me || mySideIdx === -1) {
    if (registration?.status === 'pending') {
      return (
        <div className="max-w-md mx-auto text-center py-6 px-4 select-none animate-fade">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-amber-500/15 text-amber-500 flex items-center justify-center border-4 border-amber-500/30 animate-pulse">
            <Clock size={44} />
          </div>
          <h2 className="text-2xl font-black mb-2 text-[#0b0f2a] dark:text-white">
            طلبك عند الأدمن ⏳
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            تم إرسال اسم <b>{registration.name}</b> لشاشة المقدّم. بعد التأكيد ستدخل اللعبة تلقائياً.
          </p>
          <div className="bg-white dark:bg-[#151a40] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 inline-flex items-center gap-3">
            <Avatar index={registration.av} size={48} />
            <div className="text-right">
              <span className="font-bold block">{registration.name}</span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">بانتظار الموافقة</span>
            </div>
          </div>
        </div>
      );
    }

    if (registration?.status === 'rejected') {
      return (
        <div className="max-w-md mx-auto py-6 px-4 text-center select-none">
          <h2 className="text-xl font-black mb-2 text-[#0b0f2a] dark:text-white">تم رفض أو حذف طلبك</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            يمكنك التسجيل من جديد عبر الباركود أو الزر أدناه.
          </p>
          <div className="mb-4">
            <QRCodeDisplay url={registerUrl} title="📲 باركود تسجيل المتحدّي" color="#4eaab8" />
          </div>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenRegisterOnDevice();
            }}
            className="w-full py-3.5 rounded-2xl font-bold bg-[#0b0f2a] text-white"
          >
            التسجيل من هذا الجوال
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto py-4 px-4 select-none text-center">
        <div className="w-16 h-16 rounded-full mx-auto bg-gradient-to-tr from-[#4eaab8] to-[#2fa3bf] text-white flex items-center justify-center shadow-lg mb-3">
          <Mic size={32} />
        </div>
        <h2 className="text-2xl font-black mb-1 text-[#0b0f2a] dark:text-white">انضم كمتحدّي</h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mb-5">
          امسح الباركود وسجّل اسمك — يظهر طلبك في شاشة الأدمن للتأكيد قبل دخول اللعبة
        </p>

        <div className="mb-5">
          <QRCodeDisplay url={registerUrl} title="📲 باركود التسجيل" color="#4eaab8" />
        </div>

        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onOpenRegisterOnDevice();
          }}
          className="w-full py-3.5 px-4 rounded-2xl font-extrabold flex items-center justify-center gap-2 bg-gradient-to-r from-[#4eaab8] to-[#2fa3bf] text-white shadow-md active:scale-95 transition-all mb-4"
        >
          <Smartphone size={20} />
          <span>التسجيل من هذا الجوال</span>
        </button>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck size={16} className="text-[#4eaab8]" />
          <span>لا تدخل اللعبة إلا بعد موافقة المقدّم</span>
        </div>
      </div>
    );
  }

  // Approved and in lobby — waiting for host to start
  if (state.phase === 'lobby') {
    return (
      <div className="max-w-md mx-auto text-center py-6 px-4 select-none">
        <div
          className="w-24 h-24 rounded-full mx-auto mb-4 border-4 p-1 shadow-xl animate-bounce"
          style={{ borderColor: myColor }}
        >
          <Avatar index={me.av} size={88} />
        </div>
        <h2 className="text-2xl font-black mb-1 text-[#0b0f2a] dark:text-white">أهلاً {me.name}!</h2>
        <div
          className="inline-block px-3 py-1 rounded-full text-sm font-bold mb-4"
          style={{ backgroundColor: `${myColor}20`, color: myColor }}
        >
          أنت المتحدّي {me.side === 'r' ? 'الأيمن' : 'الأيسر'}
        </div>
        <div className="bg-white dark:bg-[#151a40] rounded-2xl p-6 shadow-md border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-center gap-2 text-[#4eaab8] font-bold mb-2">
            <Clock size={20} className="animate-spin" />
            <span>بانتظار انطلاق التحدي...</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            المقدّم سيبدأ اللعبة قريباً على الشاشة الرئيسية. خلك جاهز!
          </p>
        </div>
      </div>
    );
  }

  const myCur = state.cur ? state.cur[mySideIdx] : null;

  return (
    <div className="max-w-md mx-auto py-2 px-3 select-none text-center">
      {(state.phase === 'secret' || state.phase === 'explain') && myCur && (
        <div className="animate-fade">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Avatar index={me.av} size={36} />
            <h2 className="text-xl font-black text-[#0b0f2a] dark:text-white">
              يا {me.name}، مهارتك السرّية جاهزة!
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-2">
            اضغط واستمر بالضغط على البطاقة لقراءة المهارة، ثم اشرحها للجمهور دون ذكر اسمها.
          </p>

          <SecretCard skill={myCur.skill} sideColor={myColor} />

          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-3 text-right text-xs text-amber-800 dark:text-amber-200">
            <div className="font-bold mb-1 flex items-center gap-1.5">
              <Sparkles size={14} />
              <span>نصائح للشرح الذكي:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 opacity-90">
              <li>اذكر مواقف وأمثلة واقعية تطبق فيها هذي المهارة.</li>
              <li>اشرح شعور الشخص أو تصرفه إذا كان يتمتع بها.</li>
              <li>انتبه! أي تلميح باسم المهارة أو أحرفها قد يكشفك فوراً.</li>
            </ul>
          </div>
        </div>
      )}

      {state.phase === 'vote' && (
        <div className="py-4 animate-fade">
          <CircularTimer endsAt={state.endsAt} totalDuration={state.durationSeconds} />
          <h2 className="text-2xl font-black mt-3 mb-1 text-[#0b0f2a] dark:text-white">
            الجمهور يصوّت الآن!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            استرح وراقب الشاشة لمعرفة هل وصل شرحك للجمهور أم لا...
          </p>
          <div className="bg-white dark:bg-[#151a40] p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-3">
            <Avatar index={me.av} size={48} />
            <div className="text-right">
              <span className="font-bold text-base block text-[#0b0f2a] dark:text-white">{me.name}</span>
              <span className="text-xs text-[#4eaab8] font-semibold">مهارتك: {myCur?.skill}</span>
            </div>
          </div>
        </div>
      )}

      {state.phase === 'results' && myCur && (
        <div className="py-2 animate-fade">
          <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center bg-[#1f9d73]/15 text-[#1f9d73]">
            <CheckCircle size={38} />
          </div>
          <h2 className="text-2xl font-black mb-1 text-[#0b0f2a] dark:text-white">انتهت الجولة!</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            مهارتك الحقيقية كانت: <b className="text-[#1f9d73]">{myCur.skill}</b>
          </p>

          <div className="bg-white dark:bg-[#151a40] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 mb-4 text-center">
            <span className="text-xs text-slate-400 block mb-1">عدد المصوّتين الذين عرفوا مهارتك:</span>
            <span className="text-4xl font-black text-[#4eaab8]">{state.sc[mySideIdx]}</span>
            <span className="text-xs text-slate-400 block mt-1">مصوّت</span>
          </div>

          <div className="text-xs text-slate-400">تابع الشاشة الرئيسية لبدء الجولة القادمة!</div>
        </div>
      )}
    </div>
  );
};
