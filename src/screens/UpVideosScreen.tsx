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
import type { RootStackParamList } from '../navigation/types';

/**
 * UP主作品列表页：关注项点击后进入，点击作品直接进播放器。
 */
export default function UpVideosScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'UpVideos'>>();
  const { mid, upName } = route.params;

  const [items, setItems] = useState<BiliSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await getUserVideos(mid, upName);
        if (!cancelled) setItems(list);
      } catch (e) {
        if (!cancelled) setError(String((e as Error)?.message ?? e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mid, upName]);

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
        <Text style={styles.error}>加载失败：{error}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
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
          ListEmptyComponent={<Text style={styles.hint}>未找到该UP主的作品</Text>}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    minWidth: 60,
  },
  backText: {
    color: '#58a6ff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#e6edf3',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  hint: {
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 30,
  },
  error: {
    color: '#ff7b72',
    textAlign: 'center',
    marginTop: 30,
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
