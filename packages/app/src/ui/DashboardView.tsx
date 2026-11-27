import { itemSummary, orsElements } from '@resiliolog/crdt-core';
import { useEffect, useState, type ReactNode } from 'react';
import { useLang } from '../i18n/useLang';
import { useReplica } from '../state/useReplica';
import { listCursors, type CursorRow } from '../storage/db';
import type { Page } from './AppLayout';
import {
  IconAlertTriangle,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconBarChart,
  IconBell,
  IconDroplet,
  IconHeartPulse,
  IconHome,
  IconPackage,
  IconShield,
  IconTrendingDown,
  IconTrendingUp,
} from './Icons';
import {
  badge,
  btn,
  card,
  colors,
  font,
  radius,
  space,
} from './styles';
import { buildSampleData } from './sample-data';

interface DashboardViewProps {
  onNavigate: (page: Page) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: '#6366f1',
  water: '#38bdf8',
  medicine: '#f43f5e',
  shelter: '#a855f7',
  hygiene: '#10b981',
  other: '#f59e0b',
};

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case 'water':
      return <IconDroplet size={15} color="#0284c7" />;
    case 'medicine':
      return <IconHeartPulse size={15} color="#dc2626" />;
    case 'shelter':
      return <IconHome size={15} color="#7c3aed" />;
    case 'hygiene':
      return <IconShield size={15} color="#059669" />;
    default:
      return <IconPackage size={15} color={colors.teal} />;
  }
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { replica, loading, run } = useReplica();
  const { t } = useLang();
  const [cursors, setCursors] = useState<readonly CursorRow[]>([]);
  const [loadingSample, setLoadingSample] = useState(false);

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
  const recentLogs = allLogEntries.slice().reverse().slice(0, 4);

  const maxSyncedClock = cursors.reduce((max, c) => (c.until > max ? c.until : max), 0);
  const hasUnsyncedChanges = replica.clock > maxSyncedClock;

  let totalStock = 0;
  let totalIn = 0;
  const itemRows: Array<{
    id: string;
    name: string;
    unit: string;
    category: string;
    value: number;
    ledgerIn: number;
    ledgerOut: number;
    myRights: number;
    deficit: number;
  }> = [];

  const categoryTotals: Record<string, number> = {};

  for (const [id, item] of itemEntries) {
    const s = itemSummary(replica.state, id);
    const value = s?.value ?? 0;
    const ledgerIn = s?.ledgerIn ?? 0;
    const ledgerOut = s?.ledgerOut ?? 0;
    const myRights = s?.rights[replica.nodeId] ?? 0;
    const deficit = s?.deficit ?? 0;

    totalStock += value;
    totalIn += ledgerIn;
    categoryTotals[item.meta.category] = (categoryTotals[item.meta.category] ?? 0) + Math.max(0, value);

    itemRows.push({
      id,
      name: item.meta.name,
      unit: item.meta.unit,
      category: item.meta.category,
      value,
      ledgerIn,
      ledgerOut,
      myRights,
      deficit,
    });
  }

  const sortedItems = itemRows.slice().sort((a, b) => b.value - a.value);
  const chartItems = sortedItems.slice(0, 6);
  const maxBarVal = Math.max(1, ...chartItems.map((r) => Math.max(r.ledgerIn, r.ledgerOut)));

  const categoryEntries = Object.entries(categoryTotals)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const categorySum = categoryEntries.reduce((acc, [, v]) => acc + v, 0);

  return (
    <div style={{ display: 'grid', gap: space.lg }}>
      {import.meta.env.DEV && itemEntries.length === 0 && (
        <div
          style={{
            ...card,
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            background: colors.tealLight,
            borderColor: '#c7d2fe',
          }}
        >
          <div style={{ fontSize: font.sizeMd, color: colors.tealDark }}>
            <strong>DEV-ONLY:</strong> {t('dashboard_noItems')}
          </div>
          <button
            type="button"
            disabled={loadingSample}
            onClick={() => {
              setLoadingSample(true);
              void run((r) => buildSampleData(r)).finally(() => setLoadingSample(false));
            }}
            style={{ ...btn.primary, minHeight: 36, padding: '6px 14px', fontSize: font.sizeSm }}
          >
            {t('settings_sampleData')}
          </button>
        </div>
      )}

      {/* Row 1: 4 Horizontal KPI Cards (Prodex style) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: space.md }}>
        <HorizontalKpiCard
          label={t('dashboard_totalItems')}
          value={itemEntries.length}
          icon={<IconPackage size={18} color="#4f46e5" />}
          iconBg="#eef2ff"
        />
        <HorizontalKpiCard
          label={t('dashboard_totalStock')}
          value={totalStock}
          icon={<IconBarChart size={18} color="#0284c7" />}
          iconBg="#f0f9ff"
        />
        <HorizontalKpiCard
          label={t('dashboard_totalIn')}
          value={totalIn}
          icon={<IconTrendingUp size={18} color="#16a34a" />}
          iconBg="#ecfdf5"
        />
        <HorizontalKpiCard
          label={overrideEntries.length > 0 ? t('dashboard_emergencyOverrides') : t('dashboard_openTopUps')}
          value={overrideEntries.length > 0 ? overrideEntries.length : openTopUps.length}
          icon={
            overrideEntries.length > 0 ? (
              <IconAlertTriangle size={18} color="#dc2626" />
            ) : (
              <IconBell size={18} color="#d97706" />
            )
          }
          iconBg={overrideEntries.length > 0 ? '#fef2f2' : '#fffbeb'}
        />
      </div>

      {/* Row 2: Stock Flow Bar Chart + Category Donut Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: space.md }}>
        {/* Stock Flow Overview */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconBarChart size={18} color={colors.textMuted} />
              <h2 style={{ margin: 0, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
                {t('dashboard_stockOverview')}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: font.sizeSm, color: colors.textMuted }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#5562f6' }} />
                {t('dashboard_stockIn')}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c7d2fe' }} />
                {t('dashboard_stockOut')}
              </span>
            </div>
          </div>

          {chartItems.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: colors.textMuted, fontSize: font.sizeMd }}>
              {t('dashboard_noItems')}
            </div>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <svg viewBox="0 0 460 190" style={{ width: '100%', height: 190, display: 'block' }}>
                <defs>
                  <linearGradient id="barInGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
                {/* Horizontal gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = 150 - ratio * 125;
                  return (
                    <line
                      key={idx}
                      x1={32}
                      y1={y}
                      x2={448}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                  );
                })}
                {chartItems.map((item, idx) => {
                  const slotW = 410 / chartItems.length;
                  const cx = 36 + idx * slotW + slotW / 2;
                  const barW = Math.min(24, slotW * 0.34);
                  const hIn = Math.max(4, (item.ledgerIn / maxBarVal) * 125);
                  const hOut = Math.max(4, (item.ledgerOut / maxBarVal) * 125);
                  const label = item.name.length > 9 ? `${item.name.slice(0, 8)}…` : item.name;
                  return (
                    <g key={item.id}>
                      {/* Background track */}
                      <rect
                        x={cx - barW - 2}
                        y={25}
                        width={barW}
                        height={125}
                        rx={5}
                        fill="#f8fafc"
                      />
                      {/* In bar */}
                      <rect
                        x={cx - barW - 2}
                        y={150 - hIn}
                        width={barW}
                        height={hIn}
                        rx={5}
                        fill="url(#barInGrad)"
                      />
                      {/* Out bar */}
                      <rect
                        x={cx + 2}
                        y={150 - hOut}
                        width={barW}
                        height={hOut}
                        rx={5}
                        fill="#c7d2fe"
                      />
                      <text
                        x={cx}
                        y={172}
                        textAnchor="middle"
                        fontSize="10.5"
                        fill={colors.textMuted}
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </div>

        {/* Category Breakdown Donut */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md }}>
            <h2 style={{ margin: 0, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
              {t('dashboard_topCategories')}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              style={{ ...btn.secondary, padding: '4px 10px', minHeight: 30, fontSize: font.sizeSm }}
            >
              {t('dashboard_seeAll')}
            </button>
          </div>

          {categoryEntries.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: colors.textMuted, fontSize: font.sizeMd }}>
              {t('dashboard_noItems')}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: space.md }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <DonutChart entries={categoryEntries} total={categorySum} totalLabel={t('dashboard_totalStock')} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {categoryEntries.map(([cat, val]) => {
                  const pct = categorySum > 0 ? Math.round((val / categorySum) * 100) : 0;
                  return (
                    <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: font.sizeSm }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textTransform: 'capitalize' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[cat] ?? '#6366f1' }} />
                        {cat}
                      </span>
                      <span style={{ color: colors.textMuted }}>
                        <strong style={{ color: colors.text }}>{val}</strong> &nbsp; {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Recent Activity + Top Inventory Table */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: space.md }}>
        {/* Recent Activity */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md }}>
            <h2 style={{ margin: 0, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
              {t('dashboard_recentActivity')}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('activity-log')}
              style={{ ...btn.secondary, padding: '4px 10px', minHeight: 30, fontSize: font.sizeSm }}
            >
              {t('dashboard_seeAll')}
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <p style={{ margin: 0, color: colors.textMuted, fontSize: font.sizeMd }}>{t('dashboard_noActivity')}</p>
          ) : (
            <div style={{ display: 'grid', gap: space.sm }}>
              {recentLogs.map(({ tag, el }) => {
                const isOverride = el.kind === 'override_issue';
                const isReceive = el.kind === 'receive';
                const itemName = replica.state.items[el.itemId]?.meta.name ?? el.itemId;
                return (
                  <div
                    key={tag}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      border: `1px solid ${colors.borderLight}`,
                      borderRadius: radius.md,
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: isOverride ? '#fef2f2' : isReceive ? '#ecfdf5' : '#eef2ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isOverride ? (
                          <IconAlertTriangle size={15} color="#dc2626" />
                        ) : isReceive ? (
                          <IconArrowDownLeft size={15} color="#16a34a" />
                        ) : (
                          <IconArrowUpRight size={15} color="#4f46e5" />
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: font.sizeMd, fontWeight: font.weightMedium, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {itemName} ({el.qty})
                        </div>
                        <div style={{ fontSize: font.sizeSm, color: colors.textMuted }}>
                          {el.by} · c:{el.ts.c}
                        </div>
                      </div>
                    </div>
                    <span
                      style={
                        isOverride
                          ? badge.deficit
                          : isReceive
                          ? badge.success
                          : { ...badge.warning, backgroundColor: '#eef2ff', color: '#4f46e5' }
                      }
                    >
                      {el.kind}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inventory Summary Table */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>
              {t('dashboard_topItemsTable')}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={hasUnsyncedChanges ? badge.warning : badge.success}>
                {hasUnsyncedChanges ? t('dashboard_unsyncedChanges') : t('dashboard_allSynced')}
              </span>
              <button
                type="button"
                onClick={() => onNavigate('field')}
                style={{ ...btn.secondary, padding: '4px 10px', minHeight: 30, fontSize: font.sizeSm }}
              >
                {t('nav_field')}
              </button>
            </div>
          </div>

          {sortedItems.length === 0 ? (
            <p style={{ margin: 0, color: colors.textMuted, fontSize: font.sizeMd }}>{t('dashboard_noItems')}</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: font.sizeSm }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.borderLight}`, color: colors.textMuted }}>
                    <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: font.weightMedium }}>{t('inventory_name')}</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: font.weightMedium }}>{t('inventory_totalStock')}</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: font.weightMedium }}>{t('inventory_localRights')}</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: font.weightMedium }}>{t('inventory_in')}</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: font.weightMedium }}>{t('inventory_out')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.slice(0, 5).map((row) => (
                    <tr key={row.id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                      <td style={{ padding: '10px 6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CategoryIcon category={row.category} />
                          <div>
                            <div style={{ fontWeight: font.weightMedium, color: colors.text }}>{row.name}</div>
                            <div style={{ fontSize: 11, color: colors.textMuted }}>{row.unit}</div>
                          </div>
                          {row.deficit > 0 && (
                            <span style={badge.deficit}>{t('dashboard_deficit')} {row.deficit}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: font.weightSemibold }}>{row.value}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right' }}>{row.myRights}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', color: colors.success }}>+{row.ledgerIn}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', color: colors.textMuted }}>-{row.ledgerOut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HorizontalKpiCard({
  label,
  value,
  icon,
  iconBg,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  iconBg: string;
}) {
  return (
    <div
      style={{
        ...card,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '50%',
          background: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: font.sizeSm, color: colors.textMuted, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: font.size2xl, fontWeight: font.weightBold, color: colors.text, lineHeight: 1.15 }}>
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function DonutChart({
  entries,
  total,
  totalLabel,
}: {
  entries: Array<[string, number]>;
  total: number;
  totalLabel: string;
}) {
  const size = 148;
  const strokeWidth = 18;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth={strokeWidth}
      />
      {entries.map(([cat, val]) => {
        const frac = total > 0 ? val / total : 0;
        const dash = frac * circumference;
        const dashArray = `${Math.max(0, dash - 3)} ${circumference}`;
        const dashOffset = -offset;
        offset += dash;
        return (
          <circle
            key={cat}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={CATEGORY_COLORS[cat] ?? '#6366f1'}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontSize="10" fill={colors.textMuted}>
        {totalLabel}
      </text>
      <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fontSize="18" fontWeight="700" fill={colors.text}>
        {total.toLocaleString()}
      </text>
    </svg>
  );
}
