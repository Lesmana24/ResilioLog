import { useEffect, useState } from 'react';
import { LangProvider } from './i18n/useLang';
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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function AppShell() {
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { replica, loading, storagePersistent } = useReplica();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <AppLayout
      page={page}
      onNavigate={setPage}
      installPrompt={installPrompt ? () => void handleInstall() : null}
      storagePersistent={storagePersistent}
      loading={loading}
      nodeId={replica?.nodeId}
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen((o) => !o)}
    >
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
