import {
  getLiveStreamUrl,
  getVideoAudioStream,
  getVideoInfo,
  getVideoSubtitles,
  searchVideos,
} from '../../utils/bilibili-api';
import type {
  AudioSourceInfo,
  MusicSource,
  SearchResult,
  SubtitleLine,
} from './types';

/**
 * B站音源实现（第一期唯一音源）。
 *
 * 播放链路：
 * 搜索 → 拿到 bvid → view 接口取 cid → WBI 签名 playurl 取 DASH 音频流
 * 直播 → room_init 解析真实房间号 → playUrl 取直播流
 */
export class BilibiliSource implements MusicSource {
  readonly name = 'bilibili';

  async search(keyword: string): Promise<SearchResult[]> {
    const videos = await searchVideos(keyword.trim());
    return videos;
  }

  async getAudioUrl(
    id: string,
    type: 'video' | 'live',
  ): Promise<AudioSourceInfo> {
    if (type === 'live') {
      const stream = await getLiveStreamUrl(id);
      return {
        url: stream.url,
        quality: stream.quality,
        format: stream.format,
        isLive: true,
      };
    }

    const info = await getVideoInfo(id);
    const stream = await getVideoAudioStream(id, info.cid);
    return {
      url: stream.url,
      quality: stream.quality,
      format: stream.format,
      isLive: false,
      duration: info.duration,
      title: info.title,
      artist: info.author,
      artwork: info.coverUrl,
    };
  }

  async getCoverUrl(
    id: string,
    type: 'video' | 'live',
  ): Promise<string> {
    if (type === 'video') {
      const info = await getVideoInfo(id);
      return info.coverUrl;
    }
    // 直播封面：返回空，由前端使用主播头像/占位图
    return '';
  }

  async getSubtitle(id: string): Promise<SubtitleLine[]> {
    const info = await getVideoInfo(id);
    return getVideoSubtitles(info.bvid, info.cid);
  }

  async download(id: string, type: 'video' | 'live'): Promise<string> {
    const audio = await this.getAudioUrl(id, type);
    return audio.url;
  }
}
