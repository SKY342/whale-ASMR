import TrackPlayer from 'react-native-track-player';
import { getSource } from '../sources';
import { playTrack, setEndedHandler, toPlayableTrack } from './TrackPlayerService';
import { playerQueueStore } from '../../store/playerQueueStore';
import type { QueueItem } from '../../store/playerQueueStore';
import { playerStore } from '../../store/playerStore';
import { getLiveRoomUpInfo, getVideoInfo } from '../../utils/bilibili-api';
import { addHistory } from '../historyService';

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

  // 播放成功后异步写入历史（失败静默）
  void addHistory({
    id: item.id,
    type: item.type,
    title: item.title,
    author: item.author,
    coverUrl: item.artwork,
    duration: item.duration,
  }).catch(() => {});

  // 播放后异步补齐 UP主 mid，供播放器关注按钮使用
  void enrichCurrentUpInfo(item);
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

/** 播放结束处理：单曲循环 seek0 重播；顺序模式切到队列下一个（末尾循环）。 */
export async function handlePlaybackEnded(): Promise<void> {
  const mode = playerStore.getState().playMode;
  if (mode === 'loop-one') {
    try {
      await TrackPlayer.seekTo(0);
      await TrackPlayer.play();
    } catch {
      // ignore
    }
    return;
  }

  const { items, index, source } = playerQueueStore.getState();
  if (items.length === 0) return;
  const nextIndex = (index + 1) % items.length;
  playerQueueStore.getState().setQueue(items, nextIndex, source);
  await playQueueItem(items[nextIndex]);
}

/** 注册“播放结束 → 自动连播”回调（由 App 在播放器初始化后调用）。 */
export function registerEndedHandler(): void {
  setEndedHandler(() => {
    void handlePlaybackEnded();
  });
}

/** 拉取当前播放条目的 UP主信息并写入 playerStore。 */
export async function enrichCurrentUpInfo(item: QueueItem): Promise<void> {
  try {
    let mid: number | undefined;
    let name = item.author;
    let face = item.artwork;
    if (item.type === 'video') {
      const info = await getVideoInfo(item.id);
      mid = info.mid;
      name = info.author;
      face = info.coverUrl;
    } else {
      const up = await getLiveRoomUpInfo(item.id);
      mid = up.mid;
      name = up.name;
      face = up.face;
    }
    const current = playerStore.getState().current;
    if (current && current.id === item.id) {
      playerStore.getState().setCurrent({
        ...current,
        mid,
        author: name,
        artwork: face || current.artwork,
      });
    }
  } catch {
    // 拿不到UP主信息时保持现状
  }
}
