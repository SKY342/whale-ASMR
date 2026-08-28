import { db } from '../db/schema';
import type { HistoryItem, SearchResult } from '../models/types';

const MAX_HISTORY = 40;

export async function addHistory(item: SearchResult): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO history (item_id, item_type, title, author, cover_url, duration, play_count, viewed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(item_id, item_type) DO UPDATE SET
       title = excluded.title, author = excluded.author,
       cover_url = excluded.cover_url, duration = excluded.duration,
       play_count = excluded.play_count, viewed_at = excluded.viewed_at`,
    [
      item.id,
      item.type,
      item.title,
      item.author,
      item.coverUrl,
      item.duration ?? null,
      item.playCount ?? null,
      now,
    ],
  );
  await db.runAsync(
    `DELETE FROM history WHERE id NOT IN (
       SELECT id FROM history ORDER BY viewed_at DESC LIMIT ?)`,
    [MAX_HISTORY],
  );
}

export async function getHistory(): Promise<HistoryItem[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM history ORDER BY viewed_at DESC LIMIT ?',
    [MAX_HISTORY],
  );
  return rows.map(mapRow);
}

export async function getHistoryByType(
  type: 'video' | 'live',
): Promise<HistoryItem[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM history WHERE item_type = ? ORDER BY viewed_at DESC LIMIT ?',
    [type, MAX_HISTORY],
  );
  return rows.map(mapRow);
}

export async function clearHistory(type?: 'video' | 'live'): Promise<void> {
  if (type) {
    await db.runAsync('DELETE FROM history WHERE item_type = ?', [type]);
  } else {
    await db.runAsync('DELETE FROM history');
  }
}

function mapRow(row: any): HistoryItem {
  return {
    id: String(row.item_id),
    type: row.item_type as 'video' | 'live',
    title: String(row.title ?? ''),
    author: String(row.author ?? ''),
    coverUrl: String(row.cover_url ?? ''),
    duration: row.duration != null ? Number(row.duration) : undefined,
    playCount: row.play_count != null ? String(row.play_count) : undefined,
    viewedAt: Number(row.viewed_at),
  };
}
