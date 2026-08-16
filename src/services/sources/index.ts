import { BilibiliSource } from './BilibiliSource';
import type { MusicSource } from './types';

export * from './types';

const registry = new Map<string, MusicSource>();

/** 注册音源插件。第一期注册 B站源。 */
export function registerSource(source: MusicSource): void {
  registry.set(source.name, source);
}

export function getSource(name: string): MusicSource | undefined {
  return registry.get(name);
}

export function listSources(): MusicSource[] {
  return Array.from(registry.values());
}

// 默认注册
registerSource(new BilibiliSource());
