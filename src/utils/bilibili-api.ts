import axios from 'axios';
import { signWbiParams } from './wbi-sign';
import { db } from '../db/schema';
import { shuffleArray } from './array-utils';

/**
 * B站公开接口封装。
 * 已验证的关键点（见 scripts/verify-bili-api.mjs）：
 * - 搜索接口需要 Referer 为 search.bilibili.com + 真实 buvid3，否则会命中风控返回 HTML
 * - 视频信息/热门接口用 www.bilibili.com Referer 即可
 * - 音频流取流接口用 /x/player/playurl（带 WBI 签名参数），
 *   /x/player/wbi/playurl 在本机网络下会命中 412 风控
 * - space 投稿接口易触发风控，失败时用"搜索 + 作者名过滤"兜底
 */

const COMMON_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

/** 预留：用户登录后注入的 Cookie（优先级2）。 */
let authCookie = '';
let buvid3Cookie = '';
let buvid4Cookie = '';

export function setBilibiliCookie(cookie: string): void {
  authCookie = cookie;
}

function headers(referer: string): Record<string, string> {
  const cookie = [buvid3Cookie, buvid4Cookie, authCookie].filter(Boolean).join('; ');
  return {
    ...COMMON_HEADERS,
    Referer: referer,
    Origin: 'https://www.bilibili.com',
    Accept: 'application/json, text/plain, */*',
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

/**
 * 获取真实 buvid3（B站风控需要）。
 * 优先内存 → SQLite cache → 请求 www.bilibili.com 首页 Set-Cookie。
 */
export async function ensureBuvid3(): Promise<void> {
  if (buvid3Cookie) return;

  try {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM cache WHERE key = ?',
      ['buvid3_cookie'],
    );
    if (row?.value) {
      buvid3Cookie = row.value;
      return;
    }
  } catch {
    // 数据库未初始化时忽略，直接走网络获取
  }

  try {
    const res = await fetch('https://www.bilibili.com/', {
      headers: COMMON_HEADERS,
    });
    const setCookie = String(res.headers.get('set-cookie') ?? '');
    const buvid3 = setCookie
      .split(',')
      .map((s) => s.trim())
      .find((s) => s.startsWith('buvid3='))
      ?.split(';')[0]
      ?.slice('buvid3='.length);
    if (buvid3) {
      buvid3Cookie = `buvid3=${buvid3}`;
      try {
        await db.runAsync(
          'INSERT OR REPLACE INTO cache (key, value, ttl_ms, updated_at) VALUES (?, ?, ?, ?)',
          ['buvid3_cookie', buvid3Cookie, 365 * 24 * 3600 * 1000, Date.now()],
        );
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore：拿不到 buvid3 时仍尝试请求，部分接口可能可用
  }
}

/** 获取真实 buvid4（B站风控指纹）。优先内存 → SQLite cache → SPI 接口。 */
export async function ensureBuvid4(): Promise<void> {
  if (buvid4Cookie) return;

  try {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM cache WHERE key = ?',
      ['buvid4_cookie'],
    );
    if (row?.value) {
      buvid4Cookie = row.value;
      return;
    }
  } catch {
    // ignore
  }

  try {
    const res = await fetch('https://api.bilibili.com/x/frontend/finger/spi', {
      headers: COMMON_HEADERS,
    });
    const j = await res.json();
    const b3: string | undefined = j?.data?.b_3;
    const b4: string | undefined = j?.data?.b_4;
    if (b3) buvid3Cookie = `buvid3=${b3}`;
    if (b4) buvid4Cookie = `buvid4=${b4}`;
    try {
      if (b3) {
        await db.runAsync(
          'INSERT OR REPLACE INTO cache (key, value, ttl_ms, updated_at) VALUES (?, ?, ?, ?)',
          ['buvid3_cookie', `buvid3=${b3}`, 365 * 24 * 3600 * 1000, Date.now()],
        );
      }
      if (b4) {
        await db.runAsync(
          'INSERT OR REPLACE INTO cache (key, value, ttl_ms, updated_at) VALUES (?, ?, ?, ?)',
          ['buvid4_cookie', `buvid4=${b4}`, 365 * 24 * 3600 * 1000, Date.now()],
        );
      }
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

// ---------- 通用类型 ----------

export interface BiliSearchResult {
  id: string;
  type: 'video' | 'live';
  title: string;
  author: string;
  coverUrl: string;
  duration?: number;
  playCount?: string;
  description?: string;
}

export interface VideoInfo {
  bvid: string;
  cid: number;
  mid: number;
  title: string;
  author: string;
  coverUrl: string;
  duration: number;
  description: string;
}

export interface AudioStreamInfo {
  url: string;
  quality?: string;
  format?: string;
}

// ---------- 搜索 ----------

export async function searchVideos(
  keyword: string,
  page = 1,
): Promise<BiliSearchResult[]> {
  await ensureBuvid4();
  const referer = `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`;
  const res = await axios.get(
    'https://api.bilibili.com/x/web-interface/search/type',
    {
      params: { search_type: 'video', keyword, page, page_size: 20, order: 'totalrank' },
      headers: headers(referer),
      timeout: 15000,
    },
  );

  const list: any[] = res.data?.data?.result ?? [];
  return list
    .filter((item) => item?.bvid)
    .map((item) => ({
      id: String(item.bvid),
      type: 'video' as const,
      title: String(item.title ?? '').replace(/<[^>]+>/g, ''),
      author: String(item.author ?? ''),
      coverUrl: normalizeUrl(item.pic ?? ''),
      duration: parseDuration(item.duration),
      playCount: String(item.play ?? ''),
      description: String(item.description ?? '').replace(/<[^>]+>/g, ''),
      tags: parseTags(item.tag),
    }));
}

// ---------- 直播搜索 ----------

export async function searchLiveRooms(
  keyword: string,
  page = 1,
): Promise<BiliSearchResult[]> {
  await ensureBuvid4();
  const referer = `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`;
  const res = await axios.get(
    'https://api.bilibili.com/x/web-interface/search/type',
    {
      params: { search_type: 'live_room', keyword, page, page_size: 20, order: 'online' },
      headers: headers(referer),
      timeout: 15000,
    },
  );

  const list: any[] = res.data?.data?.result ?? [];
  return list
    .filter((item) => item?.roomid != null)
    .map((item) => ({
      id: String(item.roomid),
      type: 'live' as const,
      title: String(item.title ?? '').replace(/<[^>]+>/g, ''),
      author: String(item.uname ?? ''),
      coverUrl: normalizeUrl(item.cover ?? item.user_cover ?? ''),
      playCount: item.online != null ? `${item.online}人在线` : undefined,
      description: String(item.area_name ?? ''),
      tags: parseTags(item.tag),
    }));
}

// ---------- UP主信息 ----------

export interface UpInfo {
  mid: number;
  name: string;
  face: string;
}

export async function getUpInfo(mid: number | string): Promise<UpInfo> {
  await ensureBuvid3();
  const res = await axios.get('https://api.bilibili.com/x/web-interface/card', {
    params: { mid },
    headers: headers(`https://space.bilibili.com/${mid}`),
    timeout: 10000,
  });

  const card = res.data?.data?.card;
  if (res.data?.code !== 0 || !card) {
    throw new Error(`获取UP主信息失败: ${res.data?.message ?? mid}`);
  }
  return {
    mid: Number(card.mid ?? mid),
    name: String(card.name ?? ''),
    face: normalizeUrl(String(card.face ?? '')),
  };
}

/** 通过直播间获取UP主信息（直播场景的关注按钮需要）。 */
export async function getLiveRoomUpInfo(roomId: number | string): Promise<UpInfo> {
  await ensureBuvid3();
  const roomRes = await axios.get(
    'https://api.live.bilibili.com/room/v1/Room/get_info',
    {
      params: { room_id: roomId },
      headers: headers(`https://live.bilibili.com/${roomId}`),
      timeout: 10000,
    },
  );
  const uid = Number(roomRes.data?.data?.uid);
  if (!uid) {
    throw new Error(`获取直播间UP主失败: ${roomRes.data?.message ?? roomId}`);
  }
  return getUpInfo(uid);
}

// ---------- 视频信息 ----------

export async function getVideoInfo(bvid: string): Promise<VideoInfo> {
  await ensureBuvid3();
  const res = await axios.get('https://api.bilibili.com/x/web-interface/view', {
    params: { bvid },
    headers: headers(`https://www.bilibili.com/video/${bvid}`),
    timeout: 10000,
  });

  const data = res.data?.data;
  if (res.data?.code !== 0 || !data) {
    throw new Error(`获取视频信息失败: ${res.data?.message ?? bvid}`);
  }

  return {
    bvid: String(data.bvid),
    cid: Number(data.cid),
    mid: Number(data.owner?.mid ?? 0),
    title: String(data.title ?? ''),
    author: String(data.owner?.name ?? ''),
    coverUrl: normalizeUrl(data.pic ?? ''),
    duration: Number(data.duration ?? 0),
    description: String(data.desc ?? ''),
  };
}

// ---------- 视频音频流 ----------

export async function getVideoAudioStream(
  bvid: string,
  cid: number,
  quality = 64,
): Promise<AudioStreamInfo> {
  await ensureBuvid3();
  const signed = await signWbiParams({
    bvid,
    cid,
    fnval: 16, // DASH 格式
    fnver: 0,
    fourk: 1,
    qn: quality,
  });

  // 注意：实测 /x/player/wbi/playurl 在本机网络下会 412，
  // 使用 /x/player/playurl + WBI 签名参数可以正常返回 DASH 音频流。
  const res = await axios.get('https://api.bilibili.com/x/player/playurl', {
    params: signed,
    headers: headers(`https://www.bilibili.com/video/${bvid}`),
    timeout: 12000,
  });

  const data = res.data?.data;
  if (res.data?.code !== 0 || !data) {
    throw new Error(`获取音频流失败: ${res.data?.message ?? bvid}`);
  }

  // 优先 DASH 音频流（仅音频，不取视频流）
  const dashAudio = data.dash?.audio;
  if (Array.isArray(dashAudio) && dashAudio.length > 0) {
    const first = dashAudio[0];
    return {
      url: String(first.baseUrl ?? first.base_url ?? ''),
      quality: first.id != null ? String(first.id) : undefined,
      format: first.codecs ? String(first.codecs) : undefined,
    };
  }

  // 回退：durl 完整流（含视频，作为兜底）
  const durl = data.durl;
  if (Array.isArray(durl) && durl.length > 0) {
    return { url: String(durl[0].url ?? '') };
  }

  throw new Error('获取音频流失败：接口未返回可用流地址');
}

// ---------- UP主投稿 ----------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function trySpaceVideos(
  mid: number,
  upName: string,
  page: number,
  pageSize: number,
): Promise<BiliSearchResult[]> {
  await ensureBuvid4();
  const signed = await signWbiParams({ mid, ps: pageSize, pn: page });
  const res = await axios.get(
    'https://api.bilibili.com/x/space/wbi/arc/search',
    {
      params: signed,
      headers: headers(`https://space.bilibili.com/${mid}/video`),
      timeout: 10000,
    },
  );
  const vlist: any[] = res.data?.data?.list?.vlist ?? [];
  if (res.data?.code === 0 && vlist.length > 0) {
    return vlist
      .filter((item) => item?.bvid)
      .map((item) => ({
        id: String(item.bvid),
        type: 'video' as const,
        title: String(item.title ?? ''),
        author: String(item.author ?? upName),
        coverUrl: normalizeUrl(item.pic ?? ''),
        duration: Number(item.length ?? 0),
        playCount: String(item.play ?? ''),
        description: String(item.description ?? ''),
      }));
  }
  return [];
}

export async function getUserVideos(
  mid: number,
  upName: string,
  page = 1,
  pageSize = 30,
): Promise<BiliSearchResult[]> {
  // 主接口：space 投稿，失败后重试 2 次，取结果最多的一次
  let best: BiliSearchResult[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const list = await trySpaceVideos(mid, upName, page, pageSize);
      if (list.length > best.length) best = list;
    } catch {
      // 单次失败不影响重试
    }
    if (best.length > 0 && attempt < 2) break;
    if (attempt < 2) await delay(1000 * (attempt + 1));
  }
  if (best.length > 0) return best;

  // 兜底：用 UP主昵称搜索 1~3 页，作者精确匹配；取匹配最多的一次
  let exactBest: BiliSearchResult[] = [];
  for (let p = 1; p <= 3; p += 1) {
    try {
      const results = await searchVideos(upName, p);
      const exact = results.filter((r) => r.author === upName);
      if (exact.length > exactBest.length) exactBest = exact;
    } catch {
      // ignore
    }
  }
  return exactBest;
}

// ---------- 直播 ----------

async function getRealRoomId(roomId: string | number): Promise<number> {
  await ensureBuvid3();
  const res = await axios.get(
    'https://api.live.bilibili.com/room/v1/Room/room_init',
    {
      params: { id: roomId },
      headers: headers(`https://live.bilibili.com/${roomId}`),
      timeout: 8000,
    },
  );
  const roomIdFromApi = Number(res.data?.data?.room_id);
  if (!roomIdFromApi) {
    throw new Error(`直播房间不存在或未开播: ${roomId}`);
  }
  return roomIdFromApi;
}

/**
 * 获取直播流地址。
 * 注意：B站直播接口不提供"纯音频"流，返回的是 FLV/HLS 完整流。
 * 播放器会将其交给 react-native-track-player 处理；若 FLV 不可直接播放，
 * 需在后续版本接入 ffmpeg 转码或改用 HLS 源。
 */
export async function getLiveStreamUrl(
  roomId: string | number,
): Promise<AudioStreamInfo> {
  await ensureBuvid3();
  const realRoomId = await getRealRoomId(roomId);

  const res = await axios.get(
    'https://api.live.bilibili.com/room/v1/Room/playUrl',
    {
      params: {
        cid: realRoomId,
        platform: 'web',
        qn: 10000,
        https_url_req: 1,
      },
      headers: headers(`https://live.bilibili.com/${roomId}`),
      timeout: 10000,
    },
  );

  const data = res.data?.data;
  if (res.data?.code !== 0 || !data) {
    throw new Error(`获取直播流失败: ${res.data?.message ?? roomId}`);
  }

  const durl = data.durl;
  if (Array.isArray(durl) && durl.length > 0) {
    return {
      url: String(durl[0].url ?? ''),
      quality: durl[0].qn != null ? String(durl[0].qn) : undefined,
      format: durl[0].format ?? 'flv',
    };
  }

  throw new Error('获取直播流失败：接口未返回可用流地址');
}

// ---------- 字幕 ----------

export interface SubtitleLine {
  start: number;
  end: number;
  text: string;
}

export async function getVideoSubtitles(
  bvid: string,
  cid: number,
): Promise<SubtitleLine[]> {
  try {
    await ensureBuvid3();
    const res = await axios.get('https://api.bilibili.com/x/player/v2', {
      params: { bvid, cid },
      headers: headers(`https://www.bilibili.com/video/${bvid}`),
      timeout: 8000,
    });

    const subtitles: any[] = res.data?.data?.subtitle?.subtitles ?? [];
    const first = subtitles[0];
    if (!first?.subtitle_url) return [];

    const url = normalizeUrl(String(first.subtitle_url));
    const subRes = await axios.get(url, {
      headers: headers(`https://www.bilibili.com/video/${bvid}`),
      timeout: 8000,
      responseType: 'json',
    });

    const body: any[] = subRes.data?.body ?? [];
    return body
      .filter((line) => line?.from != null && line?.to != null && line?.content)
      .map((line) => ({
        start: Number(line.from),
        end: Number(line.to),
        text: String(line.content),
      }));
  } catch {
    // 尽力而为：字幕获取失败不影响播放
    return [];
  }
}

// ---------- 首页推荐 ----------

const HOME_PRESET_KEYWORDS = ['助眠', '白噪声', 'ASMR', '自然音', '雨声'];

export async function getHomeRecommendations(): Promise<BiliSearchResult[]> {
  await ensureBuvid3();
  const merged = new Map<string, BiliSearchResult>();

  // 用预设关键词搜索后聚合去重，保证首页内容与"助眠/白噪声"定位一致。
  // 热门接口（popular）返回的内容与助眠无关，前端硬过滤后经常为空，不再使用。
  for (const keyword of HOME_PRESET_KEYWORDS) {
    try {
      const items = await searchVideos(keyword, 1);
      for (const item of items) {
        if (!merged.has(item.id)) merged.set(item.id, item);
      }
    } catch {
      // 单个关键词失败不影响整体
    }
    if (merged.size >= 20) break;
  }

  return shuffleArray(Array.from(merged.values())).slice(0, 30);
}

// ---------- 工具 ----------

export function normalizeUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace('http://', 'https://');
  return url;
}

function parseDuration(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // B站搜索接口的 duration 通常是 "3:45" 这样的字符串
    const parts = value.split(':').map(Number);
    if (parts.length === 2 && parts.every((n) => !Number.isNaN(n))) {
      return parts[0] * 60 + parts[1];
    }
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  }
  return undefined;
}

function parseTags(value: unknown): string[] | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value
    .split(/[,，、\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}
