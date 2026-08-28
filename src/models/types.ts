/**
 * 统一数据结构类型定义。
 * 注意：现有 `src/services/sources/types.ts` 与 `src/db/schema.ts` 中的类型仍在逐步迁移，
 * 新功能优先使用本文件类型，旧代码保持兼容。
 */

export interface SearchResult {
  id: string; // 视频 bvid / 直播 roomid
  type: 'video' | 'live';
  title: string;
  author: string;
  coverUrl: string;
  duration?: number;
  playCount?: string;
  description?: string;
  tags?: string[];
}

export interface FollowItem {
  id: number;
  uid: string;
  name: string | null;
  avatarUrl: string | null;
  homeUrl: string | null;
  followedAt: string | number;
}

export interface HistoryItem extends SearchResult {
  viewedAt: number;
}

export interface BlockedKeyword {
  id: number;
  keyword: string;
  mode: 'blacklist' | 'whitelist';
  createdAt: string;
}

export interface SearchHistoryItem {
  id: number;
  keyword: string;
  searchedAt: number;
}
