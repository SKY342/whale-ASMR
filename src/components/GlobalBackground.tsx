import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import WHALE_GIRL_IMAGE from '../../example_photo/鲸鱼娘竖屏图片.jpg';

interface Props {
  children: React.ReactNode;
}

/**
 * 全局页面背景：鲸鱼娘竖屏图（低透明度）+ 主色 #313A7D。
 * 所有页面容器需使用透明背景才能透出该层。
 */
export default function GlobalBackground({ children }: Props) {
  return (
    <View style={styles.root}>
      <Image
        source={WHALE_GIRL_IMAGE}
        style={styles.image}
        resizeMode="cover"
        fadeDuration={0}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#313A7D',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.26,
  },
  content: {
    flex: 1,
  },
});
