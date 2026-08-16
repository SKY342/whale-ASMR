import { getSource } from '../sources';
import type { SubtitleLine } from '../sources';

/**
 * AI字幕服务（尽力而为）。
 * 播放视频音频时尝试获取 B站 AI 字幕；获取失败返回空数组，不影响播放。
 */
export async function fetchSubtitles(
  id: string,
  type: 'video' | 'live',
): Promise<SubtitleLine[]> {
  if (type !== 'video') return [];
  const source = getSource('bilibili');
  if (!source?.getSubtitle) return [];

  try {
    return await source.getSubtitle(id);
  } catch {
    return [];
  }
}

/** 根据当前播放进度查找字幕行。 */
export function findSubtitleLine(
  subtitles: SubtitleLine[],
  positionSeconds: number,
): SubtitleLine | null {
  if (subtitles.length === 0) return null;
  return (
    subtitles.find(
      (line) => positionSeconds >= line.start && positionSeconds <= line.end,
    ) ?? null
  );
}
