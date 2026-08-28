import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../themes/ThemeContext';

interface Props {
  children: React.ReactNode;
}

/**
 * 全局页面背景：根据当前主题渲染主色与可选背景图。
 * 所有页面容器需使用透明背景才能透出该层。
 */
export default function GlobalBackground({ children }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {colors.backgroundImage ? (
        <Image
          source={colors.backgroundImage}
          style={[styles.image, { opacity: colors.backgroundImageOpacity ?? 0.6 }]}
          resizeMode="cover"
          fadeDuration={0}
        />
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
  },
});
