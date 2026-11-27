import { itemSummary, orsElements } from '@resiliolog/crdt-core';
import { useLang } from '../i18n/useLang';
import { useReplica } from '../state/useReplica';
import { badge, card, colors, font, radius, space } from './styles';

export function InventoryView() {
  const { replica, loading } = useReplica();
  const { t } = useLang();

  if (loading || !replica) {
    return (
      <div style={{ color: colors.textMuted, padding: space.lg }}>{t('loadingReplica')}</div>
    );
  }

  const itemEntries = Object.entries(replica.state.items);
  const allLogEntries = orsElements(replica.state.distributionLog);

  return (
    <div style={{ display: 'grid', gap: space.xl }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: font.sizeXl, fontWeight: font.weightBold }}>{t('inventory_title')}</h1>
        <p style={{ margin: '4px 0 0', color: colors.textMuted, fontSize: font.sizeMd }}>{t('inventory_subtitle')}</p>
      </div>

      {itemEntries.length === 0 ? (
        <div style={{ ...card, color: colors.textMuted, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: space.md }}>📋</div>
          <p style={{ margin: 0 }}>{t('inventory_noItems')}</p>
        </div>
      ) : (
        <div style={card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: font.sizeMd }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.borderLight}` }}>
                  {[
                    t('inventory_name'),
                    t('inventory_unit'),
                    t('inventory_category'),
                    t('inventory_totalStock'),
                    t('inventory_localRights'),
                    t('inventory_in'),
                    t('inventory_out'),
                    t('inventory_deficit'),
                    t('inventory_overrides'),
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: `${space.sm}px ${space.md}px`,
                        textAlign: 'left',
                        color: colors.textMuted,
                        fontWeight: font.weightSemibold,
                        fontSize: font.sizeSm,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {itemEntries.map(([id, item]) => {
                  const s = itemSummary(replica.state, id);
                  const myRights = s?.rights[replica.nodeId] ?? 0;
                  const overrideCount = allLogEntries.filter(
                    (e) => e.el.kind === 'override_issue' && e.el.itemId === id,
                  ).length;
                  return (
                    <tr
                      key={id}
                      style={{ borderBottom: `1px solid ${colors.borderLight}` }}
                    >
                      <td style={{ padding: `${space.sm}px ${space.md}px`, fontWeight: font.weightSemibold }}>
                        {item.meta.name}
                      </td>
                      <td style={{ padding: `${space.sm}px ${space.md}px`, color: colors.textMuted }}>
                        {item.meta.unit}
                      </td>
                      <td style={{ padding: `${space.sm}px ${space.md}px` }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            background: colors.tealLight,
                            color: colors.tealDark,
                            borderRadius: radius.pill,
                            fontSize: font.sizeSm,
                            fontWeight: font.weightMedium,
                          }}
                        >
                          {item.meta.category}
                        </span>
                      </td>
                      <td style={{ padding: `${space.sm}px ${space.md}px`, fontWeight: font.weightBold }}>
                        {s?.value ?? 0}
                      </td>
                      <td style={{ padding: `${space.sm}px ${space.md}px` }}>{myRights}</td>
                      <td style={{ padding: `${space.sm}px ${space.md}px`, color: colors.success }}>
                        +{s?.ledgerIn ?? 0}
                      </td>
                      <td style={{ padding: `${space.sm}px ${space.md}px`, color: colors.danger }}>
                        -{s?.ledgerOut ?? 0}
                      </td>
                      <td style={{ padding: `${space.sm}px ${space.md}px` }}>
                        {(s?.deficit ?? 0) > 0 ? (
                          <span style={badge.deficit}>{s!.deficit}</span>
                        ) : (
                          <span style={{ color: colors.textSubtle }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: `${space.sm}px ${space.md}px` }}>
                        {overrideCount > 0 ? (
                          <span style={badge.deficit}>{overrideCount}</span>
                        ) : (
                          <span style={{ color: colors.textSubtle }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
