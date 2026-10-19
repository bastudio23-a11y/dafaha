import { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Gamepad2, LogIn, Plus, Users, Mic } from 'lucide-react';
import { DafahLogo } from './DafahLogo.tsx';
import { createRoom, goToRoom, joinRoom, loadRoomMeta, normalizeRoomCode } from '../services/roomAccess.ts';

interface Props { code: string }
export function RoomGateway({ code }: Props) {
  const [roomCode, setRoomCode] = useState(code);
  const [title, setTitle] = useState('تحدّي المهارة');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'audience' | 'challenger'>(() =>
    new URLSearchParams(window.location.search).get('role') === 'challenger' ? 'challenger' : 'audience');
  const [roomTitle, setRoomTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    let active = true;
    loadRoomMeta(code).then(data => {
      if (active) setRoomTitle(data.title || 'غرفة تحدّي المهارة');
    }).catch(err => { if (active) setError(err.message || 'الغرفة غير متاحة'); });
    return () => { active = false; };
  }, [code]);

  const makeRoom = async () => {
    setLoading(true); setError('');
    try {
      const data = await createRoom(title);
      goToRoom(data.roomId);
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر إنشاء الغرفة'); }
    finally { setLoading(false); }
  };
  const enterRoom = async () => {
    setLoading(true); setError('');
    try {
      const normalized = normalizeRoomCode(roomCode);
      if (!code) {
        // Entering a code on the homepage opens the join screen first.
        goToRoom(normalized);
        return;
      }
      await joinRoom(normalized, name, role);
      goToRoom(normalized, role);
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر دخول الغرفة'); }
    finally { setLoading(false); }
  };
  const inputClass = 'w-full rounded-2xl border border-slate-700 bg-[#0b102a] text-white px-4 py-3 outline-none focus:border-[#4eaab8]';
  const actionClass = 'w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 font-bold text-white bg-gradient-to-r from-[#4eaab8] to-[#2fa3bf] disabled:opacity-50 transition-opacity hover:opacity-90';
  return (
    <main dir="rtl" className="min-h-screen bg-[#0b102a] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-5">
        <header className="text-center space-y-2">
          <div className="mx-auto w-fit rounded-3xl p-4 bg-[#151a40] border border-[#4eaab8]/30"><DafahLogo size={76} variant="full" /></div>
          <h1 className="text-3xl font-black text-[#95dce6]">تحدي المهارة مع دُفعة</h1>
          <p className="text-slate-400 text-sm">كوّن مجموعتك والعبوا من أي مكان — بدون حساب</p>
        </header>
        {error && <div role="alert" className="rounded-xl border border-red-500/50 bg-red-900/20 p-3 text-red-200 text-sm">{error}</div>}
        {code ? (
          <section className="bg-[#151a40] rounded-3xl p-5 border border-[#4eaab8]/30 space-y-4">
            <div className="text-center">
              <p className="text-slate-400 text-sm">انضم إلى {roomTitle || 'الغرفة'}</p>
              <p className="text-3xl font-black tracking-[0.12em] text-[#a4e5ef] my-2" dir="ltr">{code}</p>
            </div>
            <label className="block space-y-1">
              <span className="text-sm font-bold">اسمك في اللعبة</span>
              <input className={inputClass} maxLength={30} value={name} onChange={e=>setName(e.target.value)}
                placeholder="مثال: بسام" autoComplete="nickname"/>
            </label>
            <p className="text-sm font-bold">كيف بتشارك؟</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" aria-pressed={role==='audience'} onClick={()=>setRole('audience')}
                className={'rounded-xl border p-3 flex gap-2 justify-center items-center font-bold ' + (role==='audience'?'border-[#4eaab8] bg-[#4eaab8]/15':'border-slate-700')}>
                <Users size={20}/> جمهور
              </button>
              <button type="button" aria-pressed={role==='challenger'} onClick={()=>setRole('challenger')}
                className={'rounded-xl border p-3 flex gap-2 justify-center items-center font-bold ' + (role==='challenger'?'border-[#4eaab8] bg-[#4eaab8]/15':'border-slate-700')}>
                <Mic size={20}/> متحدّي
              </button>
            </div>
            <button type="button" onClick={enterRoom} disabled={loading || name.trim().length<2} className={actionClass}><LogIn size={20}/> دخول الغرفة</button>
            <p className="text-xs text-slate-400 text-center">المتحدّون ينتظرون موافقة المضيف قبل اللعب</p>
            <button type="button" onClick={()=>window.location.assign('/')} className="w-full text-sm text-slate-400 py-2">العودة للرئيسية</button>
          </section>
        ) : (
          <>
            <section className="bg-[#151a40] rounded-3xl p-5 border border-[#4eaab8]/30 space-y-3">
              <h2 className="text-xl font-extrabold flex items-center gap-2"><Plus size={22}/> إنشاء غرفة جديدة</h2>
              <p className="text-sm text-slate-400">أنت المضيف: تتحكم في الجولات وتستقبل المشاركين برابط أو رمز.</p>
              <input className={inputClass} value={title} onChange={e=>setTitle(e.target.value)}
                placeholder="اسم المجموعة" maxLength={60} aria-label="اسم الغرفة"/>
              <button type="button" onClick={makeRoom} disabled={loading} className={actionClass}><Gamepad2 size={20}/> إنشاء غرفة والبدء</button>
            </section>
            <section className="bg-[#151a40] rounded-3xl p-5 border border-slate-700 space-y-3">
              <h2 className="text-xl font-extrabold flex items-center gap-2"><LogIn size={22}/> دخول غرفة</h2>
              <input className={inputClass} dir="ltr" value={roomCode}
                onChange={e=>setRoomCode(normalizeRoomCode(e.target.value))}
                placeholder="رمز الغرفة المكون من 8 أحرف" maxLength={8} aria-label="رمز الغرفة"/>
              <button type="button" onClick={enterRoom} disabled={loading || roomCode.length!==8} className={actionClass}>المتابعة <ArrowLeft size={18}/></button>
            </section>
          </>
        )}
        <p className="text-center text-xs text-slate-500">الغرف مؤقتة لهذه النسخة التجريبية وقد تنتهي عند إعادة تشغيل السيرفر.</p>
      </div>
    </main>
  );
}
