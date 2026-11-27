import { useState, type FormEvent } from 'react';
import { emergencyIssue, type ItemId } from '@resiliolog/crdt-core';
import { useLang } from '../i18n/useLang';
import { useReplica } from '../state/useReplica';
import { getEngineErrorMessage, parsePositiveIntQty } from './error-messages';
import { alert, btn, card, colors, font, input as inputStyle, label as labelStyle, space } from './styles';

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
  const { t, lang } = useLang();
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
      setErrorMsg(getEngineErrorMessage('INVALID_QTY', lang));
      return;
    }
    if (reason.trim().length < 3) {
      setErrorMsg(getEngineErrorMessage('REASON_REQUIRED', lang));
      return;
    }
    if (!confirmed) {
      setErrorMsg(t('override_confirmRequired'));
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
        setErrorMsg(getEngineErrorMessage(res.error, lang));
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
        ...card,
        border: `2px solid ${colors.danger}`,
        backgroundColor: colors.dangerBg,
        marginTop: space.md,
      }}
    >
      <h3 id="override-dialog-title" style={{ marginTop: 0, color: colors.dangerText, fontSize: font.sizeLg }}>
        {t('override_title')} — {itemName}
      </h3>
      <p style={{ fontSize: font.sizeMd, color: colors.dangerText, marginTop: 0 }}>
        {t('override_warning')}
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: space.md }}>
        <label style={labelStyle}>
          <span>{t('override_qtyLabel')}</span>
          <input
            type="number"
            min={1}
            step={1}
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span>{t('override_reasonLabel')}</span>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('override_reasonPlaceholder')}
            style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: space.sm, fontSize: font.sizeMd, color: colors.dangerText, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <span>{t('override_confirmCheck')}</span>
        </label>

        {errorMsg && (
          <div role="alert" style={{ ...alert.danger, fontWeight: font.weightSemibold }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              ...btn.primary,
              backgroundColor: colors.danger,
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {t('override_submit')}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={btn.secondary}
          >
            {t('override_cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
