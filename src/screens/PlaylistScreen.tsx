import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import {
  createPlaylist,
  deletePlaylist,
  getPlaylistItems,
  getPlaylists,
  renamePlaylist,
} from '../db/schema';
import type { Playlist } from '../db/schema';
import { playerQueueStore, toQueueItem } from '../store/playerQueueStore';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

export default function PlaylistScreen() {
  const tabNavigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNavigation =
    tabNavigation.getParent<StackNavigationProp<RootStackParamList>>();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [items, setItems] = useState<
    { id: number; bvid: string; title: string | null; coverUrl: string | null; duration: number | null }[]
  >([]);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<Playlist | null>(null);
  const [renameText, setRenameText] = useState('');

  const refresh = () => {
    void getPlaylists().then(setPlaylists);
  };

  useEffect(() => {
    refresh();
  }, []);

  const openPlaylist = async (playlist: Playlist) => {
    if (expandedId === playlist.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(playlist.id);
    const list = await getPlaylistItems(playlist.id);
    setItems(list);
  };

  const addPlaylist = () => {
    const name = newName.trim();
    if (!name) return;
    void createPlaylist(name).then(() => {
      setNewName('');
      refresh();
    });
  };

  const confirmRename = () => {
    if (!renaming) return;
    const name = renameText.trim();
    if (!name) return;
    void renamePlaylist(renaming.id, name).then(() => {
      setRenaming(null);
      refresh();
    });
  };

  const confirmDelete = (playlist: Playlist) => {
    Alert.alert('删除歌单', `确定删除「${playlist.name}」及其中的所有曲目吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void deletePlaylist(playlist.id).then(() => {
            if (expandedId === playlist.id) setExpandedId(null);
            refresh();
          });
        },
      },
    ]);
  };

  const showActions = (playlist: Playlist) => {
    Alert.alert(playlist.name, '选择操作', [
      { text: '重命名', onPress: () => { setRenaming(playlist); setRenameText(playlist.name); } },
      { text: '删除', style: 'destructive', onPress: () => confirmDelete(playlist) },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const playItem = (bvid: string, title: string | null) => {
    const index = items.findIndex((i) => i.bvid === bvid);
    playerQueueStore
      .getState()
      .setQueue(
        items.map((i) =>
          toQueueItem({
            id: i.bvid,
            type: 'video',
            title: i.title ?? i.bvid,
            artwork: i.coverUrl ?? '',
            duration: i.duration ?? undefined,
          }),
        ),
        Math.max(index, 0),
        'playlist',
      );
    stackNavigation?.navigate('Player', {
      id: bvid,
      type: 'video',
      title: title ?? bvid,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>📁 歌单管理</Text>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={newName}
          placeholder="新建歌单名称"
          placeholderTextColor="#8b949e"
          onChangeText={setNewName}
          onSubmitEditing={addPlaylist}
        />
        <Pressable style={styles.addButton} onPress={addPlaylist}>
          <Text style={styles.addButtonText}>新建</Text>
        </Pressable>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View>
            <Pressable
              style={styles.card}
              onPress={() => void openPlaylist(item)}
              onLongPress={() => showActions(item)}
            >
              <Text style={styles.cardTitle}>🎵 {item.name}</Text>
              <Text style={styles.cardMeta}>{expandedId === item.id ? '收起' : '展开'} · 长按管理</Text>
            </Pressable>
            {expandedId === item.id ? (
              <View style={styles.itemList}>
                {items.length === 0 ? (
                  <Text style={styles.hint}>歌单为空</Text>
                ) : (
                  items.map((child) => (
                    <Pressable
                      key={String(child.id)}
                      style={styles.itemRow}
                      onPress={() => playItem(child.bvid, child.title)}
                    >
                      <Text style={styles.itemText} numberOfLines={1}>
                        🎵 {child.title || child.bvid}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.hint}>暂无歌单，点击上方新建</Text>}
      />

      <Modal visible={renaming !== null} transparent animationType="fade">
        <View style={styles.modalMask}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>重命名歌单</Text>
            <TextInput
              style={styles.input}
              value={renameText}
              placeholder="输入新名称"
              placeholderTextColor="#8b949e"
              onChangeText={setRenameText}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancel} onPress={() => setRenaming(null)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </Pressable>
              <Pressable style={styles.modalOk} onPress={confirmRename}>
                <Text style={styles.modalOkText}>确定</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    paddingHorizontal: 16,
  },
  title: {
    color: '#e6edf3',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#161b22',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#e6edf3',
  },
  addButton: {
    backgroundColor: '#1f6feb',
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  list: {
    paddingBottom: 100,
    marginTop: 10,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
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
  itemList: {
    backgroundColor: '#161b22',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  itemRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  itemText: {
    color: '#c9d1d9',
    fontSize: 14,
  },
  hint: {
    color: '#8b949e',
    textAlign: 'center',
    marginTop: 20,
    padding: 10,
  },
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    color: '#e6edf3',
    fontSize: 16,
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#21262d',
  },
  modalCancelText: {
    color: '#e6edf3',
  },
  modalOk: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1f6feb',
  },
  modalOkText: {
    color: '#ffffff',
  },
});
