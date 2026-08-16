import * as FileSystem from 'expo-file-system';
import { db } from '../../db/schema';
import { getSource } from '../sources';

/**
 * 音频下载管理（仅音频，不含视频）。
 * 流程：获取音频流地址 → expo-file-system 下载 → 写入 downloads 表。
 */

export interface DownloadItem {
  id: number;
  bvid: string;
  title: string;
  filePath: string;
  fileSize: number | null;
  status: 'completed' | 'downloading' | 'failed';
  downloadedAt: string;
}

export async function getDownloadList(): Promise<DownloadItem[]> {
  const rows = await db.getAllAsync<any>(
    `SELECT id, bvid, title, file_path, file_size, status, downloaded_at
     FROM downloads ORDER BY downloaded_at DESC`,
  );
  return rows.map((row) => ({
    id: Number(row.id),
    bvid: String(row.bvid),
    title: String(row.title ?? ''),
    filePath: String(row.file_path),
    fileSize: row.file_size != null ? Number(row.file_size) : null,
    status: row.status as DownloadItem['status'],
    downloadedAt: String(row.downloaded_at),
  }));
}

export async function downloadAudio(
  id: string,
  type: 'video' | 'live',
  title: string,
): Promise<DownloadItem> {
  const source = getSource('bilibili');
  if (!source) throw new Error('音源未注册');

  const audio = await source.getAudioUrl(id, type);
  if (!audio.url) throw new Error('获取音频地址失败');

  const dir = `${FileSystem.documentDirectory ?? ''}downloads`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const ext = audio.format === 'm4a' ? 'm4a' : 'mp3';
  const fileName = `${type}_${id.replace(/[^\w-]/g, '_')}_${Date.now()}.${ext}`;
  const fileUri = `${dir}/${fileName}`;

  // 状态置为 downloading
  await db.runAsync(
    `INSERT INTO downloads (bvid, title, file_path, file_size, status)
     VALUES (?, ?, ?, 0, 'downloading')`,
    [id, title, fileUri],
  );

  try {
    const result = await FileSystem.downloadAsync(audio.url, fileUri);
    if (result.status !== 200) {
      throw new Error(`下载失败 HTTP ${result.status}`);
    }

    const info = await FileSystem.getInfoAsync(fileUri);
    const size = info.exists ? (info as { size?: number }).size ?? 0 : 0;

    await db.runAsync(
      `UPDATE downloads SET status = 'completed', file_size = ? WHERE bvid = ? AND file_path = ?`,
      [size, id, fileUri],
    );

    return (await getDownloadList()).find((item) => item.filePath === fileUri)!;
  } catch (error) {
    await db.runAsync(
      `UPDATE downloads SET status = 'failed' WHERE bvid = ? AND file_path = ?`,
      [id, fileUri],
    );
    throw error;
  }
}

export async function deleteDownload(filePath: string): Promise<void> {
  await FileSystem.deleteAsync(filePath, { idempotent: true }).catch(() => {});
  await db.runAsync('DELETE FROM downloads WHERE file_path = ?', [filePath]);
}

export async function getStorageUsage(): Promise<{ usedBytes: number }> {
  const rows = await db.getAllAsync<{ total: number }>(
    'SELECT COALESCE(SUM(file_size), 0) AS total FROM downloads WHERE status = ?',
    ['completed'],
  );
  return { usedBytes: Number(rows[0]?.total ?? 0) };
}
