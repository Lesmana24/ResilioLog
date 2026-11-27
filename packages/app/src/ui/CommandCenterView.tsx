import {
  createItem,
  itemSummary,
  orsElements,
  resolveTopUp,
  transferRights,
  type Category,
  type ItemId,
  type NodeId,
} from '@resiliolog/crdt-core';
import { useEffect, useState, type FormEvent } from 'react';
import { useReplica } from '../state/useReplica';
import { listCursors, type CursorRow } from '../storage/db';
import { getEngineErrorMessage, parsePositiveIntQty } from './error-messages';

const CATEGORIES: readonly Category[] = [
  'food',
  'water',
  'medicine',
  'shelter',
  'hygiene',
  'other',
];

export function CommandCenterView() {
  const { replica, loading, run } = useReplica();

  const [cursors, setCursors] = useState<readonly CursorRow[]>([]);

  const [itemName, setItemName] = useState('');
  const [itemUnit, setItemUnit] = useState('kg');
  const [itemCategory, setItemCategory] = useState<Category>('food');
  const [initialQtyStr, setInitialQtyStr] = useState('0');
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);

  const [xferItemId, setXferItemId] = useState<ItemId>('');
  const [xferTargetNode, setXferTargetNode] = useState<NodeId>('');
  const [xferQtyStr, setXferQtyStr] = useState('');
  const [xferFeedback, setXferFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listCursors().then((rows) => {
      if (active) setCursors(rows);
    });
    return () => {
      active = false;
    };
  }, [replica?.clock]);

  if (loading || !replica) {
    return (
      <section>
        <h2>Command Center</h2>
        <p>Loading local replica...</p>
      </section>
    );
  }

  const itemEntries = Object.entries(replica.state.items);
  const activeXferItemId =
    xferItemId && replica.state.items[xferItemId]
      ? xferItemId
      : (itemEntries[0]?.[0] ?? '');

  const allLogEntries = orsElements(replica.state.distributionLog);
  const overrideEntries = allLogEntries
    .filter((entry) => entry.el.kind === 'override_issue')
    .slice()
    .reverse();
  const openTopUps = orsElements(replica.state.topUpQueue);

  // Collect known peer nodeIds from quota.R, topUpQueue, and cursors
  const knownNodes = new Set<NodeId>();
  for (const [, item] of itemEntries) {
    for (const from of Object.keys(item.quota.R)) {
      knownNodes.add(from);
      const row = item.quota.R[from];
      if (row) {
        for (const to of Object.keys(row)) knownNodes.add(to);
      }
    }
    for (const n of Object.keys(item.quota.U)) knownNodes.add(n);
    for (const n of Object.keys(item.quota.O)) knownNodes.add(n);
  }
  for (const req of openTopUps) knownNodes.add(req.el.requester);
  for (const c of cursors) knownNodes.add(c.peerId);
  knownNodes.delete(replica.nodeId);

  const maxSyncedClock = cursors.reduce((max, c) => (c.until > max ? c.until : max), 0);
  const hasUnsyncedChanges = replica.clock > maxSyncedClock;

  async function handleCreateItem(e: FormEvent) {
    e.preventDefault();
    setCreateFeedback(null);

    const name = itemName.trim();
    const unit = itemUnit.trim();
    if (!name || !unit) {
      setCreateFeedback('Item name and unit are required.');
      return;
    }

    const trimmedQty = initialQtyStr.trim();
    if (!/^[0-9]+$/.test(trimmedQty)) {
      setCreateFeedback(getEngineErrorMessage('INVALID_QTY'));
      return;
    }
    const initialQty = Number(trimmedQty);
    if (!Number.isSafeInteger(initialQty) || initialQty < 0) {
      setCreateFeedback(getEngineErrorMessage('INVALID_QTY'));
      return;
    }

    let createdItemId = '';
    const res = await run((r) => {
      const created = createItem(r, {
        name,
        unit,
        category: itemCategory,
        initialQty,
        wallTime: new Date().toISOString(),
      });
      if (!created.ok) return created;
      createdItemId = created.value.itemId;
      return { ok: true, value: created.value.replica };
    });

    if (!res.ok) {
      setCreateFeedback(getEngineErrorMessage(res.error));
      return;
    }

    setItemName('');
    setInitialQtyStr('0');
    setXferItemId(createdItemId);
    setCreateFeedback(`Created item "${name}" (${createdItemId}).`);
  }

  async function handleTransfer(e: FormEvent) {
    e.preventDefault();
    setXferFeedback(null);

    if (!activeXferItemId) {
      setXferFeedback(getEngineErrorMessage('UNKNOWN_ITEM'));
      return;
    }
    const toNode = xferTargetNode.trim();
    if (!/^[a-z0-9]{4,16}$/.test(toNode)) {
      setXferFeedback('Enter a valid target nodeId (4-16 lowercase alphanumeric chars).');
      return;
    }
    const qty = parsePositiveIntQty(xferQtyStr);
    if (qty === null) {
      setXferFeedback(getEngineErrorMessage('INVALID_QTY'));
      return;
    }

    const res = await run((r) => transferRights(r, activeXferItemId, toNode, qty));
    if (!res.ok) {
      setXferFeedback(getEngineErrorMessage(res.error));
      return;
    }

    setXferQtyStr('');
    setXferFeedback(`Transferred ${qty} rights to ${toNode}.`);
  }

  async function handleResolveTopUp(tag: string) {
    await run((r) => resolveTopUp(r, tag));
  }

  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Command Center</h2>
        <span
          style={{
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: hasUnsyncedChanges ? '#fef3c7' : '#dcfce7',
            color: hasUnsyncedChanges ? '#92400e' : '#166534',
          }}
        >
          {hasUnsyncedChanges ? `Unsynced changes (clock ${replica.clock})` : 'All changes synced'}
        </span>
      </div>

      {/* Sync status per peer */}
      <div style={{ padding: 12, border: '1px solid #d1d5db', borderRadius: 6 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 15 }}>Peer Sync Status</h3>
        {cursors.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#4b5563' }}>No peers synced yet.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {cursors.map((c) => (
              <li key={c.peerId}>
                <code>{c.peerId}</code> · cursor until: {c.until} · last sync:{' '}
                {c.lastSyncAt ?? 'unknown'}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Merged totals & per-node rights allocation table */}
      <div>
        <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>Merged Inventory &amp; Quota Allocation</h3>
        {itemEntries.length === 0 ? (
          <p style={{ color: '#4b5563', fontSize: 13 }}>No items recorded yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {itemEntries.map(([id, item]) => {
              const summary = itemSummary(replica.state, id);
              if (!summary) return null;
              const itemOverridesCount = overrideEntries.filter((o) => o.el.itemId === id).length;
              const nodeIds = Object.keys(summary.rights).sort();

              return (
                <div key={id} style={{ padding: 12, border: '1px solid #d1d5db', borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <strong>{item.meta.name}</strong> ({item.meta.unit}, {item.meta.category}) ·{' '}
                      <code>{id}</code>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13 }}>
                        Total: <strong>{summary.value}</strong> (In: {summary.ledgerIn}, Out: {summary.ledgerOut})
                      </span>
                      {(summary.deficit > 0 || itemOverridesCount > 0) && (
                        <span
                          style={{
                            padding: '2px 8px',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {itemOverridesCount} overrides · deficit {summary.deficit}
                        </span>
                      )}
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '4px 6px' }}>Node</th>
                        <th style={{ padding: '4px 6px' }}>Local Rights</th>
                        <th style={{ padding: '4px 6px' }}>Consumed (U)</th>
                        <th style={{ padding: '4px 6px' }}>Override (O)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nodeIds.map((node) => (
                        <tr key={node} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '4px 6px' }}>
                            <code>{node}</code>
                            {node === replica.nodeId ? ' (self)' : ''}
                          </td>
                          <td style={{ padding: '4px 6px' }}>{summary.rights[node] ?? 0}</td>
                          <td style={{ padding: '4px 6px' }}>{item.quota.U[node] ?? 0}</td>
                          <td style={{ padding: '4px 6px' }}>{item.quota.O[node] ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create item & Transfer rights */}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <form
          onSubmit={(e) => void handleCreateItem(e)}
          style={{ padding: 12, border: '1px solid #d1d5db', borderRadius: 6, display: 'grid', gap: 8 }}
        >
          <h3 style={{ margin: 0, fontSize: 16 }}>Create Item</h3>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            <span>Name</span>
            <input
              type="text"
              maxLength={60}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Rice"
            />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            <span>Unit</span>
            <input
              type="text"
              maxLength={16}
              value={itemUnit}
              onChange={(e) => setItemUnit(e.target.value)}
              placeholder="e.g. kg"
            />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            <span>Category</span>
            <select
              value={itemCategory}
              onChange={(e) => setItemCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            <span>Initial Quantity (&ge; 0)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={initialQtyStr}
              onChange={(e) => setInitialQtyStr(e.target.value)}
            />
          </label>
          {createFeedback && <div style={{ fontSize: 13 }}>{createFeedback}</div>}
          <button type="submit">Create Item</button>
        </form>

        <form
          onSubmit={(e) => void handleTransfer(e)}
          style={{ padding: 12, border: '1px solid #d1d5db', borderRadius: 6, display: 'grid', gap: 8 }}
        >
          <h3 style={{ margin: 0, fontSize: 16 }}>Allocate Quota (Transfer Rights)</h3>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            <span>Item</span>
            <select
              value={activeXferItemId}
              onChange={(e) => setXferItemId(e.target.value)}
              disabled={itemEntries.length === 0}
            >
              {itemEntries.map(([id, item]) => (
                <option key={id} value={id}>
                  {item.meta.name} ({id})
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            <span>Target Node ID</span>
            <input
              type="text"
              list="known-peer-nodes"
              value={xferTargetNode}
              onChange={(e) => setXferTargetNode(e.target.value)}
              placeholder="e.g. bbbb2222"
            />
            <datalist id="known-peer-nodes">
              {Array.from(knownNodes).map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            <span>Quantity (&ge; 1)</span>
            <input
              type="number"
              min={1}
              step={1}
              value={xferQtyStr}
              onChange={(e) => setXferQtyStr(e.target.value)}
              placeholder="e.g. 20"
            />
          </label>
          {xferFeedback && <div style={{ fontSize: 13 }}>{xferFeedback}</div>}
          <button type="submit" disabled={itemEntries.length === 0}>
            Transfer Rights
          </button>
        </form>
      </div>

      {/* Top-up queue */}
      <div>
        <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>
          Open Top-Up Queue ({openTopUps.length})
        </h3>
        {openTopUps.length === 0 ? (
          <p style={{ color: '#4b5563', fontSize: 13 }}>No open top-up requests.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {openTopUps.map(({ tag, el }) => (
              <li
                key={tag}
                style={{
                  padding: 8,
                  border: '1px solid #f59e0b',
                  backgroundColor: '#fffbeb',
                  borderRadius: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 13,
                }}
              >
                <span>
                  Item <code>{el.itemId}</code> requested by <code>{el.requester}</code> (c:{el.ts.c})
                </span>
                <button type="button" onClick={() => void handleResolveTopUp(tag)}>
                  Resolve
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Override audit list */}
      <div>
        <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16, color: '#991b1b' }}>
          Emergency Override Audit Log ({overrideEntries.length})
        </h3>
        {overrideEntries.length === 0 ? (
          <p style={{ color: '#4b5563', fontSize: 13 }}>No emergency overrides recorded.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {overrideEntries.map(({ tag, el }) => (
              <li
                key={tag}
                style={{
                  padding: 8,
                  border: '1px solid #dc2626',
                  backgroundColor: '#fef2f2',
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                <div>
                  <strong>{el.itemId}</strong> · qty: {el.qty} · by <code>{el.by}</code> (c:{el.ts.c})
                  {el.wallTime && <span> · {el.wallTime}</span>}
                </div>
                <div style={{ color: '#991b1b' }}>Reason: {el.reason}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
