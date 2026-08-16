import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Menu } from 'react-native-paper';
import {
  cancelSleepTimer,
  getSleepTimerRemainingSeconds,
  isSleepTimerActive,
  startSleepTimer,
} from '../utils/timer';
import { settingsStore } from '../store/settingsStore';

const PRESETS = [
  { label: '关闭', minutes: 0 },
  { label: '15分钟后', minutes: 15 },
  { label: '30分钟后', minutes: 30 },
  { label: '45分钟后', minutes: 45 },
  { label: '60分钟后', minutes: 60 },
  { label: '90分钟后', minutes: 90 },
];

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 定时关闭选择器（睡眠定时器），支持自定义分钟与倒计时显示。 */
export default function SleepTimer() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [customVisible, setCustomVisible] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [remaining, setRemaining] = useState(0);
  const sleepMinutes = settingsStore((s) => s.sleepMinutes);
  const setSleepMinutes = settingsStore((s) => s.setSleepMinutes);

  useEffect(() => {
    const tick = () => {
      setRemaining(isSleepTimerActive() ? getSleepTimerRemainingSeconds() : 0);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sleepMinutes]);

  const currentLabel = isSleepTimerActive()
    ? `${formatCountdown(remaining)} 后关闭`
    : '定时关闭';

  const select = (minutes: number) => {
    setMenuVisible(false);
    setSleepMinutes(minutes);
    if (minutes > 0) {
      startSleepTimer({
        minutes,
        onFinish: () => setSleepMinutes(0),
      });
      setRemaining(minutes * 60);
    } else {
      cancelSleepTimer();
      setRemaining(0);
    }
  };

  const applyCustom = () => {
    const minutes = Number(customMinutes);
    setCustomVisible(false);
    setCustomMinutes('');
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    select(Math.min(minutes, 24 * 60));
  };

  return (
    <View style={styles.container}>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            icon="timer-outline"
            onPress={() => setMenuVisible(true)}
            textColor="#e6edf3"
            style={styles.button}
          >
            {currentLabel}
          </Button>
        }
      >
        {PRESETS.map((preset) => (
          <Menu.Item
            key={preset.minutes}
            title={preset.label}
            onPress={() => select(preset.minutes)}
          />
        ))}
        <Menu.Item title="自定义分钟数..." onPress={() => {
          setMenuVisible(false);
          setCustomVisible(true);
        }} />
      </Menu>

      <Modal visible={customVisible} transparent animationType="fade">
        <View style={styles.modalMask}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>自定义定时关闭</Text>
            <TextInput
              style={styles.modalInput}
              value={customMinutes}
              placeholder="输入分钟数，如 120"
              placeholderTextColor="#8b949e"
              keyboardType="number-pad"
              onChangeText={setCustomMinutes}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancel} onPress={() => setCustomVisible(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </Pressable>
              <Pressable style={styles.modalOk} onPress={applyCustom}>
                <Text style={styles.modalOkText}>开始计时</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    borderColor: '#30363d',
  },
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    color: '#e6edf3',
    fontSize: 16,
    fontWeight: '700',
  },
  modalInput: {
    height: 42,
    backgroundColor: '#0d1117',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#e6edf3',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#21262d',
  },
  modalCancelText: {
    color: '#e6edf3',
  },
  modalOk: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1f6feb',
  },
  modalOkText: {
    color: '#ffffff',
  },
});
