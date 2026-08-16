import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import {
  ensureBuvid3,
  getVideoAudioStream,
  getVideoInfo,
  searchVideos,
} from '../utils/bilibili-api';
import type { RootStackParamList } from '../navigation/types';

interface DiagStep {
  name: string;
  status: 'ok' | 'fail' | 'running';
  detail: string;
}

export default function DiagnosticsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [steps, setSteps] = useState<DiagStep[]>([]);

  const run = async () => {
    setSteps([
      { name: '获取 buvid3 风控Cookie', status: 'running', detail: '' },
      { name: 'B站搜索接口', status: 'running', detail: '' },
      { name: '视频信息接口', status: 'running', detail: '' },
      { name: 'WBI签名取音频流', status: 'running', detail: '' },
      { name: '音频流可达性', status: 'running', detail: '' },
    ]);

    const update = (index: number, patch: Partial<DiagStep>) => {
      setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    };

    try {
      await ensureBuvid3();
      update(0, { status: 'ok', detail: 'buvid3 已就绪' });
    } catch (e) {
      update(0, { status: 'fail', detail: String((e as Error)?.message ?? e) });
    }

    let firstBvid = '';
    try {
      const results = await searchVideos('助眠');
      firstBvid = results[0]?.id ?? '';
      update(1, { status: 'ok', detail: `搜索到 ${results.length} 条结果` });
    } catch (e) {
      update(1, { status: 'fail', detail: String((e as Error)?.message ?? e) });
    }

    let cid = 0;
    try {
      if (!firstBvid) throw new Error('搜索无结果，无法继续');
      const info = await getVideoInfo(firstBvid);
      cid = info.cid;
      update(2, { status: 'ok', detail: `${info.title.slice(0, 30)} / cid=${cid}` });
    } catch (e) {
      update(2, { status: 'fail', detail: String((e as Error)?.message ?? e) });
    }

    let audioUrl = '';
    try {
      if (!cid) throw new Error('无cid，无法继续');
      const audio = await getVideoAudioStream(firstBvid, cid);
      audioUrl = audio.url;
      update(3, { status: 'ok', detail: audioUrl ? audioUrl.slice(0, 60) + '...' : '未获取到URL' });
    } catch (e) {
      update(3, { status: 'fail', detail: String((e as Error)?.message ?? e) });
    }

    try {
      if (!audioUrl) throw new Error('无音频URL，无法继续');
      const res = await fetch(audioUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          Referer: 'https://www.bilibili.com/',
        },
      });
      update(4, { status: 'ok', detail: `HTTP ${res.status}` });
    } catch (e) {
      update(4, { status: 'fail', detail: String((e as Error)?.message ?? e) });
    }
  };

  useEffect(() => {
    void run();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>网络诊断</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {steps.map((step, index) => (
          <View key={step.name} style={styles.card}>
            <Text style={styles.stepName}>
              {step.status === 'ok' ? '✅' : step.status === 'fail' ? '❌' : '⏳'} {index + 1}. {step.name}
            </Text>
            {step.detail ? <Text style={styles.detail}>{step.detail}</Text> : null}
          </View>
        ))}
        <Pressable style={styles.rerun} onPress={() => void run()}>
          <Text style={styles.rerunText}>重新检测</Text>
        </Pressable>
        <Text style={styles.tip}>把本页截图发给我，可以快速定位问题。</Text>
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
    color: '#e6edf3',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#161b22',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  stepName: {
    color: '#e6edf3',
    fontSize: 14,
    fontWeight: '600',
  },
  detail: {
    color: '#8b949e',
    fontSize: 12,
    marginTop: 4,
  },
  rerun: {
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  rerunText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  tip: {
    color: '#8b949e',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
});
