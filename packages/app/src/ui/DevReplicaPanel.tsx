import { itemSummary, type ItemSummary } from '@resiliolog/crdt-core';
import { useReplica } from '../state/useReplica';

export function DevReplicaPanel() {
  const { replica, loading, storagePersistent } = useReplica();

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

  return (
    <aside style={{ marginTop: 24, padding: 12, border: '1px solid #d1d5db', borderRadius: 6 }}>
      <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 14 }}>Dev Replica Panel</h3>
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
