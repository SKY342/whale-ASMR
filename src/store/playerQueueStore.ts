import { create } from 'zustand';

/**
 * 播放队列 store（PlayerQueueManager 的存储层）。
 * 按来源上下文维护队列与当前索引，页面切换不丢失。
 */

export interface QueueItem {
  id: string;
  type: 'video' | 'live';
  title: string;
  author: string;
  artwork: string;
  duration?: number;
}

interface PlayerQueueState {
  items: QueueItem[];
  index: number;
  source: string;
  setQueue: (items: QueueItem[], index: number, source: string) => void;
  next: () => QueueItem | null;
  prev: () => QueueItem | null;
  current: () => QueueItem | null;
  clear: () => void;
}

export const playerQueueStore = create<PlayerQueueState>((set, get) => ({
  items: [],
  index: -1,
  source: '',
  setQueue: (items, index, source) => set({ items, index, source }),
  next: () => {
    const { items, index } = get();
    if (items.length === 0) return null;
    const nextIndex = (index + 1) % items.length;
    set({ index: nextIndex });
    return items[nextIndex];
  },
  prev: () => {
    const { items, index } = get();
    if (items.length === 0) return null;
    const prevIndex = (index - 1 + items.length) % items.length;
    set({ index: prevIndex });
    return items[prevIndex];
  },
  current: () => {
    const { items, index } = get();
    return items[index] ?? null;
  },
  clear: () => set({ items: [], index: -1, source: '' }),
}));

export function toQueueItem(item: {
  id: string;
  type: 'video' | 'live';
  title?: string;
  author?: string;
  artwork?: string;
  duration?: number;
}): QueueItem {
  return {
    id: item.id,
    type: item.type,
    title: item.title ?? (item.type === 'live' ? '直播' : 'B站音频'),
    author: item.author ?? 'B站',
    artwork: item.artwork ?? '',
    duration: item.duration,
  };
}
