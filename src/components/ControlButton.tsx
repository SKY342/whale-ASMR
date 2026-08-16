import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  icon: string;
  size?: number;
  color?: string;
  disabled?: boolean;
  onPress: () => void;
}

/**
 * 播放控制图标按钮（非文字按钮），图标来源 react-native-vector-icons。
 */
export default function ControlButton({
  icon,
  size = 36,
  color = '#e6edf3',
  disabled = false,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <MaterialCommunityIcons name={icon} size={size} color={disabled ? '#484f58' : color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.7,
  },
});
