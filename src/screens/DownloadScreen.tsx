import React, { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  deleteDownload,
  getDownloadList,
  getStorageUsage,
} from '../services/download/DownloadManager';
import { downloadStore } from '../store/downloadStore';
import { showDialog } from '../store/dialogStore';

export default function DownloadScreen() {
  const items = downloadStore((s) => s.items);
  const usedBytes = downloadStore((s) => s.usedBytes);

  const refresh = () => {
    void Promise.all([getDownloadList(), getStorageUsage()]).then(
      ([list, usage]) => {
        downloadStore.getState().setItems(list);
        downloadStore.getState().setUsedBytes(usage.usedBytes);
      },
    );
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = (item: { filePath: string; title: string }) => {
    showDialog('删除下载', `确定删除「${item.title}」的音频文件吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void deleteDownload(item.filePath).then(refresh);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>📥 下载管理</Text>
      <Text style={styles.storage}>存储空间: 已用 {formatBytes(usedBytes)} / 2GB</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                🎵 {item.title || item.bvid}
              </Text>
              <Text style={styles.cardMeta}>
                {item.status === 'completed'
                  ? `✅ 已下载${item.fileSize ? ` [${formatBytes(item.fileSize)}]` : ''}`
                  : item.status === 'downloading'
                    ? '⏳ 下载中'
                    : '❌ 下载失败'}
              </Text>
            </View>
            <Pressable
              style={styles.deleteButton}
              onPress={() => handleDelete({ filePath: item.filePath, title: item.title || item.bvid })}
            >
              <Text style={styles.deleteText}>删除</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.hint}>暂无下载内容</Text>}
      />
    </SafeAreaView>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0MB';
  const mb = bytes / 1024 / 1024;
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)}GB`;
  return `${mb.toFixed(1)}MB`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  title: {
    color: '#e6edf3',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  storage: {
    color: '#8b949e',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 10,
  },
  list: {
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardInfo: {
    flex: 1,
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
  deleteButton: {
    backgroundColor: '#2d1515',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  deleteText: {
    color: '#ff7b72',
    fontSize: 13,
  },
  hint: {
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 30,
  },
});
