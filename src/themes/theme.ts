/**
 * 鲸鱼助眠主题定义。
 * 5 套皮肤：默认（现款）+ 4 套 JSON 配色。
 * 鲸鱼娘·梦幻深蓝 主题可带鲸鱼娘.jpg 背景图。
 */

import WHALE_GIRL_IMAGE from '../../example_photo/鲸鱼娘.jpg';

export type ThemeId =
  | 'default'
  | 'nightBlue'
  | 'warmGray'
  | 'duskWarm'
  | 'whaleGirl';

export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  primaryLight: string;
  text: string;
  textSecondary: string;
  border: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
  statusBar: 'light' | 'dark';
  /** 主题背景图（可选），当前仅鲸鱼娘主题使用。 */
  backgroundImage?: number;
  backgroundImageOpacity?: number;
}

export const THEMES: Record<ThemeId, ThemeColors> = {
  default: {
    background: '#313A7D',
    surface: '#262B5C',
    primary: '#58a6ff',
    primaryLight: '#3a4287',
    text: '#ffffff',
    textSecondary: '#9aa4b2',
    border: '#3a4287',
    tabBar: '#262B5C',
    tabBarActive: '#58a6ff',
    tabBarInactive: '#8b98a5',
    statusBar: 'light',
  },
  nightBlue: {
    background: '#1A237E',
    surface: '#3949AB',
    primary: '#7986CB',
    primaryLight: '#3949AB',
    text: '#FFFFFF',
    textSecondary: '#E8EAF6',
    border: '#3949AB',
    tabBar: '#141A5E',
    tabBarActive: '#7986CB',
    tabBarInactive: '#A7B3E8',
    statusBar: 'light',
  },
  warmGray: {
    background: '#263238',
    surface: '#455A64',
    primary: '#78909C',
    primaryLight: '#455A64',
    text: '#FFFFFF',
    textSecondary: '#CFD8DC',
    border: '#455A64',
    tabBar: '#1C262B',
    tabBarActive: '#78909C',
    tabBarInactive: '#B0BEC5',
    statusBar: 'light',
  },
  duskWarm: {
    background: '#3E2723',
    surface: '#5D4037',
    primary: '#8D6E63',
    primaryLight: '#5D4037',
    text: '#EFEBE9',
    textSecondary: '#D7CCC8',
    border: '#5D4037',
    tabBar: '#2E1C18',
    tabBarActive: '#A1887F',
    tabBarInactive: '#BCAAA4',
    statusBar: 'light',
  },
  whaleGirl: {
    background: '#0A3C8A',
    surface: '#0E4A9E',
    primary: '#ADD8E6',
    primaryLight: '#1F5BB5',
    text: '#F0F8FF',
    textSecondary: '#D8BFD8',
    border: '#1F5BB5',
    tabBar: '#072B63',
    tabBarActive: '#ADD8E6',
    tabBarInactive: '#9BB8D8',
    statusBar: 'light',
    backgroundImage: WHALE_GIRL_IMAGE,
    backgroundImageOpacity: 0.6,
  },
};

export const THEME_NAMES: Record<ThemeId, string> = {
  default: '现款默认',
  nightBlue: '静谧夜蓝',
  warmGray: '暗夜暖灰',
  duskWarm: '暮色暖调',
  whaleGirl: '鲸鱼娘·梦幻深蓝',
};

export const THEME_IDS: ThemeId[] = [
  'default',
  'nightBlue',
  'warmGray',
  'duskWarm',
  'whaleGirl',
];
