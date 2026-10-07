import { useState, useEffect, useMemo } from 'react';
import type { PlayerRole } from './types.ts';
import { useGameSync } from './hooks/useGameSync.ts';
import { HeaderBar } from './components/HeaderBar.tsx';
import { RolePicker } from './components/RolePicker.tsx';
import { HostView } from './components/HostView.tsx';
import { ChallengerView } from './components/ChallengerView.tsx';
import { AudienceView } from './components/AudienceView.tsx';
import { LeaderboardModal } from './components/LeaderboardModal.tsx';
import { AdminPinModal } from './components/AdminPinModal.tsx';
import { ReportModal } from './components/ReportModal.tsx';
import { RegistrationPortal } from './components/RegistrationPortal.tsx';
import { sound } from './utils/audio.ts';
import type { PlayerRegistration } from './types.ts';

export default function App() {
  // Stable persistent user id for this browser session
  const uid = useMemo(() => {
    try {
      let stored = localStorage.getItem('skill_uid');
      if (!stored) {
        stored = 'u_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('skill_uid', stored);
      }
      return stored;
    } catch {
      return 'u_' + Math.random().toString(36).substring(2, 9);
    }
  }, []);

  const isRegisterPage = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('page') === 'register';
    } catch {
      return false;
    }
  }, []);

  const registerDefaultRole = useMemo((): 'audience' | 'challenger' => {
    try {
      const p = new URLSearchParams(window.location.search).get('role');
      if (p === 'challenger' || p === 'ch') return 'challenger';
    } catch {
      // ignore
    }
    return 'audience';
  }, []);

  const challengerRegisterUrl = useMemo(() => {
    try {
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('page', 'register');
      url.searchParams.set('role', 'challenger');
      return url.toString();
    } catch {
      return '';
    }
  }, []);

  // Role detection from URL or state
  const [role, setRole] = useState<PlayerRole | null>(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('role');
      if (p === 'host') return 'host';
      if (p === 'challenger' || p === 'ch') return 'challenger';
      if (p === 'audience' || p === 'aud') return 'audience';
      const saved = sessionStorage.getItem('skill_role');
      if (saved === 'host' || saved === 'challenger' || saved === 'audience') {
        return saved;
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Modals state
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // Sound and Theme states
  const [soundEnabled, setSoundEnabled] = useState<boolean>(sound.enabled);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem('skill_theme');
      if (savedTheme) return savedTheme === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Guard Host access with PIN verification
  useEffect(() => {
    if (role === 'host') {
      const isVerified = sessionStorage.getItem('host_pin_verified') === 'true';
      if (!isVerified) {
        setIsPinModalOpen(true);
      }
    }
  }, [role]);

  // Apply dark mode class to root HTML
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('skill_theme', isDark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDark]);

  // Real-time synchronization
  const {
    state,
    players,
    audience,
    votes,
    manual,
    leaderboard,
    registrations,
    sendAction,
  } = useGameSync(uid);

  const myRegistration = registrations.find((r) => r.id === uid);

  const applyRole = (selected: PlayerRole) => {
    setRole(selected);
    try {
      sessionStorage.setItem('skill_role', selected);
      const url = new URL(window.location.href);
      url.searchParams.set('role', selected);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  };

  const handleSelectRole = (selected: PlayerRole) => {
    if (selected === 'host') {
      const isVerified = sessionStorage.getItem('host_pin_verified') === 'true';
      if (!isVerified) {
        setIsPinModalOpen(true);
        return;
      }
    }
    applyRole(selected);
  };

  const handleChangeRole = () => {
    setRole(null);
    try {
      sessionStorage.removeItem('skill_role');
      const url = new URL(window.location.href);
      url.searchParams.delete('role');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  };

  const handleLockHost = () => {
    try {
      sessionStorage.removeItem('host_pin_verified');
    } catch {
      // ignore
    }
    handleChangeRole();
  };

  const handlePinSuccess = () => {
    setIsPinModalOpen(false);
    applyRole('host');
  };

  const handleQuickLocalPlay = () => {
    handleSelectRole('host');
  };

  const openRegisterOnDevice = (preferredRole?: 'challenger' | 'audience') => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('page', 'register');
      if (preferredRole) url.searchParams.set('role', preferredRole);
      window.location.href = url.toString();
    } catch {
      // ignore
    }
  };

  const handleRegister = (reg: PlayerRegistration) => {
    sendAction('registerPlayer', reg as unknown as Record<string, unknown>);
  };

  const handleContinueFromRegistration = () => {
    const nextRole = myRegistration?.role === 'challenger' ? 'challenger' : 'audience';
    applyRole(nextRole);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('page');
      url.searchParams.set('role', nextRole);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  };

  const handleClearRegistrationRequest = () => {
    sendAction('rejectRegistration', { regId: uid });
  };

  // Find user's identity details
  const myPlayer = players.find((p) => p.id === uid);
  const myAudience = audience.find((a) => a.id === uid);
  const myVote = votes.find((v) => v.uid === uid && v.r === state.round);

  const currentUserName = myPlayer?.name || myAudience?.name;
  const currentUserAv = myPlayer?.av ?? myAudience?.av;

  return (
    <div className="min-h-screen p-3 sm:p-5 flex flex-col justify-between max-w-5xl mx-auto">
      <div className="w-full">
        {/* Top bar header */}
        {role && (
          <HeaderBar
            role={role}
            userName={currentUserName}
            userAv={currentUserAv}
            phase={state.phase}
            round={state.round}
            names={state.names}
            avs={state.avs}
            wins={state.wins}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(sound.toggle())}
            isDark={isDark}
            onToggleTheme={() => setIsDark(!isDark)}
            onChangeRole={handleChangeRole}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            onOpenReport={() => setIsReportModalOpen(true)}
            onLockHost={handleLockHost}
          />
        )}

        {/* View content */}
        <main className="w-full">
          {isRegisterPage ? (
            <RegistrationPortal
              uid={uid}
              registration={myRegistration}
              defaultRole={registerDefaultRole}
              onRegister={handleRegister}
              onReRequest={handleClearRegistrationRequest}
              onContinueToGame={handleContinueFromRegistration}
            />
          ) : !role ? (
            <RolePicker
              onSelectRole={handleSelectRole}
              onQuickLocalPlay={handleQuickLocalPlay}
              onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
              onOpenReport={() => setIsReportModalOpen(true)}
            />
          ) : role === 'host' ? (
            <HostView
              state={state}
              players={players}
              audience={audience}
              votes={votes}
              manual={manual}
              registrations={registrations}
              onStartGame={(names, avs, duration) =>
                sendAction('start', { names, avs, durationSeconds: duration })
              }
              onNextRound={() => sendAction('nextRound')}
              onSetPhase={(phase, duration) =>
                sendAction('setPhase', { phase, duration })
              }
              onManualVote={(sideIdx, optIdx, delta) =>
                sendAction('manualVote', { sideIdx, optIdx, delta })
              }
              onFinishRound={() => sendAction('finishRound')}
              onResetPlayers={() => sendAction('resetPlayers')}
              onResetGame={() => sendAction('resetGame')}
              onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
              onApproveRegistration={(reg, side) =>
                sendAction('approveRegistration', { reg, side })
              }
              onRejectRegistration={(regId, regRole) =>
                sendAction('rejectRegistration', { regId, role: regRole })
              }
              onApproveAllRegistrations={(list) =>
                sendAction('approveAllRegistrations', { list, currentChallengers: players })
              }
              onSwapChallengers={() => sendAction('swapChallengers')}
            />
          ) : role === 'challenger' ? (
            <ChallengerView
              uid={uid}
              state={state}
              players={players}
              registration={myRegistration}
              registerUrl={challengerRegisterUrl}
              onOpenRegisterOnDevice={() => openRegisterOnDevice('challenger')}
            />
          ) : (
            <AudienceView
              uid={uid}
              state={state}
              audience={audience}
              leaderboard={leaderboard}
              onJoinAudience={(name: string, av: number) =>
                sendAction('joinAudience', { id: uid, name, av })
              }
              onVote={(a, b) =>
                sendAction('vote', { uid, round: state.round, a, b })
              }
              myVote={myVote ? { a: myVote.a, b: myVote.b } : undefined}
            />
          )}
        </main>
      </div>

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        leaderboard={leaderboard}
        currentUserId={uid}
        isHost={role === 'host'}
        onResetLeaderboard={() => sendAction('resetLeaderboard')}
      />

      {/* Admin PIN Passcode Modal */}
      <AdminPinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          if (role === 'host' && sessionStorage.getItem('host_pin_verified') !== 'true') {
            handleChangeRole();
          }
        }}
        onSuccess={handlePinSuccess}
      />

      {/* Report Issue Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        currentRole={role ? (role === 'host' ? 'المقدّم' : role === 'challenger' ? 'متحدّي' : 'جمهور') : 'البداية'}
        roomInfo={`الجولة ${state.round || 0} - ${state.phase}`}
      />

      {/* Footer credits with Report button */}
      <footer className="text-center text-xs text-slate-400 dark:text-slate-500 py-4 mt-6 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span>تحدّي المهارة · دُفعة (Dafah)</span>
        <button
          onClick={() => {
            sound.playClick();
            setIsReportModalOpen(true);
          }}
          className="text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1.5 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/30 transition-all hover:bg-amber-500/20 active:scale-95"
        >
          <span>الإبلاغ عن مشكلة</span>
          <span>⚠️</span>
        </button>
      </footer>
    </div>
  );
}
