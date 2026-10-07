import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { DEFAULT_SKILL_POOL, shuffleArray } from './src/data/skills.ts';
import type { GameState, Player, AudienceMember, VoteRecord, QuestionRound, LeaderboardEntry, PlayerRegistration } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// In-memory game state
let gameState: GameState = {
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

let players: Player[] = [];
let audience: AudienceMember[] = [];
let votes: VoteRecord[] = [];
let manual: [number[], number[]] = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];
let leaderboard: LeaderboardEntry[] = [];
let registrations: PlayerRegistration[] = [];

// SSE subscribers for instant updates
const sseClients: express.Response[] = [];

function notifyClients() {
  gameState.updatedAt = Date.now();
  const payload = JSON.stringify({
    state: gameState,
    players,
    audience,
    votes,
    manual,
    leaderboard,
    registrations,
    serverTime: Date.now(),
  });

  for (let i = sseClients.length - 1; i >= 0; i--) {
    const res = sseClients[i];
    try {
      res.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// SSE stream
app.get('/api/game/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  res.write(
    `data: ${JSON.stringify({
      state: gameState,
      players,
      audience,
      votes,
      manual,
      leaderboard,
      registrations,
      serverTime: Date.now(),
    })}\n\n`
  );

  sseClients.push(res);

  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// GET game snapshot
app.get('/api/game/state', (_req, res) => {
  res.json({
    state: gameState,
    players,
    audience,
    votes,
    manual,
    leaderboard,
    registrations,
    serverTime: Date.now(),
  });
});

// POST game actions
app.post('/api/game/action', (req, res) => {
  const { action, payload } = req.body || {};

  switch (action) {
    case 'joinPlayer': {
      const { id, name, side, av } = payload;
      const cleanName = String(name || 'متحدّي').slice(0, 25);
      // Remove any existing challenger on that side or same id
      players = players.filter((p) => p.side !== side && p.id !== id);
      players.push({
        id,
        name: cleanName,
        side,
        av: (av || 0) % 8,
        t: Date.now(),
      });
      break;
    }

    case 'joinAudience': {
      const { id, name, av } = payload;
      const cleanName = String(name || 'ضيف').slice(0, 25);
      const existing = audience.find((a) => a.id === id);
      if (existing) {
        existing.name = cleanName;
        existing.av = (av || 0) % 8;
      } else {
        audience.push({
          id,
          name: cleanName,
          av: (av || 0) % 8,
          t: Date.now(),
        });
      }
      break;
    }

    case 'registerPlayer': {
      const reg = payload as PlayerRegistration;
      if (reg && reg.id) {
        registrations = registrations.filter((r) => r.id !== reg.id);
        registrations.push({
          id: reg.id,
          name: String(reg.name || 'لاعب جديد').slice(0, 30),
          av: (reg.av || 0) % 8,
          role: reg.role || 'audience',
          side: reg.side,
          status: reg.status || 'pending',
          createdAt: reg.createdAt || Date.now(),
        });
      }
      break;
    }

    case 'approveRegistration': {
      const { reg, side } = payload || {};
      if (reg) {
        const found = registrations.find((r) => r.id === reg.id);
        if (found) {
          found.status = 'approved';
        }
        if (reg.role === 'audience') {
          if (!audience.some((a) => a.id === reg.id)) {
            audience.push({
              id: reg.id,
              name: reg.name,
              av: reg.av,
              t: Date.now(),
            });
          }
        } else {
          const chosenSide = side || reg.side || 'r';
          players = players.filter((p) => p.side !== chosenSide && p.id !== reg.id);
          players.push({
            id: reg.id,
            name: reg.name,
            side: chosenSide,
            av: reg.av,
            t: Date.now(),
          });
        }
      }
      break;
    }

    case 'rejectRegistration': {
      const { regId, role } = payload || {};
      if (regId) {
        registrations = registrations.filter((r) => r.id !== regId);
        if (role === 'challenger') {
          players = players.filter((p) => p.id !== regId);
        } else {
          audience = audience.filter((a) => a.id !== regId);
        }
      }
      break;
    }

    case 'approveAllRegistrations': {
      const { list } = payload || {};
      const pendingToApprove = (list as PlayerRegistration[]) || registrations.filter((r) => r.status === 'pending');
      let hasRight = players.some((p) => p.side === 'r');
      let hasLeft = players.some((p) => p.side === 'l');

      pendingToApprove.forEach((reg) => {
        const rItem = registrations.find((r) => r.id === reg.id);
        if (rItem) rItem.status = 'approved';

        if (reg.role === 'challenger') {
          let assignedSide = reg.side;
          if (!assignedSide || (assignedSide === 'r' && hasRight) || (assignedSide === 'l' && hasLeft)) {
            if (!hasRight) assignedSide = 'r';
            else if (!hasLeft) assignedSide = 'l';
            else assignedSide = 'r';
          }
          if (assignedSide === 'r') hasRight = true;
          if (assignedSide === 'l') hasLeft = true;

          players = players.filter((p) => p.side !== assignedSide && p.id !== reg.id);
          players.push({
            id: reg.id,
            name: reg.name,
            side: assignedSide,
            av: reg.av,
            t: Date.now(),
          });
        } else {
          if (!audience.some((a) => a.id === reg.id)) {
            audience.push({
              id: reg.id,
              name: reg.name,
              av: reg.av,
              t: Date.now(),
            });
          }
        }
      });
      break;
    }

    case 'resetPlayers': {
      players = [];
      break;
    }

    case 'swapChallengers': {
      players = [];
      votes = [];
      manual = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      gameState = {
        ...gameState,
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
      break;
    }

    case 'start': {
      const { names, avs, durationSeconds } = payload || {};
      const rightChallenger = players.find((p) => p.side === 'r');
      const leftChallenger = players.find((p) => p.side === 'l');

      gameState.names = [
        rightChallenger?.name || names?.[0] || 'المتحدّي الأيمن',
        leftChallenger?.name || names?.[1] || 'المتحدّي الأيسر',
      ];
      gameState.avs = [
        rightChallenger?.av ?? avs?.[0] ?? 0,
        leftChallenger?.av ?? avs?.[1] ?? 1,
      ];
      gameState.durationSeconds = durationSeconds || 15;
      gameState.wins = [0, 0];
      gameState.round = 0;

      // trigger next round
      generateRound();
      break;
    }

    case 'nextRound': {
      generateRound();
      break;
    }

    case 'setPhase': {
      const { phase, duration } = payload || {};
      gameState.phase = phase;
      if (phase === 'vote') {
        const secs = duration || gameState.durationSeconds || 15;
        gameState.endsAt = Date.now() + secs * 1000;
      }
      break;
    }

    case 'vote': {
      const { uid, round, a, b } = payload || {};
      if (gameState.phase === 'vote' && round === gameState.round) {
        const existing = votes.find((v) => v.uid === uid && v.r === round);
        if (existing) {
          if (a !== undefined && a !== null) existing.a = a;
          if (b !== undefined && b !== null) existing.b = b;
          existing.updatedAt = Date.now();
        } else {
          votes.push({
            uid,
            r: round,
            a: a ?? -1,
            b: b ?? -1,
            updatedAt: Date.now(),
          });
        }
      }
      break;
    }

    case 'manualVote': {
      const { sideIdx, optIdx, delta } = payload || {};
      if (
        (sideIdx === 0 || sideIdx === 1) &&
        optIdx >= 0 &&
        optIdx <= 3
      ) {
        manual[sideIdx][optIdx] = Math.max(
          0,
          manual[sideIdx][optIdx] + (delta ?? 1)
        );
      }
      break;
    }

    case 'finishRound': {
      if (!gameState.cur) break;
      const tally = {
        t0: [0, 1, 2, 3].map((k) => countVotes(0, k)),
        t1: [0, 1, 2, 3].map((k) => countVotes(1, k)),
      };
      const sc: [number, number] = [
        tally.t0[gameState.cur[0].ans] || 0,
        tally.t1[gameState.cur[1].ans] || 0,
      ];
      const wins = [...gameState.wins] as [number, number];
      let msg = 'تعادل رائع!';
      let win = -1;

      if (sc[0] > sc[1]) {
        wins[0]++;
        win = 0;
        msg = `فاز ${gameState.names[0]}! جمهوره عرف المهارة أكثر ⭐`;
      } else if (sc[1] > sc[0]) {
        wins[1]++;
        win = 1;
        msg = `فاز ${gameState.names[1]}! جمهوره عرف المهارة أكثر ⭐`;
      }

      gameState.phase = 'results';
      gameState.tally = tally;
      gameState.sc = sc;
      gameState.wins = wins;
      gameState.win = win;
      gameState.msg = msg;

      // Update Leaderboard for Challengers
      const updateChallenger = (sideIdx: number, isWinner: boolean, score: number) => {
        const side = sideIdx === 0 ? 'r' : 'l';
        const player = players.find((p) => p.side === side);
        const cid = player ? player.id : `ch_${sideIdx}`;
        const cname = gameState.names[sideIdx];
        const cav = gameState.avs[sideIdx];

        let entry = leaderboard.find((l) => l.id === cid && l.role === 'challenger');
        if (!entry) {
          entry = {
            id: cid,
            name: cname,
            av: cav,
            role: 'challenger',
            wins: 0,
            votesEarned: 0,
            correctGuesses: 0,
            totalGuesses: 0,
            totalRounds: 0,
            points: 0,
            streak: 0,
          };
          leaderboard.push(entry);
        }
        entry.name = cname;
        entry.av = cav;
        entry.totalRounds += 1;
        entry.votesEarned += score;
        if (isWinner) {
          entry.wins += 1;
          entry.streak += 1;
          entry.points += score * 30 + 150 + entry.streak * 20;
        } else {
          entry.streak = 0;
          entry.points += score * 30 + 20;
        }
      };

      updateChallenger(0, win === 0, sc[0]);
      updateChallenger(1, win === 1, sc[1]);

      // Update Leaderboard for Audience Voters
      const currentRoundVotes = votes.filter((v) => v.r === gameState.round);
      currentRoundVotes.forEach((v) => {
        const audMember = audience.find((a) => a.id === v.uid);
        const aname = audMember ? audMember.name : 'ضيف مصوّت';
        const aav = audMember ? audMember.av : 0;

        let entry = leaderboard.find((l) => l.id === v.uid && l.role === 'audience');
        if (!entry) {
          entry = {
            id: v.uid,
            name: aname,
            av: aav,
            role: 'audience',
            wins: 0,
            votesEarned: 0,
            correctGuesses: 0,
            totalGuesses: 0,
            totalRounds: 0,
            points: 0,
            streak: 0,
          };
          leaderboard.push(entry);
        }
        if (audMember) {
          entry.name = audMember.name;
          entry.av = audMember.av;
        }

        let roundCorrect = 0;
        let guessesCount = 0;
        if (v.a !== -1) {
          guessesCount++;
          if (v.a === gameState.cur![0].ans) roundCorrect++;
        }
        if (v.b !== -1) {
          guessesCount++;
          if (v.b === gameState.cur![1].ans) roundCorrect++;
        }

        entry.totalRounds += 1;
        entry.totalGuesses += guessesCount;
        entry.correctGuesses += roundCorrect;

        // Points: 100 per correct guess + 50 perfect round bonus
        const pts = roundCorrect * 100 + (roundCorrect === 2 ? 50 : 0);
        entry.points += pts;
        if (roundCorrect > 0) {
          entry.streak += 1;
        } else {
          entry.streak = 0;
        }
      });
      break;
    }

    case 'resetLeaderboard': {
      leaderboard = [];
      break;
    }

    case 'resetGame': {
      gameState = {
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
      votes = [];
      manual = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      break;
    }
  }

  notifyClients();
  res.json({ success: true, state: gameState });
});

function generateRound() {
  const [s1, s2] = shuffleArray(DEFAULT_SKILL_POOL);
  const rest = DEFAULT_SKILL_POOL.filter((x) => x !== s1 && x !== s2);

  const cur = [s1, s2].map((s) => {
    const wrong = shuffleArray(rest).slice(0, 3);
    const opts = shuffleArray([s, ...wrong]);
    return {
      skill: s,
      opts,
      ans: opts.indexOf(s),
    };
  }) as [QuestionRound, QuestionRound];

  manual = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  votes = votes.filter((v) => v.r === gameState.round + 1); // clear old votes

  gameState.phase = 'secret';
  gameState.round += 1;
  gameState.cur = cur;
  gameState.tally = null;
  gameState.msg = '';
  gameState.sc = [0, 0];
  gameState.win = -1;
}

function countVotes(sideIdx: number, optIdx: number): number {
  const round = gameState.round;
  const key = sideIdx === 0 ? 'a' : 'b';
  const autoVotes = votes.filter((v) => v.r === round && v[key] === optIdx).length;
  const manVotes = manual[sideIdx]?.[optIdx] || 0;
  return autoVotes + manVotes;
}

// Dev and Prod setup
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
