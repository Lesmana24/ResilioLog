import {
  issue,
  itemSummary,
  orsElements,
  receiveGoods,
  voidLogEntry,
  type DistributionKind,
  type ItemId,
} from '@resiliolog/crdt-core';
import { useState, type FormEvent } from 'react';
import { useReplica } from '../state/useReplica';
import { EmergencyOverrideDialog } from './EmergencyOverrideDialog';
import { getEngineErrorMessage, parsePositiveIntQty } from './error-messages';

type LogFilter = 'all' | DistributionKind;

export function FieldView() {
  const { replica, loading, run } = useReplica();

  const [selectedItemId, setSelectedItemId] = useState<ItemId>('');
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveCounterparty, setReceiveCounterparty] = useState('');
  const [receiveNote, setReceiveNote] = useState('');
  const [receiveFeedback, setReceiveFeedback] = useState<string | null>(null);

  const [issueQty, setIssueQty] = useState('');
  const [issueCounterparty, setIssueCounterparty] = useState('');
  const [issueNote, setIssueNote] = useState('');
  const [issueError, setIssueError] = useState<string | null>(null);
  const [insufficientRights, setInsufficientRights] = useState<number | null>(null);
  const [topUpNotice, setTopUpNotice] = useState<string | null>(null);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);

  const [logFilter, setLogFilter] = useState<LogFilter>('all');

  if (loading || !replica) {
    return (
      <section>
        <h2>Field</h2>
        <p>Loading local replica...</p>
      </section>
    );
  }

  const itemEntries = Object.entries(replica.state.items);
  const activeItemId =
    selectedItemId && replica.state.items[selectedItemId]
      ? selectedItemId
      : (itemEntries[0]?.[0] ?? '');
  const activeItem = activeItemId ? replica.state.items[activeItemId] : undefined;
  const activeSummary = activeItemId ? itemSummary(replica.state, activeItemId) : undefined;
  const activeLocalRights = activeSummary?.rights[replica.nodeId] ?? 0;

  const logEntries = orsElements(replica.state.distributionLog)
    .filter((entry) => logFilter === 'all' || entry.el.kind === logFilter)
    .slice()
    .reverse();

  const openTopUps = orsElements(replica.state.topUpQueue);

  async function handleReceive(e: FormEvent) {
    e.preventDefault();
    setReceiveFeedback(null);

    if (!activeItemId) {
      setReceiveFeedback(getEngineErrorMessage('UNKNOWN_ITEM'));
      return;
    }
    const qty = parsePositiveIntQty(receiveQty);
    if (qty === null) {
      setReceiveFeedback(getEngineErrorMessage('INVALID_QTY'));
      return;
    }

    const res = await run((r) =>
      receiveGoods(r, activeItemId, qty, {
        wallTime: new Date().toISOString(),
        ...(receiveCounterparty.trim() ? { counterparty: receiveCounterparty.trim() } : {}),
        ...(receiveNote.trim() ? { note: receiveNote.trim() } : {}),
      }),
    );

    if (!res.ok) {
      setReceiveFeedback(getEngineErrorMessage(res.error));
      return;
    }

    setReceiveQty('');
    setReceiveCounterparty('');
    setReceiveNote('');
    setReceiveFeedback('Receipt recorded offline.');
  }

  async function handleIssue(e: FormEvent) {
    e.preventDefault();
    setIssueError(null);
    setInsufficientRights(null);
    setTopUpNotice(null);

    if (!activeItemId) {
      setIssueError(getEngineErrorMessage('UNKNOWN_ITEM'));
      return;
    }
    const qty = parsePositiveIntQty(issueQty);
    if (qty === null) {
      setIssueError(getEngineErrorMessage('INVALID_QTY'));
      return;
    }

    const res = await run((r) =>
      issue(r, activeItemId, qty, {
        wallTime: new Date().toISOString(),
        ...(issueCounterparty.trim() ? { counterparty: issueCounterparty.trim() } : {}),
        ...(issueNote.trim() ? { note: issueNote.trim() } : {}),
      }),
    );

    if (!res.ok) {
      setIssueError(getEngineErrorMessage(res.error));
      if (res.error === 'INSUFFICIENT_RIGHTS') {
        setInsufficientRights(activeLocalRights);
      }
      return;
    }

    setIssueQty('');
    setIssueCounterparty('');
    setIssueNote('');
    setShowOverrideDialog(false);
  }

  function handleRequestTopUp() {
    if (!activeItemId) return;
    const alreadyOpen = openTopUps.some(
      (req) => req.el.itemId === activeItemId && req.el.requester === replica?.nodeId,
    );
    setTopUpNotice(
      alreadyOpen
        ? 'A top-up request for this item is already open in the queue. Sync with Command Center to receive quota.'
        : 'Quota is below the requested issue. Ask Command Center coordinator to transfer rights during next sync.',
    );
  }

  async function handleVoid(tag: string) {
    await run((r) => voidLogEntry(r, tag));
  }

  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <div>
        <h2 style={{ marginBottom: 8 }}>Field — Stock &amp; Distribution</h2>
        {itemEntries.length === 0 ? (
          <p style={{ color: '#4b5563' }}>
            No items on this device yet. Create items in Command Center or sync with a peer.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
            {itemEntries.map(([id, item]) => {
              const summary = itemSummary(replica.state, id);
              const myRights = summary?.rights[replica.nodeId] ?? 0;
              const isSelected = id === activeItemId;
              return (
                <li
                  key={id}
                  style={{
                    padding: 10,
                    border: isSelected ? '2px solid #0f766e' : '1px solid #d1d5db',
                    borderRadius: 6,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div>
                    <strong>{item.meta.name}</strong> ({item.meta.unit}) ·{' '}
                    <span>Total: {summary?.value ?? 0}</span> ·{' '}
                    <span>Local quota: {myRights}</span>
                    {summary && summary.deficit > 0 && (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: '2px 6px',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Deficit {summary.deficit}
                      </span>
                    )}
                  </div>
                  <button type="button" onClick={() => setSelectedItemId(id)}>
                    {isSelected ? 'Selected' : 'Select'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {activeItem && (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <form
            onSubmit={(e) => void handleReceive(e)}
            style={{ padding: 12, border: '1px solid #d1d5db', borderRadius: 6, display: 'grid', gap: 8 }}
          >
            <h3 style={{ margin: 0, fontSize: 16 }}>Receive Goods ({activeItem.meta.name})</h3>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <span>Quantity ({activeItem.meta.unit})</span>
              <input
                type="number"
                min={1}
                step={1}
                value={receiveQty}
                onChange={(e) => setReceiveQty(e.target.value)}
                placeholder="e.g. 20"
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <span>Source / Counterparty (optional)</span>
              <input
                type="text"
                maxLength={80}
                value={receiveCounterparty}
                onChange={(e) => setReceiveCounterparty(e.target.value)}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <span>Note (optional)</span>
              <input
                type="text"
                maxLength={200}
                value={receiveNote}
                onChange={(e) => setReceiveNote(e.target.value)}
              />
            </label>
            {receiveFeedback && <div style={{ fontSize: 13 }}>{receiveFeedback}</div>}
            <button type="submit">Record Receipt</button>
          </form>

          <form
            onSubmit={(e) => void handleIssue(e)}
            style={{ padding: 12, border: '1px solid #d1d5db', borderRadius: 6, display: 'grid', gap: 8 }}
          >
            <h3 style={{ margin: 0, fontSize: 16 }}>Issue Goods ({activeItem.meta.name})</h3>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <span>Quantity ({activeItem.meta.unit})</span>
              <input
                type="number"
                min={1}
                step={1}
                value={issueQty}
                onChange={(e) => setIssueQty(e.target.value)}
                placeholder="e.g. 10"
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <span>Recipient / Counterparty (optional)</span>
              <input
                type="text"
                maxLength={80}
                value={issueCounterparty}
                onChange={(e) => setIssueCounterparty(e.target.value)}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
              <span>Note (optional)</span>
              <input
                type="text"
                maxLength={200}
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
              />
            </label>

            {issueError && (
              <div role="alert" style={{ color: '#991b1b', fontSize: 13 }}>
                <div>{issueError}</div>
                {insufficientRights !== null && (
                  <div style={{ marginTop: 6, display: 'grid', gap: 6 }}>
                    <div>Remaining local rights: {insufficientRights}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" onClick={handleRequestTopUp}>
                        Request top-up
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowOverrideDialog(true)}
                        style={{ backgroundColor: '#dc2626', color: '#ffffff', border: 'none', padding: '6px 10px', borderRadius: 4 }}
                      >
                        Emergency override
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {topUpNotice && <div style={{ fontSize: 13, color: '#92400e' }}>{topUpNotice}</div>}

            <button type="submit">Record Issue</button>
          </form>
        </div>
      )}

      {showOverrideDialog && activeItem && (
        <EmergencyOverrideDialog
          itemId={activeItemId}
          itemName={activeItem.meta.name}
          initialQty={issueQty}
          initialCounterparty={issueCounterparty}
          initialNote={issueNote}
          onClose={() => setShowOverrideDialog(false)}
          onSuccess={() => {
            setShowOverrideDialog(false);
            setIssueError(null);
            setInsufficientRights(null);
            setIssueQty('');
            setIssueCounterparty('');
            setIssueNote('');
          }}
        />
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Distribution Log</h3>
          <label style={{ fontSize: 13 }}>
            Filter:{' '}
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value as LogFilter)}
            >
              <option value="all">All</option>
              <option value="receive">Receive</option>
              <option value="issue">Issue</option>
              <option value="override_issue">Emergency Override</option>
            </select>
          </label>
        </div>

        {logEntries.length === 0 ? (
          <p style={{ color: '#4b5563', fontSize: 13 }}>No distribution entries.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {logEntries.map(({ tag, el }) => {
              const isOverride = el.kind === 'override_issue';
              return (
                <li
                  key={tag}
                  style={{
                    padding: 8,
                    border: isOverride ? '1px solid #dc2626' : '1px solid #e5e7eb',
                    backgroundColor: isOverride ? '#fef2f2' : '#ffffff',
                    borderRadius: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <strong>{el.kind}</strong> · {el.itemId} · qty: {el.qty} · by {el.by} (c:{el.ts.c})
                    {el.counterparty && <span> · {el.counterparty}</span>}
                    {el.reason && <div style={{ color: '#991b1b' }}>Reason: {el.reason}</div>}
                  </div>
                  {!isOverride && (
                    <button type="button" onClick={() => void handleVoid(tag)}>
                      Void
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
