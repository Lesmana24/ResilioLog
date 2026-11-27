import { useState } from 'react';
import { CommandCenterView } from './ui/CommandCenterView';
import { FieldView } from './ui/FieldView';

type Page = 'field' | 'command-center';

export function App() {
  const [page, setPage] = useState<Page>('field');

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
        </nav>
      </header>

      <main>{page === 'field' ? <FieldView /> : <CommandCenterView />}</main>
    </div>
  );
}
