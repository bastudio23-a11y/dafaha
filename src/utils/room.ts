/**
 * Room management utilities for Dafah multiplayer.
 * Ensures session isolation so different groups around the world
 * can play simultaneously without game collision.
 */

export function getActiveRoomId(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const sanitized = roomParam.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
      if (sanitized) {
        sessionStorage.setItem('dafaha_room_id', sanitized);
        return sanitized;
      }
    }
    const saved = sessionStorage.getItem('dafaha_room_id');
    if (saved) return saved;
  } catch {
    // fallback
  }
  return 'main_room';
}

export function setActiveRoomId(roomId: string): void {
  try {
    const sanitized = roomId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
    if (sanitized) {
      sessionStorage.setItem('dafaha_room_id', sanitized);
      const url = new URL(window.location.href);
      url.searchParams.set('room', sanitized);
      window.history.replaceState({}, '', url.toString());
    }
  } catch {
    // ignore
  }
}

/**
 * Generate a friendly 4-digit room code for easy party sharing.
 */
export function generateNewRoomCode(): string {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  return `room_${code}`;
}
