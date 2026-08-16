import TrackPlayer, {
  Capability,
  Event,
  State,
  Track,
} from 'react-native-track-player';
import { playerStore } from '../../store/playerStore';
import type { AudioSourceInfo } from '../sources';

/**
 * 音频播放引擎封装。
 *
 * react-native-track-player 负责：
 * - 播放/暂停/seek/上下曲
 * - 系统级媒体会话（锁屏/通知栏控制）
 * - Android Foreground Service / iOS Background Audio
 */

export interface PlayableTrack {
  id: string;
  type: 'video' | 'live';
  title: string;
  author: string;
  artwork: string;
  url: string;
  duration?: number;
  quality?: string;
  format?: string;
}

export async function setupPlayer(): Promise<void> {
  try {
    await TrackPlayer.setupPlayer();
  } catch {
    // 已初始化时 setupPlayer 会抛错，忽略即可
  }

  await TrackPlayer.updateOptions({
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
  });
}

const PLAYER_HEADERS = {
  Referer: 'https://www.bilibili.com/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

export async function playTrack(info: PlayableTrack): Promise<void> {
  const track: Track = {
    id: info.id,
    url: info.url,
    title: info.title,
    artist: info.author,
    artwork: info.artwork || undefined,
    duration: info.type === 'video' ? info.duration ?? 0 : 0,
    isLiveStream: info.type === 'live',
    // B站音频CDN需要 Referer/UA，否则可能 403
    headers: PLAYER_HEADERS,
    userAgent: PLAYER_HEADERS['User-Agent'],
  };

  await TrackPlayer.reset();
  await TrackPlayer.add(track);
  await TrackPlayer.play();

  playerStore.getState().setCurrent({
    id: info.id,
    type: info.type,
    title: info.title,
    author: info.author,
    artwork: info.artwork,
    duration: info.type === 'video' ? info.duration ?? 0 : 0,
    quality: info.quality,
    format: info.format,
  });
  playerStore.getState().setPlaying(true);
}

export async function togglePlay(): Promise<void> {
  const { state } = await TrackPlayer.getPlaybackState();
  if (state === State.Playing || state === State.Buffering) {
    await TrackPlayer.pause();
    playerStore.getState().setPlaying(false);
  } else {
    await TrackPlayer.play();
    playerStore.getState().setPlaying(true);
  }
}

export async function seekTo(seconds: number): Promise<void> {
  await TrackPlayer.seekTo(seconds);
  playerStore.getState().setProgress(seconds);
}

export async function skipToNext(): Promise<void> {
  await TrackPlayer.skipToNext();
}

export async function skipToPrevious(): Promise<void> {
  await TrackPlayer.skipToPrevious();
}

export async function stopPlayback(): Promise<void> {
  await TrackPlayer.stop();
  playerStore.getState().setPlaying(false);
}

export async function setVolume(volume: number): Promise<void> {
  await TrackPlayer.setVolume(volume);
}

export async function setRate(rate: number): Promise<void> {
  await TrackPlayer.setRate(rate);
}

export async function getProgress(): Promise<number> {
  const progress = await TrackPlayer.getProgress();
  return progress.position;
}

export async function getDuration(): Promise<number> {
  return TrackPlayer.getDuration();
}

/** 注册播放事件监听（进度/状态变化同步到 UI store）。 */
export function attachPlayerListeners(): void {
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async () => {
    try {
      const progress = await TrackPlayer.getProgress();
      playerStore.getState().setProgress(progress.position);
    } catch {
      // ignore
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackState, (data) => {
    const playing = data.state === State.Playing || data.state === State.Buffering;
    playerStore.getState().setPlaying(playing);
  });
}

export function toPlayableTrack(
  id: string,
  type: 'video' | 'live',
  audio: AudioSourceInfo,
  fallback: { title?: string; author?: string; artwork?: string },
): PlayableTrack {
  return {
    id,
    type,
    url: audio.url,
    title: audio.title ?? fallback.title ?? (type === 'live' ? '直播' : 'B站音频'),
    author: audio.artist ?? fallback.author ?? 'B站',
    artwork: audio.artwork ?? fallback.artwork ?? '',
    duration: audio.duration,
    quality: audio.quality,
    format: audio.format,
  };
}
