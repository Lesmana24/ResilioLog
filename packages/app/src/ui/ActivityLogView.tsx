import { orsElements, voidLogEntry, type DistributionKind } from '@resiliolog/crdt-core';
import { useState } from 'react';
import { useLang } from '../i18n/useLang';
import { useReplica } from '../state/useReplica';
import { btn, card, colors, font, radius, space } from './styles';

type LogFilter = 'all' | DistributionKind;

export function ActivityLogView() {
  const { replica, loading, run } = useReplica();
  const { t } = useLang();
  const [logFilter, setLogFilter] = useState<LogFilter>('all');

  if (loading || !replica) {
    return (
      <div style={{ color: colors.textMuted, padding: space.lg }}>{t('loadingReplica')}</div>
    );
  }

  const logEntries = orsElements(replica.state.distributionLog)
    .filter((entry) => logFilter === 'all' || entry.el.kind === logFilter)
    .slice()
    .reverse();

  async function handleVoid(tag: string) {
    await run((r) => voidLogEntry(r, tag));
  }

  return (
    <div style={{ display: 'grid', gap: space.xl }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: space.md }}>
        <div>
          <h1 style={{ margin: 0, fontSize: font.sizeXl, fontWeight: font.weightBold }}>{t('activityLog_title')}</h1>
          <p style={{ margin: '4px 0 0', color: colors.textMuted, fontSize: font.sizeMd }}>{t('activityLog_subtitle')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
          <label style={{ fontSize: font.sizeMd, color: colors.textMuted }}>{t('activityLog_filter')}:</label>
          <select
            value={logFilter}
            onChange={(e) => setLogFilter(e.target.value as LogFilter)}
            style={{
              padding: '6px 10px',
              border: `1px solid ${colors.borderMedium}`,
              borderRadius: radius.md,
              fontSize: font.sizeMd,
              background: '#fff',
              minHeight: 36,
            }}
          >
            <option value="all">{t('activityLog_all')}</option>
            <option value="receive">{t('activityLog_receive')}</option>
            <option value="issue">{t('activityLog_issue')}</option>
            <option value="override_issue">{t('activityLog_override')}</option>
          </select>
        </div>
      </div>

      {logEntries.length === 0 ? (
        <div style={{ ...card, color: colors.textMuted, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: space.md }}>📝</div>
          <p style={{ margin: 0 }}>{t('activityLog_noEntries')}</p>
        </div>
      ) : (
        <div style={card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: font.sizeMd }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.borderLight}` }}>
                  {[
                    t('activityLog_kind'),
                    t('activityLog_item'),
                    t('activityLog_qty'),
                    t('activityLog_by'),
                    t('activityLog_counterparty'),
                    t('activityLog_time'),
                    '',
                  ].map((h, i) => (
                    <th
                      key={i}
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
                {logEntries.map(({ tag, el }) => {
                  const isOverride = el.kind === 'override_issue';
                  const kindColor = isOverride
                    ? colors.danger
                    : el.kind === 'receive'
                    ? colors.success
                    : colors.textMuted;
                  const kindBg = isOverride
                    ? colors.dangerBg
                    : el.kind === 'receive'
                    ? colors.successBg
                    : colors.borderLight;

                  return (
                    <tr
                      key={tag}
                      style={{
                        borderBottom: `1px solid ${colors.borderLight}`,
                        background: isOverride ? '#fef2f2' : 'transparent',
                      }}
                    >
                      <td style={{ padding: `${space.sm}px ${space.md}px` }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            background: kindBg,
                            color: kindColor,
                            borderRadius: radius.pill,
                            fontSize: font.sizeSm,
                            fontWeight: font.weightSemibold,
                          }}
                        >
                          {el.kind}
                        </span>
                      </td>
                      <td style={{ padding: `${space.sm}px ${space.md}px`, fontSize: font.sizeSm }}>
                        <code>{el.itemId}</code>
                      </td>
                      <td style={{ padding: `${space.sm}px ${space.md}px`, fontWeight: font.weightSemibold }}>
                        {el.qty}
                      </td>
                      <td style={{ padding: `${space.sm}px ${space.md}px`, fontSize: font.sizeSm }}>
                        <code>{el.by}</code>
                      </td>
                      <td style={{ padding: `${space.sm}px ${space.md}px`, color: colors.textMuted, fontSize: font.sizeSm }}>
                        {el.counterparty ?? '—'}
                      </td>
                      <td style={{ padding: `${space.sm}px ${space.md}px`, fontSize: font.sizeSm, color: colors.textMuted, whiteSpace: 'nowrap' }}>
                        {el.wallTime ? new Date(el.wallTime).toLocaleString() : `c:${el.ts.c}`}
                      </td>
                      <td style={{ padding: `${space.sm}px ${space.md}px` }}>
                        {!isOverride && (
                          <button
                            type="button"
                            onClick={() => void handleVoid(tag)}
                            style={{
                              ...btn.secondary,
                              padding: '4px 10px',
                              fontSize: font.sizeSm,
                              minHeight: 28,
                            }}
                          >
                            {t('activityLog_void')}
                          </button>
                        )}
                        {isOverride && el.reason && (
                          <span style={{ fontSize: font.sizeSm, color: colors.dangerText }}>
                            {t('activityLog_reason')}: {el.reason}
                          </span>
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
