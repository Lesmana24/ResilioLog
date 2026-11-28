import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function checkStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mediaMatch = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return mediaMatch || iosStandalone;
}

function checkIsIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let globalIsInstalled = checkStandalone();
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalIsInstalled = true;
    globalDeferredPrompt = null;
    notifyListeners();
  });
}

export function usePwaInstall() {
  const [, setTick] = useState(0);
  const [isIos] = useState<boolean>(() => checkIsIos());

  useEffect(() => {
    const update = () => setTick((t) => t + 1);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!globalDeferredPrompt) return 'unavailable';
    await globalDeferredPrompt.prompt();
    const { outcome } = await globalDeferredPrompt.userChoice;
    if (outcome === 'accepted') {
      globalIsInstalled = true;
    }
    globalDeferredPrompt = null;
    notifyListeners();
    return outcome;
  }, []);

  return {
    canInstall: globalDeferredPrompt !== null,
    isInstalled: globalIsInstalled,
    isIos,
    promptInstall,
  };
}
