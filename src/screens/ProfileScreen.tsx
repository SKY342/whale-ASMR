import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';

interface Entry {
  icon: string;
  title: string;
  desc: string;
  route: keyof RootStackParamList;
}

export default function ProfileScreen() {
  const tabNavigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNavigation =
    tabNavigation.getParent<StackNavigationProp<RootStackParamList>>();

  const entries: Entry[] = [
    { icon: '🎨', title: '皮肤设置', desc: '5套主题切换', route: 'ThemeSelector' },
    { icon: '🕘', title: '历史记录', desc: '最近观看的视频/直播', route: 'History' },
    { icon: '🔍', title: '搜索记录', desc: '最近搜索的关键词', route: 'SearchHistory' },
    { icon: '⭐', title: '我的关注', desc: '关注的UP主作品', route: 'Follows' },
    { icon: '📁', title: '我的收藏', desc: '收藏的视频/直播', route: 'Favorites' },
    { icon: '📥', title: '下载管理', desc: '已下载音频', route: 'Downloads' },
    { icon: '🚫', title: '屏蔽词管理', desc: '仅黑名单屏蔽', route: 'Settings' },
    { icon: '🛠️', title: '网络诊断', desc: '排查B站API/播放链路', route: 'Diagnostics' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <Text style={styles.title}>👤 个人中心</Text>
        {entries.map((entry) => (
          <Pressable
            key={entry.route}
            style={styles.card}
            onPress={() =>
              stackNavigation?.navigate(entry.route as never)
            }
          >
            <Text style={styles.cardIcon}>{entry.icon}</Text>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{entry.title}</Text>
              <Text style={styles.cardMeta}>{entry.desc}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
        <Pressable style={styles.card}>
          <Text style={styles.cardIcon}>🐳</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>关于</Text>
            <Text style={styles.cardMeta}>鲸鱼助眠 v0.45.0</Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161d26cc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  cardMeta: {
    color: '#9aa4b2',
    fontSize: 12,
    marginTop: 3,
  },
  arrow: {
    color: '#8b98a5',
    fontSize: 20,
  },
});
