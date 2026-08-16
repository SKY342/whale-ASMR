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
import { searchLiveRooms } from '../utils/bilibili-api';
import { filterByKeywords } from '../services/filter/KeywordFilter';
import { getBlockedKeywords } from '../db/schema';
import { settingsStore } from '../store/settingsStore';
import { playerQueueStore, toQueueItem } from '../store/playerQueueStore';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { SearchResult } from '../services/sources';

const PRESET_KEYWORDS = ['助眠', '白噪声', 'ASMR', '雨声', '自然音'];

export default function LiveScreen() {
  const tabNavigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNavigation =
    tabNavigation.getParent<StackNavigationProp<RootStackParamList>>();

  const [items, setItems] = useState<SearchResult[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blockedKeywords = settingsStore((s) => s.blockedKeywords);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    setItems([]); // 下拉刷新：先清空旧列表
    try {
      const merged = new Map<string, SearchResult>();
      for (const kw of PRESET_KEYWORDS) {
        try {
          const list = await searchLiveRooms(kw, 1);
          for (const item of list) {
            if (!merged.has(item.id)) merged.set(item.id, item);
          }
        } catch {
          // 单个关键词失败不影响整体
        }
        if (merged.size >= 30) break;
      }
      setItems(Array.from(merged.values()));
      const keywords = await getBlockedKeywords();
      settingsStore.getState().setBlockedKeywords(keywords);
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const goSearch = () => {
    stackNavigation?.navigate('SearchResults', {
      type: 'live',
    });
  };

  const openLive = (item: SearchResult) => {
    const list = filtered;
    const index = list.findIndex((i) => i.id === item.id);
    playerQueueStore
      .getState()
      .setQueue(list.map(toQueueItem), Math.max(index, 0), 'live');
    stackNavigation?.navigate('Player', {
      id: item.id,
      type: 'live',
      title: item.title,
      author: item.author,
      artwork: item.coverUrl,
    });
  };

  const filtered = filterByKeywords(items, blockedKeywords);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <SearchBar
            value=""
            placeholder="搜索直播/助眠/白噪声..."
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
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>🔴 助眠/白噪声直播</Text>
        }
        ListEmptyComponent={
          <View>
            {!refreshing ? <Text style={styles.hint}>{error ? `加载失败：${error}` : '暂无直播，下拉刷新试试'}</Text> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openLive(item)}>
            <CoverImage uri={item.coverUrl} size={72} />
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                🔴 {item.title}
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
  sectionTitle: {
    color: '#e6edf3',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
  hint: {
    color: '#8b949e',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
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
