import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Menu } from 'react-native-paper';
import { playerStore } from '../store/playerStore';
import {
  seekTo,
  setRate,
  stopPlayback,
  togglePlay,
} from '../services/player/TrackPlayerService';
import { downloadAudio } from '../services/download/DownloadManager';
import { findSubtitleLine } from '../services/subtitle/SubtitleService';
import type { SubtitleLine } from '../services/sources';
import {
  addPlayHistory,
  addPlaylistItem,
  createPlaylist,
  getPlaylists,
} from '../db/schema';
import CoverImage from './CoverImage';
import ControlButton from './ControlButton';
import SleepTimer from './SleepTimer';

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];

interface Props {
  subtitles: SubtitleLine[];
}

/**
 * 统一播放器组件：纯音频，无视频画面。
 * - 视频模式：显示进度条，支持快进/后退
 * - 直播模式：隐藏进度条，不可快进/后退，仅暂停/播放
 */
export default function AudioPlayer({ subtitles }: Props) {
  const current = playerStore((s) => s.current);
  const isPlaying = playerStore((s) => s.isPlaying);
  const progressSeconds = playerStore((s) => s.progressSeconds);

  const [speedVisible, setSpeedVisible] = useState(false);
  const [rate, setRateState] = useState(1.0);
  const [subtitleText, setSubtitleText] = useState<string | null>(null);
  const [progressWidth, setProgressWidth] = useState(1);

  const isLive = current?.type === 'live';
  const duration = current?.duration ?? 0;

  useEffect(() => {
    const line = findSubtitleLine(subtitles, progressSeconds);
    setSubtitleText(line?.text ?? null);
  }, [progressSeconds, subtitles]);

  if (!current) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>暂无播放内容</Text>
      </View>
    );
  }

  const progressRatio =
    isLive || duration <= 0 ? 0 : Math.min(progressSeconds / duration, 1);

  const changeRate = (nextRate: number) => {
    setSpeedVisible(false);
    setRateState(nextRate);
    void setRate(nextRate);
  };

  const handleSeek = (locationX: number) => {
    if (isLive || progressWidth <= 0 || duration <= 0) return;
    const ratio = Math.max(0, Math.min(locationX / progressWidth, 1));
    void seekTo(ratio * duration);
  };

  const handleDownload = () => {
    if (!current) return;
    if (isLive) {
      Alert.alert('提示', '直播流暂不支持下载');
      return;
    }
    void downloadAudio(current.id, current.type, current.title)
      .then(() => Alert.alert('下载完成', '已保存到下载管理'))
      .catch((error: unknown) =>
        Alert.alert('下载失败', String((error as Error)?.message ?? error)),
      );
  };

  const handleAddToPlaylist = async () => {
    if (!current) return;
    try {
      let playlists = await getPlaylists();
      if (playlists.length === 0) {
        await createPlaylist('默认歌单');
        playlists = await getPlaylists();
      }
      const target = playlists[0];
      await addPlaylistItem(target.id, {
        bvid: current.id,
        title: current.title,
        coverUrl: current.artwork,
        audioUrl: undefined,
        duration: current.duration || undefined,
      });
      Alert.alert('已加入歌单', `已添加到「${target.name}」`);
    } catch (error) {
      Alert.alert('加入歌单失败', String((error as Error)?.message ?? error));
    }
  };

  const handleStop = () => {
    void stopPlayback();
    playerStore.getState().clear();
  };

  const recordHistory = () => {
    if (!current || isLive) return;
    void addPlayHistory({
      bvid: current.id,
      title: current.title,
      coverUrl: current.artwork,
      position: Math.floor(progressSeconds),
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.coverWrapper}>
        <CoverImage uri={current.artwork} size={220} style={styles.cover} />
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {current.title}
      </Text>
      <Text style={styles.author}>
        {isLive ? '🔴 直播中' : current.author}
        {current.quality ? ` · 音质 ${current.quality}` : ''}
      </Text>

      {!isLive ? (
        <View style={styles.progressSection}>
          <Pressable
            style={styles.progressTrack}
            onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)}
            onPress={(event) => handleSeek(event.nativeEvent.locationX)}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${progressRatio * 100}%` as `${number}%` },
              ]}
            />
          </Pressable>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>{formatTime(progressSeconds)}</Text>
            <Text style={styles.progressText}>{formatTime(duration)}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>直播模式 · 不可快进/后退</Text>
        </View>
      )}

      <View style={styles.controls}>
        <ControlButton icon="skip-previous" size={38} onPress={() => void seekTo(0)} />
        <ControlButton
          icon={isPlaying ? 'pause-circle' : 'play-circle'}
          size={64}
          onPress={() => void togglePlay()}
        />
        <ControlButton icon="stop-circle" size={38} onPress={handleStop} />
      </View>

      <View style={styles.optionRow}>
        <Menu
          visible={speedVisible}
          onDismiss={() => setSpeedVisible(false)}
          anchor={
            <Button mode="text" textColor="#e6edf3" onPress={() => setSpeedVisible(true)}>
              速度: {rate.toFixed(2)}x
            </Button>
          }
        >
          {SPEED_OPTIONS.map((option) => (
            <Menu.Item
              key={option}
              title={`${option.toFixed(2)}x`}
              onPress={() => changeRate(option)}
            />
          ))}
        </Menu>

        <Button mode="text" textColor="#e6edf3" onPress={handleDownload}>
          ⬇ 下载音频
        </Button>
        <Button mode="text" textColor="#e6edf3" onPress={handleAddToPlaylist}>
          ➕ 加入歌单
        </Button>
      </View>

      <SleepTimer />

      {!isLive && subtitleText ? (
        <View style={styles.subtitleBox}>
          <Text style={styles.subtitleText}>{subtitleText}</Text>
        </View>
      ) : null}

      <Button mode="text" textColor="#8b949e" onPress={recordHistory}>
        保存播放进度
      </Button>
    </ScrollView>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#8b949e',
  },
  coverWrapper: {
    marginBottom: 16,
  },
  cover: {
    borderRadius: 16,
  },
  title: {
    color: '#e6edf3',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  author: {
    color: '#8b949e',
    fontSize: 14,
    marginTop: 6,
  },
  progressSection: {
    width: '100%',
    marginTop: 20,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#21262d',
    width: '100%',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#58a6ff',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    color: '#8b949e',
    fontSize: 12,
  },
  liveBadge: {
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#2d1515',
  },
  liveText: {
    color: '#ff7b72',
    fontSize: 13,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  subtitleBox: {
    width: '100%',
    marginTop: 16,
    backgroundColor: '#161b22',
    borderRadius: 10,
    padding: 12,
  },
  subtitleText: {
    color: '#e6edf3',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
