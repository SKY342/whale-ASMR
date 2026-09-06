import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Menu } from 'react-native-paper';
import { playerStore } from '../store/playerStore';
import { showDialog } from '../store/dialogStore';
import {
  seekTo,
  setRate,
  togglePlay,
} from '../services/player/TrackPlayerService';
import {
  playNextInQueue,
  playPreviousInQueue,
} from '../services/player/PlayerQueueService';
import { downloadAudio } from '../services/download/DownloadManager';
import { findSubtitleLine } from '../services/subtitle/SubtitleService';
import type { SubtitleLine } from '../services/sources';
import {
  addFollow,
  addPlayHistory,
  addPlaylistItem,
  createPlaylist,
  getFollows,
  getPlaylists,
  hasPlaylistItem,
} from '../db/schema';
import type { Playlist } from '../db/schema';
import { getUpInfo } from '../utils/bilibili-api';
import { buildUpHomeUrl } from '../utils/bili-router';
import CoverImage from './CoverImage';
import ControlButton from './ControlButton';
import SleepTimer from './SleepTimer';
import SeekBar from './SeekBar';
import { useTheme } from '../themes/ThemeContext';

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
  const { colors } = useTheme();
  const current = playerStore((s) => s.current);
  const isPlaying = playerStore((s) => s.isPlaying);
  const progressSeconds = playerStore((s) => s.progressSeconds);
  const playMode = playerStore((s) => s.playMode);
  const setPlayMode = playerStore((s) => s.setPlayMode);

  const [speedVisible, setSpeedVisible] = useState(false);
  const [rate, setRateState] = useState(1.0);
  const [subtitleText, setSubtitleText] = useState<string | null>(null);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isFollowed, setIsFollowed] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isUserSliding, setIsUserSliding] = useState(false);

  const isLive = current?.type === 'live';
  const duration = current?.duration ?? 0;

  useEffect(() => {
    const line = findSubtitleLine(subtitles, progressSeconds);
    setSubtitleText(line?.text ?? null);
  }, [progressSeconds, subtitles]);

  useEffect(() => {
    let cancelled = false;
    if (!current?.mid) {
      setIsFollowed(false);
      return;
    }
    void getFollows()
      .then((list) => {
        if (!cancelled) {
          setIsFollowed(list.some((f) => f.uid === String(current.mid)));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [current?.id, current?.mid]);

  if (!current) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>暂无播放内容</Text>
      </View>
    );
  }

  const changeRate = (nextRate: number) => {
    setSpeedVisible(false);
    setRateState(nextRate);
    void setRate(nextRate);
  };

  const handleDownload = () => {
    if (!current) return;
    if (isLive) {
      showDialog('提示', '直播流暂不支持下载', [{ text: '知道了' }]);
      return;
    }
    void downloadAudio(current.id, current.type, current.title)
      .then(() =>
        showDialog('下载完成', '已保存到下载管理', [{ text: '知道了' }]),
      )
      .catch((error: unknown) =>
        showDialog('下载失败', String((error as Error)?.message ?? error), [
          { text: '知道了' },
        ]),
      );
  };

  const openPlaylistSelector = async () => {
    if (!current) return;
    try {
      const list = await getPlaylists();
      setPlaylists(list);
      setNewPlaylistName('');
      setPlaylistModalVisible(true);
    } catch (error) {
      showDialog('打开歌单失败', String((error as Error)?.message ?? error), [
        { text: '知道了' },
      ]);
    }
  };

  const addToPlaylist = async (playlist: Playlist) => {
    if (!current) return;
    try {
      const exists = await hasPlaylistItem(playlist.id, current.id);
      if (exists) {
        setPlaylistModalVisible(false);
        showDialog('提示', '该音频已在歌单中', [{ text: '知道了' }]);
        return;
      }
      await addPlaylistItem(playlist.id, {
        bvid: current.id,
        title: current.title,
        coverUrl: current.artwork,
        audioUrl: undefined,
        duration: current.duration || undefined,
      });
      setPlaylistModalVisible(false);
      showDialog('已加入歌单', `已添加到「${playlist.name}」`, [
        { text: '知道了' },
      ]);
    } catch (error) {
      showDialog('加入歌单失败', String((error as Error)?.message ?? error), [
        { text: '知道了' },
      ]);
    }
  };

  const handleFollow = async () => {
    if (!current?.mid || followLoading) return;
    setFollowLoading(true);
    const uid = String(current.mid);
    const fallback = {
      uid,
      name: current.author || undefined,
      avatarUrl: undefined,
      homeUrl: buildUpHomeUrl(uid),
    };
    try {
      const up = await getUpInfo(uid);
      await addFollow({
        ...fallback,
        name: up.name || fallback.name,
        avatarUrl: up.face || undefined,
      });
      setIsFollowed(true);
      showDialog('已关注', `已关注 UP主 ${up.name}`, [{ text: '知道了' }]);
    } catch {
      // 网络/风控失败时降级：用播放器已有数据直接写入，避免关注丢失
      await addFollow(fallback).catch(() => {});
      setIsFollowed(true);
      showDialog('已关注', '已关注（网络受限，昵称/头像稍后自动补全）', [
        { text: '知道了' },
      ]);
    } finally {
      setFollowLoading(false);
    }
  };

  const createAndAdd = async () => {
    if (!current) return;
    const name = newPlaylistName.trim();
    if (!name) return;
    try {
      await createPlaylist(name);
      const list = await getPlaylists();
      setPlaylists(list);
      setNewPlaylistName('');
      const created = list.find((p) => p.name === name);
      if (created) await addToPlaylist(created);
    } catch (error) {
      showDialog('新建歌单失败', String((error as Error)?.message ?? error), [
        { text: '知道了' },
      ]);
    }
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
    <>
    <ScrollView
    contentContainerStyle={styles.container}
    scrollEnabled={!isUserSliding}
  >
      <View style={styles.coverWrapper}>
        <CoverImage uri={current.artwork} size={220} style={styles.cover} />
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {current.title}
      </Text>
      <View style={styles.authorRow}>
        <Text style={[styles.author, { color: colors.text }]}>
          {isLive ? '🔴 直播中 · ' : ''}
          {current.author}
          {current.quality ? ` · 音质 ${current.quality}` : ''}
        </Text>
        {current.mid ? (
          <Pressable
            style={[styles.followButton, isFollowed && styles.followButtonActive]}
            onPress={() => void handleFollow()}
            disabled={isFollowed || followLoading}
          >
            <Text style={[styles.followButtonText, isFollowed && styles.followButtonTextActive]}>
              {followLoading ? '关注中...' : isFollowed ? '已关注' : '+ 关注'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {!isLive ? (
        <View style={styles.progressSection}>
          <SeekBar
            progressSeconds={progressSeconds}
            duration={duration}
            onSeek={(seconds) => void seekTo(seconds)}
            onSlidingStatusChange={setIsUserSliding}
          />
          <View style={styles.progressLabels}>
            <Text style={[styles.progressText, { color: colors.text }]}>
              {formatTime(progressSeconds)}
            </Text>
            <Text style={[styles.progressText, { color: colors.text }]}>
              {formatTime(duration)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>直播模式 · 不可快进/后退</Text>
        </View>
      )}

      <View style={styles.controls}>
        <ControlButton
          icon="skip-previous"
          size={38}
          onPress={() => void playPreviousInQueue().catch(() => {})}
        />
        <ControlButton
          icon={isPlaying ? 'pause-circle' : 'play-circle'}
          size={64}
          onPress={() => void togglePlay()}
        />
        <ControlButton
          icon="skip-next"
          size={38}
          onPress={() => void playNextInQueue().catch(() => {})}
        />
      </View>

      <View style={styles.optionRow}>
        <Button
          mode="text"
          textColor={playMode === 'loop-one' ? '#58a6ff' : '#e6edf3'}
          onPress={() =>
            setPlayMode(playMode === 'loop-one' ? 'sequence' : 'loop-one')
          }
        >
          {playMode === 'loop-one' ? '🔂 单曲循环' : '🔁 顺序播放'}
        </Button>
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
        <Button mode="text" textColor="#e6edf3" onPress={() => void openPlaylistSelector()}>
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

    <Modal visible={playlistModalVisible} transparent animationType="slide">
      <View style={styles.modalMask}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>选择要加入的歌单</Text>
          <FlatList
            data={playlists}
            keyExtractor={(item) => String(item.id)}
            style={styles.playlistList}
            renderItem={({ item }) => (
              <Pressable style={styles.playlistRow} onPress={() => void addToPlaylist(item)}>
                <Text style={styles.playlistName}>🎵 {item.name}</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.modalHint}>暂无歌单，请先新建</Text>}
          />
          <View style={styles.modalCreateRow}>
            <TextInput
              style={styles.modalInput}
              value={newPlaylistName}
              placeholder="新建歌单名称"
              placeholderTextColor="#8b949e"
              onChangeText={setNewPlaylistName}
            />
            <Pressable style={styles.modalOk} onPress={() => void createAndAdd()}>
              <Text style={styles.modalOkText}>新建并添加</Text>
            </Pressable>
          </View>
          <Pressable style={styles.modalCancel} onPress={() => setPlaylistModalVisible(false)}>
            <Text style={styles.modalCancelText}>取消</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
    </>
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
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  author: {
    color: '#8b949e',
    fontSize: 14,
  },
  followButton: {
    backgroundColor: '#1f6feb',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  followButtonActive: {
    backgroundColor: '#21262d',
  },
  followButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  followButtonTextActive: {
    color: '#8b949e',
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
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#161b22',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    color: '#e6edf3',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  playlistList: {
    marginBottom: 10,
  },
  playlistRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#21262d',
  },
  playlistName: {
    color: '#e6edf3',
    fontSize: 15,
  },
  modalHint: {
    color: '#8b949e',
    fontSize: 13,
    paddingVertical: 10,
  },
  modalCreateRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#0d1117',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#e6edf3',
  },
  modalOk: {
    backgroundColor: '#1f6feb',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOkText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalCancel: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#8b949e',
    fontSize: 15,
  },
});
