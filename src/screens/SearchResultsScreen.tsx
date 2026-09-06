import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import SearchBar from '../components/SearchBar';
import CoverImage from '../components/CoverImage';
import { searchLiveRooms, searchVideos } from '../utils/bilibili-api';
import { filterByKeywords } from '../services/filter/KeywordFilter';
import { getBlockedKeywords, getFollows } from '../db/schema';
import { addSearchHistory } from '../services/searchHistoryService';
import { settingsStore } from '../store/settingsStore';
import { playerQueueStore, toQueueItem } from '../store/playerQueueStore';
import type { RootStackParamList } from '../navigation/types';
import type { SearchResult } from '../services/sources';

const PAGE_SIZE = 20;
const PREFETCH_PAGES = 5;

export default function SearchResultsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SearchResults'>>();
  const { type, keyword: initialKeyword } = route.params;

  const [keyword, setKeyword] = useState(initialKeyword ?? '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const blockedKeywords = settingsStore((s) => s.blockedKeywords);

  const fetchPage = async (target: string, pageNum: number): Promise<SearchResult[]> => {
    const freshKeywords = await getBlockedKeywords();
    settingsStore.getState().setBlockedKeywords(freshKeywords);
    const raw =
      type === 'live'
        ? await searchLiveRooms(target, pageNum)
        : await searchVideos(target, pageNum);
    const filtered = filterByKeywords(raw, freshKeywords);
    if (type === 'live') {
      // 关注的UP主直播优先展示（每页都置顶排序，追加时再整体排序）
      const follows = await getFollows();
      const followedNames = new Set(
        follows.map((f) => f.name?.trim()).filter(Boolean),
      );
      filtered.sort(
        (a, b) =>
          Number(followedNames.has(b.author)) -
          Number(followedNames.has(a.author)),
      );
    }
    return filtered;
  };

  const appendUnique = (prev: SearchResult[], added: SearchResult[]) => {
    const seen = new Set(prev.map((i) => `${i.type}:${i.id}`));
    return [...prev, ...added.filter((i) => !seen.has(`${i.type}:${i.id}`))];
  };

  const doSearch = async (kw?: string, isRefresh = false) => {
    const target = (kw ?? keyword).trim();
    if (!target) return;
    setKeyword(target);
    if (isRefresh) {
      setRefreshing(true);
      setLoading(false);
    } else {
      setLoading(true);
      setRefreshing(false);
    }
    setLoadingMore(false);
    setError(null);
    setSearched(true);
    setResults([]);
    setPage(1);
    setHasMore(true);
    try {
      // 并发预取前 PREFETCH_PAGES 页，一次展示更多结果
      const tasks = Array.from({ length: PREFETCH_PAGES }, (_, i) =>
        fetchPage(target, i + 1),
      );
      const pages = await Promise.all(tasks);
      let merged: SearchResult[] = [];
      for (const p of pages) {
        merged = appendUnique(merged, p);
        if (merged.length >= PAGE_SIZE * PREFETCH_PAGES) break;
      }
      setResults(merged);
      setPage(Math.ceil(merged.length / PAGE_SIZE) || 1);
      setHasMore(pages[PREFETCH_PAGES - 1].length >= PAGE_SIZE);
      void addSearchHistory(target).catch(() => {});
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
      setResults([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (initialKeyword?.trim()) {
      void doSearch(initialKeyword);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKeyword, type]);

  const loadMore = async () => {
    if (loadingMore || loading || !hasMore || !keyword.trim()) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const more = await fetchPage(keyword, nextPage);
      setResults((prev) => appendUnique(prev, more));
      setPage(nextPage);
      setHasMore(more.length >= PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const openPlayer = (item: SearchResult) => {
    const index = results.findIndex((i) => i.id === item.id);
    playerQueueStore
      .getState()
      .setQueue(results.map(toQueueItem), Math.max(index, 0), 'search');
    navigation.navigate('Player', {
      id: item.id,
      type: item.type,
      title: item.title,
      author: item.author,
      artwork: item.coverUrl,
      duration: item.duration,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ 返回</Text>
        </Pressable>
        <SearchBar
          value={keyword}
          placeholder={type === 'live' ? '搜索直播...' : '搜索视频...'}
          onChangeText={setKeyword}
          onSubmit={() => void doSearch()}
          autoFocus
        />
        <Pressable style={styles.searchButton} onPress={() => void doSearch()}>
          <Text style={styles.searchButtonText}>搜索</Text>
        </Pressable>
      </View>

      {loading ? (
        <Text style={styles.hint}>搜索中...</Text>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}_${item.id}`}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshing={refreshing}
          onRefresh={() => void doSearch(keyword, true)}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <Text style={styles.hint}>加载中...</Text>
            ) : results.length > 0 && !hasMore ? (
              <Text style={styles.hint}>没有更多了</Text>
            ) : results.length > 0 && results.length < 5 ? (
              <Pressable style={styles.retryButton} onPress={() => void doSearch()}>
                <Text style={styles.retryText}>结果较少，点击重试</Text>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => openPlayer(item)}>
              <CoverImage uri={item.coverUrl} size={64} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.type === 'live' ? '🔴 ' : ''}
                  {item.title}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.author}
                  {item.playCount ? ` | ${item.playCount}` : ''}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.hint}>{searched ? '未找到相关结果' : '输入关键词开始搜索'}</Text>
              {searched && (
                <Pressable style={styles.retryButton} onPress={() => void doSearch()}>
                  <Text style={styles.retryText}>点击重试</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    minWidth: 44,
  },
  backText: {
    color: '#58a6ff',
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#1f6feb',
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  hint: {
    color: '#8b949e',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 10,
  },
  retryButton: {
    marginTop: 10,
    backgroundColor: '#1f6feb',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  error: {
    color: '#ff7b72',
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#161b22',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 10,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  cardTitle: {
    color: '#e6edf3',
    fontSize: 15,
    fontWeight: '600',
  },
  cardMeta: {
    color: '#8b949e',
    fontSize: 12,
  },
});
