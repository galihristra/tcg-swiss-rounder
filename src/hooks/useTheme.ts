import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'tk-theme';

function isTheme(v: string | null): v is Theme {
  return v === 'light' || v === 'dark';
}

/** The theme to show before the user has made an explicit choice: whatever the
 *  OS/browser asks for, falling back to dark (the app's original look). */
function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

function initialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isTheme(stored) ? stored : systemTheme();
}

/**
 * Light/dark theme with persistence. The chosen theme is written to
 * `<html data-theme>` (which `tokens.css` keys its light palette off) and saved
 * to localStorage. Until the user picks a theme, the app tracks the OS setting
 * live; once they toggle, their choice sticks across reloads.
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  // Reflect the current theme onto the document.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // While no explicit choice is stored, follow the OS preference as it changes.
  useEffect(() => {
    if (isTheme(localStorage.getItem(STORAGE_KEY))) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setTheme(systemTheme());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      // Toggling is an explicit choice, so persist it from here on.
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  };

  return { theme, toggleTheme };
}
