/**
 * B站 API 全链路验证脚本（Node 18+，无需依赖）
 * 用法: node scripts/verify-bili-api.mjs
 *
 * 验证链路：
 *   nav(WBI keys) → 搜索 → 视频信息 → WBI签名 playurl → 音频流可达性 → UP主投稿列表
 */
import crypto from 'node:crypto';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

let COOKIE = '';

function headers(referer) {
  return {
    'User-Agent': UA,
    Referer: referer,
    ...(COOKIE ? { Cookie: COOKIE } : {}),
  };
}

async function initBuvid3() {
  const res = await fetch('https://www.bilibili.com/', { headers: { 'User-Agent': UA } });
  const setCookie = String(res.headers.get('set-cookie') ?? '');
  const buvid3 = setCookie
    .split(',')
    .map((s) => s.trim())
    .find((s) => s.startsWith('buvid3='))
    ?.split(';')[0]
    ?.slice('buvid3='.length);
  if (buvid3) COOKIE = `buvid3=${buvid3}`;
  return buvid3;
}

async function getJson(url, referer) {
  const res = await fetch(url, { headers: headers(referer) });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`非JSON响应: ${text.slice(0, 120)}`);
  }
}

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52,
];

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

function getMixinKey(orig) {
  return MIXIN_KEY_ENC_TAB.map((n) => orig[n]).join('').slice(0, 32);
}

function extractKey(url) {
  const fileName = url.slice(url.lastIndexOf('/') + 1);
  return fileName.split('.')[0] ?? '';
}

let cachedMixinKey = null;

async function getMixinKeyCached() {
  if (cachedMixinKey) return cachedMixinKey;
  const nav = await getJson('https://api.bilibili.com/x/web-interface/nav', 'https://www.bilibili.com/');
  const imgKey = extractKey(nav?.data?.wbi_img?.img_url ?? '');
  const subKey = extractKey(nav?.data?.wbi_img?.sub_url ?? '');
  if (!imgKey || !subKey) throw new Error('WBI key 获取失败');
  cachedMixinKey = getMixinKey(imgKey + subKey);
  return cachedMixinKey;
}

async function signWbi(params) {
  const mixinKey = await getMixinKeyCached();
  const all = { ...params, wts: Math.round(Date.now() / 1000) };
  const query = Object.keys(all)
    .sort()
    .map((k) => {
      const v = String(all[k]).replace(/[!'()*]/g, '');
      return `${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
    })
    .join('&');
  return { ...all, w_rid: md5(query + mixinKey) };
}

async function getJsonWithRetry(url, referer, retries = 2) {
  for (let i = 0; i < retries; i += 1) {
    try {
      return await getJson(url, referer);
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log('    重试中... (' + err.message.slice(0, 60) + ')');
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

function objToQuery(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

async function main() {
  console.log('=== B站 API 全链路验证 ===\n');

  // 0. 获取真实 buvid3
  const buvid3 = await initBuvid3();
  console.log('[0/6] 获取 buvid3:', Boolean(buvid3), buvid3 ? buvid3.slice(0, 12) + '...' : '');

  // 1. nav + WBI keys
  const nav = await getJson('https://api.bilibili.com/x/web-interface/nav', 'https://www.bilibili.com/');
  console.log('[1/6] nav 接口:', 'code=' + nav.code, 'wbi_img=' + Boolean(nav?.data?.wbi_img));

  // 2. 搜索
  const kw = '助眠白噪声';
  const searchUrl =
    'https://api.bilibili.com/x/web-interface/search/type?search_type=video&page=1&page_size=10&keyword=' +
    encodeURIComponent(kw);
  const search = await getJson(searchUrl, `https://search.bilibili.com/all?keyword=${encodeURIComponent(kw)}`);
  const results = search?.data?.result ?? [];
  console.log('[2/6] 搜索接口:', 'code=' + search.code, '结果数=' + results.length);
  if (results.length === 0) throw new Error('搜索结果为空');
  const first = results.find((r) => r?.bvid) ?? results[0];
  console.log('    首个结果:', first.bvid, '-', String(first.title ?? '').replace(/<[^>]+>/g, '').slice(0, 40));

  // 3. 视频信息
  const view = await getJson(
    `https://api.bilibili.com/x/web-interface/view?bvid=${first.bvid}`,
    `https://www.bilibili.com/video/${first.bvid}`,
  );
  const cid = view?.data?.cid;
  const mid = view?.data?.owner?.mid;
  console.log('[3/6] 视频信息:', 'code=' + view.code, 'cid=' + cid, 'mid=' + mid, '标题=' + String(view?.data?.title ?? '').slice(0, 30));

  // 4. WBI 签名 playurl 获取音频流
  // 注：/x/player/wbi/playurl 在本机网络下会命中 412 风控返回 HTML，
  // 实测 /x/player/playurl 携带 WBI 签名参数可正常返回 DASH 音频流。
  const signed = await signWbi({ bvid: first.bvid, cid, fnval: 16, fnver: 0, fourk: 1, qn: 64 });
  const playData = await getJson(
    `https://api.bilibili.com/x/player/playurl?${objToQuery(signed)}`,
    `https://www.bilibili.com/video/${first.bvid}`,
  );
  const audioList = playData?.data?.dash?.audio ?? [];
  const audioUrl = audioList[0]?.baseUrl ?? audioList[0]?.base_url ?? playData?.data?.durl?.[0]?.url;
  console.log('[4/6] WBI playurl:', 'code=' + playData.code, '音频流数=' + audioList.length, 'audioUrl=' + Boolean(audioUrl));
  if (!audioUrl) throw new Error('未获取到音频流URL');

  // 5. 音频流可达性（音频CDN不支持HEAD，用GET读取前1KB验证）
  const audioRes = await fetch(audioUrl, {
    headers: { 'User-Agent': UA, Referer: 'https://www.bilibili.com/' },
  });
  const audioHead = Buffer.from(await audioRes.arrayBuffer()).subarray(0, 8).toString('hex');
  console.log('[5/6] 音频流可达性:', 'HTTP ' + audioRes.status, '前8字节=' + audioHead);
  if (audioRes.status >= 400) throw new Error('音频流不可达，状态码 ' + audioRes.status);

  // 6. UP主投稿列表（需真实 buvid3 + WBI 签名；该接口易触发风控，
  //    App 内实现为：space 接口失败时用搜索 + 作者名过滤兜底）
  const upName = String(view?.data?.owner?.name ?? '');
  let vlist = [];
  try {
    const spaceSigned = await signWbi({ mid, ps: 5, pn: 1 });
    const spaceData = await getJsonWithRetry(
      `https://api.bilibili.com/x/space/wbi/arc/search?${objToQuery(spaceSigned)}`,
      `https://space.bilibili.com/${mid}/video`,
    );
    vlist = spaceData?.data?.list?.vlist ?? [];
    console.log('[6/6] UP主投稿:', 'code=' + spaceData.code, '列表数=' + vlist.length);
  } catch (err) {
    console.log('[6/6] UP主投稿: space接口风控(' + err.message.slice(0, 40) + ')，使用搜索兜底');
    const upSearch = await getJsonWithRetry(
      `https://api.bilibili.com/x/web-interface/search/type?search_type=video&page=1&page_size=10&keyword=${encodeURIComponent(upName)}`,
      `https://search.bilibili.com/all?keyword=${encodeURIComponent(upName)}`,
    );
    vlist = (upSearch?.data?.result ?? []).filter((r) => r?.author === upName);
    console.log('[6/6] 搜索兜底:', '匹配作者=' + upName, '列表数=' + vlist.length);
  }
  if (vlist.length > 0) {
    console.log('    首个投稿:', vlist[0].bvid, '-', vlist[0].title);
  }

  console.log('\n=== 全链路验证通过 ✅ ===');
}

main().catch((err) => {
  console.error('\n=== 验证失败 ❌ ===');
  console.error(err.message);
  process.exit(1);
});
