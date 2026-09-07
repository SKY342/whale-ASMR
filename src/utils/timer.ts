import TrackPlayer from 'react-native-track-player';

/**
 * 睡眠定时器（状态机版）。
 *
 * 状态：idle | scheduled | fading
 * 每次 start/cancel 都会递增 generation，旧回调在关键步骤前检查 generation，
 * 避免“旧定时器淡出”突然停止新播放器/新定时器。
 *
 * 到点后直接 pause()：
 * - 音频立刻停止，不会触发 PlaybackQueueEnded，因此天然不会自动连播。
 * - 保留当前队列，用户之后可手动恢复播放，符合“定时关闭与自动连播是两件事”。
 */

type TimerState = 'idle' | 'scheduled' | 'fading';

let timerState: TimerState = 'idle';
let timerHandle: ReturnType<typeof setTimeout> | null = null;
let sleepEndAt: number | null = null;
let generation = 0;

export interface SleepTimerOptions {
  minutes: number;
  fadeOut?: boolean;
  onFinish?: () => void;
}

export function startSleepTimer(options: SleepTimerOptions): void {
  cancelSleepTimer();

  const { minutes, fadeOut = false, onFinish } = options;
  const myGeneration = ++generation;

  sleepEndAt = Date.now() + minutes * 60 * 1000;
  timerState = 'scheduled';

  timerHandle = setTimeout(async () => {
    // 到点时检查是否仍是当前 session
    if (myGeneration !== generation || timerState !== 'scheduled') return;

    timerState = 'fading';

    try {
      if (fadeOut) {
        const steps = 15;
        const stepMs = 2000;
        for (let i = steps; i >= 0; i -= 1) {
          if (myGeneration !== generation) return;
          await TrackPlayer.setVolume(i / steps);
          await delay(stepMs);
        }
      }

      if (myGeneration !== generation) return;

      // 到点暂停播放：不需要 stop()，不会触发 PlaybackQueueEnded 自动连播。
      await TrackPlayer.pause();
      await TrackPlayer.setVolume(1);
    } catch {
      try {
        await TrackPlayer.setVolume(1);
      } catch {
        // ignore
      }
    } finally {
      if (myGeneration === generation) {
        timerState = 'idle';
        timerHandle = null;
        sleepEndAt = null;
        onFinish?.();
      }
    }
  }, minutes * 60 * 1000);
}

export function cancelSleepTimer(): void {
  generation += 1;
  timerState = 'idle';
  if (timerHandle) {
    clearTimeout(timerHandle);
    timerHandle = null;
  }
  sleepEndAt = null;
}

export function isSleepTimerActive(): boolean {
  return timerState === 'scheduled' || timerState === 'fading';
}

export function getSleepTimerRemainingSeconds(): number {
  if (!sleepEndAt) return 0;
  return Math.max(0, Math.round((sleepEndAt - Date.now()) / 1000));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
