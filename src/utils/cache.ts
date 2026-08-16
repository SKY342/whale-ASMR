import * as FileSystem from 'expo-file-system';
import { db } from '../db/schema';

/**
 * 缓存工具：
 * - 音频流地址等 KV 缓存放在 SQLite（TTL 2 小时）
 * - 封面图缓存在本地文件系统（TTL 7 天）
 */

const AUDIO_URL_TTL_MS = 2 * 60 * 60 * 1000;
const COVER_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function now(): number {
  return Date.now();
}

export async function cacheGet(key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string; updated_at: number }>(
    'SELECT value, updated_at FROM cache WHERE key = ?',
    [key],
  );
  if (!row) return null;
  if (now() - Number(row.updated_at) > AUDIO_URL_TTL_MS) {
    await db.runAsync('DELETE FROM cache WHERE key = ?', [key]);
    return null;
  }
  return row.value;
}

export async function cacheSet(
  key: string,
  value: string,
  ttlMs: number = AUDIO_URL_TTL_MS,
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO cache (key, value, ttl_ms, updated_at)
     VALUES (?, ?, ?, ?)`,
    [key, value, ttlMs, now()],
  );
}

export async function cacheRemove(key: string): Promise<void> {
  await db.runAsync('DELETE FROM cache WHERE key = ?', [key]);
}

export async function cacheClearExpired(): Promise<void> {
  await db.runAsync('DELETE FROM cache WHERE updated_at + ttl_ms < ?', [now()]);
}

// ---------- 封面图文件缓存 ----------

export async function getCachedCover(coverUrl: string): Promise<string | null> {
  if (!coverUrl) return null;
  const fileName = coverFileName(coverUrl);
  const fileUri = `${FileSystem.cacheDirectory ?? ''}covers/${fileName}`;

  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) return null;
    const modified = (info as { modificationTime?: number }).modificationTime ?? 0;
    if (now() - modified > COVER_TTL_MS) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      return null;
    }
    return fileUri;
  } catch {
    return null;
  }
}

export async function cacheCover(coverUrl: string): Promise<string | null> {
  if (!coverUrl) return null;
  const dir = `${FileSystem.cacheDirectory ?? ''}covers`;
  const fileName = coverFileName(coverUrl);
  const fileUri = `${dir}/${fileName}`;

  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) return fileUri;

    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const download = await FileSystem.downloadAsync(coverUrl, fileUri);
    if (download.status !== 200) return null;
    return fileUri;
  } catch {
    return null;
  }
}

function coverFileName(url: string): string {
  // 简单哈希，避免文件名含非法字符
  let hash = 0;
  for (let i = 0; i < url.length; i += 1) {
    hash = (hash * 31 + url.charCodeAt(i)) | 0;
  }
  return `cover_${Math.abs(hash)}.jpg`;
}
