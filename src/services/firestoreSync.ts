import {
  doc,
  collection,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors.ts';
import { DEFAULT_SKILL_POOL, shuffleArray } from '../data/skills.ts';
import type {
  GameState,
  Player,
  AudienceMember,
  VoteRecord,
  LeaderboardEntry,
  PlayerRegistration,
  ChallengerSide,
  GamePhase,
  QuestionRound,
} from '../types.ts';

const ROOM_ID = 'main_room';

export class FirestoreSyncService {
  private unsubState: (() => void) | null = null;
  private unsubPlayers: (() => void) | null = null;
  private unsubAudience: (() => void) | null = null;
  private unsubVotes: (() => void) | null = null;
  private unsubLeaderboard: (() => void) | null = null;
  private unsubRegistrations: (() => void) | null = null;

  public subscribe(onUpdate: (data: {
    state?: GameState;
    players?: Player[];
    audience?: AudienceMember[];
    votes?: VoteRecord[];
    leaderboard?: LeaderboardEntry[];
    registrations?: PlayerRegistration[];
  }) => void) {
    const gameDocRef = doc(db, 'games', ROOM_ID);
    const playersColRef = collection(db, 'games', ROOM_ID, 'players');
    const audienceColRef = collection(db, 'games', ROOM_ID, 'audience');
    const votesColRef = collection(db, 'games', ROOM_ID, 'votes');
    const leaderboardColRef = collection(db, 'games', ROOM_ID, 'leaderboard');
    const registrationsColRef = collection(db, 'games', ROOM_ID, 'registrations');

    // 1. Game State Listener
    this.unsubState = onSnapshot(
      gameDocRef,
      (snap) => {
        if (snap.exists()) {
          onUpdate({ state: snap.data() as GameState });
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, `games/${ROOM_ID}`);
        } catch {
          // Handled and logged
        }
      }
    );

    // 2. Players Listener
    this.unsubPlayers = onSnapshot(
      playersColRef,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Player);
        onUpdate({ players: list });
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, `games/${ROOM_ID}/players`);
        } catch {
          // Handled and logged
        }
      }
    );

    // 3. Audience Listener (with Kahoot points & streak)
    this.unsubAudience = onSnapshot(
      audienceColRef,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as AudienceMember);
        onUpdate({ audience: list });
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, `games/${ROOM_ID}/audience`);
        } catch {
          // Handled and logged
        }
      }
    );

    // 4. Votes Listener
    this.unsubVotes = onSnapshot(
      votesColRef,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as VoteRecord);
        onUpdate({ votes: list });
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, `games/${ROOM_ID}/votes`);
        } catch {
          // Handled and logged
        }
      }
    );

    // 5. Leaderboard Listener
    this.unsubLeaderboard = onSnapshot(
      leaderboardColRef,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as LeaderboardEntry);
        onUpdate({ leaderboard: list });
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, `games/${ROOM_ID}/leaderboard`);
        } catch {
          // Handled and logged
        }
      }
    );

    // 6. Registrations & Approvals Listener
    this.unsubRegistrations = onSnapshot(
      registrationsColRef,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as PlayerRegistration);
        onUpdate({ registrations: list });
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, `games/${ROOM_ID}/registrations`);
        } catch {
          // Handled and logged
        }
      }
    );
  }

  public unsubscribe() {
    this.unsubState?.();
    this.unsubPlayers?.();
    this.unsubAudience?.();
    this.unsubVotes?.();
    this.unsubLeaderboard?.();
    this.unsubRegistrations?.();
  }

  // Registration for entry before entering the game
  public async registerPlayer(reg: PlayerRegistration) {
    const path = `games/${ROOM_ID}/registrations/${reg.id}`;
    try {
      await setDoc(doc(db, 'games', ROOM_ID, 'registrations', reg.id), {
        id: reg.id,
        name: String(reg.name || 'لاعب جديد').slice(0, 40),
        av: (reg.av || 0) % 8,
        role: reg.role,
        side: reg.side || 'auto',
        status: reg.status || 'pending',
        createdAt: reg.createdAt || Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  public async approveRegistration(reg: PlayerRegistration, assignedSide?: ChallengerSide) {
    try {
      const batch = writeBatch(db);
      const regRef = doc(db, 'games', ROOM_ID, 'registrations', reg.id);
      batch.set(regRef, { ...reg, status: 'approved' }, { merge: true });

      if (reg.role === 'audience') {
        const audRef = doc(db, 'games', ROOM_ID, 'audience', reg.id);
        batch.set(
          audRef,
          {
            id: reg.id,
            name: reg.name,
            av: reg.av,
            points: 0,
            streak: 0,
            correctGuesses: 0,
            lastPointsEarned: 0,
            t: Date.now(),
          },
          { merge: true }
        );
      } else {
        const chosenSide = assignedSide || reg.side || 'r';
        const playerRef = doc(db, 'games', ROOM_ID, 'players', reg.id);
        batch.set(playerRef, {
          id: reg.id,
          name: reg.name,
          side: chosenSide,
          av: reg.av,
          t: Date.now(),
        });
      }

      await batch.commit();
    } catch (err) {
      console.warn('Approve registration error:', err);
    }
  }

  public async rejectRegistration(regId: string, role?: string) {
    try {
      const batch = writeBatch(db);
      const regRef = doc(db, 'games', ROOM_ID, 'registrations', regId);
      batch.delete(regRef);

      if (role === 'challenger') {
        const pRef = doc(db, 'games', ROOM_ID, 'players', regId);
        batch.delete(pRef);
      } else {
        const aRef = doc(db, 'games', ROOM_ID, 'audience', regId);
        batch.delete(aRef);
      }

      await batch.commit();
    } catch (err) {
      console.warn('Reject registration error:', err);
    }
  }

  public async approveAllRegistrations(pendingList: PlayerRegistration[], currentChallengers: Player[]) {
    try {
      const batch = writeBatch(db);
      let hasRight = currentChallengers.some((p) => p.side === 'r');
      let hasLeft = currentChallengers.some((p) => p.side === 'l');

      for (const reg of pendingList) {
        const regRef = doc(db, 'games', ROOM_ID, 'registrations', reg.id);
        batch.set(regRef, { ...reg, status: 'approved' }, { merge: true });

        if (reg.role === 'challenger') {
          let side: ChallengerSide = 'r';
          if (!hasRight) {
            side = 'r';
            hasRight = true;
          } else if (!hasLeft) {
            side = 'l';
            hasLeft = true;
          } else {
            // Already 2 challengers, assign as audience
            side = 'r';
          }
          const pRef = doc(db, 'games', ROOM_ID, 'players', reg.id);
          batch.set(pRef, {
            id: reg.id,
            name: reg.name,
            side,
            av: reg.av,
            t: Date.now(),
          });
        } else {
          const aRef = doc(db, 'games', ROOM_ID, 'audience', reg.id);
          batch.set(
            aRef,
            {
              id: reg.id,
              name: reg.name,
              av: reg.av,
              points: 0,
              streak: 0,
              correctGuesses: 0,
              lastPointsEarned: 0,
              t: Date.now(),
            },
            { merge: true }
          );
        }
      }

      await batch.commit();
    } catch (err) {
      console.warn('Approve all error:', err);
    }
  }

  // Actions
  public async joinPlayer(id: string, name: string, side: ChallengerSide, av: number) {
    const path = `games/${ROOM_ID}/players/${id}`;
    try {
      await setDoc(doc(db, 'games', ROOM_ID, 'players', id), {
        id,
        name: String(name || 'متحدّي').slice(0, 30),
        side,
        av: (av || 0) % 8,
        t: Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  public async joinAudience(id: string, name: string, av: number) {
    const path = `games/${ROOM_ID}/audience/${id}`;
    try {
      await setDoc(
        doc(db, 'games', ROOM_ID, 'audience', id),
        {
          id,
          name: String(name || 'ضيف').slice(0, 30),
          av: (av || 0) % 8,
          points: 0,
          streak: 0,
          correctGuesses: 0,
          lastPointsEarned: 0,
          t: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  public async vote(uid: string, round: number, a: number | null, b: number | null) {
    const path = `games/${ROOM_ID}/votes/${uid}`;
    try {
      await setDoc(doc(db, 'games', ROOM_ID, 'votes', uid), {
        uid,
        r: round,
        a: a ?? -1,
        b: b ?? -1,
        updatedAt: Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  public async startGame(names: [string, string], avs: [number, number], duration: number) {
    const [s1, s2] = shuffleArray(DEFAULT_SKILL_POOL);
    const rest = DEFAULT_SKILL_POOL.filter((x) => x !== s1 && x !== s2);
    const cur = [s1, s2].map((s) => {
      const wrong = shuffleArray(rest).slice(0, 3);
      const opts = shuffleArray([s, ...wrong]);
      return { skill: s, opts, ans: opts.indexOf(s) };
    }) as [QuestionRound, QuestionRound];

    const state: GameState = {
      phase: 'secret',
      round: 1,
      names,
      avs,
      wins: [0, 0],
      cur,
      endsAt: 0,
      tally: null,
      msg: '',
      sc: [0, 0],
      win: -1,
      durationSeconds: duration || 15,
      updatedAt: Date.now(),
    };

    await this.clearVotes();
    await setDoc(doc(db, 'games', ROOM_ID), state);
  }

  public async nextRound(currentState: GameState) {
    const [s1, s2] = shuffleArray(DEFAULT_SKILL_POOL);
    const rest = DEFAULT_SKILL_POOL.filter((x) => x !== s1 && x !== s2);
    const cur = [s1, s2].map((s) => {
      const wrong = shuffleArray(rest).slice(0, 3);
      const opts = shuffleArray([s, ...wrong]);
      return { skill: s, opts, ans: opts.indexOf(s) };
    }) as [QuestionRound, QuestionRound];

    const nextState: GameState = {
      ...currentState,
      phase: 'secret',
      round: currentState.round + 1,
      cur,
      endsAt: 0,
      tally: null,
      msg: '',
      sc: [0, 0],
      win: -1,
      updatedAt: Date.now(),
    };

    await this.clearVotes();
    await setDoc(doc(db, 'games', ROOM_ID), nextState);
  }

  public async setPhase(phase: GamePhase, duration?: number, currentState?: GameState) {
    if (!currentState) return;
    const update: Partial<GameState> = {
      phase,
      updatedAt: Date.now(),
    };
    if (phase === 'vote') {
      const d = duration || currentState.durationSeconds || 15;
      update.endsAt = Date.now() + d * 1000;
    }
    await setDoc(doc(db, 'games', ROOM_ID), { ...currentState, ...update }, { merge: true });
  }

  public async finishRound(
    currentState: GameState,
    votes: VoteRecord[],
    manual: [number[], number[]],
    audience: AudienceMember[]
  ) {
    if (!currentState.cur) return;

    // 1. Tally votes
    const tally = {
      t0: [0, 1, 2, 3].map(
        (k) => votes.filter((v) => v.r === currentState.round && v.a === k).length + (manual[0]?.[k] || 0)
      ),
      t1: [0, 1, 2, 3].map(
        (k) => votes.filter((v) => v.r === currentState.round && v.b === k).length + (manual[1]?.[k] || 0)
      ),
    };

    const sc: [number, number] = [
      tally.t0[currentState.cur[0].ans] || 0,
      tally.t1[currentState.cur[1].ans] || 0,
    ];

    const wins = [...currentState.wins] as [number, number];
    let win = -1;
    let msg = 'تعادل رائع!';

    if (sc[0] > sc[1]) {
      wins[0]++;
      win = 0;
      msg = `فاز ${currentState.names[0]}! جمهوره عرف المهارة أكثر ⭐`;
    } else if (sc[1] > sc[0]) {
      wins[1]++;
      win = 1;
      msg = `فاز ${currentState.names[1]}! جمهوره عرف المهارة أكثر ⭐`;
    }

    // 2. Kahoot scoring calculation for Audience
    const batch = writeBatch(db);
    const updatedAudienceScores: { id: string; points: number }[] = [];

    const ansA = currentState.cur[0].ans;
    const ansB = currentState.cur[1].ans;

    for (const aud of audience) {
      const v = votes.find((x) => x.uid === aud.id && x.r === currentState.round);
      let roundCorrect = 0;
      if (v) {
        if (v.a === ansA) roundCorrect++;
        if (v.b === ansB) roundCorrect++;
      }

      // Base: 100 pts per correct guess + 50 perfect round bonus + streak bonus
      const currentStreak = roundCorrect > 0 ? (aud.streak || 0) + 1 : 0;
      const streakBonus = currentStreak > 1 ? (currentStreak - 1) * 20 : 0;
      const roundPoints =
        roundCorrect > 0
          ? roundCorrect * 100 + (roundCorrect === 2 ? 50 : 0) + streakBonus
          : 0;

      const newTotalPoints = (aud.points || 0) + roundPoints;
      const newCorrectGuesses = (aud.correctGuesses || 0) + roundCorrect;

      updatedAudienceScores.push({ id: aud.id, points: newTotalPoints });

      // Update audience document in Firestore
      const audRef = doc(db, 'games', ROOM_ID, 'audience', aud.id);
      batch.set(
        audRef,
        {
          points: newTotalPoints,
          streak: currentStreak,
          correctGuesses: newCorrectGuesses,
          lastPointsEarned: roundPoints,
          lastIsCorrectA: v ? v.a === ansA : false,
          lastIsCorrectB: v ? v.b === ansB : false,
        },
        { merge: true }
      );

      // Update leaderboard entry in Firestore
      const lbRef = doc(db, 'games', ROOM_ID, 'leaderboard', `aud_${aud.id}`);
      batch.set(
        lbRef,
        {
          id: aud.id,
          name: aud.name,
          av: aud.av,
          role: 'audience',
          points: newTotalPoints,
          streak: currentStreak,
          correctGuesses: newCorrectGuesses,
          totalRounds: currentState.round,
        },
        { merge: true }
      );
    }

    // 3. Update Challengers Leaderboard in Firestore
    [0, 1].forEach((idx) => {
      const isWinner = win === idx;
      const cscore = sc[idx];
      const cid = `ch_${idx}`;
      const lbRef = doc(db, 'games', ROOM_ID, 'leaderboard', cid);
      const points = cscore * 40 + (isWinner ? 200 : 30);

      batch.set(
        lbRef,
        {
          id: cid,
          name: currentState.names[idx],
          av: currentState.avs[idx],
          role: 'challenger',
          points,
          wins: isWinner ? 1 : 0,
          votesEarned: cscore,
          totalRounds: currentState.round,
        },
        { merge: true }
      );
    });

    // 4. Save batch and update game state to results
    await batch.commit();

    const resultsState: GameState = {
      ...currentState,
      phase: 'results',
      tally,
      sc,
      wins,
      win,
      msg,
      updatedAt: Date.now(),
    };

    await setDoc(doc(db, 'games', ROOM_ID), resultsState);
  }

  public async resetLeaderboard() {
    try {
      const snap = await getDocs(collection(db, 'games', ROOM_ID, 'leaderboard'));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch {
      // ignore
    }
  }

  public async resetPlayers() {
    try {
      const snap = await getDocs(collection(db, 'games', ROOM_ID, 'players'));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch {
      // ignore
    }
  }

  /** Clear challengers and return to lobby so new players can register via QR. */
  public async swapChallengers(currentState: GameState) {
    try {
      const snap = await getDocs(collection(db, 'games', ROOM_ID, 'players'));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      await this.clearVotes();

      await setDoc(doc(db, 'games', ROOM_ID), {
        ...currentState,
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
      });
    } catch {
      // ignore
    }
  }

  public async resetGame() {
    const defaultState: GameState = {
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
    await this.clearVotes();
    await setDoc(doc(db, 'games', ROOM_ID), defaultState);
  }

  private async clearVotes() {
    try {
      const snap = await getDocs(collection(db, 'games', ROOM_ID, 'votes'));
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch {
      // ignore
    }
  }
}

export const firestoreSync = new FirestoreSyncService();
