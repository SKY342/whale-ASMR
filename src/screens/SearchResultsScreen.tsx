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
import { getBlockedKeywords } from '../db/schema';
import { settingsStore } from '../store/settingsStore';
import { playerQueueStore, toQueueItem } from '../store/playerQueueStore';
import type { RootStackParamList } from '../navigation/types';
import type { SearchResult } from '../services/sources';

export default function SearchResultsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SearchResults'>>();
  const { type, keyword: initialKeyword } = route.params;

  const [keyword, setKeyword] = useState(initialKeyword ?? '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blockedKeywords = settingsStore((s) => s.blockedKeywords);

  const doSearch = async (kw?: string) => {
    const target = (kw ?? keyword).trim();
    if (!target) return;
    setKeyword(target);
    setLoading(true);
    setError(null);
    try {
      // 每次搜索前从数据库重新读取屏蔽词，确保刚添加的屏蔽词立即生效
      const freshKeywords = await getBlockedKeywords();
      settingsStore.getState().setBlockedKeywords(freshKeywords);
      const raw =
        type === 'live'
          ? await searchLiveRooms(target, 1)
          : await searchVideos(target, 1);
      setResults(filterByKeywords(raw, freshKeywords));
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialKeyword?.trim()) {
      void doSearch(initialKeyword);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKeyword, type]);

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
          ListEmptyComponent={<Text style={styles.hint}>输入关键词开始搜索</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
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
