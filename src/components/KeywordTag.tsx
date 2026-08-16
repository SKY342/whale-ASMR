import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface Props {
  keyword: string;
  mode: 'blacklist' | 'whitelist';
  onRemove?: () => void;
}

/** 屏蔽词/白名单词标签。 */
export default function KeywordTag({ keyword, mode, onRemove }: Props) {
  return (
    <Pressable style={styles.tag} onPress={onRemove}>
      <Text style={styles.text}>
        {mode === 'blacklist' ? '×' : '✓'} {keyword}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tag: {
    backgroundColor: '#21262d',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 6,
  },
  text: {
    color: '#e6edf3',
    fontSize: 13,
  },
});
