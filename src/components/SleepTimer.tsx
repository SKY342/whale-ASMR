import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Menu } from 'react-native-paper';
import { cancelSleepTimer, startSleepTimer } from '../utils/timer';
import { settingsStore } from '../store/settingsStore';

const PRESETS = [
  { label: '关闭', minutes: 0 },
  { label: '15分钟后', minutes: 15 },
  { label: '30分钟后', minutes: 30 },
  { label: '45分钟后', minutes: 45 },
  { label: '60分钟后', minutes: 60 },
  { label: '90分钟后', minutes: 90 },
];

/** 定时关闭选择器（睡眠定时器）。 */
export default function SleepTimer() {
  const [visible, setVisible] = useState(false);
  const sleepMinutes = settingsStore((s) => s.sleepMinutes);
  const setSleepMinutes = settingsStore((s) => s.setSleepMinutes);

  const currentLabel =
    sleepMinutes > 0 ? `${sleepMinutes}分钟后` : '定时关闭';

  const select = (minutes: number) => {
    setVisible(false);
    setSleepMinutes(minutes);
    if (minutes > 0) {
      startSleepTimer({
        minutes,
        onFinish: () => setSleepMinutes(0),
      });
    } else {
      cancelSleepTimer();
    }
  };

  return (
    <View style={styles.container}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <Button
            mode="outlined"
            icon="timer-outline"
            onPress={() => setVisible(true)}
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
      </Menu>
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
});
