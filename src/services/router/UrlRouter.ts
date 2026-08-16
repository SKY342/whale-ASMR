import axios from 'axios';

/**
 * URL 路由（核心设计 5.1）：
 * 所有 B站内容统一通过 URL 路由进入播放器。
 *
 *   bilibili.com/video/BVxxxxx  → 视频音频模式（有进度条）
 *   live.bilibili.com/xxxxx     → 直播音频模式（无进度条）
 *   b23.tv/xxxxx                → 短链，先解析再路由
 */

export interface RouteTarget {
  type: 'video' | 'live';
  id: string;
  originalUrl: string;
}

const VIDEO_PATTERN = /bilibili\.com\/video\/((?:BV|av)[0-9A-Za-z]+)/;
const LIVE_PATTERN = /live\.bilibili\.com\/(\d+)/;
const SHORT_LINK_PATTERN = /b23\.tv\/([0-9A-Za-z]+)/;

export function parseBilibiliUrl(input: string): RouteTarget | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const videoMatch = trimmed.match(VIDEO_PATTERN);
  if (videoMatch?.[1]) {
    return { type: 'video', id: videoMatch[1], originalUrl: trimmed };
  }

  const liveMatch = trimmed.match(LIVE_PATTERN);
  if (liveMatch?.[1]) {
    return { type: 'live', id: liveMatch[1], originalUrl: trimmed };
  }

  return null;
}

/**
 * 路由入口：直接 URL 或 b23.tv 短链均可。
 */
export async function routeBilibiliUrl(input: string): Promise<RouteTarget | null> {
  const direct = parseBilibiliUrl(input);
  if (direct) return direct;

  const trimmed = input.trim();
  if (SHORT_LINK_PATTERN.test(trimmed)) {
    const expanded = await resolveShortLink(trimmed);
    if (expanded) return parseBilibiliUrl(expanded);
  }

  return null;
}

async function resolveShortLink(shortUrl: string): Promise<string | null> {
  try {
    const res = await axios.get(shortUrl, {
      maxRedirects: 5,
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    // axios 跟随重定向后，request.responseURL 是最终地址
    const finalUrl: string | undefined = (res.request as any)?.responseURL;
    return finalUrl ?? null;
  } catch {
    return null;
  }
}
