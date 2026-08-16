import { create } from 'zustand';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface DialogState {
  visible: boolean;
  title: string;
  message: string;
  buttons: DialogButton[];
  open: (title: string, message: string, buttons: DialogButton[]) => void;
  close: () => void;
}

export const dialogStore = create<DialogState>((set) => ({
  visible: false,
  title: '',
  message: '',
  buttons: [],
  open: (title, message, buttons) =>
    set({ visible: true, title, message, buttons }),
  close: () => set({ visible: false }),
}));

/** 统一弹窗入口：替代系统 Alert.alert。 */
export function showDialog(
  title: string,
  message: string,
  buttons: DialogButton[],
): void {
  dialogStore.getState().open(title, message, buttons);
}
