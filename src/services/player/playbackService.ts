import TrackPlayer, { Event } from 'react-native-track-player';
import {
  playNextInQueue,
  playPreviousInQueue,
} from './PlayerQueueService';

/**
 * 后台播放服务：处理锁屏/通知栏的远程控制事件。
 * 在 index.ts 中通过 TrackPlayer.registerPlaybackService 注册。
 * 上一首/下一首走播放队列，保证与 App 内按钮行为一致。
 */
export async function playbackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) =>
    TrackPlayer.seekTo(event.position),
  );
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    void playNextInQueue().catch(() => TrackPlayer.skipToNext());
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    void playPreviousInQueue().catch(() => TrackPlayer.skipToPrevious());
  });
}
