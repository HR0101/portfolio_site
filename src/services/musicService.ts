import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import { normalizeRecentTracks, type MusicStatus, type RecentTrack } from '../lib/edge/appleMusic';

const cacheKey = 'apple_music_recent_v1';
const cacheLifetimeMs = 5 * 60 * 1000;
const requestTimeoutMs = 8000;
export interface RecentMusicResponse {
  tracks: RecentTrack[];
  apiStatus: MusicStatus;
}

function sanitizeTracks(value: unknown): RecentTrack[] {
  if (!Array.isArray(value)) return [];
  // localStorage からの URL も，再び同じ許可リストで検証する．
  return normalizeRecentTracks({ data: value.map((track) => ({
    type: 'songs', attributes: {
      name: track?.title, artistName: track?.artist, albumName: track?.album,
      artwork: { url: track?.artworkUrl }, url: track?.url,
    },
  })) });
}

let pending: Promise<RecentMusicResponse> | undefined;

async function loadRecentMusic(): Promise<RecentMusicResponse> {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const cached = JSON.parse(raw);
      const age = Date.now() - cached.timestamp;
      if (typeof cached.timestamp === 'number' && age >= 0 && age < cacheLifetimeMs) {
        return { tracks: sanitizeTracks(cached.tracks), apiStatus: 'success' };
      }
    }
  } catch {
    // ストレージが使えなくても API から取得する．
  }
  try {
    const response = await fetchWithTimeout('/api/music/recent', {}, requestTimeoutMs);
    if (!response.ok) return { tracks: [], apiStatus: 'offline' };
    const data: RecentMusicResponse = await response.json();
    if (data.apiStatus !== 'success') {
      const apiStatus = ['no_token', 'token_expired', 'rate_limited'].includes(data.apiStatus) ? data.apiStatus : 'offline';
      return { tracks: [], apiStatus };
    }
    const tracks = sanitizeTracks(data.tracks);
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), tracks }));
    } catch {
      // 容量超過や保存不可のときも表示を続ける．
    }
    return { tracks, apiStatus: 'success' };
  } catch {
    return { tracks: [], apiStatus: 'offline' };
  }
}

export function fetchRecentMusic(): Promise<RecentMusicResponse> {
  // Strict Mode の再マウントや同時取得でもリクエストを共有する．
  if (!pending) pending = loadRecentMusic().finally(() => { pending = undefined; });
  return pending;
}
