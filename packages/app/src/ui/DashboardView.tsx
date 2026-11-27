import { itemSummary, orsElements } from '@resiliolog/crdt-core';
import { useLang } from '../i18n/useLang';
import { useReplica } from '../state/useReplica';
import { listCursors, type CursorRow } from '../storage/db';
import { useEffect, useState } from 'react';
import {
  badge,
  card,
  colors,
  font,
  quickActionColors,
  radius,
  space,
} from './styles';
import type { Page } from './AppLayout';

interface DashboardViewProps {
  onNavigate: (page: Page) => void;
}

const CAT_ICONS: Record<string, string> = {
  food: '🌾',
  water: '💧',
  medicine: '💊',
  shelter: '🏠',
  hygiene: '🧴',
  other: '📦',
};

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { replica, loading } = useReplica();
  const { t } = useLang();
  const [cursors, setCursors] = useState<readonly CursorRow[]>([]);

  useEffect(() => {
    let active = true;
    void listCursors().then((rows) => { if (active) setCursors(rows); });
    return () => { active = false; };
  }, [replica?.clock]);

  if (loading || !replica) {
    return (
      <div style={{ color: colors.textMuted, padding: space.lg }}>
        {t('loadingReplica')}
      </div>
    );
  }

  const itemEntries = Object.entries(replica.state.items);
  const allLogEntries = orsElements(replica.state.distributionLog);
  const overrideEntries = allLogEntries.filter((e) => e.el.kind === 'override_issue');
  const openTopUps = orsElements(replica.state.topUpQueue);

  const maxSyncedClock = cursors.reduce((max, c) => (c.until > max ? c.until : max), 0);
  const hasUnsyncedChanges = replica.clock > maxSyncedClock;

  // Compute total stock across all items
  let totalStock = 0;
  for (const [id] of itemEntries) {
    const s = itemSummary(replica.state, id);
    totalStock += s?.value ?? 0;
  }

  const quickActions: Array<{ labelKey: string; subKey: string; page: Page; emoji: string }> = [
    { labelKey: 'dashboard_receiveGoods', subKey: 'dashboard_receiveGoodsSub', page: 'field', emoji: '📥' },
    { labelKey: 'dashboard_issueGoods', subKey: 'dashboard_issueGoodsSub', page: 'field', emoji: '📤' },
    { labelKey: 'dashboard_transferRights', subKey: 'dashboard_transferRightsSub', page: 'command-center', emoji: '🔀' },
    { labelKey: 'dashboard_qrSync', subKey: 'dashboard_qrSyncSub', page: 'sync', emoji: '📲' },
  ];

  return (
    <div style={{ display: 'grid', gap: space.xl }}>
      {/* Welcome */}
      <div>
        <h1 style={{ margin: 0, fontSize: font.sizeXl, fontWeight: font.weightBold, color: colors.text }}>
          {t('dashboard_welcome')}
        </h1>
        <p style={{ margin: '4px 0 0', color: colors.textMuted, fontSize: font.sizeMd }}>
          {t('dashboard_subtitle')}
        </p>
      </div>

      {/* Quick Action Cards */}
      <div>
        <h2 style={{ margin: `0 0 ${space.md}px`, fontSize: font.sizeLg, fontWeight: font.weightSemibold, color: colors.text }}>
          {t('dashboard_quickActions')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: space.md }}>
          {quickActions.map((qa, i) => {
            const c = quickActionColors[i % quickActionColors.length]!;
            return (
              <button
                key={qa.page + qa.labelKey}
                type="button"
                onClick={() => onNavigate(qa.page)}
                style={{
                  background: c.bg,
                  border: 'none',
                  borderRadius: radius.lg,
                  padding: space.md,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: space.xs,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                  minHeight: 90,
                }}
              >
                <span style={{ fontSize: 24 }}>{qa.emoji}</span>
                <span style={{ fontSize: font.sizeMd, fontWeight: font.weightSemibold, color: c.accent }}>
                  {t(qa.labelKey)}
                </span>
                <span style={{ fontSize: font.sizeSm, color: colors.textMuted }}>{t(qa.subKey)}</span>
                <span style={{ position: 'absolute', top: 10, right: 12, color: c.accent, fontSize: 18 }}>↗</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: space.md }}>
        <KpiCard label={t('dashboard_totalItems')} value={itemEntries.length} emoji="📦" />
        <KpiCard label={t('dashboard_totalStock')} value={totalStock} emoji="📊" />
        <KpiCard label={t('dashboard_openTopUps')} value={openTopUps.length} emoji="🔔" warn={openTopUps.length > 0} />
        <KpiCard label={t('dashboard_emergencyOverrides')} value={overrideEntries.length} emoji="⚠️" danger={overrideEntries.length > 0} />
      </div>

      {/* Bottom row: Inventory insights + Sync status + Node info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: space.md }}>

        {/* Inventory Insights */}
        <div style={card}>
          <h3 style={{ margin: `0 0 ${space.md}px`, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
            {t('dashboard_inventoryInsights')}
          </h3>
          {itemEntries.length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: font.sizeMd, margin: 0 }}>{t('dashboard_noItems')}</p>
          ) : (
            <div style={{ display: 'grid', gap: space.sm }}>
              {itemEntries
                .map(([id, item]) => {
                  const s = itemSummary(replica.state, id);
                  return { id, item, value: s?.value ?? 0, deficit: s?.deficit ?? 0 };
                })
                .sort((a, b) => b.value - a.value)
                .slice(0, 5)
                .map(({ id, item, value, deficit }) => (
                  <div
                    key={id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: `${space.sm}px 0`,
                      borderBottom: `1px solid ${colors.borderLight}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
                      <span>{CAT_ICONS[item.meta.category] ?? '📦'}</span>
                      <div>
                        <div style={{ fontSize: font.sizeMd, fontWeight: font.weightMedium }}>{item.meta.name}</div>
                        <div style={{ fontSize: font.sizeSm, color: colors.textMuted }}>{item.meta.unit} · {item.meta.category}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
                      <span style={{ fontSize: font.sizeLg, fontWeight: font.weightBold }}>{value}</span>
                      {deficit > 0 && (
                        <span style={badge.deficit}>{t('dashboard_deficit')} {deficit}</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Sync Status */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md }}>
            <h3 style={{ margin: 0, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
              {t('dashboard_syncStatus')}
            </h3>
            <span style={hasUnsyncedChanges ? badge.warning : badge.success}>
              {hasUnsyncedChanges ? t('dashboard_unsyncedChanges') : t('dashboard_allSynced')}
            </span>
          </div>
          {cursors.length === 0 ? (
            <p style={{ color: colors.textMuted, fontSize: font.sizeMd, margin: 0 }}>{t('dashboard_noPeers')}</p>
          ) : (
            <div style={{ display: 'grid', gap: space.sm }}>
              {cursors.map((c) => (
                <div
                  key={c.peerId}
                  style={{
                    padding: `${space.sm}px ${space.md}px`,
                    background: colors.tealLight,
                    borderRadius: radius.md,
                    fontSize: font.sizeSm,
                  }}
                >
                  <div style={{ fontWeight: font.weightSemibold, color: colors.tealDark }}>{c.peerId}</div>
                  <div style={{ color: colors.textMuted }}>Clock: {c.until} · {c.lastSyncAt ?? 'unknown'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Node Info */}
        <div style={card}>
          <h3 style={{ margin: `0 0 ${space.md}px`, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
            {t('dashboard_nodeInfo')}
          </h3>
          <div style={{ display: 'grid', gap: space.sm }}>
            <InfoRow label={t('dashboard_nodeId')} value={<code style={{ fontSize: font.sizeSm }}>{replica.nodeId}</code>} />
            <InfoRow label={t('dashboard_clock')} value={String(replica.clock)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  emoji,
  warn,
  danger,
}: {
  label: string;
  value: number;
  emoji: string;
  warn?: boolean;
  danger?: boolean;
}) {
  const bg = danger ? colors.dangerBg : warn ? colors.warningBg : colors.cardBg;
  const textColor = danger ? colors.dangerText : warn ? '#92400e' : colors.text;

  return (
    <div
      style={{
        ...card,
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        gap: space.xs,
      }}
    >
      <div style={{ fontSize: 24 }}>{emoji}</div>
      <div style={{ fontSize: font.size3xl, fontWeight: font.weightBold, color: textColor, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: font.sizeSm, color: colors.textMuted }}>{label}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: font.sizeMd }}>
      <span style={{ color: colors.textMuted }}>{label}</span>
      <span style={{ fontWeight: font.weightMedium }}>{value}</span>
    </div>
  );
}
