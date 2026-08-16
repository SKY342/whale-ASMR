import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import AudioPlayer from '../components/AudioPlayer';
import type { SubtitleLine } from '../services/sources';
import { playQueueItem } from '../services/player/PlayerQueueService';
import { fetchSubtitles } from '../services/subtitle/SubtitleService';
import type { RootStackParamList } from '../navigation/types';

/**
 * 统一播放器页：所有 B站内容（视频/直播）均进入此页面，
 * 无视频画面，纯音频播放。
 */
export default function PlayerScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Player'>>();
  const { id, type, title, author, artwork } = route.params;

  const [subtitles, setSubtitles] = useState<SubtitleLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        await playQueueItem({
          id,
          type,
          title: title ?? (type === 'live' ? '直播' : 'B站音频'),
          author: author ?? 'B站',
          artwork: artwork ?? '',
        });

        if (type === 'video') {
          const subs = await fetchSubtitles(id, type);
          if (!cancelled) setSubtitles(subs);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String((e as Error)?.message ?? e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, type, title, author, artwork]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>正在播放</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.hint}>正在解析音频流...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>返回</Text>
          </Pressable>
        </View>
      ) : (
        <AudioPlayer subtitles={subtitles} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    minWidth: 60,
  },
  backText: {
    color: '#58a6ff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#e6edf3',
    fontSize: 16,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  hint: {
    color: '#8b949e',
  },
  error: {
    color: '#ff7b72',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#21262d',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#e6edf3',
  },
});
