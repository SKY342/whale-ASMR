export type RootStackParamList = {
  MainTabs: undefined;
  Player: {
    id: string;
    type: 'video' | 'live';
    title?: string;
    author?: string;
    artwork?: string;
    duration?: number;
  };
  Downloads: undefined;
  Settings: undefined;
  UpVideos: {
    mid: number;
    upName: string;
  };
  Diagnostics: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: { keyword?: string } | undefined;
  Playlist: undefined;
  Profile: undefined;
};
