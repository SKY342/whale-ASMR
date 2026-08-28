/**
 * 音源插件接口（参考 MusicFree 的枪弹分离设计）。
 *
 * 第一期仅实现 BilibiliSource，但该接口必须在第一期就落地，
 * 未来接入酷狗/喜马拉雅等音源时只需新增实现类。
 */

export interface SearchResult {
  /** 视频 bvid / 直播房间号，音源内唯一标识。 */
  id: string;
  type: 'video' | 'live';
  title: string;
  author: string;
  coverUrl: string;
  /** 秒。直播无时长。 */
  duration?: number;
  playCount?: string;
  description?: string;
  /** B站标签（搜索接口若返回则填入）。 */
  tags?: string[];
}

export interface AudioSourceInfo {
  url: string;
  quality?: string;
  format?: string;
  isLive: boolean;
  duration?: number;
  title?: string;
  artist?: string;
  artwork?: string;
}

export interface SubtitleLine {
  start: number;
  end: number;
  text: string;
}

export interface MusicSource {
  name: string;

  search(keyword: string): Promise<SearchResult[]>;

  /** 直播搜索（可选）：搜索直播间。 */
  searchLive?(keyword: string): Promise<SearchResult[]>;

  getAudioUrl(
    id: string,
    type: 'video' | 'live',
  ): Promise<AudioSourceInfo>;

  getCoverUrl?(id: string, type: 'video' | 'live'): Promise<string>;

  getSubtitle?(id: string): Promise<SubtitleLine[]>;

  /** 下载：返回可离线播放的音频地址/本地文件路径。 */
  download?(id: string, type: 'video' | 'live'): Promise<string>;
}
