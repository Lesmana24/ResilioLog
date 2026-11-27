import { useEffect, useState } from 'react';
import { ReplicaProvider, useReplica } from './state/useReplica';
import { CommandCenterView } from './ui/CommandCenterView';
import { DevReplicaPanel } from './ui/DevReplicaPanel';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { FieldView } from './ui/FieldView';
import { SyncView } from './ui/SyncView';

type Page = 'field' | 'command-center' | 'sync';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function AppShell() {
  const [page, setPage] = useState<Page>('field');
  const { loading, storagePersistent } = useReplica();
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
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 720,
        margin: '0 auto',
        padding: 12,
        boxSizing: 'border-box',
      }}
    >
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        button, input, select, textarea { min-height: 40px; font-size: 16px; }
        table { display: block; overflow-x: auto; }
      `}</style>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>ResilioLog</h1>
        <nav aria-label="Primary navigation" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setPage('field')}
            aria-pressed={page === 'field'}
          >
            Field
          </button>
          <button
            type="button"
            onClick={() => setPage('command-center')}
            aria-pressed={page === 'command-center'}
          >
            Command Center
          </button>
          <button
            type="button"
            onClick={() => setPage('sync')}
            aria-pressed={page === 'sync'}
          >
            QR Sync
          </button>
          {installPrompt && (
            <button type="button" onClick={() => void handleInstall()}>
              Install App
            </button>
          )}
        </nav>
      </header>

      {!loading && storagePersistent === false && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: 10,
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            color: '#92400e',
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <strong>Storage not persistent:</strong> Browser denied persistent storage. Local IndexedDB data may be evicted under storage pressure.
        </div>
      )}

      <main>
        {page === 'field' && <FieldView />}
        {page === 'command-center' && <CommandCenterView />}
        {page === 'sync' && <SyncView />}
      </main>
      <DevReplicaPanel />
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ReplicaProvider>
        <AppShell />
      </ReplicaProvider>
    </ErrorBoundary>
  );
}
