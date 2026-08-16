import { create } from 'zustand';
import type { KeywordMode } from '../db/schema';
import type { BlockedKeyword } from '../db/schema';

interface SettingsState {
  blockedKeywords: BlockedKeyword[];
  /** 搜索/推荐过滤模式：黑名单 or 白名单。 */
  filterMode: KeywordMode;
  /** 默认音质 qn 值：64=标准, 32=高清, 16=无损(若提供)。 */
  qualityQn: number;
  /** 睡眠定时分钟数，0 表示关闭。 */
  sleepMinutes: number;
  setBlockedKeywords: (keywords: BlockedKeyword[]) => void;
  setFilterMode: (mode: KeywordMode) => void;
  setQualityQn: (qn: number) => void;
  setSleepMinutes: (minutes: number) => void;
}

export const settingsStore = create<SettingsState>((set) => ({
  blockedKeywords: [],
  filterMode: 'blacklist',
  qualityQn: 64,
  sleepMinutes: 0,
  setBlockedKeywords: (blockedKeywords) => set({ blockedKeywords }),
  setFilterMode: (filterMode) => set({ filterMode }),
  setQualityQn: (qualityQn) => set({ qualityQn }),
  setSleepMinutes: (sleepMinutes) => set({ sleepMinutes }),
}));
