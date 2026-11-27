import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { translations, type Lang } from './translations';

export type { Lang };

const LANG_KEY = 'resiliolog_lang';

function readLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'en' || stored === 'id') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'en';
}

function writeLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // ignore
  }
}

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => undefined,
  t: (key) => key,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);

  const setLang = useCallback((next: Lang) => {
    writeLang(next);
    setLangState(next);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return translations[lang][key] ?? translations['en'][key] ?? key;
    },
    [lang],
  );

  // Reflect changes across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LANG_KEY && (e.newValue === 'en' || e.newValue === 'id')) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return createElement(LangContext.Provider, { value: { lang, setLang, t } }, children);
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
