import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Copy,
  Droplets,
  LogOut,
  Navigation,
  Package,
  Pause,
  Play,
  QrCode,
  Radio,
  RefreshCw,
  Send,
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
import { MobileBottomNav, type MobileTab } from './MobileBottomNav';
import { QrScannerModal } from './QrScannerModal';

interface P2PSyncScreenProps {
  activeTab: MobileTab;
  onChangeTab: (tab: MobileTab) => void;
  lang: AppLanguage;
  onChangeLang: (lang: AppLanguage) => void;
  nodeParam: string;
  nodeId: string;
  officerId: string;
  onLogout: () => void;
  items: ItemViewModel[];
  distributionEntries: ReadonlyArray<{ tag: Tag; el: DistributionEntry }>;
  cursors: PeerCursorRow[];
  nearbyPeers: Record<string, string>;
  unsyncedCount: number;
  qrProgress: ChunkProgress | null;
  onBroadcastDelta: () => Promise<void>;
  getQrChunks: () => { chunks: string[]; msgId: string; crc32: string; totalChars: number };
  onImportQrFrame: (frameText: string) => Promise<Result<ChunkProgress, AnyEngineErrorCode>>;
  onSimulateCourierArrival: () => Promise<void>;
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

export function P2PSyncScreen({
  activeTab,
  onChangeTab,
  lang,
  onChangeLang,
  nodeParam,
  nodeId,
  officerId,
  onLogout,
  items,
  distributionEntries,
  cursors,
  nearbyPeers,
  unsyncedCount,
  qrProgress,
  onBroadcastDelta,
  getQrChunks,
  onImportQrFrame,
  onSimulateCourierArrival,
}: P2PSyncScreenProps) {
  const t = COPY[lang];
  const [qrPanelOpen, setQrPanelOpen] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [autoCycle, setAutoCycle] = useState(true);
  const [frameIndex, setFrameIndex] = useState(0);
  const [frameInput, setFrameInput] = useState('');
  const [syncingMesh, setSyncingMesh] = useState(false);

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

  const peerCount = Object.keys(nearbyPeers).length;
  const lastCursorTime = cursors[0]?.lastSyncAt
    ? lang === 'id'
      ? `${new Date(cursors[0].lastSyncAt).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })} WIB`
      : new Date(cursors[0].lastSyncAt).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
    : lang === 'en'
      ? 'Not synced yet'
      : 'Belum sinkron';

  const itemMetaMap = useMemo(() => {
    const m: Record<string, { name: string; unit: string; category: string }> = {};
    for (const item of items) {
      m[item.id] = { name: item.name, unit: item.unit, category: item.category };
    }
    return m;
  }, [items]);

  async function handleMeshSync() {
    setSyncingMesh(true);
    try {
      await onBroadcastDelta();
    } finally {
      window.setTimeout(() => setSyncingMesh(false), 500);
    }
  }

  async function handleImportSubmit() {
    if (!frameInput.trim()) return;
    await onImportQrFrame(frameInput);
    setFrameInput('');
  }

  return (
    <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden bg-[#F8FAFC] text-[#0F172A] shadow-lg sm:rounded-3xl sm:border sm:border-slate-200">
      {/* Header matching Stitch P2P Sync */}
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
              {t.p2pTitle}
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
        {/* Status Card: Ready to Sync (Offline) with crisp Emerald #059669 dot */}
        <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#059669]">
              <Radio className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#059669] opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#059669]" />
                </span>
                <span className="font-display text-sm font-bold text-[#0F172A]">
                  {t.readyToSyncTitle}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                {peerCount}{' '}
                {lang === 'en' ? 'peer tab(s) nearby' : 'perangkat/tab terdeteksi'} •{' '}
                <span className="font-mono">{nodeId}</span>
              </span>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-[#059669]">
            {t.activeBadge}
          </span>
        </section>

        {/* Verified Total Stock Tiles */}
        <section className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-display text-sm font-bold text-[#0F172A]">
              <CheckCircle2 className="h-4 w-4 text-[#059669]" />
              {t.verifiedStockTitle}
            </span>
            <span className="text-[11px] text-slate-500">{lastCursorTime}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {items.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex flex-col items-center justify-center rounded-xl bg-slate-100 p-2.5"
              >
                <span className="truncate text-[11px] font-medium text-slate-500">
                  {tileLabel(item.name, lang)}
                </span>
                <span className="font-mono text-sm font-extrabold text-[#0F172A] tabular-nums">
                  {item.stock} {item.unit}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 2 Primary Sync Action Cards */}
        <section className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl border border-[#0F172A]/20 bg-[#0F172A] p-4 text-left text-white shadow-sm transition-colors hover:bg-[#1E293B] active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                <Camera className="h-6 w-6" />
              </div>
              <div>
                <div className="font-display text-sm font-bold">
                  {lang === 'en' ? 'Scan Peer QR (Camera)' : 'Pindai QR Peer (Kamera)'}
                </div>
                <div className="text-xs text-slate-300">
                  {lang === 'en'
                    ? 'Sync two physical phones offline with zero data'
                    : 'Sinkronkan 2 HP fisik secara offline tanpa kuota'}
                </div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-white" />
          </button>

          <button
            type="button"
            onClick={handleMeshSync}
            className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-white p-4 text-left shadow-xs transition-colors hover:bg-emerald-50/40 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#059669]">
                <RefreshCw className={`h-6 w-6 ${syncingMesh ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <div className="font-display text-sm font-bold text-[#0F172A]">
                  {t.nearbySyncTitle}
                </div>
                <div className="text-xs text-slate-500">
                  {lang === 'en'
                    ? 'Sync open tabs on this device (BroadcastChannel)'
                    : 'Sinkron antar-tab di perangkat ini (BroadcastChannel)'}
                </div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-[#059669]" />
          </button>

          <button
            type="button"
            onClick={() => setQrPanelOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition-colors hover:bg-slate-50 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#0F172A]">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <div className="font-display text-sm font-bold text-[#0F172A]">
                  {t.courierQrTitle}
                </div>
                <div className="text-xs text-slate-500">{t.courierQrSub}</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-[#0F172A]" />
          </button>
        </section>

        {/* Expandable Chunked QR Courier Transfer Panel */}
        {qrPanelOpen && (
          <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {lang === 'en' ? 'RL1 QR Frame' : 'Frame QR RL1'} ({safeFrameIdx + 1} /{' '}
                {Math.max(1, qrBundle.chunks.length)})
              </span>
              <div className="flex items-center gap-1.5">
                {qrBundle.chunks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setAutoCycle((v) => !v)}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      autoCycle
                        ? 'bg-emerald-50 text-[#059669] border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {autoCycle ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    <span>{autoCycle ? 'Auto' : 'Paused'}</span>
                  </button>
                )}
                <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                  CRC {qrBundle.crc32 || '00000000'}
                </span>
              </div>
            </div>

            {activeFrame && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200/60 bg-slate-50 p-3">
                <div className="rounded-xl bg-white p-2.5 shadow-xs">
                  <QRCodeSVG value={activeFrame} size={200} level="M" marginSize={2} />
                </div>
                <div className="flex w-full items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    disabled={safeFrameIdx === 0}
                    onClick={() => setFrameIndex((i) => Math.max(0, i - 1))}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold disabled:opacity-40"
                  >
                    {lang === 'en' ? 'Prev' : 'Sblm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(activeFrame)}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#0F172A]"
                  >
                    <Copy className="h-3 w-3" />{' '}
                    {lang === 'en' ? 'Copy Frame' : 'Salin Frame'}
                  </button>
                  <button
                    type="button"
                    disabled={safeFrameIdx >= qrBundle.chunks.length - 1}
                    onClick={() =>
                      setFrameIndex((i) => Math.min(qrBundle.chunks.length - 1, i + 1))
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold disabled:opacity-40"
                  >
                    {lang === 'en' ? 'Next' : 'Brkt'}
                  </button>
                </div>
              </div>
            )}

            {/* 1-Click Courier Arrival Simulation */}
            <button
              type="button"
              onClick={onSimulateCourierArrival}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-3 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1E293B] active:scale-[0.99]"
            >
              <Truck className="h-4 w-4" />
              <span>
                {lang === 'en'
                  ? 'Simulate Courier Arrival at Command Center'
                  : 'Simulasi Kurir Tiba di Command Center'}
              </span>
            </button>

            {/* Paste / Import QR Frame (ChunkCollector) */}
            <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0F172A]">
                  {lang === 'en' ? 'Import RL1 QR Frame' : 'Impor Frame QR RL1'}
                </label>
                {qrProgress && (
                  <span className="font-mono text-[11px] font-bold text-[#059669]">
                    {qrProgress.received} {lang === 'en' ? 'of' : 'dari'} {qrProgress.total}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={frameInput}
                  onChange={(e) => setFrameInput(e.target.value)}
                  placeholder="RL1|msgId|1/1|..."
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#059669] px-3 py-2 text-xs font-bold text-white"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{lang === 'en' ? 'Merge' : 'Gabung'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Outgoing Queue & Peer Cursors */}
        <section className="flex flex-col gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500" />
              <h3 className="font-display text-sm font-bold text-[#0F172A]">
                {t.outgoingQueueTitle}
              </h3>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-[#059669] tabular-nums">
              {unsyncedCount} {lang === 'en' ? 'Item(s)' : 'Item'}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {distributionEntries.slice(0, 4).map(({ tag, el }) => {
              const meta = itemMetaMap[el.itemId];
              const isReceive = el.kind === 'receive';
              return (
                <div
                  key={tag}
                  className="flex items-center justify-between gap-2 rounded-xl bg-slate-100 p-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        meta?.category === 'water'
                          ? 'bg-blue-100 text-blue-700'
                          : meta?.category === 'medicine'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {meta?.category === 'water' ? (
                        <Droplets className="h-4 w-4" />
                      ) : meta?.category === 'medicine' ? (
                        <Stethoscope className="h-4 w-4" />
                      ) : (
                        <Package className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-[#0F172A]">
                        {meta?.name ?? el.itemId} ({isReceive ? '+' : '-'}
                        {el.qty} {meta?.unit ?? ''})
                      </div>
                      <div className="truncate text-[11px] text-slate-500">
                        {formatEntryTime(el.wallTime, el.ts.c, lang)} • {el.counterparty ?? el.by}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    {t.readySyncPill}
                  </span>
                </div>
              );
            })}
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
