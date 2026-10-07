import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  GameState,
  Player,
  AudienceMember,
  VoteRecord,
  GamePhase,
  ChallengerSide,
  LeaderboardEntry,
  PlayerRegistration,
} from '../types.ts';
import { DEFAULT_SKILL_POOL, shuffleArray } from '../data/skills.ts';
import { firestoreSync } from '../services/firestoreSync.ts';

const DEFAULT_STATE: GameState = {
  phase: 'lobby',
  round: 0,
  names: ['المتحدّي الأيمن', 'المتحدّي الأيسر'],
  avs: [0, 1],
  wins: [0, 0],
  cur: null,
  endsAt: 0,
  tally: null,
  msg: '',
  sc: [0, 0],
  win: -1,
  durationSeconds: 15,
  updatedAt: Date.now(),
};

export function useGameSync(uid: string) {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);
  const [players, setPlayers] = useState<Player[]>([]);
  const [audience, setAudience] = useState<AudienceMember[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [manual, setManual] = useState<[number[], number[]]>([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([]);
  const [connected, setConnected] = useState<boolean>(true);

  // BroadcastChannel for instant local multi-tab synchronization fallback
  const bcRef = useRef<BroadcastChannel | null>(null);

  const applySnapshot = useCallback((data: {
    state?: GameState;
    players?: Player[];
    audience?: AudienceMember[];
    votes?: VoteRecord[];
    manual?: [number[], number[]];
    leaderboard?: LeaderboardEntry[];
    registrations?: PlayerRegistration[];
  }) => {
    if (!data) return;
    if (data.state) setState(data.state);
    if (data.players) setPlayers(data.players);
    if (data.audience) setAudience(data.audience);
    if (data.votes) setVotes(data.votes);
    if (data.manual) setManual(data.manual);
    if (data.leaderboard) setLeaderboard(data.leaderboard);
    if (data.registrations) setRegistrations(data.registrations);
  }, []);

  useEffect(() => {
    // 1. Subscribe to Firebase Firestore Real-time updates
    try {
      firestoreSync.subscribe((update) => {
        setConnected(true);
        applySnapshot(update);
      });
    } catch (err) {
      console.warn('Firestore subscription notice:', err);
    }

    try {
      const bc = new BroadcastChannel('skill_challenge_bus');
      bcRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data?.type === 'SYNC') {
          applySnapshot(event.data.payload);
        }
      };
    } catch {
      // BroadcastChannel not available
    }

    // Connect to Server-Sent Events as secondary bridge
    let es: EventSource | null = null;
    let fallbackPollTimer: number | undefined;

    const connectSSE = () => {
      try {
        es = new EventSource('/api/game/events');
        es.onopen = () => setConnected(true);
        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            applySnapshot(data);
          } catch {
            // parse error ignored
          }
        };
        es.onerror = () => {
          es?.close();
        };
      } catch {
        // SSE error
      }
    };

    connectSSE();

    return () => {
      firestoreSync.unsubscribe();
      es?.close();
      if (fallbackPollTimer) clearInterval(fallbackPollTimer);
      bcRef.current?.close();
    };
  }, [applySnapshot]);

  // Action dispatcher
  const sendAction = useCallback(
    async (action: string, payload?: Record<string, unknown>) => {
      // First, perform Firestore direct mutation
      try {
        switch (action) {
          case 'joinPlayer': {
            const p = payload as { id: string; name: string; side: ChallengerSide; av: number };
            await firestoreSync.joinPlayer(p.id, p.name, p.side, p.av);
            break;
          }
          case 'joinAudience': {
            const p = payload as { id: string; name: string; av: number };
            await firestoreSync.joinAudience(p.id, p.name, p.av);
            break;
          }
          case 'vote': {
            const p = payload as { uid: string; round: number; a: number; b: number };
            await firestoreSync.vote(p.uid, p.round, p.a, p.b);
            break;
          }
          case 'start': {
            const p = payload as { names: [string, string]; avs: [number, number]; durationSeconds: number };
            await firestoreSync.startGame(p.names, p.avs, p.durationSeconds);
            break;
          }
          case 'nextRound': {
            await firestoreSync.nextRound(state);
            break;
          }
          case 'setPhase': {
            const p = payload as { phase: GamePhase; duration?: number };
            await firestoreSync.setPhase(p.phase, p.duration, state);
            break;
          }
          case 'finishRound': {
            await firestoreSync.finishRound(state, votes, manual, audience);
            break;
          }
          case 'resetLeaderboard': {
            await firestoreSync.resetLeaderboard();
            break;
          }
          case 'resetPlayers': {
            await firestoreSync.resetPlayers();
            break;
          }
          case 'resetGame': {
            await firestoreSync.resetGame();
            break;
          }
          case 'registerPlayer': {
            await firestoreSync.registerPlayer(payload as any);
            break;
          }
          case 'approveRegistration': {
            const p = payload as { reg: PlayerRegistration; side?: ChallengerSide };
            await firestoreSync.approveRegistration(p.reg, p.side);
            break;
          }
          case 'rejectRegistration': {
            const p = payload as { regId: string; role?: string };
            await firestoreSync.rejectRegistration(p.regId, p.role);
            break;
          }
          case 'approveAllRegistrations': {
            const p = payload as { list: PlayerRegistration[]; currentChallengers: Player[] };
            await firestoreSync.approveAllRegistrations(p.list, p.currentChallengers);
            break;
          }
          case 'swapChallengers': {
            await firestoreSync.swapChallengers(state);
            break;
          }
        }
      } catch (err) {
        console.warn('Firestore action error, using fallback:', err);
      }

      // Also dispatch to API backend
      try {
        await fetch('/api/game/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, payload }),
        });
      } catch {
        handleLocalFallbackAction(action, payload);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, players, audience, votes, manual, registrations, uid]
  );

  const handleLocalFallbackAction = (action: string, payload?: Record<string, unknown>) => {
    let nextState = { ...state };
    let nextPlayers = [...players];
    let nextAudience = [...audience];
    let nextVotes = [...votes];
    let nextRegistrations = [...registrations];
    let nextManual: [number[], number[]] = [
      [...manual[0]],
      [...manual[1]],
    ];

    if (action === 'joinPlayer') {
      const { id, name, side, av } = payload as { id: string; name: string; side: ChallengerSide; av: number };
      nextPlayers = nextPlayers.filter((p) => p.side !== side && p.id !== id);
      nextPlayers.push({ id, name, side, av: (av || 0) % 8, t: Date.now() });
    } else if (action === 'joinAudience') {
      const { id, name, av } = payload as { id: string; name: string; av: number };
      const idx = nextAudience.findIndex((a) => a.id === id);
      if (idx !== -1) {
        nextAudience[idx] = { ...nextAudience[idx], name, av: (av || 0) % 8 };
      } else {
        nextAudience.push({ id, name, av: (av || 0) % 8, t: Date.now() });
      }
    } else if (action === 'resetPlayers') {
      nextPlayers = [];
    } else if (action === 'swapChallengers') {
      nextPlayers = [];
      nextVotes = [];
      nextManual = [[0, 0, 0, 0], [0, 0, 0, 0]];
      nextState = {
        ...nextState,
        phase: 'lobby',
        round: 0,
        wins: [0, 0],
        cur: null,
        endsAt: 0,
        tally: null,
        msg: '',
        sc: [0, 0],
        win: -1,
        updatedAt: Date.now(),
      };
    } else if (action === 'registerPlayer') {
      const reg = payload as unknown as PlayerRegistration;
      if (reg?.id) {
        nextRegistrations = nextRegistrations.filter((r) => r.id !== reg.id);
        nextRegistrations.push({
          ...reg,
          name: String(reg.name || 'لاعب جديد').slice(0, 30),
          av: (reg.av || 0) % 8,
          status: reg.status || 'pending',
          createdAt: reg.createdAt || Date.now(),
        });
      }
    } else if (action === 'approveRegistration') {
      const { reg, side } = payload as { reg: PlayerRegistration; side?: ChallengerSide };
      if (reg) {
        nextRegistrations = nextRegistrations.map((r) =>
          r.id === reg.id ? { ...r, status: 'approved' as const } : r
        );
        if (reg.role === 'audience') {
          if (!nextAudience.some((a) => a.id === reg.id)) {
            nextAudience.push({ id: reg.id, name: reg.name, av: reg.av, t: Date.now() });
          }
        } else {
          const chosenSide = side || reg.side || 'r';
          nextPlayers = nextPlayers.filter((p) => p.side !== chosenSide && p.id !== reg.id);
          nextPlayers.push({
            id: reg.id,
            name: reg.name,
            side: chosenSide,
            av: reg.av,
            t: Date.now(),
          });
        }
      }
    } else if (action === 'rejectRegistration') {
      const { regId, role: regRole } = payload as { regId: string; role?: string };
      if (regId) {
        nextRegistrations = nextRegistrations.filter((r) => r.id !== regId);
        if (regRole === 'challenger') {
          nextPlayers = nextPlayers.filter((p) => p.id !== regId);
        } else {
          nextAudience = nextAudience.filter((a) => a.id !== regId);
        }
      }
    } else if (action === 'approveAllRegistrations') {
      const { list } = payload as { list: PlayerRegistration[] };
      let hasRight = nextPlayers.some((p) => p.side === 'r');
      let hasLeft = nextPlayers.some((p) => p.side === 'l');
      for (const reg of list || []) {
        nextRegistrations = nextRegistrations.map((r) =>
          r.id === reg.id ? { ...r, status: 'approved' as const } : r
        );
        if (reg.role === 'challenger') {
          let assignedSide: ChallengerSide = reg.side || 'r';
          if (
            (assignedSide === 'r' && hasRight) ||
            (assignedSide === 'l' && hasLeft)
          ) {
            if (!hasRight) assignedSide = 'r';
            else if (!hasLeft) assignedSide = 'l';
          }
          if (assignedSide === 'r') hasRight = true;
          if (assignedSide === 'l') hasLeft = true;
          nextPlayers = nextPlayers.filter((p) => p.side !== assignedSide && p.id !== reg.id);
          nextPlayers.push({
            id: reg.id,
            name: reg.name,
            side: assignedSide,
            av: reg.av,
            t: Date.now(),
          });
        } else if (!nextAudience.some((a) => a.id === reg.id)) {
          nextAudience.push({ id: reg.id, name: reg.name, av: reg.av, t: Date.now() });
        }
      }
    } else if (action === 'start') {
      const [s1, s2] = shuffleArray(DEFAULT_SKILL_POOL);
      const rest = DEFAULT_SKILL_POOL.filter((x) => x !== s1 && x !== s2);
      const cur = [s1, s2].map((s) => {
        const wrong = shuffleArray(rest).slice(0, 3);
        const opts = shuffleArray([s, ...wrong]);
        return { skill: s, opts, ans: opts.indexOf(s) };
      }) as [any, any];

      nextState = {
        ...nextState,
        phase: 'secret',
        round: 1,
        cur,
        wins: [0, 0],
        msg: '',
        sc: [0, 0],
        win: -1,
        updatedAt: Date.now(),
      };
      nextManual = [[0, 0, 0, 0], [0, 0, 0, 0]];
      nextVotes = [];
    } else if (action === 'nextRound') {
      const [s1, s2] = shuffleArray(DEFAULT_SKILL_POOL);
      const rest = DEFAULT_SKILL_POOL.filter((x) => x !== s1 && x !== s2);
      const cur = [s1, s2].map((s) => {
        const wrong = shuffleArray(rest).slice(0, 3);
        const opts = shuffleArray([s, ...wrong]);
        return { skill: s, opts, ans: opts.indexOf(s) };
      }) as [any, any];

      nextState = {
        ...nextState,
        phase: 'secret',
        round: nextState.round + 1,
        cur,
        msg: '',
        sc: [0, 0],
        win: -1,
        updatedAt: Date.now(),
      };
      nextManual = [[0, 0, 0, 0], [0, 0, 0, 0]];
      nextVotes = [];
    } else if (action === 'setPhase') {
      const p = payload as { phase: GamePhase; duration?: number };
      nextState.phase = p.phase;
      if (p.phase === 'vote') {
        const d = p.duration || nextState.durationSeconds || 15;
        nextState.endsAt = Date.now() + d * 1000;
      }
    } else if (action === 'manualVote') {
      const { sideIdx, optIdx, delta } = payload as { sideIdx: number; optIdx: number; delta?: number };
      if (sideIdx === 0 || sideIdx === 1) {
        nextManual[sideIdx][optIdx] = Math.max(0, nextManual[sideIdx][optIdx] + (delta ?? 1));
      }
    } else if (action === 'finishRound' && nextState.cur) {
      const tally = {
        t0: [0, 1, 2, 3].map((k) => (nextVotes.filter((v) => v.r === nextState.round && v.a === k).length + nextManual[0][k])),
        t1: [0, 1, 2, 3].map((k) => (nextVotes.filter((v) => v.r === nextState.round && v.b === k).length + nextManual[1][k])),
      };
      const sc: [number, number] = [
        tally.t0[nextState.cur[0].ans] || 0,
        tally.t1[nextState.cur[1].ans] || 0,
      ];
      const wins = [...nextState.wins] as [number, number];
      let win = -1;
      let msg = 'تعادل رائع!';
      if (sc[0] > sc[1]) {
        wins[0]++;
        win = 0;
        msg = `فاز ${nextState.names[0]}! جمهوره عرف المهارة أكثر ⭐`;
      } else if (sc[1] > sc[0]) {
        wins[1]++;
        win = 1;
        msg = `فاز ${nextState.names[1]}! جمهوره عرف المهارة أكثر ⭐`;
      }
      nextState = { ...nextState, phase: 'results', tally, sc, wins, win, msg };
    } else if (action === 'resetGame') {
      nextState = { ...DEFAULT_STATE };
      nextVotes = [];
      nextManual = [[0, 0, 0, 0], [0, 0, 0, 0]];
    }

    setState(nextState);
    setPlayers(nextPlayers);
    setAudience(nextAudience);
    setVotes(nextVotes);
    setManual(nextManual);
    setRegistrations(nextRegistrations);

    // Broadcast to other tabs
    bcRef.current?.postMessage({
      type: 'SYNC',
      payload: {
        state: nextState,
        players: nextPlayers,
        audience: nextAudience,
        votes: nextVotes,
        manual: nextManual,
        registrations: nextRegistrations,
      },
    });
  };

  return {
    state,
    players,
    audience,
    votes,
    manual,
    leaderboard,
    registrations,
    connected,
    sendAction,
  };
}
