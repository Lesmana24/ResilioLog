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
import { useLang } from '../i18n/useLang';
import { useReplica } from '../state/useReplica';
import { EmergencyOverrideDialog } from './EmergencyOverrideDialog';
import { getEngineErrorMessage, parsePositiveIntQty } from './error-messages';
import { alert, badge, btn, card, colors, font, input as inputStyle, label as labelStyle, radius, space } from './styles';

type LogFilter = 'all' | DistributionKind;

export function FieldView() {
  const { replica, loading, run } = useReplica();
  const { t, lang } = useLang();

  const [selectedItemId, setSelectedItemId] = useState<ItemId>('');
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveCounterparty, setReceiveCounterparty] = useState('');
  const [receiveNote, setReceiveNote] = useState('');
  const [receiveFeedback, setReceiveFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

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
      <div style={{ color: colors.textMuted, padding: space.lg }}>{t('loadingReplica')}</div>
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
      setReceiveFeedback({ ok: false, msg: getEngineErrorMessage('UNKNOWN_ITEM', lang) });
      return;
    }
    const qty = parsePositiveIntQty(receiveQty);
    if (qty === null) {
      setReceiveFeedback({ ok: false, msg: getEngineErrorMessage('INVALID_QTY', lang) });
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
      setReceiveFeedback({ ok: false, msg: getEngineErrorMessage(res.error, lang) });
      return;
    }

    setReceiveQty('');
    setReceiveCounterparty('');
    setReceiveNote('');
    setReceiveFeedback({ ok: true, msg: t('field_receiptRecorded') });
  }

  async function handleIssue(e: FormEvent) {
    e.preventDefault();
    setIssueError(null);
    setInsufficientRights(null);
    setTopUpNotice(null);

    if (!activeItemId) {
      setIssueError(getEngineErrorMessage('UNKNOWN_ITEM', lang));
      return;
    }
    const qty = parsePositiveIntQty(issueQty);
    if (qty === null) {
      setIssueError(getEngineErrorMessage('INVALID_QTY', lang));
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
      setIssueError(getEngineErrorMessage(res.error, lang));
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
      alreadyOpen ? t('field_topUpAlreadyOpen') : t('field_topUpAdvice'),
    );
  }

  async function handleVoid(tag: string) {
    await run((r) => voidLogEntry(r, tag));
  }

  return (
    <div style={{ display: 'grid', gap: space.xl }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: font.sizeXl, fontWeight: font.weightBold }}>{t('field_title')}</h1>
      </div>

      {/* Item selector cards */}
      <div style={card}>
        {itemEntries.length === 0 ? (
          <p style={{ color: colors.textMuted, margin: 0 }}>{t('field_noItems')}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: space.sm }}>
            {itemEntries.map(([id, item]) => {
              const summary = itemSummary(replica.state, id);
              const myRights = summary?.rights[replica.nodeId] ?? 0;
              const isSelected = id === activeItemId;
              return (
                <li
                  key={id}
                  style={{
                    padding: space.md,
                    border: isSelected ? `2px solid ${colors.teal}` : `1px solid ${colors.borderLight}`,
                    backgroundColor: isSelected ? colors.tealLight : '#ffffff',
                    borderRadius: radius.md,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: space.sm,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: font.sizeMd }}>{item.meta.name}</strong>{' '}
                    <span style={{ color: colors.textMuted, fontSize: font.sizeSm }}>({item.meta.unit})</span> ·{' '}
                    <span style={{ fontSize: font.sizeMd }}>
                      {t('field_total')}: <strong>{summary?.value ?? 0}</strong>
                    </span> ·{' '}
                    <span style={{ fontSize: font.sizeMd }}>
                      {t('field_localQuota')}: <strong>{myRights}</strong>
                    </span>
                    {summary && summary.deficit > 0 && (
                      <span style={{ ...badge.deficit, marginLeft: space.sm }}>
                        {t('dashboard_deficit')} {summary.deficit}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedItemId(id)}
                    style={isSelected ? btn.primary : btn.secondary}
                  >
                    {isSelected ? t('field_selected') : t('field_select')}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Receive & Issue forms */}
      {activeItem && (
        <div style={{ display: 'grid', gap: space.md, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <form onSubmit={(e) => void handleReceive(e)} style={{ ...card, display: 'grid', gap: space.md }}>
            <h2 style={{ margin: 0, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
              {t('field_receiveGoods')} ({activeItem.meta.name})
            </h2>
            <label style={labelStyle}>
              <span>{t('field_quantity')} ({activeItem.meta.unit})</span>
              <input
                type="number"
                min={1}
                step={1}
                value={receiveQty}
                onChange={(e) => setReceiveQty(e.target.value)}
                placeholder="e.g. 20"
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              <span>{t('field_source')}</span>
              <input
                type="text"
                maxLength={80}
                value={receiveCounterparty}
                onChange={(e) => setReceiveCounterparty(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              <span>{t('field_note')}</span>
              <input
                type="text"
                maxLength={200}
                value={receiveNote}
                onChange={(e) => setReceiveNote(e.target.value)}
                style={inputStyle}
              />
            </label>
            {receiveFeedback && (
              <div style={receiveFeedback.ok ? alert.success : alert.danger}>{receiveFeedback.msg}</div>
            )}
            <button type="submit" style={btn.primary}>
              {t('field_recordReceipt')}
            </button>
          </form>

          <form onSubmit={(e) => void handleIssue(e)} style={{ ...card, display: 'grid', gap: space.md }}>
            <h2 style={{ margin: 0, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
              {t('field_issueGoods')} ({activeItem.meta.name})
            </h2>
            <label style={labelStyle}>
              <span>{t('field_quantity')} ({activeItem.meta.unit})</span>
              <input
                type="number"
                min={1}
                step={1}
                value={issueQty}
                onChange={(e) => setIssueQty(e.target.value)}
                placeholder="e.g. 10"
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              <span>{t('field_recipient')}</span>
              <input
                type="text"
                maxLength={80}
                value={issueCounterparty}
                onChange={(e) => setIssueCounterparty(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              <span>{t('field_note')}</span>
              <input
                type="text"
                maxLength={200}
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                style={inputStyle}
              />
            </label>

            {issueError && (
              <div role="alert" style={alert.danger}>
                <div>{issueError}</div>
                {insufficientRights !== null && (
                  <div style={{ marginTop: space.sm, display: 'grid', gap: space.sm }}>
                    <div>
                      {t('field_remainingRights')}: <strong>{insufficientRights}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
                      <button type="button" onClick={handleRequestTopUp} style={btn.secondary}>
                        {t('field_requestTopUp')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowOverrideDialog(true)}
                        style={{ ...btn.primary, backgroundColor: colors.danger }}
                      >
                        {t('field_emergencyOverride')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {topUpNotice && <div style={alert.warning}>{topUpNotice}</div>}

            <button type="submit" style={btn.primary}>
              {t('field_recordIssue')}
            </button>
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

      {/* Distribution Log */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md, flexWrap: 'wrap', gap: space.sm }}>
          <h2 style={{ margin: 0, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
            {t('field_distributionLog')}
          </h2>
          <label style={{ fontSize: font.sizeMd, display: 'flex', alignItems: 'center', gap: space.sm }}>
            <span style={{ color: colors.textMuted }}>{t('field_filter')}:</span>
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value as LogFilter)}
              style={{ ...inputStyle, width: 'auto', minHeight: 36 }}
            >
              <option value="all">{t('field_filterAll')}</option>
              <option value="receive">{t('field_filterReceive')}</option>
              <option value="issue">{t('field_filterIssue')}</option>
              <option value="override_issue">{t('field_filterOverride')}</option>
            </select>
          </label>
        </div>

        {logEntries.length === 0 ? (
          <p style={{ color: colors.textMuted, fontSize: font.sizeMd, margin: 0 }}>{t('field_noLogEntries')}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: space.sm }}>
            {logEntries.map(({ tag, el }) => {
              const isOverride = el.kind === 'override_issue';
              return (
                <li
                  key={tag}
                  style={{
                    padding: space.md,
                    border: isOverride ? `1px solid ${colors.danger}` : `1px solid ${colors.borderLight}`,
                    backgroundColor: isOverride ? colors.dangerBg : '#ffffff',
                    borderRadius: radius.md,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: space.sm,
                    fontSize: font.sizeMd,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong>{el.kind}</strong> · <code>{el.itemId}</code> · {t('qty')}: {el.qty} · {t('by')}{' '}
                    <code>{el.by}</code> ({t('clock')}:{el.ts.c})
                    {el.counterparty && <span> · {el.counterparty}</span>}
                    {el.reason && (
                      <div style={{ color: colors.dangerText, marginTop: 4 }}>
                        {t('field_reason')}: {el.reason}
                      </div>
                    )}
                  </div>
                  {!isOverride && (
                    <button
                      type="button"
                      onClick={() => void handleVoid(tag)}
                      style={{ ...btn.secondary, padding: '4px 12px', minHeight: 32, fontSize: font.sizeSm }}
                    >
                      {t('field_void')}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
