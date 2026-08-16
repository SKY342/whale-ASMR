import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import SearchBar from '../components/SearchBar';
import KeywordTag from '../components/KeywordTag';
import CoverImage from '../components/CoverImage';
import { getSource } from '../services/sources';
import type { SearchResult } from '../services/sources';
import { filterByKeywords } from '../services/filter/KeywordFilter';
import { addBlockedKeyword, getBlockedKeywords, removeBlockedKeyword } from '../db/schema';
import { settingsStore } from '../store/settingsStore';
import { searchStore } from '../store/searchStore';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

export default function SearchScreen() {
  const tabNavigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNavigation =
    tabNavigation.getParent<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Search'>>();

  const { keyword, results, loading, error } = searchStore();
  const blockedKeywords = settingsStore((s) => s.blockedKeywords);

  const [newKeyword, setNewKeyword] = useState('');

  const refreshKeywords = () => {
    void getBlockedKeywords().then((keywords) =>
      settingsStore.getState().setBlockedKeywords(keywords),
    );
  };

  useEffect(() => {
    refreshKeywords();
  }, []);

  useEffect(() => {
    const incoming = route.params?.keyword?.trim();
    if (incoming) {
      searchStore.getState().setKeyword(incoming);
      void doSearch(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.keyword]);

  const doSearch = async (kw?: string) => {
    const target = (kw ?? keyword).trim();
    if (!target) return;
    searchStore.getState().setKeyword(target);
    searchStore.getState().setLoading(true);
    searchStore.getState().setError(null);
    try {
      const source = getSource('bilibili');
      const raw = source ? await source.search(target) : [];
      // 仅黑名单过滤：命中屏蔽词的结果剔除
      const filtered = filterByKeywords(raw, blockedKeywords);
      searchStore.getState().setResults(filtered);
    } catch (e) {
      searchStore.getState().setError(String((e as Error)?.message ?? e));
      searchStore.getState().setResults([]);
    } finally {
      searchStore.getState().setLoading(false);
    }
  };

  const addKeyword = () => {
    const value = newKeyword.trim();
    if (!value) return;
    void addBlockedKeyword(value, 'blacklist').then(() => {
      setNewKeyword('');
      refreshKeywords();
    });
  };

  const removeKeyword = (id: number) => {
    void removeBlockedKeyword(id).then(refreshKeywords);
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
        <SearchBar
          value={keyword}
          placeholder="输入搜索关键词..."
          onChangeText={(text) => searchStore.getState().setKeyword(text)}
          onSubmit={() => void doSearch()}
        />
        <Pressable style={styles.searchButton} onPress={() => void doSearch()}>
          <Text style={styles.searchButtonText}>搜索</Text>
        </Pressable>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>关键词屏蔽（黑名单）</Text>
        <View style={styles.tagsRow}>
          {blockedKeywords.map((rule) => (
            <KeywordTag
              key={rule.id}
              keyword={rule.keyword}
              mode={rule.mode}
              onRemove={() => removeKeyword(rule.id)}
            />
          ))}
        </View>
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            value={newKeyword}
            placeholder="+ 添加屏蔽词"
            placeholderTextColor="#8b949e"
            onChangeText={setNewKeyword}
            onSubmitEditing={addKeyword}
            returnKeyType="done"
          />
          <Pressable style={styles.addButton} onPress={addKeyword}>
            <Text style={styles.addButtonText}>添加</Text>
          </Pressable>
        </View>
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
                  {item.playCount ? ` | ${item.playCount}播放` : ''}
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
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  searchButton: {
    backgroundColor: '#1f6feb',
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  filterSection: {
    marginTop: 12,
  },
  filterTitle: {
    color: '#8b949e',
    fontSize: 13,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  addInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#161b22',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#e6edf3',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#21262d',
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#e6edf3',
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
  },
  list: {
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
