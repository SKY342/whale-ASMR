import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  value: string;
  placeholder?: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  /** 传入后渲染为"假输入框"（点击跳转用），不渲染 TextInput。 */
  onPress?: () => void;
  /** 进入页面时自动聚焦弹出输入法。 */
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  placeholder = '搜索ASMR/白噪声...',
  onChangeText,
  onSubmit,
  onPress,
  autoFocus = false,
}: Props) {
  if (onPress) {
    return (
      <Pressable style={styles.container} onPress={onPress}>
        <MaterialCommunityIcons name="magnify" size={20} color="#8b949e" />
        <Text style={styles.placeholderText} numberOfLines={1}>
          {placeholder}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="magnify" size={20} color="#8b949e" />
      <TextInput
        style={styles.input}
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#8b949e"
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={autoFocus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161b22',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  input: {
    flex: 1,
    color: '#e6edf3',
    fontSize: 15,
    paddingVertical: 0,
  },
  placeholderText: {
    flex: 1,
    color: '#8b949e',
    fontSize: 15,
  },
});
