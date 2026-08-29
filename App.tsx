import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import HomeScreen from './src/screens/HomeScreen';
import LiveScreen from './src/screens/LiveScreen';
import PlaylistScreen from './src/screens/PlaylistScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import SearchResultsScreen from './src/screens/SearchResultsScreen';
import DownloadScreen from './src/screens/DownloadScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import UpVideosScreen from './src/screens/UpVideosScreen';
import DiagnosticsScreen from './src/screens/DiagnosticsScreen';
import ThemeSelectorScreen from './src/screens/ThemeSelectorScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SearchHistoryScreen from './src/screens/SearchHistoryScreen';
import FollowsScreen from './src/screens/FollowsScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import MiniPlayer from './src/components/MiniPlayer';
import GlobalBackground from './src/components/GlobalBackground';
import ThemedDialog from './src/components/ThemedDialog';
import { ThemeProvider, useTheme } from './src/themes/ThemeContext';
import { initDatabase, getBlockedKeywords } from './src/db/schema';
import {
  attachPlayerListeners,
  setupPlayer,
} from './src/services/player/TrackPlayerService';
import { settingsStore } from './src/store/settingsStore';
import { navigationRef } from './src/navigation/navigationRef';
import type { MainTabParamList, RootStackParamList } from './src/navigation/types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// 关键：让导航器内部场景背景透明，才能透出 GlobalBackground 的主题背景/鲸鱼娘图
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    card: 'transparent',
  },
};

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Home: 'video-vintage',
            Live: 'access-point',
            Playlist: 'playlist-music',
            Profile: 'account-circle',
          };
          return (
            <MaterialCommunityIcons
              name={icons[route.name] ?? 'music-note'}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '视频' }} />
      <Tab.Screen name="Live" component={LiveScreen} options={{ title: '直播' }} />
      <Tab.Screen name="Playlist" component={PlaylistScreen} options={{ title: '歌单' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '我的' }} />
    </Tab.Navigator>
  );
}

function AppInner() {
  const { colors } = useTheme();

  useEffect(() => {
    void (async () => {
      await initDatabase();
      const keywords = await getBlockedKeywords();
      settingsStore.getState().setBlockedKeywords(keywords);
    })();

    void setupPlayer()
      .then(() => attachPlayerListeners())
      .catch(() => {
        // 播放器初始化失败不阻塞 UI；进入播放页时会再次尝试
      });
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={MD3DarkTheme}>
        <GlobalBackground>
          <NavigationContainer ref={navigationRef} theme={navTheme}>
            <View style={styles.root}>
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                  cardStyle: { backgroundColor: 'transparent' },
                }}
              >
                <Stack.Screen name="MainTabs" component={MainTabs} />
                <Stack.Screen name="Player" component={PlayerScreen} />
                <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
                <Stack.Screen name="Downloads" component={DownloadScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="UpVideos" component={UpVideosScreen} />
                <Stack.Screen name="Diagnostics" component={DiagnosticsScreen} />
                <Stack.Screen name="ThemeSelector" component={ThemeSelectorScreen} />
                <Stack.Screen name="History" component={HistoryScreen} />
                <Stack.Screen name="SearchHistory" component={SearchHistoryScreen} />
                <Stack.Screen name="Follows" component={FollowsScreen} />
                <Stack.Screen name="Favorites" component={FavoritesScreen} />
              </Stack.Navigator>
              <MiniPlayer />
            </View>
          </NavigationContainer>
        </GlobalBackground>
        <ThemedDialog />
        <StatusBar style={colors.statusBar} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
