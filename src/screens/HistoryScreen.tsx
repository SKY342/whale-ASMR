import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import CoverImage from '../components/CoverImage';
import { clearHistory, getHistory } from '../services/historyService';
import type { HistoryItem } from '../models/types';
import { playerQueueStore, toQueueItem } from '../store/playerQueueStore';
import { showDialog } from '../store/dialogStore';
import type { RootStackParamList } from '../navigation/types';

type Tab = 'all' | 'video' | 'live';

export default function HistoryScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [tab, setTab] = useState<Tab>('all');

  useFocusEffect(
    useCallback(() => {
      void getHistory().then(setItems);
    }, []),
  );

  const filtered = useMemo(() => {
    let list = items;
    if (tab !== 'all') list = list.filter((it) => it.type === tab);
    const k = keyword.trim().toLowerCase();
    if (k) {
      list = list.filter(
        (it) =>
          it.title.toLowerCase().includes(k) ||
          it.author.toLowerCase().includes(k),
      );
    }
    return list;
  }, [items, keyword, tab]);

  const confirmClear = (type?: 'video' | 'live') => {
    showDialog(
      '清空历史',
      type ? `确定清空${type === 'video' ? '视频' : '直播'}历史吗？` : '确定清空全部历史吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '清空',
          style: 'destructive',
          onPress: () => {
            void clearHistory(type).then(() => getHistory().then(setItems));
          },
        },
      ],
    );
  };

  const openItem = (item: HistoryItem) => {
    const index = filtered.findIndex((i) => i.id === item.id);
    playerQueueStore
      .getState()
      .setQueue(filtered.map(toQueueItem), Math.max(index, 0), 'history');
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
        <Text style={styles.headerTitle}>历史记录</Text>
        <Pressable
          style={styles.clearButton}
          onPress={() => confirmClear()}
        >
          <Text style={styles.clearText}>清空</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={keyword}
          placeholder="搜索历史记录..."
          placeholderTextColor="#8b98a5"
          onChangeText={setKeyword}
        />
      </View>

      <View style={styles.tabs}>
        {(['all', 'video', 'live'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'all' ? '全部' : t === 'video' ? '视频' : '直播'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.type}_${item.id}`}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openItem(item)}>
            <CoverImage uri={item.coverUrl} size={56} />
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
          <Text style={styles.hint}>
            {keyword ? '未找到相关历史' : '暂无历史记录'}
          </Text>
        }
      />
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
  headerTitle: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  clearButton: { minWidth: 60, alignItems: 'flex-end' },
  clearText: { color: '#ff7b72', fontSize: 14 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: {
    height: 40,
    borderRadius: 20,
    backgroundColor: '#242d38',
    paddingHorizontal: 16,
    color: '#ffffff',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 10,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#1a222b',
  },
  tabActive: { backgroundColor: '#1f6feb' },
  tabText: { color: '#8b98a5', fontSize: 13 },
  tabTextActive: { color: '#ffffff', fontWeight: '600' },
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
  cardTitle: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  cardMeta: { color: '#9aa4b2', fontSize: 12 },
  hint: { color: '#8b98a5', textAlign: 'center', marginTop: 30 },
});
