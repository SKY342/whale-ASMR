import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  value: string;
  placeholder?: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
}

export default function SearchBar({
  value,
  placeholder = '搜索ASMR/白噪声...',
  onChangeText,
  onSubmit,
}: Props) {
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
});
