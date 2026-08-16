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
    color: '#ffffff',
    fontSize: 15,
    paddingVertical: 0,
  },
  placeholderText: {
    flex: 1,
    color: '#8b98a5',
    fontSize: 15,
  },
});
