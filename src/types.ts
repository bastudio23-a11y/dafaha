export type GamePhase = 'lobby' | 'secret' | 'explain' | 'vote' | 'results';

export type PlayerRole = 'host' | 'challenger' | 'audience';

export type ChallengerSide = 'r' | 'l'; // 'r' = Right (الأيمن), 'l' = Left (الأيسر)

export interface Player {
  id: string;
  name: string;
  side: ChallengerSide;
  av: number;
  t: number;
}

export interface AudienceMember {
  id: string;
  name: string;
  av: number;
  t: number;
  points?: number;
  streak?: number;
  correctGuesses?: number;
  lastPointsEarned?: number;
  rank?: number;
}

export interface QuestionRound {
  skill: string;
  opts: string[];
  ans: number; // 0, 1, 2, or 3 index
}

export interface GameState {
  phase: GamePhase;
  round: number;
  names: [string, string];
  avs: [number, number];
  wins: [number, number];
  cur: [QuestionRound, QuestionRound] | null;
  endsAt: number;
  tally: { t0: number[]; t1: number[] } | null;
  msg: string;
  sc: [number, number];
  win: number; // -1 for tie/none, 0 for right, 1 for left
  durationSeconds: number;
  updatedAt: number;
}

export interface VoteRecord {
  uid: string;
  r: number;
  a: number; // chosen index for challenger 0 (0-3 or -1)
  b: number; // chosen index for challenger 1 (0-3 or -1)
  updatedAt: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  av: number;
  role: 'challenger' | 'audience';
  wins: number; // for challengers: rounds won
  votesEarned: number; // for challengers: how many audience votes their real skill received
  correctGuesses: number; // for audience: how many correct skills they guessed
  totalGuesses: number; // for audience: total skills guessed
  totalRounds: number;
  points: number; // total accumulated game score
  streak: number;
}

export interface PlayerRegistration {
  id: string;
  name: string;
  av: number;
  role: 'challenger' | 'audience';
  side?: ChallengerSide;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface FullRoomData {
  state: GameState;
  players: Player[];
  audience: AudienceMember[];
  votes: VoteRecord[];
  manual: [number[], number[]];
  leaderboard: LeaderboardEntry[];
  registrations?: PlayerRegistration[];
}
