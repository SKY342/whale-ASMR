import TrackPlayer from 'react-native-track-player';

/**
 * 睡眠定时器。
 *
 * 注意：纯 JS 的 setTimeout 在 App 进入后台后可能被系统暂停。
 * 生产环境建议替换为原生后台计时方案（如 react-native-background-timer，
 * 或 iOS 的 AVAudioSession 定时策略）。第一期先保证 App 在前台/锁屏播放时
 * 定时关闭可用（后台播放由 TrackPlayer 的前台服务保证，计时器可能在
 * 长时间后台运行时延迟触发，这是已知限制）。
 */

let sleepTimerHandle: ReturnType<typeof setTimeout> | null = null;

export interface SleepTimerOptions {
  minutes: number;
  /** 时间到后是否先渐弱音量再停止，默认 true。 */
  fadeOut?: boolean;
  onFinish?: () => void;
}

export function startSleepTimer(options: SleepTimerOptions): void {
  cancelSleepTimer();
  const { minutes, fadeOut = true, onFinish } = options;

  sleepTimerHandle = setTimeout(async () => {
    try {
      if (fadeOut) {
        // 30 秒淡出
        const steps = 15;
        const stepMs = 2000;
        for (let i = steps; i >= 0; i -= 1) {
          await TrackPlayer.setVolume(i / steps);
          await delay(stepMs);
        }
      }
      await TrackPlayer.stop();
      await TrackPlayer.setVolume(1);
    } catch {
      // 停止失败也重置音量
      try {
        await TrackPlayer.setVolume(1);
      } catch {
        // ignore
      }
    } finally {
      sleepTimerHandle = null;
      onFinish?.();
    }
  }, minutes * 60 * 1000);
}

export function cancelSleepTimer(): void {
  if (sleepTimerHandle) {
    clearTimeout(sleepTimerHandle);
    sleepTimerHandle = null;
  }
}

export function isSleepTimerActive(): boolean {
  return sleepTimerHandle !== null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
