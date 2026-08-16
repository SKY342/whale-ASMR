import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { cacheCover } from '../utils/cache';

interface Props {
  uri?: string | null;
  size?: number;
  style?: object;
}

/**
 * 封面图组件：带本地缓存与占位图。
 * 直播封面等获取不到的场合显示音乐图标占位。
 */
export default function CoverImage({ uri, size = 64, style }: Props) {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!uri) {
      setLocalUri(null);
      setFailed(true);
      return;
    }
    setFailed(false);
    cacheCover(uri)
      .then((cached) => {
        if (mounted) setLocalUri(cached ?? uri);
      })
      .catch(() => {
        if (mounted) setLocalUri(uri);
      });
    return () => {
      mounted = false;
    };
  }, [uri]);

  const source = !failed && (localUri || uri) ? { uri: localUri || uri! } : undefined;

  if (!source) {
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, borderRadius: size / 8 },
          style,
        ]}
      >
        <MaterialCommunityIcons name="music-note" size={size * 0.45} color="#8b949e" />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={[{ width: size, height: size, borderRadius: size / 8 }, style]}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#161b22',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
