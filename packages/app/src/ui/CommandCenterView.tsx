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
import { useLang } from '../i18n/useLang';
import { useReplica } from '../state/useReplica';
import { listCursors, type CursorRow } from '../storage/db';
import { getEngineErrorMessage, parsePositiveIntQty } from './error-messages';
import { alert, badge, btn, card, colors, font, input as inputStyle, label as labelStyle, radius, space } from './styles';

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
  const { t, lang } = useLang();

  const [cursors, setCursors] = useState<readonly CursorRow[]>([]);

  const [itemName, setItemName] = useState('');
  const [itemUnit, setItemUnit] = useState('kg');
  const [itemCategory, setItemCategory] = useState<Category>('food');
  const [initialQtyStr, setInitialQtyStr] = useState('0');
  const [createFeedback, setCreateFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const [xferItemId, setXferItemId] = useState<ItemId>('');
  const [xferTargetNode, setXferTargetNode] = useState<NodeId>('');
  const [xferQtyStr, setXferQtyStr] = useState('');
  const [xferFeedback, setXferFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

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
      <div style={{ color: colors.textMuted, padding: space.lg }}>{t('loadingReplica')}</div>
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
      setCreateFeedback({ ok: false, msg: t('cc_itemNameUnit') });
      return;
    }

    const trimmedQty = initialQtyStr.trim();
    if (!/^[0-9]+$/.test(trimmedQty)) {
      setCreateFeedback({ ok: false, msg: getEngineErrorMessage('INVALID_QTY', lang) });
      return;
    }
    const initialQty = Number(trimmedQty);
    if (!Number.isSafeInteger(initialQty) || initialQty < 0) {
      setCreateFeedback({ ok: false, msg: getEngineErrorMessage('INVALID_QTY', lang) });
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
      setCreateFeedback({ ok: false, msg: getEngineErrorMessage(res.error, lang) });
      return;
    }

    setItemName('');
    setInitialQtyStr('0');
    setXferItemId(createdItemId);
    setCreateFeedback({ ok: true, msg: `${t('cc_created')} "${name}" (${createdItemId}).` });
  }

  async function handleTransfer(e: FormEvent) {
    e.preventDefault();
    setXferFeedback(null);

    if (!activeXferItemId) {
      setXferFeedback({ ok: false, msg: getEngineErrorMessage('UNKNOWN_ITEM', lang) });
      return;
    }
    const toNode = xferTargetNode.trim();
    if (!/^[a-z0-9]{4,16}$/.test(toNode)) {
      setXferFeedback({ ok: false, msg: t('cc_invalidNodeId') });
      return;
    }
    const qty = parsePositiveIntQty(xferQtyStr);
    if (qty === null) {
      setXferFeedback({ ok: false, msg: getEngineErrorMessage('INVALID_QTY', lang) });
      return;
    }

    const res = await run((r) => transferRights(r, activeXferItemId, toNode, qty));
    if (!res.ok) {
      setXferFeedback({ ok: false, msg: getEngineErrorMessage(res.error, lang) });
      return;
    }

    setXferQtyStr('');
    setXferFeedback({ ok: true, msg: `${t('cc_transferred')} ${qty} ${t('cc_rightsTo')} ${toNode}.` });
  }

  async function handleResolveTopUp(tag: string) {
    await run((r) => resolveTopUp(r, tag));
  }

  return (
    <div style={{ display: 'grid', gap: space.xl }}>
      {/* Header + unsynced badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space.sm }}>
        <h1 style={{ margin: 0, fontSize: font.sizeXl, fontWeight: font.weightBold }}>{t('cc_title')}</h1>
        <span style={hasUnsyncedChanges ? badge.warning : badge.success}>
          {hasUnsyncedChanges
            ? `${t('cc_unsyncedChanges')} ${replica.clock})`
            : t('cc_allSynced')}
        </span>
      </div>

      {/* Peer Sync Status */}
      <div style={card}>
        <h2 style={{ marginTop: 0, marginBottom: space.md, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
          {t('cc_peerSync')}
        </h2>
        {cursors.length === 0 ? (
          <p style={{ margin: 0, fontSize: font.sizeMd, color: colors.textMuted }}>{t('cc_noPeers')}</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: font.sizeMd, display: 'grid', gap: 6 }}>
            {cursors.map((c) => (
              <li key={c.peerId}>
                <code>{c.peerId}</code> · {t('cc_cursorUntil')}: {c.until} · {t('cc_lastSync')}:{' '}
                {c.lastSyncAt ?? t('cc_unknown')}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Merged Inventory & Quota Allocation */}
      <div style={card}>
        <h2 style={{ marginTop: 0, marginBottom: space.md, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
          {t('cc_mergedInventory')}
        </h2>
        {itemEntries.length === 0 ? (
          <p style={{ color: colors.textMuted, fontSize: font.sizeMd, margin: 0 }}>{t('cc_noItems')}</p>
        ) : (
          <div style={{ display: 'grid', gap: space.md }}>
            {itemEntries.map(([id, item]) => {
              const summary = itemSummary(replica.state, id);
              if (!summary) return null;
              const itemOverridesCount = overrideEntries.filter((o) => o.el.itemId === id).length;
              const nodeIds = Object.keys(summary.rights).sort();

              return (
                <div
                  key={id}
                  style={{
                    padding: space.md,
                    border: `1px solid ${colors.borderLight}`,
                    borderRadius: radius.md,
                    background: '#fafafa',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space.sm }}>
                    <div>
                      <strong style={{ fontSize: font.sizeMd }}>{item.meta.name}</strong>{' '}
                      <span style={{ color: colors.textMuted, fontSize: font.sizeSm }}>
                        ({item.meta.unit}, {item.meta.category})
                      </span>{' '}
                      · <code style={{ fontSize: font.sizeSm }}>{id}</code>
                    </div>
                    <div style={{ display: 'flex', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: font.sizeMd }}>
                        {t('cc_total')}: <strong>{summary.value}</strong> ({t('cc_in')}: {summary.ledgerIn}, {t('cc_out')}: {summary.ledgerOut})
                      </span>
                      {(summary.deficit > 0 || itemOverridesCount > 0) && (
                        <span style={badge.deficit}>
                          {itemOverridesCount} {t('cc_overrides')} · {t('cc_deficit')} {summary.deficit}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', marginTop: space.sm }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: font.sizeSm }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: `1px solid ${colors.borderMedium}`, color: colors.textMuted }}>
                          <th style={{ padding: '6px 8px' }}>{t('cc_node')}</th>
                          <th style={{ padding: '6px 8px' }}>{t('cc_localRights')}</th>
                          <th style={{ padding: '6px 8px' }}>{t('cc_consumed')}</th>
                          <th style={{ padding: '6px 8px' }}>{t('cc_override')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nodeIds.map((node) => (
                          <tr key={node} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                            <td style={{ padding: '6px 8px' }}>
                              <code>{node}</code>
                              {node === replica.nodeId ? ` ${t('cc_self')}` : ''}
                            </td>
                            <td style={{ padding: '6px 8px', fontWeight: font.weightSemibold }}>{summary.rights[node] ?? 0}</td>
                            <td style={{ padding: '6px 8px' }}>{item.quota.U[node] ?? 0}</td>
                            <td style={{ padding: '6px 8px' }}>{item.quota.O[node] ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Item & Allocate Quota */}
      <div style={{ display: 'grid', gap: space.md, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <form onSubmit={(e) => void handleCreateItem(e)} style={{ ...card, display: 'grid', gap: space.md }}>
          <h2 style={{ margin: 0, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>{t('cc_createItem')}</h2>
          <label style={labelStyle}>
            <span>{t('cc_name')}</span>
            <input
              type="text"
              maxLength={60}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Rice"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span>{t('cc_unit')}</span>
            <input
              type="text"
              maxLength={16}
              value={itemUnit}
              onChange={(e) => setItemUnit(e.target.value)}
              placeholder="e.g. kg"
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span>{t('cc_category')}</span>
            <select
              value={itemCategory}
              onChange={(e) => setItemCategory(e.target.value as Category)}
              style={inputStyle}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            <span>{t('cc_initialQty')}</span>
            <input
              type="number"
              min={0}
              step={1}
              value={initialQtyStr}
              onChange={(e) => setInitialQtyStr(e.target.value)}
              style={inputStyle}
            />
          </label>
          {createFeedback && (
            <div style={createFeedback.ok ? alert.success : alert.danger}>{createFeedback.msg}</div>
          )}
          <button type="submit" style={btn.primary}>{t('cc_createBtn')}</button>
        </form>

        <form onSubmit={(e) => void handleTransfer(e)} style={{ ...card, display: 'grid', gap: space.md }}>
          <h2 style={{ margin: 0, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>{t('cc_allocateQuota')}</h2>
          <label style={labelStyle}>
            <span>{t('cc_item')}</span>
            <select
              value={activeXferItemId}
              onChange={(e) => setXferItemId(e.target.value)}
              disabled={itemEntries.length === 0}
              style={inputStyle}
            >
              {itemEntries.map(([id, item]) => (
                <option key={id} value={id}>
                  {item.meta.name} ({id})
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            <span>{t('cc_targetNode')}</span>
            <input
              type="text"
              list="known-peer-nodes"
              value={xferTargetNode}
              onChange={(e) => setXferTargetNode(e.target.value)}
              placeholder="e.g. bbbb2222"
              style={inputStyle}
            />
            <datalist id="known-peer-nodes">
              {Array.from(knownNodes).map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </label>
          <label style={labelStyle}>
            <span>{t('cc_qty')}</span>
            <input
              type="number"
              min={1}
              step={1}
              value={xferQtyStr}
              onChange={(e) => setXferQtyStr(e.target.value)}
              placeholder="e.g. 20"
              style={inputStyle}
            />
          </label>
          {xferFeedback && (
            <div style={xferFeedback.ok ? alert.success : alert.danger}>{xferFeedback.msg}</div>
          )}
          <button type="submit" disabled={itemEntries.length === 0} style={btn.primary}>
            {t('cc_transferBtn')}
          </button>
        </form>
      </div>

      {/* Top-Up Queue */}
      <div style={card}>
        <h2 style={{ marginTop: 0, marginBottom: space.md, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
          {t('cc_openTopUps')} ({openTopUps.length})
        </h2>
        {openTopUps.length === 0 ? (
          <p style={{ color: colors.textMuted, fontSize: font.sizeMd, margin: 0 }}>{t('cc_noTopUps')}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: space.sm }}>
            {openTopUps.map(({ tag, el }) => (
              <li
                key={tag}
                style={{
                  ...alert.warning,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: space.sm,
                }}
              >
                <span>
                  {t('cc_item')} <code>{el.itemId}</code> {t('cc_requestedBy')} <code>{el.requester}</code> ({t('clock')}:{el.ts.c})
                </span>
                <button
                  type="button"
                  onClick={() => void handleResolveTopUp(tag)}
                  style={{ ...btn.primary, padding: '6px 14px', minHeight: 34, fontSize: font.sizeSm }}
                >
                  {t('cc_resolve')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Override Audit Log */}
      <div style={card}>
        <h2 style={{ marginTop: 0, marginBottom: space.md, fontSize: font.sizeLg, fontWeight: font.weightSemibold, color: colors.dangerText }}>
          {t('cc_overrideAudit')} ({overrideEntries.length})
        </h2>
        {overrideEntries.length === 0 ? (
          <p style={{ color: colors.textMuted, fontSize: font.sizeMd, margin: 0 }}>{t('cc_noOverrides')}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: space.sm }}>
            {overrideEntries.map(({ tag, el }) => (
              <li key={tag} style={alert.danger}>
                <div>
                  <strong>{el.itemId}</strong> · {t('qty')}: {el.qty} · {t('by')} <code>{el.by}</code> ({t('clock')}:{el.ts.c})
                  {el.wallTime && <span> · {el.wallTime}</span>}
                </div>
                <div style={{ marginTop: 4 }}>{t('field_reason')}: {el.reason}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
