import { getSource } from '../sources';
import { playTrack, toPlayableTrack } from './TrackPlayerService';
import { playerQueueStore } from '../../store/playerQueueStore';
import type { QueueItem } from '../../store/playerQueueStore';

/**
 * 播放队列服务：负责按队列上下文解析音频并播放。
 */
export async function playQueueItem(item: QueueItem): Promise<void> {
  const source = getSource('bilibili');
  if (!source) throw new Error('B站音源未注册');

  const audio = await source.getAudioUrl(item.id, item.type);
  const playable = toPlayableTrack(item.id, item.type, audio, {
    title: item.title,
    author: item.author,
    artwork: item.artwork,
  });
  await playTrack(playable);
}

export async function playNextInQueue(): Promise<boolean> {
  const item = playerQueueStore.getState().next();
  if (!item) return false;
  await playQueueItem(item);
  return true;
}

export async function playPreviousInQueue(): Promise<boolean> {
  const item = playerQueueStore.getState().prev();
  if (!item) return false;
  await playQueueItem(item);
  return true;
}
