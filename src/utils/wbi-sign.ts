import axios from 'axios';
import * as Crypto from 'expo-crypto';

/**
 * B站 WBI 签名工具。
 *
 * WBI 是 B站 web 端接口的请求签名机制：先调用 nav 接口拿到 img_key / sub_key，
 * 二者拼接后按固定映射表取出 32 位 mixinKey；请求参数按 key 排序后拼接，
 * 末尾追加 mixinKey 做 MD5，得到 w_rid。
 *
 * 注意：该签名算法属于 B站公开接口的"高风险不可控链路"，算法变更时需要更新本文件。
 */

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52,
];

const NAV_URL = 'https://api.bilibili.com/x/web-interface/nav';
const KEYS_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 小时

interface WbiKeys {
  imgKey: string;
  subKey: string;
}

let cachedKeys: (WbiKeys & { fetchedAt: number }) | null = null;

function extractKey(url: string): string {
  if (!url) return '';
  const fileName = url.slice(url.lastIndexOf('/') + 1);
  return fileName.split('.')[0] ?? '';
}

async function fetchWbiKeys(): Promise<WbiKeys> {
  const res = await axios.get(NAV_URL, {
    timeout: 8000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      Referer: 'https://www.bilibili.com/',
    },
  });

  const data = res.data?.data;
  const imgKey = extractKey(data?.wbi_img?.img_url ?? '');
  const subKey = extractKey(data?.wbi_img?.sub_url ?? '');

  if (!imgKey || !subKey) {
    throw new Error('WBI签名初始化失败：nav接口未返回wbi_img字段');
  }

  return { imgKey, subKey };
}

async function getWbiKeys(): Promise<WbiKeys> {
  if (cachedKeys && Date.now() - cachedKeys.fetchedAt < KEYS_CACHE_TTL_MS) {
    return { imgKey: cachedKeys.imgKey, subKey: cachedKeys.subKey };
  }
  const keys = await fetchWbiKeys();
  cachedKeys = { ...keys, fetchedAt: Date.now() };
  return keys;
}

function getMixinKey(orig: string): string {
  return MIXIN_KEY_ENC_TAB.map((n) => orig[n])
    .join('')
    .slice(0, 32);
}

/**
 * 对请求参数做 WBI 签名，返回带 wts / w_rid 的新参数对象。
 */
export async function signWbiParams(
  params: Record<string, string | number>,
): Promise<Record<string, string>> {
  const { imgKey, subKey } = await getWbiKeys();
  const mixinKey = getMixinKey(imgKey + subKey);

  const wts = Math.round(Date.now() / 1000);
  const allParams: Record<string, string | number> = { ...params, wts };

  const query = Object.keys(allParams)
    .sort()
    .map((key) => {
      // B站签名会过滤参数值中的 !'()* 字符
      const value = String(allParams[key]).replace(/[!'()*]/g, '');
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');

  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.MD5,
    query + mixinKey,
  );

  const result: Record<string, string> = {
    wts: String(wts),
    w_rid: digest,
  };
  for (const [key, value] of Object.entries(params)) {
    result[key] = String(value);
  }
  return result;
}

/** 清空 WBI key 缓存（调试或算法变更时使用）。 */
export function resetWbiKeyCache(): void {
  cachedKeys = null;
}
