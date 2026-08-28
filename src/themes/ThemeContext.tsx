import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { THEMES, ThemeColors, ThemeId } from './theme';
import { db } from '../db/schema';

const THEME_STORAGE_KEY = 'theme_id';

interface ThemeContextType {
  themeId: ThemeId;
  colors: ThemeColors;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: 'default',
  colors: THEMES.default,
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>('default');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await db.getFirstAsync<{ value: string }>(
          'SELECT value FROM settings WHERE key = ?',
          [THEME_STORAGE_KEY],
        );
        const saved = row?.value as ThemeId | undefined;
        if (!cancelled && saved && THEMES[saved]) {
          setThemeId(saved);
        }
      } catch {
        // 数据库未初始化时使用默认
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    try {
      void db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [THEME_STORAGE_KEY, id],
      );
    } catch {
      // 持久化失败不阻塞
    }
  }, []);

  const value = useMemo(
    () => ({ themeId, colors: THEMES[themeId], setTheme }),
    [themeId, setTheme],
  );

  if (!ready) {
    // 等待主题加载完成后再渲染，避免闪烁
    return null;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
