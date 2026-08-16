import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { playerStore } from '../store/playerStore';
import { togglePlay } from '../services/player/TrackPlayerService';
import { navigateToPlayer } from '../navigation/navigationRef';
import CoverImage from './CoverImage';
import ControlButton from './ControlButton';

/**
 * 全局悬浮迷你播放器：常驻底部，切换页面时不消失，
 * 点击信息区展开进入完整播放器页。
 */
export default function MiniPlayer() {
  const current = playerStore((s) => s.current);
  const isPlaying = playerStore((s) => s.isPlaying);

  if (!current) return null;

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.infoArea}
        onPress={() =>
          navigateToPlayer({
            id: current.id,
            type: current.type,
            title: current.title,
            author: current.author,
            artwork: current.artwork,
            duration: current.duration,
          })
        }
      >
        <CoverImage uri={current.artwork} size={40} />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {current.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {current.type === 'live' ? '🔴 直播' : current.author}
          </Text>
        </View>
      </Pressable>
      <ControlButton
        icon={isPlaying ? 'pause' : 'play'}
        size={26}
        onPress={() => void togglePlay()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
    backgroundColor: '#161b22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363d',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
  },
  infoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#e6edf3',
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    color: '#8b949e',
    fontSize: 12,
  },
});
