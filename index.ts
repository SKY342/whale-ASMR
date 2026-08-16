import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { playbackService } from './src/services/player/playbackService';

// react-native-track-player 后台播放服务注册
TrackPlayer.registerPlaybackService(() => playbackService);

registerRootComponent(App);
