import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { THEMES, THEME_IDS, THEME_NAMES } from '../themes/theme';
import { useTheme } from '../themes/ThemeContext';
import type { RootStackParamList } from '../navigation/types';

export default function ThemeSelectorScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { themeId, setTheme } = useTheme();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>选择皮肤</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {THEME_IDS.map((id) => {
          const theme = THEMES[id];
          const active = id === themeId;
          return (
            <Pressable
              key={id}
              style={[styles.card, { backgroundColor: theme.surface }]}
              onPress={() => setTheme(id)}
            >
              <View style={styles.previewRow}>
                <View style={[styles.dot, { backgroundColor: theme.background }]} />
                <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                <View style={[styles.dot, { backgroundColor: theme.surface }]} />
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {THEME_NAMES[id]}
              </Text>
              {active ? <Text style={styles.check}>✓ 当前</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    minWidth: 60,
  },
  backText: {
    color: '#58a6ff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  check: {
    color: '#58a6ff',
    fontSize: 14,
    fontWeight: '700',
  },
});
