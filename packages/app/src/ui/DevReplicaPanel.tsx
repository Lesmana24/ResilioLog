import { createItem, itemSummary, type ItemSummary } from '@resiliolog/crdt-core';
import { useState } from 'react';
import { useReplica } from '../state/useReplica';

const DEV_TOOLS_ENABLED = import.meta.env.DEV;

export function DevReplicaPanel() {
  const { replica, loading, storagePersistent, run, resetLocalData } = useReplica();
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading || !replica) {
    return (
      <aside style={{ marginTop: 24, padding: 12, border: '1px solid #d1d5db', borderRadius: 6 }}>
        <strong>Dev Panel</strong>: Loading replica...
      </aside>
    );
  }

  const summaries: Record<string, ItemSummary | undefined> = {};
  for (const itemId of Object.keys(replica.state.items)) {
    summaries[itemId] = itemSummary(replica.state, itemId);
  }

  async function handleConfirmReset() {
    setBusy(true);
    try {
      await resetLocalData();
      setConfirmResetOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleLoadSampleData() {
    setBusy(true);
    try {
      await run((r) => {
        const r1 = createItem(r, {
          name: 'Rice',
          unit: 'kg',
          category: 'food',
          initialQty: 100,
          wallTime: new Date().toISOString(),
        });
        if (!r1.ok) return r1;
        const r2 = createItem(r1.value.replica, {
          name: 'Clean Water',
          unit: 'L',
          category: 'water',
          initialQty: 80,
          wallTime: new Date().toISOString(),
        });
        if (!r2.ok) return r2;
        return { ok: true, value: r2.value.replica };
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside style={{ marginTop: 24, padding: 12, border: '1px solid #d1d5db', borderRadius: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>Dev Replica Panel</h3>
        {DEV_TOOLS_ENABLED && (
          <span
            style={{
              padding: '2px 6px',
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              borderRadius: 4,
            }}
          >
            DEV-ONLY
          </span>
        )}
      </div>

      <div style={{ fontSize: 13, marginBottom: 8 }}>
        <div>
          <strong>nodeId:</strong> <code>{replica.nodeId}</code>
        </div>
        <div>
          <strong>clock:</strong> <code>{replica.clock}</code>
        </div>
        <div>
          <strong>storagePersistent:</strong> <code>{String(storagePersistent)}</code>
        </div>
      </div>

      {DEV_TOOLS_ENABLED && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <button type="button" disabled={busy} onClick={() => void handleLoadSampleData()}>
            Sample data
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmResetOpen(true)}
            style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #dc2626' }}
          >
            Reset local data
          </button>
        </div>
      )}

      {DEV_TOOLS_ENABLED && confirmResetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm reset local data"
          style={{
            marginBottom: 10,
            padding: 10,
            border: '2px solid #dc2626',
            borderRadius: 6,
            backgroundColor: '#fef2f2',
            fontSize: 13,
          }}
        >
          <p style={{ marginTop: 0 }}>
            Delete all local IndexedDB data (items, logs, cursors) and generate a new{' '}
            <code>nodeId</code>?
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleConfirmReset()}
              style={{ backgroundColor: '#dc2626', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: 4 }}
            >
              Confirm Reset
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirmResetOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <pre
        style={{
          margin: 0,
          padding: 8,
          background: '#f3f4f6',
          borderRadius: 4,
          fontSize: 12,
          overflowX: 'auto',
        }}
      >
        {JSON.stringify(summaries, null, 2)}
      </pre>
    </aside>
  );
}
