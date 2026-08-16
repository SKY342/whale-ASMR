import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import SearchBar from '../components/SearchBar';
import CoverImage from '../components/CoverImage';
import { getHomeRecommendations } from '../utils/bilibili-api';
import { filterByKeywords } from '../services/filter/KeywordFilter';
import { getBlockedKeywords, getPlayHistory } from '../db/schema';
import { settingsStore } from '../store/settingsStore';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import type { SearchResult } from '../services/sources';

const CATEGORIES = ['全部', '助眠', '白噪声', '自然音', 'ASMR'];

export default function HomeScreen() {
  const tabNavigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNavigation =
    tabNavigation.getParent<StackNavigationProp<RootStackParamList>>();

  const [items, setItems] = useState<SearchResult[]>([]);
  const [filtered, setFiltered] = useState<SearchResult[]>([]);
  const [category, setCategory] = useState('全部');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [history, setHistory] = useState<{ title: string }[]>([]);
  const blockedKeywords = settingsStore((s) => s.blockedKeywords);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recs, histories, keywords] = await Promise.all([
        getHomeRecommendations(),
        getPlayHistory(),
        getBlockedKeywords(),
      ]);
      settingsStore.getState().setBlockedKeywords(keywords);
      setItems(recs);
      setHistory(
        histories
          .slice(0, 3)
          .map((item) => ({ title: item.title ?? '未知音频' })),
      );
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const base = filterByKeywords(items, blockedKeywords);
    if (category === '全部') {
      setFiltered(base);
    } else {
      setFiltered(
        base.filter((item) =>
          `${item.title} ${item.description ?? ''}`
            .toLowerCase()
            .includes(category.toLowerCase()),
        ),
      );
    }
  }, [category, items, blockedKeywords]);

  const goSearch = () => {
    const kw = keyword.trim();
    tabNavigation.navigate('Search', kw ? { keyword: kw } : undefined);
  };

  const openPlayer = (item: SearchResult) => {
    stackNavigation?.navigate('Player', {
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
        <View style={styles.searchRow}>
          <SearchBar
            value={keyword}
            placeholder="搜索ASMR/白噪声..."
            onChangeText={setKeyword}
            onSubmit={goSearch}
          />
          <Pressable style={styles.searchButton} onPress={goSearch}>
            <Text style={styles.searchButtonText}>搜索</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>📋 推荐内容</Text>
        {loading ? (
          <Text style={styles.hint}>加载中...</Text>
        ) : error ? (
          <Text style={styles.error}>加载失败：{error}</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.hint}>暂无推荐内容</Text>
        ) : (
          filtered.map((item) => (
            <Pressable
              key={`${item.type}_${item.id}`}
              style={styles.card}
              onPress={() => openPlayer(item)}
            >
              <CoverImage uri={item.coverUrl} size={72} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.type === 'live' ? '🔴 ' : ''}
                  {item.title}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.author}
                  {item.playCount ? ` | ${item.playCount}播放` : ''}
                </Text>
              </View>
            </Pressable>
          ))
        )}

        <Text style={styles.sectionTitle}>🕐 最近播放</Text>
        {history.length === 0 ? (
          <Text style={styles.hint}>暂无播放历史</Text>
        ) : (
          history.map((item, index) => (
            <View key={`${item.title}_${index}`} style={styles.historyRow}>
              <Text style={styles.historyText}>🎵 {item.title}</Text>
            </View>
          ))
        )}
      </ScrollView>
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
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
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
    marginTop: 14,
    marginBottom: 8,
  },
  hint: {
    color: '#8b949e',
    fontSize: 13,
    marginBottom: 10,
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
  historyRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  historyText: {
    color: '#c9d1d9',
    fontSize: 14,
  },
});
