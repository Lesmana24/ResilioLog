import { useState, type FormEvent } from 'react';
import { getEngineErrorMessage, parsePositiveIntQty } from './error-messages';
import { emergencyIssue, type ItemId } from '@resiliolog/crdt-core';
import { useReplica } from '../state/useReplica';

interface EmergencyOverrideDialogProps {
  readonly itemId: ItemId;
  readonly itemName: string;
  readonly initialQty: string;
  readonly initialCounterparty: string;
  readonly initialNote: string;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

export function EmergencyOverrideDialog({
  itemId,
  itemName,
  initialQty,
  initialCounterparty,
  initialNote,
  onClose,
  onSuccess,
}: EmergencyOverrideDialogProps) {
  const { run } = useReplica();
  const [qtyStr, setQtyStr] = useState(initialQty || '1');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const qty = parsePositiveIntQty(qtyStr);
    if (qty === null) {
      setErrorMsg(getEngineErrorMessage('INVALID_QTY'));
      return;
    }
    if (reason.trim().length < 3) {
      setErrorMsg(getEngineErrorMessage('REASON_REQUIRED'));
      return;
    }
    if (!confirmed) {
      setErrorMsg('Please confirm that this is a genuine medical emergency override.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await run((r) =>
        emergencyIssue(r, itemId, qty, {
          reason: reason.trim(),
          wallTime: new Date().toISOString(),
          ...(initialCounterparty.trim() ? { counterparty: initialCounterparty.trim() } : {}),
          ...(initialNote.trim() ? { note: initialNote.trim() } : {}),
        }),
      );
      if (!res.ok) {
        setErrorMsg(getEngineErrorMessage(res.error));
        return;
      }
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="override-dialog-title"
      style={{
        marginTop: 12,
        padding: 16,
        border: '2px solid #dc2626',
        borderRadius: 8,
        backgroundColor: '#fef2f2',
      }}
    >
      <h3 id="override-dialog-title" style={{ marginTop: 0, color: '#991b1b' }}>
        Emergency Override — {itemName}
      </h3>
      <p style={{ fontSize: 13, color: '#7f1d1d', marginTop: 0 }}>
        This bypasses local quota checks and records an audited deficit.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: 10 }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <span>Quantity (whole number &ge; 1)</span>
          <input
            type="number"
            min={1}
            step={1}
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
          />
        </label>

        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          <span>Reason (required, 3–200 chars)</span>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Critical patient needs insulin immediately"
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#7f1d1d' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>I confirm this emergency override will be audited.</span>
        </label>

        {errorMsg && (
          <div role="alert" style={{ color: '#991b1b', fontWeight: 600, fontSize: 13 }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '8px 12px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Confirm Emergency Override
          </button>
          <button type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
