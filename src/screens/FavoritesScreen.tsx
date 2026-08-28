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
import { deleteFavorite, getFavorites } from '../db/schema';
import { routeBilibiliUrl } from '../services/router/UrlRouter';
import { playerQueueStore, toQueueItem } from '../store/playerQueueStore';
import { showDialog } from '../store/dialogStore';
import type { RootStackParamList } from '../navigation/types';

interface FavoriteRow {
  id: number;
  mediaId: string;
  title: string | null;
  url: string | null;
}

export default function FavoritesScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<FavoriteRow[]>([]);
  const [keyword, setKeyword] = useState('');

  const refresh = useCallback(async () => {
    const list = await getFavorites();
    setItems(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return items;
    return items.filter(
      (it) =>
        (it.title ?? '').toLowerCase().includes(k) ||
        (it.url ?? '').toLowerCase().includes(k),
    );
  }, [items, keyword]);

  const openFavorite = async (url: string | null) => {
    if (!url) return;
    try {
      const queueItems = await Promise.all(
        items.map(async (fav) => {
          if (!fav.url) return null;
          try {
            const routed = await routeBilibiliUrl(fav.url);
            if (!routed) return null;
            return toQueueItem({
              id: routed.id,
              type: routed.type,
              title: fav.title ?? fav.url,
            });
          } catch {
            return null;
          }
        }),
      );
      const validQueue = queueItems.filter(
        (i): i is NonNullable<typeof i> => i !== null,
      );
      const routed = await routeBilibiliUrl(url);
      if (!routed || validQueue.length === 0) {
        showDialog('暂不支持该链接', '目前仅支持视频、直播和 b23.tv 短链', [
          { text: '知道了' },
        ]);
        return;
      }
      const index = validQueue.findIndex(
        (i) => i.id === routed.id && i.type === routed.type,
      );
      playerQueueStore
        .getState()
        .setQueue(validQueue, Math.max(index, 0), 'favorites');
      navigation.navigate('Player', { id: routed.id, type: routed.type });
    } catch {
      showDialog('暂不支持该链接', '目前仅支持视频、直播和 b23.tv 短链', [
        { text: '知道了' },
      ]);
    }
  };

  const confirmDelete = (fav: FavoriteRow) => {
    showDialog('删除收藏', `确定删除收藏「${fav.title ?? fav.url}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void deleteFavorite(fav.id).then(refresh);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>我的收藏</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={keyword}
          placeholder="搜索收藏..."
          placeholderTextColor="#8b98a5"
          onChangeText={setKeyword}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable
              style={styles.cardMain}
              onPress={() => void openFavorite(item.url)}
            >
              <View style={styles.cardInfo}>
                <Text style={styles.title} numberOfLines={1}>
                  📁 {item.title ?? item.url}
                </Text>
                <Text style={styles.meta}>点击在App内打开</Text>
              </View>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={() => confirmDelete(item)}>
              <Text style={styles.deleteText}>删除</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.hint}>{keyword ? '未找到相关收藏' : '暂无收藏'}</Text>
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
  searchWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  searchInput: {
    height: 40,
    borderRadius: 20,
    backgroundColor: '#242d38',
    paddingHorizontal: 16,
    color: '#ffffff',
  },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161d26cc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    gap: 10,
  },
  cardMain: { flex: 1 },
  cardInfo: { flex: 1 },
  title: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  meta: { color: '#9aa4b2', fontSize: 12, marginTop: 3 },
  deleteButton: {
    backgroundColor: '#2d1515',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteText: { color: '#ff7b72', fontSize: 12 },
  hint: { color: '#8b98a5', textAlign: 'center', marginTop: 30 },
});
