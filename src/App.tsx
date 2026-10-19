import { useEffect, useState } from 'react';
import { useGameSync } from './hooks/useGameSync.ts';
import { RoomGateway } from './components/RoomGateway.tsx';
import { HostView } from './components/HostView.tsx';
import { ChallengerView } from './components/ChallengerView.tsx';
import { AudienceView } from './components/AudienceView.tsx';
import { HeaderBar } from './components/HeaderBar.tsx';
import { LeaderboardModal } from './components/LeaderboardModal.tsx';
import { ReportModal } from './components/ReportModal.tsx';
import { getActiveRoomId } from './utils/room.ts';
import { loadRoomSession } from './services/roomAccess.ts';
import type { RoomSession } from './services/roomAccess.ts';
import { sound } from './utils/audio.ts';
import type { PlayerRegistration } from './types.ts';
import { Copy, Share2, LogOut } from 'lucide-react';

function GameBoard({ session }: { session: RoomSession }) {
  const role = session.role;
  const uid = session.userId;
  const roomCode = session.roomId;
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('skill_theme') !== 'light');
  const [copied, setCopied] = useState(false);
  const { state, players, audience, votes, manual, leaderboard, registrations, connected,
    syncError, sendAction } = useGameSync(uid);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('skill_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const myRegistration = registrations.find((r: PlayerRegistration) => r.id === uid);
  const myPlayer = players.find(p => p.id === uid);
  const myAudience = audience.find(a => a.id === uid);
  const myVote = votes.find(v => v.uid === uid && v.r === state.round);
  const inviteUrl = new URL(window.location.origin + window.location.pathname);
  inviteUrl.searchParams.set('room', roomCode);
  const shareRoom = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // The room code stays visible if clipboard permission is unavailable.
    }
  };

  return (
    <div dir="rtl" className="min-h-screen p-3 sm:p-5 flex flex-col justify-between max-w-5xl mx-auto">
      <div className="w-full">
        <div className="flex items-center justify-between gap-2 mb-3 bg-[#151a40] rounded-xl p-3 border border-[#4eaab8]/25 text-white">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-slate-300">غرفة</span>
            <strong dir="ltr" className="tracking-widest text-[#95dce6]">{roomCode}</strong>
            <span className="text-xs text-slate-400 hidden sm:inline truncate">{session.title}</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className={connected ? 'text-green-400 text-xs' : 'text-amber-400 text-xs'}>
              {connected ? '● مباشر' : '◌ جار الاتصال'}
            </span>
            <button type="button" onClick={shareRoom} className="flex items-center gap-1 text-xs font-bold bg-[#4eaab8] rounded-lg px-2.5 py-1.5">
              {copied ? 'تم النسخ' : 'مشاركة'} {copied ? <Copy size={15}/> : <Share2 size={15}/>}
            </button>
            <button type="button" onClick={() => window.location.assign('/')} aria-label="الرئيسية" title="الرجوع للرئيسية"
              className="rounded-lg bg-white/10 p-1.5"><LogOut size={16}/></button>
          </div>
        </div>
        {syncError && <div role="alert" className="bg-red-500/10 border border-red-500/40 text-red-500 dark:text-red-300 text-xs p-3 rounded-xl mb-3">{syncError}</div>}
        <HeaderBar
          role={role} userName={myPlayer?.name || myAudience?.name || session.name}
          userAv={myPlayer?.av ?? myAudience?.av}
          phase={state.phase} round={state.round} names={state.names} avs={state.avs} wins={state.wins}
          soundEnabled={soundEnabled} onToggleSound={() => setSoundEnabled(sound.toggle())}
          isDark={isDark} onToggleTheme={() => setIsDark(!isDark)}
          onChangeRole={() => window.location.assign('/')}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onOpenReport={() => setReportOpen(true)}
          onLockHost={role === 'host' ? () => window.location.assign('/') : undefined}
        />
        <main className="w-full">
          {role === 'host' ? (
            <HostView
              state={state} players={players} audience={audience} votes={votes}
              manual={manual} registrations={registrations}
              onStartGame={(names, avs, durationSeconds) => sendAction('start', { names, avs, durationSeconds })}
              onNextRound={() => sendAction('nextRound')}
              onSetPhase={(phase, duration) => sendAction('setPhase', { phase, duration })}
              onManualVote={(sideIdx, optIdx, delta) => sendAction('manualVote', { sideIdx, optIdx, delta })}
              onFinishRound={() => sendAction('finishRound')}
              onResetPlayers={() => sendAction('resetPlayers')}
              onResetGame={() => sendAction('resetGame')}
              onOpenLeaderboard={() => setLeaderboardOpen(true)}
              onApproveRegistration={(reg, side) => sendAction('approveRegistration', { reg, side })}
              onRejectRegistration={(regId, regRole) => sendAction('rejectRegistration', { regId, role: regRole })}
              onApproveAllRegistrations={(list) => sendAction('approveAllRegistrations', { list })}
              onSwapChallengers={() => sendAction('swapChallengers')}
            />
          ) : role === 'challenger' ? (
            <ChallengerView uid={uid} state={state} players={players} registration={myRegistration}
              registerUrl={inviteUrl.toString() + '&role=challenger'}
              onOpenRegisterOnDevice={() => sendAction('registerPlayer')} />
          ) : (
            <AudienceView uid={uid} state={state} audience={audience} leaderboard={leaderboard}
              onJoinAudience={(name, av) => sendAction('joinAudience', { name, av })}
              onVote={(a, b) => sendAction('vote', { round: state.round, a: a ?? -1, b: b ?? -1 })}
              myVote={myVote ? { a: myVote.a, b: myVote.b } : undefined} />
          )}
        </main>
      </div>
      <LeaderboardModal isOpen={leaderboardOpen} onClose={() => setLeaderboardOpen(false)}
        leaderboard={leaderboard} currentUserId={uid} isHost={role === 'host'}
        onResetLeaderboard={() => sendAction('resetLeaderboard')} />
      <ReportModal isOpen={reportOpen} onClose={() => setReportOpen(false)}
        currentRole={role === 'host' ? 'المضيف' : role === 'challenger' ? 'المتحدّي' : 'الجمهور'}
        roomInfo={'الغرفة ' + roomCode + ' - الجولة ' + state.round} />
      <footer className="text-center text-slate-500 text-xs mt-7 py-4">دُفعة · Dafah — العب مع مجموعتك</footer>
    </div>
  );
}
export default function App() {
  const code = getActiveRoomId();
  const [loading, setLoading] = useState(!!code);
  const [session, setSession] = useState<RoomSession | null>(null);
  useEffect(() => {
    if (!code) return;
    let active = true;
    loadRoomSession(code).then(result => { if (active) setSession(result); })
      .catch(() => { if (active) setSession(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [code]);
  if (loading) return <div dir="rtl" className="min-h-screen bg-[#0b102a] text-white grid place-items-center">جاري الاتصال بالغرفة...</div>;
  if (!session) return <RoomGateway code={code} />;
  return <GameBoard session={session} />;
}
