import { randomBytes } from 'node:crypto';
import type { Express, Request, Response } from 'express';
import { DEFAULT_SKILL_POOL, shuffleArray } from '../src/data/skills.ts';
import type { AudienceMember, ChallengerSide, FullRoomData, GameState, LeaderboardEntry, Player, PlayerRegistration, QuestionRound, VoteRecord } from '../src/types.ts';

type Role = 'host' | 'challenger' | 'audience';
type Session = { token: string; id: string; role: Role; name: string; av: number };
type Listener = { res: Response; token: string };
type Room = {
  id: string; title: string; updatedAt: number; state: GameState; players: Player[];
  audience: AudienceMember[]; votes: VoteRecord[]; manual: [number[], number[]];
  leaderboard: LeaderboardEntry[]; registrations: PlayerRegistration[];
  sessions: Map<string, Session>; listeners: Set<Listener>;
};
const COOKIE = 'dafaha_sid';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rooms = new Map<string, Room>();
const limits = new Map<string, { count: number; until: number }>();
const actionLimits = new Map<string, { count: number; until: number }>();
const codePattern = /^[A-HJ-NP-Z2-9]{8}$/;
const TTL = 6 * 60 * 60 * 1000;
const defaultGame = (): GameState => ({
  phase: 'lobby', round: 0, names: ['المتحدّي الأيمن', 'المتحدّي الأيسر'],
  avs: [0, 1], wins: [0, 0], cur: null, endsAt: 0, tally: null, msg: '',
  sc: [0, 0], win: -1, durationSeconds: 15, updatedAt: Date.now(),
});
const generateCode = () => Array.from(randomBytes(8), b => ALPHABET[b % ALPHABET.length]).join('');
const generateToken = () => randomBytes(32).toString('base64url');
const nameOf = (value: unknown) => {
  if (typeof value !== 'string') return '';
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= 30 && !/[<>{}\u0000-\u001f]/.test(name) ? name : '';
};
const avatarOf = (v: unknown) => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 7 ? Number(v) : 0;
const int = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const cookieToken = (req: Request) => (req.headers.cookie || '').split(';').map(v => v.trim())
  .find(v => v.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1) || '';
const setCookie = (res: Response, token: string) => res.setHeader(
  'Set-Cookie', COOKIE + '=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=21600' +
  (process.env.NODE_ENV === 'production' ? '; Secure' : ''),
);
const getSession = (room: Room, req: Request) => room.sessions.get(cookieToken(req));
function guardOrigin(req: Request, res: Response) {
  try {
    if (!req.headers.origin || new URL(req.headers.origin).host === req.get('host')) return true;
  } catch {}
  res.status(403).json({ error: 'مصدر الطلب غير مسموح' });
  return false;
}
function guardRate(req: Request, res: Response) {
  const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
  const now = Date.now();
  const slot = limits.get(ip);
  if (!slot || now >= slot.until) { limits.set(ip, { count: 1, until: now + 300000 }); return true; }
  if (++slot.count <= 35) return true;
  res.status(429).json({ error: 'طلبات كثيرة، حاول بعد قليل' });
  return false;
}
function guardAction(req: Request, res: Response) {
  const key = cookieToken(req);
  const now = Date.now();
  const slot = actionLimits.get(key);
  if (!slot || now >= slot.until) { actionLimits.set(key, { count: 1, until: now + 60000 }); return true; }
  if (++slot.count <= 180) return true;
  res.status(429).json({ error: 'طلبات كثيرة من هذا اللاعب، حاول بعد قليل' });
  return false;
}
function prune() {
  const now = Date.now();
  for (const [id, room] of rooms) if (now - room.updatedAt > TTL) {
    for (const listener of room.listeners) listener.res.end();
    rooms.delete(id);
  }
  for (const [ip, slot] of limits) if (slot.until < now) limits.delete(ip);
  for (const [key, slot] of actionLimits) if (slot.until < now) actionLimits.delete(key);
}
function roomFrom(req: Request, res: Response) {
  prune();
  const id = String(req.params.code || '').toUpperCase();
  const room = codePattern.test(id) ? rooms.get(id) : undefined;
  if (!room) res.status(404).json({ error: 'الغرفة غير موجودة أو انتهت صلاحيتها' });
  return room;
}
function requireSession(req: Request, res: Response) {
  const room = roomFrom(req, res);
  if (!room) return;
  const session = getSession(room, req);
  if (!session) { res.status(401).json({ error: 'يرجى الانضمام للغرفة أولاً' }); return; }
  return { room, session };
}
function visibleState(room: Room, session: Session): FullRoomData & { serverTime: number } {
  const state: GameState = { ...room.state };
  if (state.cur && session.role !== 'host' && state.phase !== 'results') {
    const player = room.players.find(p => p.id === session.id);
    const side = player?.side === 'r' ? 0 : player?.side === 'l' ? 1 : -1;
    state.cur = state.cur.map((r, i) =>
      session.role === 'challenger' && side === i
        ? { ...r, ans: -1 }
        : { skill: '', opts: r.opts, ans: -1 },
    ) as [QuestionRound, QuestionRound];
  }
  return { state, players: room.players, audience: room.audience,
    votes: session.role === 'host' ? room.votes : room.votes.filter(v => v.uid === session.id),
    manual: room.manual, leaderboard: room.leaderboard,
    registrations: session.role === 'host'
      ? room.registrations : room.registrations.filter(r => r.id === session.id),
    serverTime: Date.now() };
}
function broadcast(room: Room) {
  room.updatedAt = Date.now();
  room.state.updatedAt = room.updatedAt;
  for (const sub of room.listeners) {
    const session = room.sessions.get(sub.token);
    if (!session) { sub.res.end(); room.listeners.delete(sub); continue; }
    try { sub.res.write('data: ' + JSON.stringify(visibleState(room, session)) + '\n\n'); }
    catch { sub.res.end(); room.listeners.delete(sub); }
  }
}
function generateRound(room: Room) {
  const [a, b] = shuffleArray(DEFAULT_SKILL_POOL);
  const other = DEFAULT_SKILL_POOL.filter(s => s !== a && s !== b);
  const cur = [a, b].map(skill => {
    const opts = shuffleArray([skill, ...shuffleArray(other).slice(0, 3)]);
    return { skill, opts, ans: opts.indexOf(skill) };
  }) as [QuestionRound, QuestionRound];
  room.state = { ...room.state, phase: 'secret', round: room.state.round + 1,
    cur, endsAt: 0, tally: null, msg: '', sc: [0, 0], win: -1 };
  room.votes = [];
  room.manual = [[0, 0, 0, 0], [0, 0, 0, 0]];
}
function finishRound(room: Room) {
  const { state, votes, manual } = room;
  if (!state.cur || state.phase !== 'vote') return 'التصويت غير متاح';
  const count = (side: 0 | 1, option: number) =>
    votes.filter(v => v.r === state.round && (side === 0 ? v.a : v.b) === option).length + manual[side][option];
  const tally = { t0: [0, 1, 2, 3].map(i => count(0, i)), t1: [0, 1, 2, 3].map(i => count(1, i)) };
  const sc: [number, number] = [tally.t0[state.cur[0].ans], tally.t1[state.cur[1].ans]];
  const winner = sc[0] === sc[1] ? -1 : sc[0] > sc[1] ? 0 : 1;
  const wins: [number, number] = [...state.wins] as [number, number];
  if (winner === 0) wins[0]++; else if (winner === 1) wins[1]++;
  room.state = { ...state, phase: 'results', tally, sc, win: winner, wins,
    msg: winner < 0 ? 'تعادل رائع!' : 'فاز ' + state.names[winner === 0 ? 0 : 1] + '! جمهوره عرف المهارة أكثر ⭐' };
  for (let side = 0; side < 2; side++) {
    const player = room.players.find(p => p.side === (side === 0 ? 'r' : 'l'));
    const id = player?.id || 'local_' + side;
    let entry = room.leaderboard.find(l => l.id === id && l.role === 'challenger');
    if (!entry) {
      entry = { id, name: state.names[side], av: state.avs[side], role: 'challenger',
        wins: 0, votesEarned: 0, correctGuesses: 0, totalGuesses: 0,
        totalRounds: 0, points: 0, streak: 0 };
      room.leaderboard.push(entry);
    }
    entry.totalRounds++; entry.votesEarned += sc[side];
    if (winner === side) { entry.wins++; entry.streak++; } else entry.streak = 0;
    entry.points += sc[side] * 30 + (winner === side ? 150 + entry.streak * 20 : 20);
  }
  for (const vote of votes.filter(v => v.r === state.round)) {
    const member = room.audience.find(a => a.id === vote.uid);
    if (!member) continue;
    let entry = room.leaderboard.find(l => l.id === vote.uid && l.role === 'audience');
    if (!entry) {
      entry = { id: vote.uid, name: member.name, av: member.av, role: 'audience',
        wins: 0, votesEarned: 0, correctGuesses: 0, totalGuesses: 0,
        totalRounds: 0, points: 0, streak: 0 };
      room.leaderboard.push(entry);
    }
    const correct = Number(vote.a === state.cur![0].ans) + Number(vote.b === state.cur![1].ans);
    entry.totalRounds++; entry.correctGuesses += correct;
    entry.totalGuesses += Number(vote.a >= 0) + Number(vote.b >= 0);
    entry.points += correct * 100 + (correct === 2 ? 50 : 0);
    entry.streak = correct ? entry.streak + 1 : 0;
  }
}
const hostActions = new Set([
  'start', 'nextRound', 'setPhase', 'finishRound', 'resetGame', 'resetPlayers',
  'resetLeaderboard', 'manualVote', 'swapChallengers', 'approveRegistration',
  'approveAllRegistrations', 'rejectRegistration',
]);
function act(room: Room, session: Session, action: string, data: any): string | undefined {
  if (hostActions.has(action) && session.role !== 'host') return 'هذا الإجراء خاص بمضيف الغرفة';
  const state = room.state;
  switch (action) {
    case 'joinAudience': {
      if (session.role !== 'audience') return 'هذا الإجراء خاص بالجمهور';
      const name = nameOf(data?.name);
      if (!name) return 'اسم غير صالح';
      session.name = name; session.av = avatarOf(data?.av);
      const member = room.audience.find(p => p.id === session.id);
      if (member) { member.name = name; member.av = session.av; }
      else room.audience.push({ id: session.id, name, av: session.av, t: Date.now() });
      return;
    }
    case 'registerPlayer': {
      if (session.role !== 'challenger') return 'هذا الإجراء خاص بالمتحدّين';
      room.registrations = room.registrations.filter(r => r.id !== session.id);
      room.registrations.push({ id: session.id, name: session.name, av: session.av,
        role: 'challenger', status: 'pending', createdAt: Date.now() });
      return;
    }
    case 'approveRegistration': {
      const id = String(data?.reg?.id || '');
      const reg = room.registrations.find(r => r.id === id && r.status === 'pending');
      if (!reg) return 'طلب غير موجود';
      const side: ChallengerSide = data?.side === 'l' ? 'l' : 'r';
      reg.status = 'approved'; reg.side = side;
      room.players = room.players.filter(p => p.id !== id && p.side !== side);
      room.players.push({ id, name: reg.name, av: reg.av, side, t: Date.now() });
      return;
    }
    case 'approveAllRegistrations': {
      const available = (['r', 'l'] as ChallengerSide[]).filter(side => !room.players.some(p => p.side === side));
      for (const reg of room.registrations.filter(r => r.status === 'pending')) {
        const side = available.shift();
        if (!side) break;
        reg.status = 'approved'; reg.side = side;
        room.players.push({ id: reg.id, name: reg.name, av: reg.av, side, t: Date.now() });
      }
      return;
    }
    case 'rejectRegistration': {
      const id = String(data?.regId || '');
      room.registrations = room.registrations.map(r => r.id === id ? { ...r, status: 'rejected' } : r);
      room.players = room.players.filter(p => p.id !== id);
      return;
    }
    case 'resetPlayers': room.players = []; return;
    case 'swapChallengers':
      room.players = [];
      room.registrations = room.registrations.map(r => ({ ...r, status: 'rejected' }));
      room.votes = []; room.manual = [[0, 0, 0, 0], [0, 0, 0, 0]];
      room.state = { ...defaultGame(), wins: state.wins };
      return;
    case 'start': {
      if (state.phase !== 'lobby' && state.phase !== 'results') return 'لا يمكن بدء جولة الآن';
      const right = room.players.find(p => p.side === 'r');
      const left = room.players.find(p => p.side === 'l');
      const names = Array.isArray(data?.names) ? data.names : [];
      const avs = Array.isArray(data?.avs) ? data.avs : [];
      room.state = defaultGame();
      room.state.names = [right?.name || nameOf(names[0]) || 'المتحدّي الأيمن',
        left?.name || nameOf(names[1]) || 'المتحدّي الأيسر'];
      room.state.avs = [right?.av ?? avatarOf(avs[0]), left?.av ?? avatarOf(avs[1])];
      room.state.durationSeconds = int(data?.durationSeconds, 5, 120) ? data.durationSeconds : 15;
      generateRound(room); return;
    }
    case 'nextRound':
      if (state.phase !== 'results') return 'أنه الجولة أولاً';
      generateRound(room); return;
    case 'setPhase':
      if ((data?.phase === 'explain' && state.phase !== 'secret') ||
          (data?.phase === 'vote' && state.phase !== 'explain')) return 'ترتيب المراحل غير صحيح';
      if (!['explain', 'vote'].includes(data?.phase)) return 'مرحلة غير صالحة';
      room.state.phase = data.phase;
      if (data.phase === 'vote') {
        const seconds = int(data?.duration, 5, 120) ? data.duration : state.durationSeconds;
        room.state.durationSeconds = seconds;
        room.state.endsAt = Date.now() + seconds * 1000;
      }
      return;
    case 'vote': {
      if (session.role !== 'audience') return 'التصويت متاح للجمهور فقط';
      if (state.phase !== 'vote' || Date.now() > state.endsAt) return 'انتهى وقت التصويت';
      if (data?.round !== state.round || !int(data?.a, -1, 3) || !int(data?.b, -1, 3)) return 'صوت غير صالح';
      const old = room.votes.find(v => v.uid === session.id && v.r === state.round);
      if (old) { old.a = data.a; old.b = data.b; old.updatedAt = Date.now(); }
      else room.votes.push({ uid: session.id, r: state.round, a: data.a, b: data.b, updatedAt: Date.now() });
      return;
    }
    case 'manualVote':
      if (state.phase !== 'vote' || !int(data?.sideIdx, 0, 1) || !int(data?.optIdx, 0, 3) ||
          !int(data?.delta, -1, 1)) return 'صوت يدوي غير صالح';
      room.manual[data.sideIdx][data.optIdx] = Math.max(0, room.manual[data.sideIdx][data.optIdx] + data.delta);
      return;
    case 'finishRound': return finishRound(room);
    case 'resetLeaderboard': room.leaderboard = []; return;
    case 'resetGame':
      room.state = defaultGame(); room.votes = []; room.manual = [[0, 0, 0, 0], [0, 0, 0, 0]]; return;
    default: return 'إجراء غير معروف';
  }
}
export function registerMultiplayerRoutes(app: Express) {
  app.post('/api/rooms', (req, res) => {
    if (!guardOrigin(req, res) || !guardRate(req, res)) return;
    prune();
    if (rooms.size >= 300) return res.status(503).json({ error: 'الغرف ممتلئة مؤقتاً' });
    let id = generateCode();
    for (let i = 0; rooms.has(id) && i < 5; i++) id = generateCode();
    if (rooms.has(id)) return res.status(503).json({ error: 'تعذر إنشاء غرفة' });
    const token = generateToken(); const title = String(req.body?.title || 'غرفة تحدّي المهارة').slice(0, 60);
    const session: Session = { token, id: 'host_' + randomBytes(8).toString('hex'), role: 'host', name: 'المضيف', av: 0 };
    const room: Room = { id, title, updatedAt: Date.now(), state: defaultGame(), players: [],
      audience: [], votes: [], manual: [[0, 0, 0, 0], [0, 0, 0, 0]], leaderboard: [], registrations: [],
      sessions: new Map([[token, session]]), listeners: new Set() };
    rooms.set(id, room); setCookie(res, token);
    return res.status(201).json({ roomId: id, title, role: 'host' });
  });
  app.get('/api/rooms/:code', (req, res) => {
    const room = roomFrom(req, res);
    if (room) res.json({ roomId: room.id, title: room.title, phase: room.state.phase,
      audienceCount: room.audience.length, challengerCount: room.players.length });
  });
  app.post('/api/rooms/:code/join', (req, res) => {
    if (!guardOrigin(req, res) || !guardRate(req, res)) return;
    const room = roomFrom(req, res);
    if (!room) return;
    const old = getSession(room, req);
    if (old) return res.json({ roomId: room.id, userId: old.id, role: old.role });
    if (room.sessions.size >= 150) return res.status(429).json({ error: 'الغرفة ممتلئة' });
    const role = req.body?.role;
    const name = nameOf(req.body?.name);
    if (!['audience', 'challenger'].includes(role) || !name)
      return res.status(400).json({ error: 'اختر دورًا واكتب اسمًا من حرفين إلى 30 حرفًا' });
    const token = generateToken(); const av = avatarOf(req.body?.av);
    const session: Session = { token, role, name, av, id: 'u_' + randomBytes(12).toString('hex') };
    room.sessions.set(token, session);
    if (role === 'audience') room.audience.push({ id: session.id, name, av, t: Date.now() });
    else room.registrations.push({ id: session.id, name, av, role: 'challenger',
      status: 'pending', createdAt: Date.now() });
    setCookie(res, token); broadcast(room);
    return res.json({ roomId: room.id, userId: session.id, role });
  });
  app.get('/api/rooms/:code/session', (req, res) => {
    const pair = requireSession(req, res);
    if (pair) res.json({ roomId: pair.room.id, title: pair.room.title,
      role: pair.session.role, userId: pair.session.id, name: pair.session.name });
  });
  app.get('/api/rooms/:code/state', (req, res) => {
    const pair = requireSession(req, res);
    if (pair) res.json(visibleState(pair.room, pair.session));
  });
  app.get('/api/rooms/:code/events', (req, res) => {
    const pair = requireSession(req, res);
    if (!pair) return;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    const sub = { res, token: pair.session.token };
    pair.room.listeners.add(sub);
    res.write('data: ' + JSON.stringify(visibleState(pair.room, pair.session)) + '\n\n');
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(heartbeat); pair.room.listeners.delete(sub); });
  });
  app.post('/api/rooms/:code/action', (req, res) => {
    if (!guardOrigin(req, res)) return;
    const pair = requireSession(req, res);
    if (!pair || !guardAction(req, res)) return;
    const action = req.body?.action;
    if (typeof action !== 'string') return res.status(400).json({ error: 'إجراء غير صالح' });
    const error = act(pair.room, pair.session, action, req.body?.payload);
    if (error) return res.status(403).json({ error });
    broadcast(pair.room);
    return res.json({ ok: true });
  });
}
export function resetRoomsForTests() {
  for (const room of rooms.values()) for (const listener of room.listeners) listener.res.end();
  rooms.clear(); limits.clear(); actionLimits.clear();
}
