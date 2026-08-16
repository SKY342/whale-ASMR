import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import SearchBar from '../components/SearchBar';
import CoverImage from '../components/CoverImage';
import { getHomeRecommendations, searchVideos } from '../utils/bilibili-api';
import { filterByKeywords } from '../services/filter/KeywordFilter';
import { getBlockedKeywords, getPlayHistory } from '../db/schema';
import { settingsStore } from '../store/settingsStore';
import { playerQueueStore, toQueueItem } from '../store/playerQueueStore';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { SearchResult } from '../services/sources';

const CATEGORIES = [
  '全部',
  '助眠',
  '白噪声',
  '自然音',
  'ASMR',
  '触发音',
  '轻语',
  '采耳',
  '敲击音',
  '无人声',
  '纯音乐',
];

const ZONES = [
  { title: '助眠专区', keyword: '助眠' },
  { title: '白噪声专区', keyword: '白噪声' },
];

export default function HomeScreen() {
  const tabNavigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNavigation =
    tabNavigation.getParent<StackNavigationProp<RootStackParamList>>();

  const [items, setItems] = useState<SearchResult[]>([]);
  const [category, setCategory] = useState('全部');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ title: string }[]>([]);
  const blockedKeywords = settingsStore((s) => s.blockedKeywords);

  const loadKeywordsAndHistory = useCallback(async () => {
    const [keywords, histories] = await Promise.all([
      getBlockedKeywords(),
      getPlayHistory(),
    ]);
    settingsStore.getState().setBlockedKeywords(keywords);
    setHistory(
      histories.slice(0, 3).map((item) => ({ title: item.title ?? '未知音频' })),
    );
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    setItems([]); // 下拉刷新：先清空旧列表，确保替换而非追加
    try {
      const keywordForLoad = category === '全部' ? null : category;
      const list = keywordForLoad
        ? await searchVideos(keywordForLoad, 1)
        : await getHomeRecommendations();
      setItems(list);
      setPage(1);
      setHasMore(list.length > 0);
      await loadKeywordsAndHistory();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
      setItems([]);
    } finally {
      setRefreshing(false);
    }
  }, [category, loadKeywordsAndHistory]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || refreshing) return;
    setLoadingMore(true);
    try {
      const keywordForLoad = category === '全部' ? '助眠' : category;
      const nextPage = page + 1;
      const more = await searchVideos(keywordForLoad, nextPage);
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const appended = more.filter((item) => !seen.has(item.id));
        return [...prev, ...appended];
      });
      setPage(nextPage);
      setHasMore(more.length > 0);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const goSearch = () => {
    stackNavigation?.navigate('SearchResults', {
      type: 'video',
    });
  };

  const openPlayer = (item: SearchResult) => {
    const list = filtered;
    const index = list.findIndex((i) => i.id === item.id);
    playerQueueStore
      .getState()
      .setQueue(list.map(toQueueItem), Math.max(index, 0), 'home');
    stackNavigation?.navigate('Player', {
      id: item.id,
      type: item.type,
      title: item.title,
      author: item.author,
      artwork: item.coverUrl,
      duration: item.duration,
    });
  };

  const filtered = filterByKeywords(items, blockedKeywords);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <SearchBar
            value=""
            placeholder="搜索视频/助眠/白噪声..."
            onChangeText={() => {}}
            onPress={goSearch}
          />
          <Pressable style={styles.searchButton} onPress={goSearch}>
            <Text style={styles.searchButtonText}>搜索</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.type}_${item.id}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor="#8b949e" />
        }
        onEndReachedThreshold={0.3}
        onEndReached={() => void loadMore()}
        ListHeaderComponent={
          <View>
            <FlatList
              horizontal
              data={CATEGORIES}
              keyExtractor={(cat) => cat}
              showsHorizontalScrollIndicator={false}
              style={styles.categories}
              renderItem={({ item: cat }) => (
                <Pressable
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                    {cat}
                  </Text>
                </Pressable>
              )}
            />
            <View style={styles.zoneRow}>
              {ZONES.map((zone) => (
                <Pressable
                  key={zone.title}
                  style={styles.zoneCard}
                  onPress={() =>
                    stackNavigation?.navigate('SearchResults', {
                      type: 'video',
                      keyword: zone.keyword,
                    })
                  }
                >
                  <Text style={styles.zoneTitle}>{zone.title}</Text>
                  <Text style={styles.zoneMeta}>按「{zone.keyword}」聚合</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.sectionTitle}>📋 推荐内容</Text>
            {error ? <Text style={styles.error}>加载失败：{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <View>
            {!refreshing && !error ? <Text style={styles.hint}>暂无推荐内容，下拉刷新试试</Text> : null}
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <Text style={styles.hint}>加载中...</Text>
          ) : !hasMore && filtered.length > 0 ? (
            <Text style={styles.hint}>没有更多了</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openPlayer(item)}>
            <CoverImage uri={item.coverUrl} size={72} />
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    backgroundColor: '#1f6feb',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  categories: {
    marginVertical: 10,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#161b22',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#1f6feb',
  },
  categoryText: {
    color: '#8b949e',
    fontSize: 13,
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  sectionTitle: {
    color: '#e6edf3',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
  zoneRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  zoneCard: {
    flex: 1,
    backgroundColor: '#1f6feb',
    borderRadius: 12,
    padding: 14,
  },
  zoneTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  zoneMeta: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    color: '#8b949e',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  error: {
    color: '#ff7b72',
    fontSize: 13,
    marginBottom: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#161b22',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
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
