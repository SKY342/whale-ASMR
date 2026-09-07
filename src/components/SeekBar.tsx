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
 * 使用绝对横坐标 pageX + measureInWindow 计算比例，
 * 保证“本体上”和“上下热区”都严格线性，不抽搐、不跳跃。
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
  const leftRef = useRef(0);
  const trackRef = useRef<View>(null);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  const ratio = duration > 0 ? Math.min(progressSeconds / duration, 1) : 0;
  const displayRatio = dragging ? previewRatio : ratio;

  const setSliding = (value: boolean) => {
    setDragging(value);
    onSlidingStatusChange?.(value);
  };

  const measureLeft = () => {
    trackRef.current?.measureInWindow((x) => {
      leftRef.current = x;
    });
  };

  const ratioFromPageX = (pageX: number) => {
    const w = widthRef.current || 1;
    return Math.max(0, Math.min((pageX - leftRef.current) / w, 1));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        measureLeft();
        setSliding(true);
        setPreviewRatio(ratioFromPageX(evt.nativeEvent.pageX));
      },
      onPanResponderMove: (evt) => {
        setPreviewRatio(ratioFromPageX(evt.nativeEvent.pageX));
      },
      onPanResponderRelease: (evt) => {
        const r = ratioFromPageX(evt.nativeEvent.pageX);
        setSliding(false);
        onSeek(r * (durationRef.current || 0));
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
        ref={trackRef}
        style={styles.track}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          widthRef.current = w;
          setWidth(w);
          measureLeft();
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
