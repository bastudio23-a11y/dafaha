import { useCallback, useEffect, useState } from 'react';
import type {
  AudienceMember, FullRoomData, GameState, LeaderboardEntry,
  Player, PlayerRegistration, VoteRecord,
} from '../types.ts';
import { getActiveRoomId } from '../utils/room.ts';

const DEFAULT_STATE: GameState = {
  phase: 'lobby', round: 0,
  names: ['المتحدّي الأيمن', 'المتحدّي الأيسر'],
  avs: [0, 1], wins: [0, 0], cur: null, endsAt: 0, tally: null,
  msg: '', sc: [0, 0], win: -1, durationSeconds: 15, updatedAt: 0,
};
type Snapshot = Partial<FullRoomData>;
export function useGameSync(uid: string) {
  const [state, setState] = useState<GameState>(DEFAULT_STATE);
  const [players, setPlayers] = useState<Player[]>([]);
  const [audience, setAudience] = useState<AudienceMember[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [manual, setManual] = useState<[number[], number[]]>([[0, 0, 0, 0], [0, 0, 0, 0]]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([]);
  const [connected, setConnected] = useState(false);
  const [syncError, setSyncError] = useState('');
  const roomId = getActiveRoomId();

  const applySnapshot = useCallback((data: Snapshot) => {
    if (data.state) setState(data.state);
    if (data.players) setPlayers(data.players);
    if (data.audience) setAudience(data.audience);
    if (data.votes) setVotes(data.votes);
    if (data.manual) setManual(data.manual);
    if (data.leaderboard) setLeaderboard(data.leaderboard);
    if (data.registrations) setRegistrations(data.registrations);
    setConnected(true);
    setSyncError('');
  }, []);
  useEffect(() => {
    if (!uid || !roomId) return;
    const controller = new AbortController();
    fetch('/api/rooms/' + roomId + '/state', {
      credentials: 'same-origin', signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('تعذر تحميل حالة الغرفة');
      return response.json();
    }).then(applySnapshot).catch(err => {
      if (!controller.signal.aborted) setSyncError(err.message || 'مشكلة اتصال');
    });
    const events = new EventSource('/api/rooms/' + roomId + '/events');
    events.onmessage = event => {
      try { applySnapshot(JSON.parse(event.data)); } catch { setSyncError('خطأ في تحديث اللعبة'); }
    };
    events.onerror = () => {
      setConnected(false);
      setSyncError('إعادة الاتصال بالغرفة...');
    };
    return () => { controller.abort(); events.close(); };
  }, [uid, roomId, applySnapshot]);

  const sendAction = useCallback(async (action: string, payload?: Record<string, unknown>) => {
    if (!roomId) return;
    try {
      const response = await fetch('/api/rooms/' + roomId + '/action', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر إكمال العملية');
      setSyncError('');
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'تعذر تنفيذ العملية');
    }
  }, [roomId]);

  return { state, players, audience, votes, manual, leaderboard,
    registrations, connected, syncError, sendAction };
}
