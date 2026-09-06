import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../themes/ThemeContext';

interface Props {
  progressSeconds: number;
  duration: number;
  onSeek: (seconds: number) => void;
  /** 拖动状态上抛，用于外层禁用页面滚动。 */
  onSlidingStatusChange?: (isSliding: boolean) => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/**
 * 可拖动进度条（PanResponder，无第三方依赖）。
 * 拖动时实时预览时间；拖动期间上抛 isSliding，外层禁用滚动。
 */
export default function SeekBar({
  progressSeconds,
  duration,
  onSeek,
  onSlidingStatusChange,
}: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [previewRatio, setPreviewRatio] = useState(0);
  const widthRef = useRef(1);

  const ratio = duration > 0 ? Math.min(progressSeconds / duration, 1) : 0;
  const displayRatio = dragging ? previewRatio : ratio;

  const setSliding = (value: boolean) => {
    setDragging(value);
    onSlidingStatusChange?.(value);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setSliding(true);
        const w = widthRef.current || 1;
        const r = Math.max(0, Math.min(evt.nativeEvent.locationX / w, 1));
        setPreviewRatio(r);
      },
      onPanResponderMove: (evt) => {
        const w = widthRef.current || 1;
        const r = Math.max(0, Math.min(evt.nativeEvent.locationX / w, 1));
        setPreviewRatio(r);
      },
      onPanResponderRelease: (evt) => {
        const w = widthRef.current || 1;
        const r = Math.max(0, Math.min(evt.nativeEvent.locationX / w, 1));
        setSliding(false);
        onSeek(r * duration);
      },
      onPanResponderTerminate: () => {
        setSliding(false);
      },
    }),
  ).current;

  const previewSeconds = previewRatio * duration;

  return (
    <View>
      <View
        style={styles.track}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          widthRef.current = w;
          setWidth(w);
        }}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.fill,
            { width: `${displayRatio * 100}%` as `${number}%`, backgroundColor: colors.primary },
          ]}
        />
        <View
          style={[
            styles.thumb,
            {
              left: `${displayRatio * 100}%` as `${number}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
        {dragging ? (
          <View style={[styles.tooltip, { left: `${displayRatio * 100}%` as `${number}%` }]}>
            <Text style={[styles.tooltipText, { color: colors.text }]}>
              {formatTime(previewSeconds)}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 40,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    top: 11,
  },
  tooltip: {
    position: 'absolute',
    top: -22,
    transform: [{ translateX: -20 }],
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
