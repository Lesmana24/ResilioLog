import { createItem, itemSummary, type ItemSummary } from '@resiliolog/crdt-core';
import { useState } from 'react';
import { useLang } from '../i18n/useLang';
import { useReplica } from '../state/useReplica';
import { alert, btn, card, colors, font, radius, space } from './styles';

const DEV_TOOLS_ENABLED = import.meta.env.DEV;

export function DevReplicaPanel() {
  const { replica, loading, storagePersistent, run, resetLocalData } = useReplica();
  const { t } = useLang();
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading || !replica) {
    return (
      <aside style={{ ...card, marginTop: space.lg }}>
        <strong>Dev Panel</strong>: {t('loadingReplica')}
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
    <aside style={{ ...card, marginTop: space.xl }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm }}>
        <h3 style={{ margin: 0, fontSize: font.sizeMd }}>Dev Replica Panel</h3>
        {DEV_TOOLS_ENABLED && (
          <span
            style={{
              padding: '2px 8px',
              fontSize: font.sizeXs,
              fontWeight: font.weightBold,
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              borderRadius: radius.pill,
            }}
          >
            {t('settings_devOnly')}
          </span>
        )}
      </div>

      <div style={{ fontSize: font.sizeSm, marginBottom: space.md, color: colors.textMuted, display: 'grid', gap: 4 }}>
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
        <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap', marginBottom: space.md }}>
          <button type="button" disabled={busy} onClick={() => void handleLoadSampleData()} style={btn.secondary}>
            {t('settings_sampleData')}
          </button>
          <button type="button" disabled={busy} onClick={() => setConfirmResetOpen(true)} style={btn.danger}>
            {t('settings_resetData')}
          </button>
        </div>
      )}

      {DEV_TOOLS_ENABLED && confirmResetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm reset local data"
          style={{ ...alert.danger, marginBottom: space.md }}
        >
          <p style={{ marginTop: 0 }}>{t('settings_resetConfirm')}</p>
          <div style={{ display: 'flex', gap: space.sm }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleConfirmReset()}
              style={{ ...btn.primary, backgroundColor: colors.danger }}
            >
              {t('settings_confirmReset')}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirmResetOpen(false)} style={btn.secondary}>
              {t('settings_cancel')}
            </button>
          </div>
        </div>
      )}

      <pre
        style={{
          margin: 0,
          padding: space.md,
          background: colors.borderLight,
          borderRadius: radius.md,
          fontSize: 12,
          overflowX: 'auto',
        }}
      >
        {JSON.stringify(summaries, null, 2)}
      </pre>
    </aside>
  );
}
