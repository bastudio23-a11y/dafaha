// Room code in the URL selects an independent online game.
// No shared default room is used: landing visitors must create or join a room.
export function getActiveRoomId(): string {
  try {
    const raw = new URLSearchParams(window.location.search).get('room') || '';
    const code = raw.trim().toUpperCase();
    return /^[A-HJ-NP-Z2-9]{8}$/.test(code) ? code : '';
  } catch {
    return '';
  }
}
export function setActiveRoomId(roomId: string): void {
  const code = roomId.trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) return;
  const url = new URL(window.location.href);
  url.searchParams.set('room', code);
  window.history.replaceState({}, '', url.toString());
}
export function generateNewRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}
