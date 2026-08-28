import { db } from '../db/schema';
import type { SearchHistoryItem } from '../models/types';

const MAX_SEARCH_HISTORY = 40;

export async function addSearchHistory(keyword: string): Promise<void> {
  const kw = keyword?.trim();
  if (!kw) return;
  await db.runAsync(
    'INSERT INTO search_history (keyword, searched_at) VALUES (?, ?)',
    [kw, Date.now()],
  );
  await db.runAsync(
    `DELETE FROM search_history WHERE id NOT IN (
       SELECT id FROM search_history ORDER BY searched_at DESC LIMIT ?)`,
    [MAX_SEARCH_HISTORY],
  );
}

export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  const rows = await db.getAllAsync<any>(
    'SELECT id, keyword, searched_at FROM search_history ORDER BY searched_at DESC LIMIT ?',
    [MAX_SEARCH_HISTORY],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    keyword: String(row.keyword),
    searchedAt: Number(row.searched_at),
  }));
}

export async function clearSearchHistory(): Promise<void> {
  await db.runAsync('DELETE FROM search_history');
}
