import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import {
  clearSearchHistory,
  getSearchHistory,
} from '../services/searchHistoryService';
import type { SearchHistoryItem } from '../models/types';
import { showDialog } from '../store/dialogStore';
import type { RootStackParamList } from '../navigation/types';

export default function SearchHistoryScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<SearchHistoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      void getSearchHistory().then(setItems);
    }, []),
  );

  const confirmClear = () => {
    showDialog('清空搜索记录', '确定清空所有搜索记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: () => {
          void clearSearchHistory().then(() => setItems([]));
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
        <Text style={styles.headerTitle}>搜索记录</Text>
        <Pressable style={styles.clearButton} onPress={confirmClear}>
          <Text style={styles.clearText}>清空</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.keyword}>🔍 {item.keyword}</Text>
            <Text style={styles.time}>
              {formatTime(item.searchedAt)}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.hint}>暂无搜索记录</Text>}
      />
    </SafeAreaView>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161d26cc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  keyword: { color: '#ffffff', fontSize: 14, flex: 1 },
  time: { color: '#9aa4b2', fontSize: 12 },
  hint: { color: '#8b98a5', textAlign: 'center', marginTop: 30 },
});
