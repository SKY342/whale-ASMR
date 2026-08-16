import { create } from 'zustand';

export interface CurrentTrackInfo {
  id: string;
  type: 'video' | 'live';
  title: string;
  author: string;
  artwork: string;
  duration: number;
  quality?: string;
  format?: string;
}

interface PlayerState {
  current: CurrentTrackInfo | null;
  isPlaying: boolean;
  progressSeconds: number;
  durationSeconds: number;
  setCurrent: (track: CurrentTrackInfo | null) => void;
  setPlaying: (playing: boolean) => void;
  setProgress: (seconds: number) => void;
  setDuration: (seconds: number) => void;
  clear: () => void;
}

export const playerStore = create<PlayerState>((set) => ({
  current: null,
  isPlaying: false,
  progressSeconds: 0,
  durationSeconds: 0,
  setCurrent: (current) => set({ current, progressSeconds: 0 }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setProgress: (progressSeconds) => set({ progressSeconds }),
  setDuration: (durationSeconds) => set({ durationSeconds }),
  clear: () =>
    set({
      current: null,
      isPlaying: false,
      progressSeconds: 0,
      durationSeconds: 0,
    }),
}));
