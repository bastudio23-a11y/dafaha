import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerMultiplayerRoutes, resetRoomsForTests } from '../server/multiplayer.ts';

const app = express();
app.use(express.json());
registerMultiplayerRoutes(app);
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
after(() => server.close());
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
