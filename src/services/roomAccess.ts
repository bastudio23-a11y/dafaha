export const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}
export function goToRoom(code: string, role?: 'challenger' | 'audience'): void {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('room', code);
  if (role) url.searchParams.set('role', role);
  window.location.assign(url.toString());
}
async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'تعذّر الاتصال بالخادم');
  return data;
}
export async function createRoom(title: string): Promise<{ roomId: string; role: 'host' }> {
  return readJson(await fetch('/api/rooms', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  }));
}
export async function joinRoom(code: string, name: string, role: 'challenger' | 'audience') {
  if (!CODE_RE.test(code)) throw new Error('رمز الغرفة يجب أن يحتوي على 8 أحرف أو أرقام');
  return readJson(await fetch('/api/rooms/' + code + '/join', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, role, av: Math.floor(Math.random() * 8) }),
  }));
}
export type RoomSession = {
  roomId: string; title: string; userId: string; role: 'host' | 'challenger' | 'audience'; name: string;
};
export async function loadRoomSession(code: string): Promise<RoomSession | null> {
  const response = await fetch('/api/rooms/' + code + '/session', { credentials: 'same-origin' });
  if (response.status === 401 || response.status === 404) return null;
  return readJson(response);
}
export async function loadRoomMeta(code: string) {
  return readJson(await fetch('/api/rooms/' + code));
}
