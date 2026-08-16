import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * 全局导航引用：供非页面组件（如 MiniPlayer）在导航容器外部/兄弟位置
 * 直接触发路由跳转。
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToPlayer(params: RootStackParamList['Player']): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Player', params);
  }
}

export function navigateToDownloads(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Downloads');
  }
}

export function navigateToSettings(): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Settings');
  }
}
