import { useEffect, useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ClipboardList,
  Copy,
  Droplets,
  LogOut,
  Package,
  Pause,
  Play,
  QrCode,
  ShieldCheck,
  Stethoscope,
  Truck,
  User,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { DistributionEntry, Result, Tag } from '@resiliolog/crdt-core';
import type { ChunkProgress } from '@resiliolog/sync';
import type { AnyEngineErrorCode, AppLanguage } from '../engine/errorMessages';
import { COPY } from '../i18n/translations';
import type { ItemViewModel } from '../state/useReplica';
import type { PeerCursorRow } from '../storage/db';
import { QrScannerModal } from './QrScannerModal';

type CourierTab = 'relay' | 'manifest';

interface CourierScreenProps {
  lang: AppLanguage;
  onChangeLang: (lang: AppLanguage) => void;
  officerId: string;
  onLogout: () => void;
  items: ItemViewModel[];
  distributionEntries: ReadonlyArray<{ tag: Tag; el: DistributionEntry }>;
  cursors: PeerCursorRow[];
  qrProgress: ChunkProgress | null;
  getQrChunks: () => { chunks: string[]; msgId: string; crc32: string; totalChars: number };
  onImportQrFrame: (frameText: string) => Promise<Result<ChunkProgress, AnyEngineErrorCode>>;
}

function tileLabel(name: string, lang: AppLanguage): string {
  const lower = name.toLowerCase();
  if (lower.includes('sembako')) return lang === 'en' ? 'Food Aid' : 'Sembako';
  if (lower.includes('air')) return lang === 'en' ? 'Water 19L' : 'Air 19L';
  if (lower.includes('trauma')) return 'Trauma Kit';
  return name;
}

function formatEntryTime(wallTime: string | undefined, clock: number, lang: AppLanguage): string {
  if (!wallTime) return `c:${clock}`;
  if (wallTime.includes('T')) {
    const t = new Date(wallTime).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return lang === 'id' ? `${t} WIB` : t;
  }
  return wallTime;
}

export function CourierScreen({
  lang,
  onChangeLang,
  officerId,
  onLogout,
  items,
  distributionEntries,
  cursors,
  qrProgress,
  getQrChunks,
  onImportQrFrame,
}: CourierScreenProps) {
  const t = COPY[lang];
  const [courierTab, setCourierTab] = useState<CourierTab>('relay');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [qrPanelOpen, setQrPanelOpen] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [autoCycle, setAutoCycle] = useState(true);
  const [frameIndex, setFrameIndex] = useState(0);
  const [frameInput, setFrameInput] = useState('');
  const [logFilter, setLogFilter] = useState<'all' | 'receive' | 'issue' | 'override_issue'>('all');

  const qrBundle = useMemo(() => getQrChunks(), [getQrChunks, distributionEntries, items]);
  const safeFrameIdx =
    qrBundle.chunks.length > 0 ? Math.min(frameIndex, qrBundle.chunks.length - 1) : 0;
  const activeFrame = qrBundle.chunks[safeFrameIdx] ?? '';

  useEffect(() => {
    if (!qrPanelOpen || !autoCycle || qrBundle.chunks.length <= 1) return;
    const timer = window.setInterval(() => {
      setFrameIndex((i) => (i + 1) % qrBundle.chunks.length);
    }, 650);
    return () => window.clearInterval(timer);
  }, [qrPanelOpen, autoCycle, qrBundle.chunks.length]);

  const itemMetaMap = useMemo(() => {
    const m: Record<string, { name: string; unit: string; category: string }> = {};
    for (const item of items) {
      m[item.id] = { name: item.name, unit: item.unit, category: item.category };
    }
    return m;
  }, [items]);

  const filteredEntries = useMemo(() => {
    const sorted = [...distributionEntries].reverse();
    if (logFilter === 'all') return sorted;
    return sorted.filter(({ el }) => el.kind === logFilter);
  }, [distributionEntries, logFilter]);

  async function handleImportSubmit() {
    if (!frameInput.trim()) return;
    await onImportQrFrame(frameInput);
    setFrameInput('');
  }

  return (
    <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-[#F8FAFC] text-[#0F172A] shadow-lg sm:rounded-3xl sm:border sm:border-slate-200">
      {/* Courier Header */}
      <header className="shrink-0 z-30 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-[#B45309]" />
              <span className="truncate text-[11px] font-bold uppercase tracking-wider text-[#B45309]">
                {t.courierBannerPrefix} {officerId}
              </span>
            </div>
            <h1 className="font-display truncate text-lg font-extrabold tracking-tight text-[#0F172A]">
              {courierTab === 'relay' ? t.courierRelayTitle : t.courierManifestTitle}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="inline-flex select-none items-center gap-1 rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-medium shadow-xs">
              <button
                type="button"
                onClick={() => onChangeLang('id')}
                className={`cursor-pointer ${
                  lang === 'id' ? 'font-bold text-[#0F172A]' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                ID
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => onChangeLang('en')}
                className={`cursor-pointer ${
                  lang === 'en' ? 'font-bold text-[#0F172A]' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                EN
              </button>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((o) => !o)}
                aria-label="Account menu"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#0F172A] text-white transition-colors hover:bg-slate-800"
              >
                <User className="h-4 w-4" />
              </button>
              {accountMenuOpen && (
                <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  <div className="border-b border-slate-100 px-2.5 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {t.signedInAs}
                    </div>
                    <div className="truncate text-xs font-bold text-[#0F172A]">{officerId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onLogout();
                    }}
                    className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>{t.signOutBtn}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 pb-8 pt-4">
        {courierTab === 'relay' ? (
          <>
            {/* Courier Status + 3-Stat Strip */}
            <section className="rounded-2xl border border-amber-200/80 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-[#B45309]">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-display text-sm font-bold text-[#0F172A]">
                      {t.courierRelayTitle}
                    </div>
                    <div className="text-xs text-slate-500">{t.courierReadySub}</div>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-[#059669]">
                  {t.activeBadge}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                <div className="rounded-xl bg-slate-50 p-2 text-center">
                  <div className="font-display text-base font-extrabold text-[#0F172A]">
                    {distributionEntries.length}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    {t.carriedLogsLabel}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2 text-center">
                  <div className="font-display text-base font-extrabold text-[#0F172A]">
                    {cursors.length}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    {t.syncedPostsLabel}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2 text-center">
                  <div className="font-display text-base font-extrabold text-[#B45309]">
                    {qrBundle.chunks.length}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500">
                    {t.qrFramesLabel}
                  </div>
                </div>
              </div>
            </section>

            {/* Primary Courier Actions: Scan QR from Post & Show Relay QR */}
            <section className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.98]"
              >
                <Camera className="h-4 w-4 shrink-0" />
                <span>{t.scanFromPostBtn}</span>
              </button>
              <button
                type="button"
                onClick={() => setQrPanelOpen((v) => !v)}
                className="flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-[#B45309] shadow-xs transition-all hover:bg-amber-100 active:scale-[0.98]"
              >
                <QrCode className="h-4 w-4 shrink-0" />
                <span>{t.showRelayQrBtn}</span>
              </button>
            </section>

            {/* Chunked QR Progress Feedback */}
            {qrProgress && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#059669]" />
                  <span>
                    QR {qrProgress.msgId}: {qrProgress.received}/{qrProgress.total}{' '}
                    {qrProgress.complete
                      ? lang === 'en'
                        ? 'Complete & Merged!'
                        : 'Lengkap & Digabung!'
                      : lang === 'en'
                        ? 'received...'
                        : 'diterima...'}
                  </span>
                </div>
                <span className="font-mono text-[11px]">
                  {Math.round((qrProgress.received / Math.max(1, qrProgress.total)) * 100)}%
                </span>
              </div>
            )}

            {/* Relay QR Display + Manual Paste Fallback */}
            {qrPanelOpen && (
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">{t.courierQrTitle}</div>
                    <div className="font-mono text-[10px] text-slate-500">
                      msgId: {qrBundle.msgId} • crc32: {qrBundle.crc32}
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-[#0F172A]">
                    Frame {safeFrameIdx + 1} / {qrBundle.chunks.length}
                  </span>
                </div>

                {activeFrame ? (
                  <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="rounded-xl bg-white p-3 shadow-xs">
                      <QRCodeSVG value={activeFrame} size={196} level="M" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAutoCycle((c) => !c)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#0F172A] hover:bg-slate-50"
                      >
                        {autoCycle ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        <span>{autoCycle ? 'Pause' : 'Play'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAutoCycle(false);
                          setFrameIndex((i) => (i - 1 + qrBundle.chunks.length) % qrBundle.chunks.length);
                        }}
                        className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#0F172A] hover:bg-slate-50"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAutoCycle(false);
                          setFrameIndex((i) => (i + 1) % qrBundle.chunks.length);
                        }}
                        className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#0F172A] hover:bg-slate-50"
                      >
                        Next
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard?.writeText(activeFrame);
                        }}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#0F172A] hover:bg-slate-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Manual Frame Import Fallback */}
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  <div className="text-[11px] font-semibold text-slate-500">
                    {lang === 'en'
                      ? 'Manual QR Frame Paste (RL1:...)'
                      : 'Tempel Frame QR Manual (RL1:...)'}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={frameInput}
                      onChange={(e) => setFrameInput(e.target.value)}
                      placeholder="RL1:msgId:0/2:crc:..."
                      className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 font-mono text-xs outline-none focus:border-[#0F172A] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleImportSubmit}
                      className="cursor-pointer rounded-lg bg-[#0F172A] px-3.5 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      {lang === 'en' ? 'Import' : 'Impor'}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Carried Stock Snapshot (Read-Only) */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t.carriedStockTitle}
                </span>
                <ShieldCheck className="h-4 w-4 text-[#059669]" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {items.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-center"
                  >
                    <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#0F172A] shadow-2xs">
                      {item.category === 'water' ? (
                        <Droplets className="h-3.5 w-3.5 text-sky-600" />
                      ) : item.category === 'medicine' ? (
                        <Stethoscope className="h-3.5 w-3.5 text-rose-600" />
                      ) : (
                        <Package className="h-3.5 w-3.5 text-amber-600" />
                      )}
                    </div>
                    <div className="truncate text-[11px] font-semibold text-slate-600">
                      {tileLabel(item.name, lang)}
                    </div>
                    <div className="font-display text-sm font-extrabold text-[#0F172A]">
                      {item.stock}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Synced Posts List */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                {t.syncedPeersTitle}
              </h2>
              {cursors.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  {t.noPeersSyncedYet}
                </p>
              ) : (
                <div className="space-y-2">
                  {cursors.map((c) => (
                    <div
                      key={c.peerId}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span className="font-bold text-[#0F172A]">{c.label ?? c.peerId}</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {formatEntryTime(c.lastSyncAt, c.until, lang)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Read-Only Carried Logistics Audit Trail */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t.manifestAuditTitle} ({filteredEntries.length})
                </h2>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ['all', lang === 'en' ? 'All' : 'Semua'],
                      ['receive', lang === 'en' ? 'In' : 'Masuk'],
                      ['issue', lang === 'en' ? 'Out' : 'Keluar'],
                      ['override_issue', 'Override'],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setLogFilter(val)}
                      className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                        logFilter === val
                          ? 'bg-[#0F172A] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {filteredEntries.map(({ tag, el }) => {
                  const meta = itemMetaMap[el.itemId];
                  const isReceive = el.kind === 'receive';
                  const isOverride = el.kind === 'override_issue';
                  return (
                    <div
                      key={tag}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              isReceive
                                ? 'bg-emerald-100 text-[#059669]'
                                : isOverride
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isReceive ? '+' : '-'}
                            {el.qty} {meta?.unit ?? ''}
                          </span>
                          <span className="truncate text-xs font-bold text-[#0F172A]">
                            {meta?.name ?? el.itemId}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-slate-500">
                          {el.counterparty ?? el.reason ?? el.by} •{' '}
                          {formatEntryTime(el.wallTime, el.ts.c, lang)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Dedicated 2-Tab Courier Bottom Navigation */}
      <nav
        aria-label="Courier Navigation"
        className="shrink-0 z-30 h-[72px] w-full border-t border-slate-200 bg-white/95 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-full max-w-md items-center justify-around px-6">
          <button
            type="button"
            onClick={() => setCourierTab('relay')}
            className={`relative flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-1 transition-colors ${
              courierTab === 'relay' ? 'text-[#0F172A]' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {courierTab === 'relay' && (
              <span className="absolute top-0 h-0.5 w-10 rounded-full bg-[#B45309]" />
            )}
            <QrCode className="h-5 w-5" />
            <span className={`text-[11px] ${courierTab === 'relay' ? 'font-bold' : 'font-medium'}`}>
              {t.courierRelayTab}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCourierTab('manifest')}
            className={`relative flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-1 transition-colors ${
              courierTab === 'manifest' ? 'text-[#0F172A]' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {courierTab === 'manifest' && (
              <span className="absolute top-0 h-0.5 w-10 rounded-full bg-[#B45309]" />
            )}
            <ClipboardList className="h-5 w-5" />
            <span
              className={`text-[11px] ${courierTab === 'manifest' ? 'font-bold' : 'font-medium'}`}
            >
              {t.courierManifestTab}
            </span>
          </button>
        </div>
      </nav>

      {/* Live Camera QR Scanner Modal */}
      <QrScannerModal
        open={scannerOpen}
        lang={lang}
        qrProgress={qrProgress}
        onScanFrame={onImportQrFrame}
        onClose={() => setScannerOpen(false)}
      />
    </div>
  );
}
