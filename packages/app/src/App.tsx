import { useState } from 'react';
import { ReplicaProvider } from './state/useReplica';
import { CommandCenterView } from './ui/CommandCenterView';
import { DevReplicaPanel } from './ui/DevReplicaPanel';
import { FieldView } from './ui/FieldView';
import { SyncView } from './ui/SyncView';

type Page = 'field' | 'command-center' | 'sync';

function AppShell() {
  const [page, setPage] = useState<Page>('field');

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>ResilioLog</h1>
        <nav aria-label="Primary navigation" style={{ display: 'flex', gap: 8 }}>
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
        </nav>
      </header>

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
    <ReplicaProvider>
      <AppShell />
    </ReplicaProvider>
  );
}
