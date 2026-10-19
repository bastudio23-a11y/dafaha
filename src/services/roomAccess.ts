import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, initAuth } from '../firebase.ts';
import { setActiveRoomId } from '../utils/room.ts';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_ID_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export function makeRoomCode(): string {
  const random = new Uint8Array(8);
  crypto.getRandomValues(random);
  return Array.from(random, (number) => ALPHABET[number % ALPHABET.length]).join('');
}

async function currentUid(): Promise<string> {
  await initAuth();
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('تعذر تسجيل الدخول كضيف، حاول مرة أخرى');
  return uid;
}

export async function createRoom(title = 'غرفة تحدي المهارة'): Promise<string> {
  const hostUid = await currentUid();
  const cleanTitle = title.trim().slice(0, 60) || 'غرفة تحدي المهارة';
  // setDoc on an existing room becomes an update, which our rules explicitly reject.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeRoomCode();
    try {
      await setDoc(doc(db, 'rooms', code), {
        hostUid,
        title: cleanTitle,
        createdAt: serverTimestamp(),
      });
      setActiveRoomId(code);
      return code;
    } catch (error) {
      // Fail closed for permission or network problems; never claim the room exists.
      if (error instanceof Error && !/already.exists/i.test(error.message)) throw error;
    }
  }
  throw new Error('تعذر إنشاء غرفة جديدة، حاول مرة أخرى');
}

export async function joinRoom(input: string): Promise<{ code: string; isHost: boolean }> {
  const code = normalizeRoomCode(input);
  if (!ROOM_ID_PATTERN.test(code)) throw new Error('رمز الغرفة يجب أن يتكون من 8 أحرف أو أرقام');
  const uid = await currentUid();
  const snapshot = await getDoc(doc(db, 'rooms', code));
  if (!snapshot.exists()) throw new Error('الغرفة غير موجودة، تحقق من الرمز');
  setActiveRoomId(code);
  return { code, isHost: snapshot.data().hostUid === uid };
}

export async function isRoomHost(roomId: string): Promise<boolean> {
  const uid = await currentUid();
  const snapshot = await getDoc(doc(db, 'rooms', roomId));
  return snapshot.exists() && snapshot.data().hostUid === uid;
}
