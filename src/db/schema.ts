import * as SQLite from 'expo-sqlite';

/**
 * 本地数据库（expo-sqlite）。
 * 表设计见技术方案附录 E。
 */

export const db = SQLite.openDatabaseSync('bili_asmr.db');

export async function initDatabase(): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS blocked_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL UNIQUE,
      mode TEXT DEFAULT 'blacklist',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id INTEGER NOT NULL,
      bvid TEXT NOT NULL,
      title TEXT,
      cover_url TEXT,
      audio_url TEXT,
      duration INTEGER,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (playlist_id) REFERENCES playlists(id)
    );

    CREATE TABLE IF NOT EXISTS downloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bvid TEXT NOT NULL,
      title TEXT,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      status TEXT DEFAULT 'completed',
      downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL,
      name TEXT,
      avatar_url TEXT,
      home_url TEXT,
      followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id TEXT NOT NULL,
      title TEXT,
      url TEXT,
      favorited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS play_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bvid TEXT NOT NULL,
      title TEXT,
      cover_url TEXT,
      position INTEGER DEFAULT 0,
      played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      ttl_ms INTEGER NOT NULL DEFAULT 7200000,
      updated_at INTEGER NOT NULL
    );
  `);
}

// ---------- 屏蔽关键词 ----------

export type KeywordMode = 'blacklist' | 'whitelist';

export interface BlockedKeyword {
  id: number;
  keyword: string;
  mode: KeywordMode;
}

export async function getBlockedKeywords(): Promise<BlockedKeyword[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT id, keyword, mode FROM blocked_keywords ORDER BY created_at DESC',
  );
  return rows.map((row) => ({
    id: Number(row.id),
    keyword: String(row.keyword),
    mode: row.mode as KeywordMode,
  }));
}

export async function addBlockedKeyword(
  keyword: string,
  mode: KeywordMode,
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO blocked_keywords (keyword, mode) VALUES (?, ?)',
    [keyword.trim(), mode],
  );
}

export async function removeBlockedKeyword(id: number): Promise<void> {
  await db.runAsync('DELETE FROM blocked_keywords WHERE id = ?', [id]);
}

// ---------- 歌单 ----------

export interface Playlist {
  id: number;
  name: string;
  createdAt: string;
}

export interface PlaylistItem {
  id: number;
  playlistId: number;
  bvid: string;
  title: string | null;
  coverUrl: string | null;
  audioUrl: string | null;
  duration: number | null;
}

export async function getPlaylists(): Promise<Playlist[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT id, name, created_at FROM playlists ORDER BY created_at DESC',
  );
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    createdAt: String(row.created_at),
  }));
}

export async function createPlaylist(name: string): Promise<void> {
  await db.runAsync('INSERT INTO playlists (name) VALUES (?)', [name.trim()]);
}

export async function renamePlaylist(id: number, name: string): Promise<void> {
  await db.runAsync('UPDATE playlists SET name = ? WHERE id = ?', [name.trim(), id]);
}

export async function deletePlaylist(id: number): Promise<void> {
  await db.runAsync('DELETE FROM playlist_items WHERE playlist_id = ?', [id]);
  await db.runAsync('DELETE FROM playlists WHERE id = ?', [id]);
}

export async function getPlaylistItems(playlistId: number): Promise<PlaylistItem[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT id, playlist_id, bvid, title, cover_url, audio_url, duration
     FROM playlist_items WHERE playlist_id = ? ORDER BY added_at DESC`,
    [playlistId],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    playlistId: Number(row.playlist_id),
    bvid: String(row.bvid),
    title: row.title != null ? String(row.title) : null,
    coverUrl: row.cover_url != null ? String(row.cover_url) : null,
    audioUrl: row.audio_url != null ? String(row.audio_url) : null,
    duration: row.duration != null ? Number(row.duration) : null,
  }));
}

export async function hasPlaylistItem(
  playlistId: number,
  bvid: string,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM playlist_items WHERE playlist_id = ? AND bvid = ?',
    [playlistId, bvid],
  );
  return Number(row?.count ?? 0) > 0;
}

export async function addPlaylistItem(
  playlistId: number,
  item: {
    bvid: string;
    title?: string;
    coverUrl?: string;
    audioUrl?: string;
    duration?: number;
  },
): Promise<void> {
  await db.runAsync(
    `INSERT INTO playlist_items (playlist_id, bvid, title, cover_url, audio_url, duration)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      playlistId,
      item.bvid,
      item.title ?? null,
      item.coverUrl ?? null,
      item.audioUrl ?? null,
      item.duration ?? null,
    ],
  );
}

// ---------- 关注 / 收藏 ----------

export interface FollowItem {
  id: number;
  uid: string;
  name: string | null;
  avatarUrl: string | null;
  homeUrl: string | null;
}

export interface FavoriteItem {
  id: number;
  mediaId: string;
  title: string | null;
  url: string | null;
}

export async function getFollows(): Promise<FollowItem[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT id, uid, name, avatar_url, home_url FROM follows ORDER BY followed_at DESC',
  );
  return rows.map((row) => ({
    id: Number(row.id),
    uid: String(row.uid),
    name: row.name != null ? String(row.name) : null,
    avatarUrl: row.avatar_url != null ? String(row.avatar_url) : null,
    homeUrl: row.home_url != null ? String(row.home_url) : null,
  }));
}

export async function addFollow(follow: {
  uid: string;
  name?: string;
  avatarUrl?: string;
  homeUrl?: string;
}): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO follows (uid, name, avatar_url, home_url) VALUES (?, ?, ?, ?)',
    [follow.uid, follow.name ?? null, follow.avatarUrl ?? null, follow.homeUrl ?? null],
  );
}

export async function updateFollowInfo(
  id: number,
  info: { name: string; avatarUrl: string; homeUrl?: string },
): Promise<void> {
  await db.runAsync(
    'UPDATE follows SET name = ?, avatar_url = ?, home_url = ? WHERE id = ?',
    [info.name, info.avatarUrl, info.homeUrl ?? null, id],
  );
}

export async function deleteFollow(id: number): Promise<void> {
  await db.runAsync('DELETE FROM follows WHERE id = ?', [id]);
}

export async function deleteFavorite(id: number): Promise<void> {
  await db.runAsync('DELETE FROM favorites WHERE id = ?', [id]);
}

export async function getFavorites(): Promise<FavoriteItem[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT id, media_id, title, url FROM favorites ORDER BY favorited_at DESC',
  );
  return rows.map((row) => ({
    id: Number(row.id),
    mediaId: String(row.media_id),
    title: row.title != null ? String(row.title) : null,
    url: row.url != null ? String(row.url) : null,
  }));
}

export async function addFavorite(favorite: {
  mediaId: string;
  title?: string;
  url?: string;
}): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO favorites (media_id, title, url) VALUES (?, ?, ?)',
    [favorite.mediaId, favorite.title ?? null, favorite.url ?? null],
  );
}

// ---------- 播放历史 ----------

export interface PlayHistoryItem {
  id: number;
  bvid: string;
  title: string | null;
  coverUrl: string | null;
  position: number;
  playedAt: string;
}

export async function getPlayHistory(): Promise<PlayHistoryItem[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT id, bvid, title, cover_url, position, played_at FROM play_history ORDER BY played_at DESC LIMIT 20',
  );
  return rows.map((row) => ({
    id: Number(row.id),
    bvid: String(row.bvid),
    title: row.title != null ? String(row.title) : null,
    coverUrl: row.cover_url != null ? String(row.cover_url) : null,
    position: Number(row.position ?? 0),
    playedAt: String(row.played_at),
  }));
}

export async function addPlayHistory(history: {
  bvid: string;
  title?: string;
  coverUrl?: string;
  position?: number;
}): Promise<void> {
  await db.runAsync(
    `INSERT INTO play_history (bvid, title, cover_url, position)
     VALUES (?, ?, ?, ?)`,
    [history.bvid, history.title ?? null, history.coverUrl ?? null, history.position ?? 0],
  );
}
