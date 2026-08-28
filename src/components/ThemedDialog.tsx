import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { dialogStore } from '../store/dialogStore';
import { useTheme } from '../themes/ThemeContext';

/**
 * 自定义主题弹窗：替代系统白色 Alert。
 * 背景色跟随主题（比主色更深一点）。
 */
export default function ThemedDialog() {
  const { colors } = useTheme();
  const { visible, title, message, buttons, close } = dialogStore();

  if (!visible) return null;

  const handlePress = (onPress?: () => void) => {
    close();
    onPress?.();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.mask}>
        <View style={[styles.box, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {message ? (
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {message}
            </Text>
          ) : null}
          <View style={styles.buttons}>
            {buttons.map((button, index) => (
              <Pressable
                key={`${button.text}_${index}`}
                style={styles.button}
                onPress={() => handlePress(button.onPress)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { color: colors.primary },
                    button.style === 'destructive' && styles.destructive,
                    button.style === 'cancel' && styles.cancel,
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  box: {
    width: '100%',
    backgroundColor: '#262B5C', // 比 #313A7D 更深一点
    borderRadius: 16,
    padding: 20,
  },
  title: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  message: {
    color: '#c9d1d9',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#58a6ff',
    fontSize: 15,
    fontWeight: '600',
  },
  destructive: {
    color: '#ff7b72',
  },
  cancel: {
    color: '#9aa4b2',
  },
});
