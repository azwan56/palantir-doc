import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type ColorScheme = 'light' | 'dark';

function getSystemScheme(): ColorScheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredScheme(): ColorScheme | null {
  try {
    const val = localStorage.getItem('color-scheme');
    return val === 'light' || val === 'dark' ? val : null;
  } catch {
    return null;
  }
}

export function ThemeToggle() {
  const [effectiveScheme, setEffectiveScheme] = useState<ColorScheme>(() => {
    return readStoredScheme() ?? getSystemScheme();
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const syncFromMetaOrSystem = () => {
      const stored = readStoredScheme();
      const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
      if (meta) {
        meta.content = stored ?? 'light dark';
      }
      setEffectiveScheme(stored ?? (mq.matches ? 'dark' : 'light'));
    };

    const handleSystemChange = () => {
      // Only update UI state when user has not stored an explicit override;
      // never delete stored preference when system matches it.
      if (!readStoredScheme()) {
        setEffectiveScheme(mq.matches ? 'dark' : 'light');
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'color-scheme' || e.key === null) {
        syncFromMetaOrSystem();
      }
    };

    mq.addEventListener('change', handleSystemChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      mq.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleToggle = () => {
    const next: ColorScheme = effectiveScheme === 'dark' ? 'light' : 'dark';
    const system = getSystemScheme();
    const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');

    try {
      if (next === system) {
        localStorage.removeItem('color-scheme');
        if (meta) meta.content = 'light dark';
      } else {
        localStorage.setItem('color-scheme', next);
        if (meta) meta.content = next;
      }
    } catch {
      if (meta) meta.content = next;
    }

    setEffectiveScheme(next);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="theme-toggle-btn inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
      aria-label={effectiveScheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
      title={effectiveScheme === 'dark' ? '当前深色模式，点击切换浅色' : '当前浅色模式，点击切换深色'}
    >
      <span className="icon-when-light items-center gap-1.5">
        <Moon className="size-4 text-[var(--accent)]" aria-hidden="true" />
        <span className="hidden sm:inline">深色</span>
      </span>
      <span className="icon-when-dark items-center gap-1.5">
        <Sun className="size-4 text-[var(--warning)]" aria-hidden="true" />
        <span className="hidden sm:inline">浅色</span>
      </span>
    </button>
  );
}
