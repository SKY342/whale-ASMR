import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
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
  addFavorite,
  addFollow,
  deleteFavorite,
  deleteFollow,
  getFavorites,
  getFollows,
  updateFollowInfo,
} from '../db/schema';
import { routeBilibiliUrl } from '../services/router/UrlRouter';
import { getUpInfo, getVideoInfo } from '../utils/bilibili-api';
import { buildUpHomeUrl, parseUpMid } from '../utils/bili-router';
import CoverImage from '../components/CoverImage';
import { playerQueueStore, toQueueItem } from '../store/playerQueueStore';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

export default function ProfileScreen() {
  const tabNavigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNavigation =
    tabNavigation.getParent<StackNavigationProp<RootStackParamList>>();

  const [follows, setFollows] = useState<
    { id: number; uid: string; name: string | null; avatarUrl: string | null; homeUrl: string | null }[]
  >([]);
  const [favorites, setFavorites] = useState<{ id: number; mediaId: string; title: string | null; url: string | null }[]>([]);
  const [followUrl, setFollowUrl] = useState('');
  const [favoriteUrl, setFavoriteUrl] = useState('');

  const refresh = () => {
    void Promise.all([getFollows(), getFavorites()]).then(async ([f, fav]) => {
      setFollows(f);
      setFavorites(fav);
      // 补齐旧数据的昵称/头像（旧版本只存了 UID）
      for (const follow of f) {
        if (!follow.name || follow.name.startsWith('UP主 ') || !follow.avatarUrl) {
          try {
            const info = await getUpInfo(follow.uid);
            await updateFollowInfo(follow.id, {
              name: info.name,
              avatarUrl: info.face,
              homeUrl: buildUpHomeUrl(follow.uid),
            });
            setFollows((prev) =>
              prev.map((item) =>
                item.id === follow.id
                  ? { ...item, name: info.name, avatarUrl: info.face, homeUrl: buildUpHomeUrl(follow.uid) }
                  : item,
              ),
            );
          } catch {
            // 拉取失败保持原样
          }
        }
      }
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const addFollowByUrl = async () => {
    const url = followUrl.trim();
    if (!url) return;
    try {
      // 支持 space.bilibili.com/<mid> 或视频链接
      const midFromUrl = parseUpMid(url);
      if (midFromUrl) {
        let name = `UP主 ${midFromUrl}`;
        let avatarUrl = '';
        try {
          const upInfo = await getUpInfo(midFromUrl);
          name = upInfo.name;
          avatarUrl = upInfo.face;
        } catch {
          // 拉取失败时先存编号
        }
        await addFollow({
          uid: midFromUrl,
          name,
          avatarUrl,
          homeUrl: buildUpHomeUrl(midFromUrl),
        });
      } else {
        const routed = await routeBilibiliUrl(url);
        if (!routed || routed.type !== 'video') {
          Alert.alert('提示', '请输入UP主空间链接（space.bilibili.com/数字）或视频链接');
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
      refresh();
      Alert.alert('已添加关注', '点击关注项即可查看该UP主的作品');
    } catch (e) {
      Alert.alert('添加关注失败', String((e as Error)?.message ?? e));
    }
  };

  const addFavoriteByUrl = async () => {
    const url = favoriteUrl.trim();
    if (!url) return;
    await addFavorite({ mediaId: `manual_${Date.now()}`, title: url, url });
    setFavoriteUrl('');
    refresh();
    Alert.alert('已收藏', '点击收藏项可在App内打开（视频/直播链接会直接进入播放器）');
  };

  const openFavorite = async (url: string | null) => {
    if (!url) return;
    try {
      const queueItems = await Promise.all(
        favorites.map(async (fav) => {
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
      if (validQueue.length === 0) {
        Alert.alert('暂不支持该链接', '目前仅支持视频、直播和 b23.tv 短链');
        return;
      }

      const routed = await routeBilibiliUrl(url);
      if (!routed) {
        Alert.alert('暂不支持该链接', '目前仅支持视频、直播和 b23.tv 短链');
        return;
      }
      const index = validQueue.findIndex(
        (i) => i.id === routed.id && i.type === routed.type,
      );
      playerQueueStore
        .getState()
        .setQueue(validQueue, Math.max(index, 0), 'favorites');

      stackNavigation?.navigate('Player', {
        id: routed.id,
        type: routed.type,
      });
    } catch {
      Alert.alert('暂不支持该链接', '目前仅支持视频、直播和 b23.tv 短链');
    }
  };

  const openFollow = (follow: { uid: string; name: string | null }) => {
    const mid = Number(follow.uid);
    if (!mid) return;
    stackNavigation?.navigate('UpVideos', {
      mid,
      upName: follow.name ?? `UP主 ${follow.uid}`,
    });
  };

  const confirmDeleteFollow = (follow: { id: number; name: string | null; uid: string }) => {
    Alert.alert('取消关注', `确定取消关注「${follow.name ?? follow.uid}」吗？`, [
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

  const confirmDeleteFavorite = (favorite: { id: number; title: string | null; url: string | null }) => {
    Alert.alert('删除收藏', `确定删除收藏「${favorite.title ?? favorite.url}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void deleteFavorite(favorite.id).then(refresh);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <Text style={styles.title}>👤 个人中心</Text>

        <Text style={styles.sectionTitle}>⭐ 我的关注</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={followUrl}
            placeholder="输入UP主空间链接或视频链接"
            placeholderTextColor="#8b949e"
            onChangeText={setFollowUrl}
          />
          <Pressable style={styles.addButton} onPress={() => void addFollowByUrl()}>
            <Text style={styles.addButtonText}>添加</Text>
          </Pressable>
        </View>
        {follows.map((item) => (
          <Pressable
            key={String(item.id)}
            style={styles.card}
            onPress={() => openFollow(item)}
            onLongPress={() => confirmDeleteFollow(item)}
          >
            <View style={styles.followRow}>
              <CoverImage uri={item.avatarUrl} size={40} />
              <View style={styles.followInfo}>
                <Text style={styles.cardTitle}>UP主: {item.name ?? item.uid}</Text>
                <Text style={styles.cardMeta}>点击查看TA的作品 · 长按取消关注</Text>
              </View>
            </View>
          </Pressable>
        ))}

        <Text style={styles.sectionTitle}>📁 我的收藏</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={favoriteUrl}
            placeholder="输入视频/直播链接"
            placeholderTextColor="#8b949e"
            onChangeText={setFavoriteUrl}
          />
          <Pressable style={styles.addButton} onPress={() => void addFavoriteByUrl()}>
            <Text style={styles.addButtonText}>收藏</Text>
          </Pressable>
        </View>
        {favorites.map((item) => (
          <Pressable
            key={String(item.id)}
            style={styles.card}
            onPress={() => void openFavorite(item.url)}
            onLongPress={() => confirmDeleteFavorite(item)}
          >
            <Text style={styles.cardTitle} numberOfLines={1}>
              收藏: {item.title ?? item.url}
            </Text>
            <Text style={styles.cardMeta}>点击在App内打开 · 长按删除</Text>
          </Pressable>
        ))}

        <Text style={styles.sectionTitle}>⚙️ 设置</Text>
        <Pressable
          style={styles.card}
          onPress={() => stackNavigation?.navigate('Settings')}
        >
          <Text style={styles.cardTitle}>关键词屏蔽管理</Text>
          <Text style={styles.cardMeta}>仅黑名单屏蔽</Text>
        </Pressable>
        <Pressable
          style={styles.card}
          onPress={() => stackNavigation?.navigate('Downloads')}
        >
          <Text style={styles.cardTitle}>下载管理</Text>
          <Text style={styles.cardMeta}>已下载音频</Text>
        </Pressable>
        <Pressable
          style={styles.card}
          onPress={() => stackNavigation?.navigate('Diagnostics')}
        >
          <Text style={styles.cardTitle}>网络诊断</Text>
          <Text style={styles.cardMeta}>排查B站API/播放链路问题</Text>
        </Pressable>
        <Pressable style={styles.card}>
          <Text style={styles.cardTitle}>音源管理</Text>
          <Text style={styles.cardMeta}>当前：B站（唯一音源）</Text>
        </Pressable>
        <Pressable style={styles.card}>
          <Text style={styles.cardTitle}>关于</Text>
          <Text style={styles.cardMeta}>鲸鱼助眠 v0.4.1</Text>
        </Pressable>
      </ScrollView>
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
  sectionTitle: {
    color: '#e6edf3',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    height: 38,
    backgroundColor: '#161b22',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#e6edf3',
    fontSize: 13,
  },
  addButton: {
    backgroundColor: '#21262d',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#e6edf3',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#161b22',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  followInfo: {
    flex: 1,
  },
  cardTitle: {
    color: '#e6edf3',
    fontSize: 14,
    fontWeight: '600',
  },
  cardMeta: {
    color: '#8b949e',
    fontSize: 12,
    marginTop: 3,
  },
});
