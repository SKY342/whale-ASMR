import { create } from 'zustand';
import type { DownloadItem } from '../services/download/DownloadManager';

interface DownloadState {
  items: DownloadItem[];
  usedBytes: number;
  setItems: (items: DownloadItem[]) => void;
  setUsedBytes: (bytes: number) => void;
}

export const downloadStore = create<DownloadState>((set) => ({
  items: [],
  usedBytes: 0,
  setItems: (items) => set({ items }),
  setUsedBytes: (usedBytes) => set({ usedBytes }),
}));
