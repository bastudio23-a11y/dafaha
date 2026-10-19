import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { registerMultiplayerRoutes, resetRoomsForTests } from '../server/multiplayer.ts';

const app = express();
app.use(express.json());
registerMultiplayerRoutes(app);
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port;
after(() => new Promise((resolve, reject) => {
  server.close(error => error ? reject(error) : resolve());
}));
beforeEach(() => resetRoomsForTests());

async function request(route, opts = {}) {
  const response = await fetch(base + route, {
    method: opts.method || 'GET',
    headers: {
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
      ...(opts.origin ? { Origin: opts.origin } : {}),
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  const data = await response.json();
  return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0] || '' };
}
async function create(title = 'غرفة أصدقاء') {
  const r = await request('/api/rooms', { method: 'POST', body: { title } });
  assert.equal(r.status, 201);
  assert.match(r.data.roomId, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.match(r.cookie, /^dafaha_sid=/);
  return r;
}
const action = (code, cookie, actionName, payload) =>
  request('/api/rooms/' + code + '/action', { method: 'POST', cookie, body: { action: actionName, payload } });
const join = (code, name, role) =>
  request('/api/rooms/' + code + '/join', { method: 'POST', body: { name, role } });
const state = (code, cookie) => request('/api/rooms/' + code + '/state', { cookie });

test('creates independent non-guessable rooms and prevents cross-room control', async () => {
  const a = await create('الأولى');
  const b = await create('الثانية');
  assert.notEqual(a.data.roomId, b.data.roomId);
  assert.equal((await request('/api/rooms/' + a.data.roomId)).data.title, 'الأولى');
  assert.equal((await action(b.data.roomId, a.cookie, 'start', {})).status, 401);
  assert.equal((await state(a.data.roomId, '')).status, 401);
  assert.equal((await request('/api/rooms/NOTREAL0')).status, 404);
});

test('guests join without an account, only host approves and controls phases', async () => {
  const host = await create();
  const room = host.data.roomId;
  const challenger = await join(room, 'أحمد', 'challenger');
  const audience = await join(room, 'محمد', 'audience');
  assert.equal(challenger.status, 200);
  assert.equal(audience.status, 200);
  assert.equal((await action(room, audience.cookie, 'start', {})).status, 403);
  assert.equal((await action(room, challenger.cookie, 'approveAllRegistrations')).status, 403);
  const hostBefore = await state(room, host.cookie);
  const reg = hostBefore.data.registrations[0];
  assert.equal(reg.status, 'pending');
  assert.equal((await action(room, host.cookie, 'approveRegistration', { reg, side: 'r' })).status, 200);
  assert.equal((await state(room, challenger.cookie)).data.players[0].id, challenger.data.userId);
  assert.equal((await action(room, host.cookie, 'start', {
    names: ['الأيمن', 'الأيسر'], avs: [0, 1], durationSeconds: 15,
  })).status, 200);

  const hostRound = await state(room, host.cookie);
  const audienceRound = await state(room, audience.cookie);
  const challengerRound = await state(room, challenger.cookie);
  assert.equal(hostRound.data.state.phase, 'secret');
  assert.notEqual(hostRound.data.state.cur[0].ans, -1);
  assert.equal(audienceRound.data.state.cur[0].skill, '');
  assert.equal(audienceRound.data.state.cur[0].ans, -1);
  assert.equal(challengerRound.data.state.cur[0].skill, hostRound.data.state.cur[0].skill);
  assert.equal(challengerRound.data.state.cur[1].skill, '');
  assert.equal(challengerRound.data.state.cur[0].ans, -1);
  assert.equal((await action(room, host.cookie, 'setPhase', { phase: 'vote' })).status, 403);
  assert.equal((await action(room, host.cookie, 'setPhase', { phase: 'explain' })).status, 200);
  assert.equal((await action(room, host.cookie, 'setPhase', { phase: 'vote', duration: 15 })).status, 200);
  assert.equal((await action(room, audience.cookie, 'vote', { round: 1, a: 4, b: 0 })).status, 403);
  assert.equal((await action(room, audience.cookie, 'vote', { round: 1, a: 1, b: 2 })).status, 200);
  assert.equal((await action(room, challenger.cookie, 'vote', { round: 1, a: 1, b: 2 })).status, 403);
  assert.equal((await action(room, host.cookie, 'finishRound')).status, 200);
  assert.equal((await state(room, audience.cookie)).data.state.phase, 'results');
  assert.notEqual((await state(room, audience.cookie)).data.state.cur[0].ans, -1);
  assert.equal((await action(room, host.cookie, 'nextRound')).status, 200);
  assert.equal((await state(room, audience.cookie)).data.state.round, 2);
});

test('rejects invalid names, forged origin, and unauthorized session', async () => {
  const host = await create();
  const room = host.data.roomId;
  assert.equal((await join(room, '<script>', 'audience')).status, 400);
  assert.equal((await join(room, 'أحمد', 'host')).status, 400);
  assert.equal((await request('/api/rooms', {
    method: 'POST', origin: 'https://evil.example', body: { title: 'forgery' },
  })).status, 403);
  assert.equal((await action(room, '', 'resetGame')).status, 401);
  assert.equal((await action(room, host.cookie, 'arbitraryAction')).status, 403);
});


test('accepts a workshop-size audience using a shared network address', async () => {
  const host = await create('ورشة جامعية');
  for (let i = 0; i < 45; i++) {
    const guest = await join(host.data.roomId, 'طالب ' + i, 'audience');
    assert.equal(guest.status, 200, 'audience join ' + i);
  }
  const snapshot = await state(host.data.roomId, host.cookie);
  assert.equal(snapshot.data.audience.length, 45);
});

async function hostAction(host, name, payload) {
  const response = await action(host.data.roomId, host.cookie, name, payload);
  assert.equal(response.status, 200, name + ': ' + JSON.stringify(response.data));
}
async function openVoting(host, next = false) {
  await hostAction(host, next ? 'nextRound' : 'start', {
    names: ['الأيمن', 'الأيسر'], durationSeconds: 120,
  });
  await hostAction(host, 'setPhase', { phase: 'explain' });
  await hostAction(host, 'setPhase', { phase: 'vote', duration: 120 });
  return (await state(host.data.roomId, host.cookie)).data.state;
}
async function addCorrectManualVotes(host, round, scores) {
  for (const sideIdx of [0, 1]) {
    for (let i = 0; i < scores[sideIdx]; i++) {
      await hostAction(host, 'manualVote', {
        sideIdx, optIdx: round.cur[sideIdx].ans, delta: 1,
      });
    }
  }
}

for (const scenario of [
  { label: 'right winner', scores: [2, 1], winner: 0, wins: [1, 0], name: 'الأيمن' },
  { label: 'left winner', scores: [1, 2], winner: 1, wins: [0, 1], name: 'الأيسر' },
  { label: 'tie', scores: [1, 1], winner: -1, wins: [0, 0], name: null },
]) {
  test('scores ' + scenario.label + ' without invalid tuple indexing', async () => {
    const host = await create();
    const round = await openVoting(host);
    await addCorrectManualVotes(host, round, scenario.scores);
    await hostAction(host, 'finishRound');
    const result = (await state(host.data.roomId, host.cookie)).data.state;
    assert.equal(result.phase, 'results');
    assert.deepEqual(result.sc, scenario.scores);
    assert.equal(result.win, scenario.winner);
    assert.deepEqual(result.wins, scenario.wins);
    assert.equal(result.msg, scenario.name
      ? 'فاز ' + scenario.name + '! جمهوره عرف المهارة أكثر ⭐'
      : 'تعادل رائع!');
    assert.equal(Object.hasOwn(result.wins, '-1'), false);

    // A later tied round must preserve any accumulated wins.
    const next = await openVoting(host, true);
    await addCorrectManualVotes(host, next, [1, 1]);
    await hostAction(host, 'finishRound');
    const tied = (await state(host.data.roomId, host.cookie)).data.state;
    assert.equal(tied.win, -1);
    assert.deepEqual(tied.wins, scenario.wins);
  });
}

for (const resetAction of ['resetGame', 'swapChallengers']) {
  test(resetAction + ' clears both manual vote sides and recorded votes', async () => {
    const host = await create();
    const room = host.data.roomId;
    const first = await openVoting(host);
    await addCorrectManualVotes(host, first, [1, 0]);
    await hostAction(host, 'finishRound');

    const round = await openVoting(host, true);
    await addCorrectManualVotes(host, round, [2, 1]);
    const audience = await join(room, 'مشارك', 'audience');
    assert.equal(audience.status, 200);
    assert.equal((await action(room, audience.cookie, 'vote', {
      round: round.round, a: round.cur[0].ans, b: round.cur[1].ans,
    })).status, 200);
    const before = (await state(room, host.cookie)).data;
    assert.equal(before.votes.length, 1);
    assert.deepEqual(before.manual.map(side => side.reduce((a, b) => a + b, 0)), [2, 1]);

    await hostAction(host, resetAction);
    const reset = (await state(room, host.cookie)).data;
    assert.equal(reset.state.phase, 'lobby');
    assert.equal(reset.state.round, 0);
    assert.equal(reset.state.cur, null);
    assert.deepEqual(reset.manual, [[0, 0, 0, 0], [0, 0, 0, 0]]);
    assert.deepEqual(reset.votes, []);
    assert.deepEqual(reset.state.wins, resetAction === 'swapChallengers' ? [1, 0] : [0, 0]);

    // Both sides remain usable, and prior votes do not leak into the new game.
    const fresh = await openVoting(host);
    await addCorrectManualVotes(host, fresh, [1, 1]);
    await hostAction(host, 'finishRound');
    const result = (await state(room, host.cookie)).data.state;
    assert.deepEqual(result.sc, [1, 1]);
    assert.equal(result.win, -1);
  });
}
