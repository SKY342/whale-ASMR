import React, { useCallback, useState } from 'react';
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
import {
  addFollow,
  deleteFollow,
  getFollows,
  updateFollowInfo,
} from '../db/schema';
import { getUpInfo, getVideoInfo } from '../utils/bilibili-api';
import {
  buildUpHomeUrl,
  isValidUpHomeUrl,
  parseUpMid,
} from '../utils/bili-router';
import { routeBilibiliUrl } from '../services/router/UrlRouter';
import { showDialog } from '../store/dialogStore';
import type { RootStackParamList } from '../navigation/types';

interface FollowRow {
  id: number;
  uid: string;
  name: string | null;
  avatarUrl: string | null;
  homeUrl: string | null;
}

export default function FollowsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<FollowRow[]>([]);
  const [followUrl, setFollowUrl] = useState('');

  const refresh = useCallback(async () => {
    const list = await getFollows();
    const normalized: FollowRow[] = [];
    for (const f of list) {
      let row = { ...f };
      if (!isValidUpHomeUrl(f.homeUrl)) {
        row.homeUrl = buildUpHomeUrl(f.uid);
        await updateFollowInfo(f.id, {
          name: f.name ?? '',
          avatarUrl: f.avatarUrl ?? '',
          homeUrl: row.homeUrl,
        }).catch(() => {});
      }
      if (!row.name || !row.avatarUrl) {
        try {
          const up = await getUpInfo(row.uid);
          row = { ...row, name: up.name, avatarUrl: up.face };
          await updateFollowInfo(row.id, {
            name: up.name,
            avatarUrl: up.face,
          }).catch(() => {});
        } catch {
          // 拉取失败保持原样
        }
      }
      normalized.push(row);
    }
    setItems(normalized);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const addFollowByUrl = async () => {
    const url = followUrl.trim();
    if (!url) return;
    try {
      const midFromUrl = parseUpMid(url);
      if (midFromUrl) {
        await addFollow({
          uid: midFromUrl,
          name: `UP主 ${midFromUrl}`,
          homeUrl: buildUpHomeUrl(midFromUrl),
        });
      } else {
        const routed = await routeBilibiliUrl(url);
        if (!routed || routed.type !== 'video') {
          showDialog('提示', '请输入UP主空间链接（space.bilibili.com/数字）或视频链接', [
            { text: '知道了' },
          ]);
          return;
        }
        const info = await getVideoInfo(routed.id);
        await addFollow({
          uid: String(info.mid),
          name: info.author,
          homeUrl: buildUpHomeUrl(info.mid),
        });
      }
      setFollowUrl('');
      await refresh();
      showDialog('已添加关注', '点击关注项即可查看该UP主的作品', [{ text: '知道了' }]);
    } catch (e) {
      showDialog('添加关注失败', String((e as Error)?.message ?? e), [
        { text: '知道了' },
      ]);
    }
  };

  const confirmDelete = (follow: FollowRow) => {
    showDialog('取消关注', `确定取消关注「${follow.name ?? follow.uid}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '取消关注',
        style: 'destructive',
        onPress: () => {
          void deleteFollow(follow.id).then(refresh);
        },
      },
    ]);
  };

  const openFollow = (follow: FollowRow) => {
    const mid = Number(follow.uid);
    if (!mid) return;
    navigation.navigate('UpVideos', {
      mid,
      upName: follow.name ?? `UP主 ${follow.uid}`,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>我的关注</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.addInput}
          value={followUrl}
          placeholder="粘贴UP主空间/视频链接添加关注"
          placeholderTextColor="#8b98a5"
          onChangeText={setFollowUrl}
          onSubmitEditing={() => void addFollowByUrl()}
        />
        <Pressable style={styles.addButton} onPress={() => void addFollowByUrl()}>
          <Text style={styles.addButtonText}>添加</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable style={styles.cardMain} onPress={() => openFollow(item)}>
              <CoverImage uri={item.avatarUrl} size={44} />
              <View style={styles.cardInfo}>
                <Text style={styles.name} numberOfLines={1}>
                  UP主: {item.name ?? item.uid}
                </Text>
                <Text style={styles.meta}>点击查看TA的作品</Text>
              </View>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={() => confirmDelete(item)}>
              <Text style={styles.deleteText}>删除</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.hint}>暂无关注</Text>}
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
  addRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  addInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#242d38',
    paddingHorizontal: 16,
    color: '#ffffff',
  },
  addButton: {
    backgroundColor: '#1f6feb',
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
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
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardInfo: { flex: 1 },
  name: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
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
