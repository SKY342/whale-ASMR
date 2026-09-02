import { create } from 'zustand';

export type PlayMode = 'sequence' | 'loop-one';

export interface CurrentTrackInfo {
  id: string;
  type: 'video' | 'live';
  title: string;
  author: string;
  artwork: string;
  duration: number;
  quality?: string;
  format?: string;
  /** UP主 mid，用于播放器关注按钮。 */
  mid?: number;
}

interface PlayerState {
  current: CurrentTrackInfo | null;
  isPlaying: boolean;
  progressSeconds: number;
  durationSeconds: number;
  playMode: PlayMode;
  setCurrent: (track: CurrentTrackInfo | null) => void;
  setPlaying: (playing: boolean) => void;
  setProgress: (seconds: number) => void;
  setDuration: (seconds: number) => void;
  setPlayMode: (mode: PlayMode) => void;
  clear: () => void;
}

export const playerStore = create<PlayerState>((set) => ({
  current: null,
  isPlaying: false,
  progressSeconds: 0,
  durationSeconds: 0,
  playMode: 'sequence',
  setCurrent: (current) => set({ current, progressSeconds: 0 }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setProgress: (progressSeconds) => set({ progressSeconds }),
  setDuration: (durationSeconds) => set({ durationSeconds }),
  setPlayMode: (playMode) => set({ playMode }),
  clear: () =>
    set({
      current: null,
      isPlaying: false,
      progressSeconds: 0,
      durationSeconds: 0,
    }),
}));
