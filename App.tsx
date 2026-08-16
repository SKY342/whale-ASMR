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
import MiniPlayer from './src/components/MiniPlayer';
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

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#161b22',
          borderTopColor: '#21262d',
        },
        tabBarActiveTintColor: '#58a6ff',
        tabBarInactiveTintColor: '#8b949e',
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

export default function App() {
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
        <NavigationContainer ref={navigationRef} theme={DarkTheme}>
          <View style={styles.root}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="Player" component={PlayerScreen} />
              <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
              <Stack.Screen name="Downloads" component={DownloadScreen} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="UpVideos" component={UpVideosScreen} />
              <Stack.Screen name="Diagnostics" component={DiagnosticsScreen} />
            </Stack.Navigator>
            <MiniPlayer />
          </View>
        </NavigationContainer>
        <StatusBar style="light" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
});
