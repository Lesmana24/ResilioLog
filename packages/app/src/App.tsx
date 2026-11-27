import { useEffect, useState } from 'react';
import { LangProvider, useLang } from './i18n/useLang';
import { ReplicaProvider, useReplica } from './state/useReplica';
import { ActivityLogView } from './ui/ActivityLogView';
import { AppLayout, type Page } from './ui/AppLayout';
import { CommandCenterView } from './ui/CommandCenterView';
import { DashboardView } from './ui/DashboardView';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { FieldView } from './ui/FieldView';
import { InventoryView } from './ui/InventoryView';
import { SettingsView } from './ui/SettingsView';
import { SyncView } from './ui/SyncView';
import { btn, card, colors, font, space } from './ui/styles';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function AppShell() {
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { replica, loading, storagePersistent } = useReplica();
  const { t } = useLang();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  async function handleInstallClick() {
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }
    setShowInstallHelp(true);
  }

  return (
    <AppLayout
      page={page}
      onNavigate={setPage}
      onInstallClick={() => void handleInstallClick()}
      canNativeInstall={installPrompt !== null}
      storagePersistent={storagePersistent}
      loading={loading}
      nodeId={replica?.nodeId}
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen((o) => !o)}
    >
      {showInstallHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('installPwa_hintTitle')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 39, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: space.md,
            zIndex: 200,
          }}
          onClick={() => setShowInstallHelp(false)}
        >
          <div
            style={{ ...card, maxWidth: 440, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: `0 0 ${space.sm}px`, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
              {t('installPwa_hintTitle')}
            </h2>
            <p style={{ margin: `0 0 ${space.md}px`, fontSize: font.sizeMd, color: colors.textMuted, lineHeight: 1.5 }}>
              {t('installPwa_hintBody')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowInstallHelp(false)}
                style={btn.primary}
              >
                {t('installPwa_close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {page === 'dashboard' && <DashboardView onNavigate={setPage} />}
      {page === 'field' && <FieldView />}
      {page === 'command-center' && <CommandCenterView />}
      {page === 'inventory' && <InventoryView />}
      {page === 'sync' && <SyncView />}
      {page === 'activity-log' && <ActivityLogView />}
      {page === 'settings' && <SettingsView />}
    </AppLayout>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <LangProvider>
        <ReplicaProvider>
          <AppShell />
        </ReplicaProvider>
      </LangProvider>
    </ErrorBoundary>
  );
}
