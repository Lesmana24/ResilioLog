import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Droplets,
  History,
  Keyboard,
  LockOpen,
  Minus,
  Navigation,
  Package,
  Plus,
  QrCode,
  ShieldAlert,
  Stethoscope,
  Trash2,
  User,
  WifiOff,
  X,
} from 'lucide-react';
import type { DistributionEntry, ItemId, Tag } from '@resiliolog/crdt-core';
import type { AppLanguage } from '../engine/errorMessages';
import { COPY } from '../i18n/translations';
import type { ItemViewModel } from '../state/useReplica';
import { MobileBottomNav, type MobileTab } from './MobileBottomNav';

interface InventarisScreenProps {
  activeTab: MobileTab;
  onChangeTab: (tab: MobileTab) => void;
  lang: AppLanguage;
  onChangeLang: (lang: AppLanguage) => void;
  nodeParam: string;
  items: ItemViewModel[];
  distributionEntries: ReadonlyArray<{ tag: Tag; el: DistributionEntry }>;
  unsyncedCount: number;
  onReceive: (itemId: ItemId, qty: number, counterparty?: string, note?: string) => Promise<{ ok: boolean }>;
  onIssue: (itemId: ItemId, qty: number, counterparty?: string, note?: string) => Promise<{ ok: boolean }>;
  onEmergencyIssue: (itemId: ItemId, qty: number, reason: string) => Promise<{ ok: boolean }>;
  onRequestTopUp: (itemId: ItemId) => Promise<unknown>;
  onVoidLog: (tag: Tag) => Promise<unknown>;
}

const SIMULATED_QR_CRATES = [
  {
    code: 'RL-CRATE-SMB-20',
    itemId: 'sembako',
    qty: 20,
    labelEn: 'Food Aid Parcels (+20 Koli)',
    labelId: 'Paket Sembako (+20 Koli)',
    donorEn: 'Courier Fleet #02',
    donorId: 'Armada Kurir #02',
  },
  {
    code: 'RL-CRATE-AIR-30',
    itemId: 'air-19l',
    qty: 30,
    labelEn: 'Clean Water 19L (+30 Units)',
    labelId: 'Air Bersih 19L (+30 Unit)',
    donorEn: 'Posko B-07 Tanker',
    donorId: 'Tangki Posko B-07',
  },
  {
    code: 'RL-CRATE-MED-10',
    itemId: 'trauma-kit',
    qty: 10,
    labelEn: 'Trauma Kit B Medicine (+10 Sets)',
    labelId: 'Obat Trauma Kit B (+10 Set)',
    donorEn: 'Central Medical Depot',
    donorId: 'Gudang Medis Pusat',
  },
] as const;

function itemIcon(category: string) {
  if (category === 'water') return <Droplets className="h-5 w-5" />;
  if (category === 'medicine') return <Stethoscope className="h-5 w-5" />;
  return <Package className="h-5 w-5" />;
}

export function InventarisScreen({
  activeTab,
  onChangeTab,
  lang,
  onChangeLang,
  nodeParam,
  items,
  distributionEntries,
  unsyncedCount,
  onReceive,
  onIssue,
  onEmergencyIssue,
  onRequestTopUp,
  onVoidLog,
}: InventarisScreenProps) {
  const t = COPY[lang];
  const [flow, setFlow] = useState<'receive' | 'issue'>('issue');
  const [selectedItemId, setSelectedItemId] = useState<ItemId>('sembako');
  const [qty, setQty] = useState<number>(15);
  const [logFilter, setLogFilter] = useState<'all' | 'receive' | 'issue' | 'override_issue'>('all');

  // Modals
  const [scanOpen, setScanOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('SMB-25');
  const [manualDonor, setManualDonor] = useState('Fleet #04');

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [insufficientRightsPrompt, setInsufficientRightsPrompt] = useState(false);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) ?? items[0],
    [items, selectedItemId],
  );

  const quotaPct = selectedItem
    ? Math.round(selectedItem.remainingRatio * 100)
    : 0;
  const isCritical = quotaPct <= 15;

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return distributionEntries;
    return distributionEntries.filter(({ el }) => el.kind === logFilter);
  }, [distributionEntries, logFilter]);

  const itemNamesById = useMemo(() => {
    const map: Record<string, { name: string; unit: string; category: string }> = {};
    for (const item of items) {
      map[item.id] = { name: item.name, unit: item.unit, category: item.category };
    }
    return map;
  }, [items]);

  async function handleCommit() {
    if (!selectedItem) return;
    setInsufficientRightsPrompt(false);
    if (flow === 'receive') {
      await onReceive(selectedItem.id, qty);
    } else {
      const res = await onIssue(selectedItem.id, qty);
      if (!res.ok && qty > selectedItem.localRights) {
        setInsufficientRightsPrompt(true);
      }
    }
  }

  async function handleOverrideSubmit() {
    if (!selectedItem) return;
    if (overrideReason.trim().length === 0) {
      setOverrideError(
        lang === 'en'
          ? 'A reason is required for emergency override.'
          : 'Alasan wajib diisi untuk bypass kuota darurat.',
      );
      return;
    }
    setOverrideError(null);
    const res = await onEmergencyIssue(selectedItem.id, qty, overrideReason.trim());
    if (res.ok) {
      setOverrideReason('');
      setOverrideOpen(false);
      setInsufficientRightsPrompt(false);
    }
  }

  async function handleManualSubmit() {
    if (!selectedItem) return;
    const match = manualCode.match(/(\d+)/);
    const parsedQty = match ? Math.max(1, Number.parseInt(match[1] ?? '1', 10)) : qty;
    await onReceive(selectedItem.id, parsedQty, manualDonor.trim() || 'Manual Code', `Code: ${manualCode}`);
    setManualOpen(false);
  }

  return (
    <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-[#F8FAFC] text-[#0F172A] shadow-lg sm:rounded-3xl sm:border sm:border-slate-200">
      {/* Header matching Stitch Inventaris */}
      <header className="shrink-0 z-30 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5 text-[#0F172A]" />
              <span className="truncate text-[11px] font-bold uppercase tracking-wider text-[#0F172A]">
                {t.postBannerPrefix} {nodeParam.toUpperCase()}
              </span>
            </div>
            <h1 className="font-display truncate text-lg font-extrabold tracking-tight text-[#0F172A]">
              {activeTab === 'history' ? t.historyTitle : t.inventarisTitle}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div
              className="inline-flex select-none items-center gap-1 rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-medium shadow-xs"
              role="group"
              aria-label="Language toggle"
            >
              <button
                type="button"
                onClick={() => onChangeLang('id')}
                className={`cursor-pointer transition-colors ${
                  lang === 'id' ? 'font-bold text-[#0F172A]' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                ID
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => onChangeLang('en')}
                className={`cursor-pointer transition-colors ${
                  lang === 'en' ? 'font-bold text-[#0F172A]' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                EN
              </button>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F172A] text-white">
              <User className="h-4 w-4" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 pb-8 pt-4">
        {activeTab === 'inventaris' && (
          <>
            {/* Rapid Action Buttons: Scan Koli & Input Kode */}
            <section className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 text-sm font-bold text-[#0F172A] shadow-xs transition-all hover:bg-slate-50 active:scale-[0.98]"
              >
                <QrCode className="h-5 w-5 text-[#0F172A]" />
                <span>{t.scanKoli}</span>
              </button>
              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[#CBD5E1] bg-white px-4 text-sm font-bold text-[#0F172A] shadow-xs transition-all hover:bg-slate-50 active:scale-[0.98]"
              >
                <Keyboard className="h-5 w-5 text-[#0F172A]" />
                <span>{t.inputCode}</span>
              </button>
            </section>

            {/* Transaction Form Card */}
            <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-[#0F172A]">
                    {t.recordCardTitle}
                  </h2>
                  <p className="text-xs text-slate-500">{t.recordCardSub}</p>
                </div>
                <WifiOff className="h-5 w-5 text-[#059669]" />
              </div>

              {/* + Receive / - Issue Segmented Toggle */}
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1.5" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={flow === 'receive'}
                  onClick={() => {
                    setFlow('receive');
                    setInsufficientRightsPrompt(false);
                  }}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-sm transition-all active:scale-95 ${
                    flow === 'receive'
                      ? 'bg-[#0F172A] font-bold text-white shadow-xs'
                      : 'font-semibold text-slate-600 hover:text-[#0F172A]'
                  }`}
                >
                  {t.receiveBtn}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={flow === 'issue'}
                  onClick={() => setFlow('issue')}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-sm transition-all active:scale-95 ${
                    flow === 'issue'
                      ? 'bg-[#0F172A] font-bold text-white shadow-xs'
                      : 'font-semibold text-slate-600 hover:text-[#0F172A]'
                  }`}
                >
                  {t.issueBtn}
                </button>
              </div>

              {/* Commodity Selector */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="commodity-select" className="text-xs font-bold text-[#0F172A]">
                    {t.commodityLabel}
                  </label>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-[#0F172A]">
                    {lang === 'en'
                      ? `Priority ${selectedItem?.priority ?? 1}`
                      : `Prioritas ${selectedItem?.priority ?? 1}`}
                  </span>
                </div>
                <div className="relative">
                  <select
                    id="commodity-select"
                    value={selectedItem?.id ?? ''}
                    onChange={(e) => {
                      setSelectedItemId(e.target.value);
                      setInsufficientRightsPrompt(false);
                    }}
                    className="h-[50px] w-full appearance-none rounded-xl bg-slate-100 px-3.5 pr-10 font-display text-sm font-bold text-[#0F172A] focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20"
                  >
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.stock} {item.unit})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {/* Quantity Stepper + Preset Chips */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#0F172A]">{t.qtyLabel}</label>
                <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-1.5">
                  <button
                    type="button"
                    aria-label={lang === 'en' ? 'Decrease quantity' : 'Kurangi jumlah'}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-[#0F172A] shadow-xs transition-transform active:scale-95"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <div className="flex flex-1 flex-col items-center justify-center py-0.5">
                    <span className="tabular-nums font-mono text-2xl font-extrabold text-[#0F172A]">
                      {qty}
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      {selectedItem?.unit ?? 'Unit'}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={lang === 'en' ? 'Increase quantity' : 'Tambah jumlah'}
                    onClick={() => setQty((q) => q + 1)}
                    className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-[#0F172A] shadow-xs transition-transform active:scale-95"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 20].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => setQty((q) => q + inc)}
                      className="h-10 rounded-lg bg-slate-100 font-mono text-sm font-bold text-[#0F172A] tabular-nums transition-all hover:bg-slate-200 active:scale-95"
                    >
                      +{inc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contextual Bounded Counter Quota Bar (ONLY in - Issue mode) */}
              {flow === 'issue' && selectedItem && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-100 p-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="flex items-center gap-1 text-xs font-bold text-[#0F172A]">
                        <Package
                          className={`h-4 w-4 ${
                            isCritical ? 'text-[#DC2626]' : 'text-[#059669]'
                          }`}
                        />
                        {t.remainingQuota}:{' '}
                        <span className="font-mono tabular-nums">
                          {selectedItem.localRights}
                        </span>{' '}
                        /{' '}
                        <span className="font-mono tabular-nums">
                          {selectedItem.granted}
                        </span>
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${
                          isCritical ? 'bg-[#DC2626]' : 'bg-[#059669]'
                        }`}
                      >
                        {isCritical ? t.criticalBadge : t.healthyBadge} ({quotaPct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCritical ? 'bg-[#DC2626]' : 'bg-[#059669]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(4, quotaPct))}%` }}
                      />
                    </div>
                  </div>
                  {isCritical && (
                    <button
                      type="button"
                      onClick={() => onRequestTopUp(selectedItem.id)}
                      className="h-8 shrink-0 rounded-lg bg-[#DC2626] px-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-red-700 active:scale-95"
                    >
                      {t.requestQuotaBtn}
                    </button>
                  )}
                </div>
              )}

              {/* Insufficient Rights inline recovery banner (ONLY in - Issue mode) */}
              {flow === 'issue' && insufficientRightsPrompt && selectedItem && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-semibold">
                    {lang === 'en'
                      ? `Requested ${qty} exceeds local quota (${selectedItem.localRights}).`
                      : `Permintaan ${qty} melebihi kuota lokal (${selectedItem.localRights}).`}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onRequestTopUp(selectedItem.id)}
                      className="rounded-lg bg-white px-2.5 py-1.5 font-bold text-[#0F172A] border border-amber-300"
                    >
                      {t.requestQuotaBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverrideOpen(true)}
                      className="rounded-lg bg-[#B45309] px-2.5 py-1.5 font-bold text-white"
                    >
                      {t.emergencyOverrideBtn}
                    </button>
                  </div>
                </div>
              )}

              {/* Primary CTA & Emergency Override (Emergency Override hidden in + Receive mode) */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCommit}
                  className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-4 font-display text-sm font-bold text-white shadow-md transition-all hover:bg-[#1E293B] active:scale-[0.98]"
                >
                  <CheckCircle2 className="h-5 w-5 text-white" />
                  <span>{flow === 'receive' ? t.saveOfflineReceive : t.saveOfflineIssue}</span>
                </button>
                {flow === 'issue' && (
                  <button
                    type="button"
                    onClick={() => {
                      setOverrideError(null);
                      setOverrideOpen(true);
                    }}
                    className="flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-[#B45309] transition-colors hover:bg-amber-50"
                  >
                    <LockOpen className="h-4 w-4" />
                    <span>{t.emergencyOverrideBtn}</span>
                  </button>
                )}
              </div>
            </section>
          </>
        )}

        {/* Distribution Log List (visible on Inventaris & History tabs) */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h3 className="font-display text-sm font-bold text-[#0F172A]">
                {activeTab === 'history' ? t.historyTitle : t.unsyncedLogsTitle}
              </h3>
              <p className="text-[11px] text-slate-500">{t.unsyncedLogsSub}</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-bold text-[#059669] border border-emerald-200 tabular-nums">
              {filteredLogs.length} {lang === 'en' ? 'Items' : 'Item'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', lang === 'en' ? 'All' : 'Semua'],
                ['receive', lang === 'en' ? 'Receive' : 'Masuk'],
                ['issue', lang === 'en' ? 'Issue' : 'Keluar'],
                ['override_issue', 'Override'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setLogFilter(key)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  logFilter === key
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {filteredLogs.map(({ tag, el }) => {
              const meta = itemNamesById[el.itemId];
              const isReceive = el.kind === 'receive';
              const isOverride = el.kind === 'override_issue';
              return (
                <article
                  key={tag}
                  className={`flex items-center justify-between gap-2 rounded-xl border p-3 shadow-xs ${
                    isOverride
                      ? 'border-amber-300 bg-amber-50/70'
                      : 'border-slate-200/80 bg-white'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        isOverride
                          ? 'bg-amber-100 text-[#B45309]'
                          : isReceive
                            ? 'bg-emerald-50 text-[#059669]'
                            : 'bg-red-50 text-[#DC2626]'
                      }`}
                    >
                      {isOverride ? (
                        <ShieldAlert className="h-5 w-5" />
                      ) : (
                        itemIcon(meta?.category ?? 'other')
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-display text-sm font-bold text-[#0F172A]">
                        {meta?.name ?? el.itemId}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        <span className="font-mono">{el.wallTime ?? `c:${el.ts.c}`}</span> •{' '}
                        {el.counterparty ?? el.by}
                      </span>
                      {el.reason && (
                        <span className="mt-0.5 text-[11px] font-medium text-[#B45309]">
                          Override: {el.reason}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`font-mono text-sm font-bold tabular-nums ${
                        isReceive
                          ? 'text-[#059669]'
                          : isOverride
                            ? 'text-[#B45309]'
                            : 'text-[#DC2626]'
                      }`}
                    >
                      {isReceive ? '+' : '-'}
                      {el.qty} {meta?.unit ?? ''}
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isOverride
                            ? 'bg-amber-100 text-[#B45309]'
                            : 'bg-emerald-50 text-[#059669]'
                        }`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {isOverride
                          ? lang === 'en'
                            ? 'Override Audit'
                            : 'Audit Override'
                          : t.savedLocalBadge}
                      </span>
                      <button
                        type="button"
                        aria-label={lang === 'en' ? 'Void log entry' : 'Hapus tampilan log'}
                        title={lang === 'en' ? 'Void' : 'Sembunyikan'}
                        onClick={() => onVoidLog(tag)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            {filteredLogs.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
                <History className="mx-auto mb-1.5 h-5 w-5 text-slate-400" />
                {lang === 'en'
                  ? 'No log entries match this filter.'
                  : 'Belum ada catatan pada filter ini.'}
              </div>
            )}
          </div>
        </section>
      </main>

      <MobileBottomNav
        activeTab={activeTab}
        onChangeTab={onChangeTab}
        unsyncedCount={unsyncedCount}
        labels={{
          inventaris: t.navInventaris,
          sync: t.navSync,
          history: t.navHistory,
        }}
      />

      {/* Simulated Scan Koli Modal */}
      {scanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-[#0F172A]" />
                <h3 className="font-display text-base font-bold">{t.scanKoli}</h3>
              </div>
              <button
                type="button"
                onClick={() => setScanOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-600">
              {lang === 'en'
                ? 'Select a simulated crate barcode to record incoming goods without webcam permissions:'
                : 'Pilih simulasi barcode koli untuk mencatat barang masuk tanpa izin kamera:'}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {SIMULATED_QR_CRATES.map((crate) => {
                const label = lang === 'en' ? crate.labelEn : crate.labelId;
                const donor = lang === 'en' ? crate.donorEn : crate.donorId;
                return (
                  <button
                    key={crate.code}
                    type="button"
                    onClick={async () => {
                      await onReceive(crate.itemId, crate.qty, donor, crate.code);
                      setScanOpen(false);
                    }}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:bg-slate-100"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#0F172A]">{label}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {crate.code} • {donor}
                      </div>
                    </div>
                    <span className="rounded-lg bg-[#0F172A] px-2.5 py-1 text-xs font-bold text-white">
                      {lang === 'en' ? 'Scan' : 'Pindai'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Manual Input Code Modal */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-display text-base font-bold">{t.inputCode}</h3>
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                {lang === 'en'
                  ? 'Crate Code (number sets qty)'
                  : 'Kode Koli (angka menentukan jumlah)'}
              </label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm"
              />
              <label className="block text-xs font-semibold text-slate-700">
                {lang === 'en' ? 'Courier / Counterparty' : 'Kurir / Sumber'}
              </label>
              <input
                type="text"
                value={manualDonor}
                onChange={(e) => setManualDonor(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold"
              >
                {lang === 'en' ? 'Cancel' : 'Batal'}
              </button>
              <button
                type="button"
                onClick={handleManualSubmit}
                className="rounded-xl bg-[#0F172A] px-4 py-2 text-xs font-bold text-white"
              >
                {lang === 'en' ? 'Apply Receive' : 'Catat Masuk'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Quota Override Modal */}
      {overrideOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-amber-300 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#B45309]">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-display text-base font-bold">{t.emergencyOverrideBtn}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOverrideOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {lang === 'en'
                ? `Issuing ${qty} ${selectedItem.unit} of ${selectedItem.name} bypasses local Bounded Counter quota and creates a permanent Command Center audit entry.`
                : `Menyalurkan ${qty} ${selectedItem.unit} ${selectedItem.name} melewati batas kuota lokal dan tercatat permanen untuk audit Command Center.`}
            </p>
            <div>
              <label className="block text-xs font-bold text-[#0F172A]">
                {lang === 'en' ? 'Emergency Reason (Required)' : 'Alasan Darurat (Wajib)'}
              </label>
              <textarea
                rows={3}
                value={overrideReason}
                onChange={(e) => {
                  setOverrideReason(e.target.value);
                  if (overrideError) setOverrideError(null);
                }}
                placeholder={
                  lang === 'en'
                    ? 'e.g. Triage flood victims arriving at Sector A-04'
                    : 'Contoh: Triage korban banjir tiba di Sektor A-04'
                }
                className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-[#B45309] focus:outline-none"
              />
              {overrideError && (
                <p className="mt-1 text-xs font-semibold text-[#DC2626]">{overrideError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOverrideOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold"
              >
                {lang === 'en' ? 'Cancel' : 'Batal'}
              </button>
              <button
                type="button"
                onClick={handleOverrideSubmit}
                className="rounded-xl bg-[#B45309] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-800"
              >
                {lang === 'en' ? 'Confirm Override' : 'Konfirmasi Bypass'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
