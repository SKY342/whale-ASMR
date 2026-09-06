import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import CoverImage from '../components/CoverImage';
import { getUserVideos } from '../utils/bilibili-api';
import type { BiliSearchResult } from '../utils/bilibili-api';
import { playerQueueStore, toQueueItem } from '../store/playerQueueStore';
import { buildUpHomeUrl, openExternal } from '../utils/bili-router';
import type { RootStackParamList } from '../navigation/types';

const PAGE_SIZE = 30;

export default function UpVideosScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'UpVideos'>>();
  const { mid, upName } = route.params;

  const [items, setItems] = useState<BiliSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFirst = async () => {
    setLoading(true);
    setError(null);
    setItems([]);
    setPage(1);
    setHasMore(true);
    try {
      const list = await getUserVideos(mid, upName, 1, PAGE_SIZE);
      setItems(list);
      setHasMore(list.length >= PAGE_SIZE);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mid, upName]);

  const loadMore = async () => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const more = await getUserVideos(mid, upName, nextPage, PAGE_SIZE);
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...more.filter((i) => !seen.has(i.id))];
      });
      setPage(nextPage);
      setHasMore(more.length >= PAGE_SIZE);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {upName} 的作品
        </Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <Text style={styles.hint}>加载中...</Text>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.error}>加载失败：{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => void loadFirst()}>
            <Text style={styles.retryText}>点击重试</Text>
          </Pressable>
          <Pressable
            style={styles.retryButton}
            onPress={() => void openExternal(buildUpHomeUrl(mid))}
          >
            <Text style={styles.retryText}>打开UP主主页</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <Text style={styles.hint}>加载中...</Text>
            ) : items.length > 0 && !hasMore ? (
              <Text style={styles.hint}>没有更多了</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => {
                const list = items;
                const index = list.findIndex((i) => i.id === item.id);
                playerQueueStore
                  .getState()
                  .setQueue(list.map(toQueueItem), Math.max(index, 0), 'up-videos');
                navigation.navigate('Player', {
                  id: item.id,
                  type: 'video',
                  title: item.title,
                  author: item.author,
                  artwork: item.coverUrl,
                  duration: item.duration,
                });
              }}
            >
              <CoverImage uri={item.coverUrl} size={64} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.author}
                  {item.playCount ? ` | ${item.playCount}播放` : ''}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.hint}>未找到该UP主的作品</Text>
              <Pressable style={styles.retryButton} onPress={() => void loadFirst()}>
                <Text style={styles.retryText}>点击重试</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: { minWidth: 60 },
  backText: { color: '#58a6ff', fontSize: 16 },
  headerTitle: { color: '#ffffff', fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' },
  hint: { color: '#8b949e', textAlign: 'center', marginTop: 30 },
  error: { color: '#ff7b72', textAlign: 'center', marginTop: 10, paddingHorizontal: 20 },
  emptyWrap: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#1f6feb',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  retryText: { color: '#ffffff', fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#161d26cc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    gap: 10,
  },
  cardInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  cardTitle: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  cardMeta: { color: '#9aa4b2', fontSize: 12 },
});
