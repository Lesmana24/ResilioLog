import {
  createItem,
  emergencyIssue,
  issue,
  itemSummary,
  receiveGoods,
  transferRights,
  type ItemSummary,
} from '@resiliolog/crdt-core';
import { useState } from 'react';
import { useLang, type Lang } from '../i18n/useLang';
import { useReplica } from '../state/useReplica';
import { alert, badge, btn, card, colors, font, input as inputStyle, label as labelStyle, radius, space } from './styles';

const DEV_TOOLS_ENABLED = import.meta.env.DEV;

export function SettingsView() {
  const { replica, loading, storagePersistent, run, resetLocalData } = useReplica();
  const { t, lang, setLang } = useLang();
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading || !replica) {
    return (
      <div style={{ color: colors.textMuted, padding: space.lg }}>{t('loadingReplica')}</div>
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
      const now = new Date().toISOString();
      await run((r) => {
        const c1 = createItem(r, { name: 'Rice', unit: 'kg', category: 'food', initialQty: 250, wallTime: now });
        if (!c1.ok) return c1;
        const c2 = createItem(c1.value.replica, { name: 'Clean Water', unit: 'L', category: 'water', initialQty: 400, wallTime: now });
        if (!c2.ok) return c2;
        const c3 = createItem(c2.value.replica, { name: 'First Aid Kits', unit: 'box', category: 'medicine', initialQty: 30, wallTime: now });
        if (!c3.ok) return c3;
        const c4 = createItem(c3.value.replica, { name: 'Emergency Tents', unit: 'unit', category: 'shelter', initialQty: 45, wallTime: now });
        if (!c4.ok) return c4;
        const c5 = createItem(c4.value.replica, { name: 'Hygiene Kits', unit: 'pack', category: 'hygiene', initialQty: 120, wallTime: now });
        if (!c5.ok) return c5;

        let cur = c5.value.replica;

        const rec1 = receiveGoods(cur, c1.value.itemId, 50, { counterparty: 'BNPB Central Warehouse', wallTime: now });
        if (!rec1.ok) return rec1;
        cur = rec1.value;

        const iss1 = issue(cur, c1.value.itemId, 110, { counterparty: 'Shelter Posko A', wallTime: now });
        if (!iss1.ok) return iss1;
        cur = iss1.value;

        const iss2 = issue(cur, c2.value.itemId, 140, { counterparty: 'Shelter Posko B', wallTime: now });
        if (!iss2.ok) return iss2;
        cur = iss2.value;

        // Issue 88% of Hygiene Kits so remainingRatio <= 0.15 triggers an open top-up request
        const iss3 = issue(cur, c5.value.itemId, 106, { counterparty: 'Medical Post 1', wallTime: now });
        if (!iss3.ok) return iss3;
        cur = iss3.value;

        const xfer = transferRights(cur, c4.value.itemId, 'bbbb2222', 15);
        if (!xfer.ok) return xfer;
        cur = xfer.value;

        // Demonstrate an audited emergency override
        const ovr = emergencyIssue(cur, c3.value.itemId, 35, {
          reason: 'Critical trauma response at Posko Utara',
          counterparty: 'Emergency Clinic',
          wallTime: now,
        });
        if (!ovr.ok) return ovr;

        return { ok: true, value: ovr.value };
      });
    } finally {
      setBusy(false);
    }
  }

  const storageLabel =
    storagePersistent === null || storagePersistent === undefined
      ? t('settings_storageUnknown')
      : storagePersistent
      ? t('settings_storagePersistent')
      : t('settings_storageNotPersistent');

  return (
    <div style={{ display: 'grid', gap: space.xl, maxWidth: 600 }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: font.sizeXl, fontWeight: font.weightBold }}>{t('settings_title')}</h1>
      </div>

      {/* Language */}
      <div style={card}>
        <h2 style={{ margin: `0 0 ${space.sm}px`, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
          {t('settings_language')}
        </h2>
        <p style={{ margin: `0 0 ${space.md}px`, fontSize: font.sizeMd, color: colors.textMuted }}>
          {t('settings_languageDesc')}
        </p>
        <div style={{ display: 'flex', gap: space.sm }}>
          {(['en', 'id'] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              style={{
                ...btn.secondary,
                background: lang === l ? colors.teal : '#fff',
                color: lang === l ? '#fff' : colors.teal,
                borderColor: colors.teal,
                fontWeight: lang === l ? font.weightBold : font.weightMedium,
              }}
            >
              {l === 'en' ? t('settings_english') : t('settings_indonesian')}
            </button>
          ))}
        </div>
      </div>

      {/* Node Info */}
      <div style={card}>
        <h2 style={{ margin: `0 0 ${space.md}px`, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
          {t('settings_nodeInfo')}
        </h2>
        <div style={{ display: 'grid', gap: space.sm, fontSize: font.sizeMd }}>
          <InfoRow label={t('settings_nodeId')} value={<code style={{ fontSize: font.sizeSm, wordBreak: 'break-all' }}>{replica.nodeId}</code>} />
          <InfoRow label={t('settings_clock')} value={String(replica.clock)} />
          <InfoRow
            label={t('settings_storage')}
            value={
              <span
                style={
                  storagePersistent === true
                    ? badge.success
                    : storagePersistent === false
                    ? badge.deficit
                    : badge.warning
                }
              >
                {storageLabel}
              </span>
            }
          />
        </div>
      </div>

      {/* Dev Tools (DEV-ONLY) */}
      {DEV_TOOLS_ENABLED && (
        <div
          style={{
            ...card,
            border: `1px solid ${colors.dangerBorder}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md }}>
            <h2 style={{ margin: 0, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
              {t('settings_devTools')}
            </h2>
            <span
              style={{
                padding: '2px 8px',
                fontSize: font.sizeSm,
                fontWeight: font.weightBold,
                background: '#e0f2fe',
                color: '#0369a1',
                borderRadius: radius.pill,
              }}
            >
              {t('settings_devOnly')}
            </span>
          </div>
          <p style={{ margin: `0 0 ${space.md}px`, fontSize: font.sizeMd, color: colors.textMuted }}>
            {t('settings_devWarning')}
          </p>
          <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap', marginBottom: space.md }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleLoadSampleData()}
              style={{ ...btn.secondary, opacity: busy ? 0.6 : 1 }}
            >
              {t('settings_sampleData')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmResetOpen(true)}
              style={{ ...btn.danger, opacity: busy ? 0.6 : 1 }}
            >
              {t('settings_resetData')}
            </button>
          </div>

          {confirmResetOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Confirm reset local data"
              style={{
                ...alert.danger,
                marginBottom: space.md,
              }}
            >
              <p style={{ marginTop: 0, fontSize: font.sizeMd }}>{t('settings_resetConfirm')}</p>
              <div style={{ display: 'flex', gap: space.sm }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleConfirmReset()}
                  style={{
                    ...btn.primary,
                    background: colors.danger,
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  {t('settings_confirmReset')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmResetOpen(false)}
                  style={{ ...btn.secondary }}
                >
                  {t('settings_cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Replica state JSON */}
          <div>
            <div style={{ fontSize: font.sizeSm, fontWeight: font.weightSemibold, color: colors.textMuted, marginBottom: space.xs }}>
              {t('settings_replicaState')}
            </div>
            <pre
              style={{
                margin: 0,
                padding: space.md,
                background: colors.borderLight,
                borderRadius: radius.md,
                fontSize: 11,
                overflowX: 'auto',
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {JSON.stringify(summaries, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${space.sm}px 0`,
        borderBottom: `1px solid ${colors.borderLight}`,
        gap: space.md,
      }}
    >
      <span style={{ color: colors.textMuted, flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: font.weightMedium, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
