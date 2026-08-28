import { Linking } from 'react-native';

/**
 * 统一 B站 URL 构造与跳转工具（BiliRouter）。
 * 集中管理 UP主主页、视频页、直播间等 URL，避免各处拼接错误。
 */

export function buildUpHomeUrl(mid: number | string): string {
  // 统一指向UP主投稿列表页
  return `https://space.bilibili.com/${mid}/upload/video`;
}

const SPACE_UPLOAD_RE = /^https:\/\/space\.bilibili\.com\/\d+\/upload\/video\/?$/;

export function isValidUpHomeUrl(url: string | null): boolean {
  return !!url && SPACE_UPLOAD_RE.test(url);
}

export function buildVideoUrl(bvid: string): string {
  return `https://www.bilibili.com/video/${bvid}`;
}

export function buildLiveUrl(roomId: number | string): string {
  return `https://live.bilibili.com/${roomId}`;
}

export function parseUpMid(input: string): string | null {
  const match = input.trim().match(/space\.bilibili\.com\/(\d+)/);
  return match?.[1] ?? null;
}

export async function openExternal(url: string): Promise<void> {
  const target = url.startsWith('http') ? url : `https://${url}`;
  await Linking.openURL(target).catch(() => {});
}
