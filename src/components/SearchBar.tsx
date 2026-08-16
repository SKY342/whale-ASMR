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
  placeholder = '搜索助眠音频、ASMR...',
  onChangeText,
  onSubmit,
  onPress,
  autoFocus = false,
}: Props) {
  if (onPress) {
    return (
      <Pressable style={styles.container} onPress={onPress}>
        <MaterialCommunityIcons name="magnify" size={20} color="#8b98a5" />
        <Text style={styles.placeholderText} numberOfLines={1}>
          {placeholder}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="magnify" size={20} color="#8b98a5" />
      <TextInput
        style={styles.input}
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#8b98a5"
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={autoFocus}
        editable
        selectionColor="#58a6ff"
        keyboardAppearance="dark"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // 关键：在横向布局中占满剩余宽度，否则输入区域会收缩得几乎不可见/不可点击
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242d38',
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 44,
    gap: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: '#ffffff',
    fontSize: 15,
    paddingVertical: 0,
  },
  placeholderText: {
    flex: 1,
    minWidth: 0,
    color: '#8b98a5',
    fontSize: 15,
  },
});
