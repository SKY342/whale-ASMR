import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SegmentedButtons } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import KeywordTag from '../components/KeywordTag';
import {
  addBlockedKeyword,
  getBlockedKeywords,
  removeBlockedKeyword,
} from '../db/schema';
import { cacheClearExpired } from '../utils/cache';
import { resetWbiKeyCache } from '../utils/wbi-sign';
import { settingsStore } from '../store/settingsStore';
import type { RootStackParamList } from '../navigation/types';

export default function SettingsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const blockedKeywords = settingsStore((s) => s.blockedKeywords);
  const qualityQn = settingsStore((s) => s.qualityQn);
  const setBlockedKeywords = settingsStore((s) => s.setBlockedKeywords);
  const setQualityQn = settingsStore((s) => s.setQualityQn);

  const [newKeyword, setNewKeyword] = useState('');

  const refreshKeywords = () => {
    void getBlockedKeywords().then(setBlockedKeywords);
  };

  useEffect(() => {
    refreshKeywords();
  }, []);

  const addKeyword = () => {
    const value = newKeyword.trim();
    if (!value) return;
    void addBlockedKeyword(value, 'blacklist').then(() => {
      setNewKeyword('');
      refreshKeywords();
    });
  };

  const removeKeyword = (id: number) => {
    void removeBlockedKeyword(id).then(refreshKeywords);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>设置</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView>
        <Text style={styles.sectionTitle}>关键词屏蔽管理（黑名单）</Text>
        <Text style={styles.sectionHint}>搜索结果中命中任一屏蔽词的内容会被自动剔除</Text>
        <View style={styles.tagsRow}>
          {blockedKeywords.map((rule) => (
            <KeywordTag
              key={rule.id}
              keyword={rule.keyword}
              mode={rule.mode}
              onRemove={() => removeKeyword(rule.id)}
            />
          ))}
        </View>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={newKeyword}
            placeholder="+ 添加屏蔽词"
            placeholderTextColor="#8b949e"
            onChangeText={setNewKeyword}
            onSubmitEditing={addKeyword}
          />
          <Pressable style={styles.addButton} onPress={addKeyword}>
            <Text style={styles.addButtonText}>添加</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>音质策略</Text>
        <SegmentedButtons
          value={String(qualityQn)}
          onValueChange={(value) => setQualityQn(Number(value))}
          buttons={[
            { value: '64', label: '标准' },
            { value: '32', label: '高品质' },
            { value: '16', label: '无损(若提供)' },
          ]}
        />

        <Text style={styles.sectionTitle}>诊断</Text>
        <Pressable
          style={styles.actionCard}
          onPress={() => navigation.navigate('Diagnostics')}
        >
          <Text style={styles.actionText}>网络诊断</Text>
          <Text style={styles.actionMeta}>逐项检查B站搜索/视频信息/音频流，出了问题可截图给我</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>缓存管理</Text>
        <Pressable
          style={styles.actionCard}
          onPress={() => {
            void cacheClearExpired().then(() => {
              resetWbiKeyCache();
            });
          }}
        >
          <Text style={styles.actionText}>清理过期缓存</Text>
          <Text style={styles.actionMeta}>音频流地址TTL 2小时，封面7天</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>关于</Text>
        <Text style={styles.about}>
          鲸鱼助眠 v0.4.0{'\n'}
          纯音频 · 无互动 · 专注助眠{'\n'}
          技术方案 v2.0 · 仅手机端
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
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
    color: '#e6edf3',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#e6edf3',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 4,
  },
  sectionHint: {
    color: '#8b949e',
    fontSize: 12,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  input: {
    flex: 1,
    height: 38,
    backgroundColor: '#161b22',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#e6edf3',
  },
  addButton: {
    backgroundColor: '#21262d',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#e6edf3',
  },
  actionCard: {
    backgroundColor: '#161b22',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  actionText: {
    color: '#e6edf3',
    fontSize: 14,
    fontWeight: '600',
  },
  actionMeta: {
    color: '#8b949e',
    fontSize: 12,
    marginTop: 3,
  },
  about: {
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 22,
  },
});
