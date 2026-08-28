/**
 * 关键词屏蔽/白名单过滤。
 *
 * 双机制内容过滤（见技术方案 5.3）：
 * - 首页推荐过滤：首页只展示助眠/白噪声相关分类（在 HomeScreen 中实现）
 * - 用户自定义关键词：blacklist 剔除命中项；whitelist 只保留命中项
 */

export type FilterMode = 'blacklist' | 'whitelist';

export interface KeywordRule {
  id: number;
  keyword: string;
  mode: FilterMode;
}

export interface FilterableItem {
  title: string;
  description?: string;
  author?: string;
  tags?: string[];
}

export function filterByKeywords<T extends FilterableItem>(
  items: T[],
  rules: KeywordRule[],
): T[] {
  if (!rules || rules.length === 0) return items;

  const blacklist = rules
    .filter((r) => r.mode === 'blacklist')
    .map((r) => r.keyword.trim().toLowerCase())
    .filter(Boolean);
  const whitelist = rules
    .filter((r) => r.mode === 'whitelist')
    .map((r) => r.keyword.trim().toLowerCase())
    .filter(Boolean);

  if (blacklist.length === 0 && whitelist.length === 0) return items;

  return items.filter((item) => {
    const text = [
      item.title ?? '',
      item.description ?? '',
      item.author ?? '',
      (item.tags ?? []).join(' '),
    ]
      .join(' ')
      .toLowerCase();

    if (blacklist.some((keyword) => text.includes(keyword))) {
      return false;
    }

    if (whitelist.length > 0 && !whitelist.some((keyword) => text.includes(keyword))) {
      return false;
    }

    return true;
  });
}

/** 首页推荐内容过滤：只保留助眠/白噪声相关的内容。 */
const HOME_ALLOWED_KEYWORDS = [
  '助眠',
  '白噪声',
  '白噪音',
  'asmr',
  '自然音',
  '雨声',
  '掏耳',
  '耳骚',
  'sleep',
  'relax',
  '3dio',
];

export function filterHomeRecommendations<T extends FilterableItem>(
  items: T[],
  rules: KeywordRule[],
): T[] {
  const relaxed = filterByKeywords(items, rules);
  return relaxed.filter((item) => {
    const text = `${item.title ?? ''} ${item.description ?? ''}`.toLowerCase();
    return HOME_ALLOWED_KEYWORDS.some((keyword) => text.includes(keyword));
  });
}
