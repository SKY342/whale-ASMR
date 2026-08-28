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
  SearchResults: {
    type: 'video' | 'live';
    keyword?: string;
  };
  Downloads: undefined;
  Settings: undefined;
  UpVideos: {
    mid: number;
    upName: string;
  };
  Diagnostics: undefined;
  ThemeSelector: undefined;
  History: undefined;
  SearchHistory: undefined;
  Follows: undefined;
  Favorites: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Live: undefined;
  Playlist: undefined;
  Profile: undefined;
};
