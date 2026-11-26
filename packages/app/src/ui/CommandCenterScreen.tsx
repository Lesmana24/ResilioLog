import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Clock,
  Compass,
  Download,
  GitCompareArrows,
  Map as MapIcon,
  MapPin,
  Package,
  PieChart,
  Radar,
  RefreshCw,
  Route,
  Search,
  Send,
  ShieldCheck,
  Truck,
  User,
  Zap,
} from 'lucide-react';
import type { DistributionEntry, ItemId, Tag, TopUpRequest } from '@resiliolog/crdt-core';
import type { AppLanguage } from '../engine/errorMessages';
import { COPY } from '../i18n/translations';
import type { ItemViewModel } from '../state/useReplica';
import type { PeerCursorRow } from '../storage/db';

interface CommandCenterScreenProps {
  lang: AppLanguage;
  onChangeLang: (lang: AppLanguage) => void;
  nodeParam: string;
  items: ItemViewModel[];
  distributionEntries: ReadonlyArray<{ tag: Tag; el: DistributionEntry }>;
  topUpRequests: ReadonlyArray<{ tag: Tag; el: TopUpRequest }>;
  cursors: PeerCursorRow[];
  ratifiedOverrides: string[];
  onApproveReroute: (itemId: ItemId, qty: number, topUpTag?: Tag) => Promise<unknown>;
  onRatifyOverride: (overrideId: string) => Promise<void>;
  onExportLog: () => void;
  onSyncNow: () => Promise<void>;
}

export function CommandCenterScreen({
  lang,
  onChangeLang,
  nodeParam,
  items,
  distributionEntries,
  topUpRequests,
  cursors,
  ratifiedOverrides,
  onApproveReroute,
  onRatifyOverride,
  onExportLog,
  onSyncNow,
}: CommandCenterScreenProps) {
  const t = COPY[lang];
  const [mapFilter, setMapFilter] = useState<'all' | 'critical'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [rebalanceBanner, setRebalanceBanner] = useState<string | null>(null);

  const sembako = useMemo(
    () => items.find((i) => i.id === 'sembako') ?? items[0],
    [items],
  );
  const poskoA04Pct = sembako ? sembako.remainingRatio * 100 : 15;
  const poskoA04Critical = poskoA04Pct <= 15;

  const totalUnits = useMemo(
    () => items.reduce((acc, item) => acc + item.stock, 0),
    [items],
  );

  const overrideEntries = useMemo(
    () => distributionEntries.filter(({ el }) => el.kind === 'override_issue'),
    [distributionEntries],
  );

  const openSembakoReq = useMemo(
    () => topUpRequests.find(({ el }) => el.itemId === 'sembako'),
    [topUpRequests],
  );

  const criticalPostCount = (poskoA04Critical ? 1 : 0) + 2; // A-04 (live) + C-02 + D-01
  const lastUplink = cursors[0]?.lastSyncAt
    ? new Date(cursors[0].lastSyncAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '2 min ago (Fleet #04)';

  const baselineRatified = ratifiedOverrides.includes('#E9A4-F29D');

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-[#0F172A]">
      <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row">
        {/* Left Navigation Sidebar */}
        <aside className="flex w-full shrink-0 flex-col justify-between border-b border-slate-200 bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
          <div>
            <div className="flex h-16 items-center gap-3 border-b border-slate-200 bg-slate-50 px-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F172A] text-white">
                <Radar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display truncate text-sm font-extrabold">ResilioLog</div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Command Center
                </div>
              </div>
            </div>

            <div className="px-5 pb-2 pt-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {lang === 'en' ? 'Field Operations' : 'Operasi Lapangan'}
            </div>
            <nav className="flex flex-row gap-1 overflow-x-auto px-3 pb-3 lg:flex-col">
              <span className="flex items-center gap-2.5 rounded-lg bg-[#0F172A] px-3 py-2 text-xs font-bold text-white shadow-xs">
                <MapIcon className="h-4 w-4" />
                <span>{lang === 'en' ? 'Map & Stock' : 'Peta & Stok'}</span>
              </span>
              <span className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600">
                <PieChart className="h-4 w-4" />
                <span>{lang === 'en' ? 'Post Quota Allocation' : 'Alokasi Kuota Posko'}</span>
              </span>
              <span className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600">
                <GitCompareArrows className="h-4 w-4" />
                <span>{lang === 'en' ? 'CvRDT Convergence Log' : 'Log Konvergensi CvRDT'}</span>
              </span>
              <span className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600">
                <Truck className="h-4 w-4" />
                <span>{lang === 'en' ? 'Courier Fleet' : 'Armada Kurir'}</span>
              </span>
            </nav>
          </div>

          <div className="hidden border-t border-slate-200 bg-slate-50 lg:block">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#059669]" />
                <span className="text-xs font-semibold">Local Cluster #01</span>
              </div>
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#059669]">
                Mesh OK
              </span>
            </div>
            <div className="flex items-center gap-2.5 p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F172A] text-white">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold">Central Logistics Coord</div>
                <div className="truncate text-[11px] text-slate-500">Main Command Post</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="flex flex-1 flex-col">
          {/* Desktop Top Header */}
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[#0F172A]">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold">
                    {lang === 'en' ? 'Regional Disaster Command Post' : 'Posko Komando Wilayah Bencana'}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    Sector Alfa-7 ({nodeParam})
                  </span>
                </div>
                <span className="text-xs text-slate-500">{t.cmdSubtitle}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#059669]" />
                <span>
                  Uplink: <strong className="text-[#0F172A]">{lastUplink}</strong>
                </span>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => onChangeLang('id')}
                  className={lang === 'id' ? 'font-bold text-[#0F172A]' : 'text-slate-400'}
                >
                  ID
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => onChangeLang('en')}
                  className={lang === 'en' ? 'font-bold text-[#0F172A]' : 'text-slate-400'}
                >
                  EN
                </button>
              </div>
              <button
                type="button"
                onClick={onSyncNow}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-[#0F172A] shadow-xs hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{lang === 'en' ? 'Sync Now' : 'Sinkronkan'}</span>
              </button>
            </div>
          </header>

          {/* Operational Title + Search + Actions */}
          <section className="flex flex-col gap-4 p-6 pb-4">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-bold tracking-wide text-[#059669]">
                    <span className="h-2 w-2 rounded-full bg-[#059669]" />
                    {t.cvrdtActive}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-medium text-slate-500">18 Connected Sector Nodes</span>
                </div>
                <h1 className="font-display mt-0.5 text-2xl font-extrabold tracking-tight text-[#0F172A]">
                  {t.cmdTitle}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onExportLog}
                  className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-[#0F172A] shadow-xs hover:bg-slate-50"
                >
                  <Download className="h-4 w-4 text-slate-500" />
                  <span>{t.exportLog}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRebalanceBanner(
                      lang === 'en'
                        ? 'Suggested rebalance: Transfer +100 Koli Paket Sembako from Posko B-07 (Surplus) → Posko A-04.'
                        : 'Saran rebalance: Transfer +100 Koli Paket Sembako dari Posko B-07 (Surplus) → Posko A-04.',
                    )
                  }
                  className="flex h-10 items-center gap-2 rounded-lg bg-[#0F172A] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#1E293B]"
                >
                  <Route className="h-4 w-4" />
                  <span>{t.calcRebalance}</span>
                </button>
              </div>
            </div>

            {rebalanceBanner && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900">
                <span>{rebalanceBanner}</span>
                <button
                  type="button"
                  onClick={() => setRebalanceBanner(null)}
                  className="font-bold text-emerald-800 underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
              <Search className="ml-2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  lang === 'en'
                    ? 'Search posts, commodities, or CRDT transfer logs...'
                    : 'Cari posko, komoditas, atau log transfer...'
                }
                className="h-8 flex-1 text-xs focus:outline-none"
              />
            </div>
          </section>

          {/* 4 KPI Cards */}
          <section className="grid grid-cols-1 gap-4 px-6 pb-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                <span>{lang === 'en' ? 'Total Logistics (Node)' : 'Total Logistik (Node)'}</span>
                <Package className="h-4 w-4 text-slate-400" />
              </div>
              <div className="font-display text-2xl font-extrabold tabular-nums">
                {totalUnits.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">units</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-[#059669]">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>Log Integrity 100%</span>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-2 rounded-xl border border-red-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#DC2626]">
                  {lang === 'en' ? 'Critical Posts (<15%)' : 'Posko Kritis (<15%)'}
                </span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-[#DC2626]">
                  Action
                </span>
              </div>
              <div className="font-display text-2xl font-extrabold text-[#DC2626] tabular-nums">
                {criticalPostCount}{' '}
                <span className="text-xs font-normal text-slate-500">Posts</span>
              </div>
              <div className="text-xs font-medium text-[#DC2626]">
                {poskoA04Critical ? 'Posko A-04, C-02, D-01' : 'Posko C-02, D-01'}
              </div>
            </div>

            <div className="flex flex-col justify-between gap-2 rounded-xl border border-emerald-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#059669]">
                  {lang === 'en' ? 'Surplus Posts (>85%)' : 'Posko Surplus (>85%)'}
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-[#059669]">
                  Ready
                </span>
              </div>
              <div className="font-display text-2xl font-extrabold text-[#059669] tabular-nums">
                2 <span className="text-xs font-normal text-slate-500">Posts</span>
              </div>
              <div className="text-xs font-medium text-slate-600">Posko B-07 (+340 units)</div>
            </div>

            <div className="flex flex-col justify-between gap-2 rounded-xl border border-amber-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#B45309]">
                  {lang === 'en' ? 'Overrides Audited' : 'Audit Override'}
                </span>
                <ShieldCheck className="h-4 w-4 text-[#B45309]" />
              </div>
              <div className="font-display text-2xl font-extrabold text-[#B45309] tabular-nums">
                {overrideEntries.length + 1}
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>{ratifiedOverrides.length} ratified</span>
              </div>
            </div>
          </section>

          {/* Main 60/40 Operational Grid */}
          <section className="grid grid-cols-1 gap-6 px-6 pb-10 lg:grid-cols-12">
            {/* Left 7 cols: Topographic Map + Sectoral Audit Table */}
            <div className="flex flex-col gap-5 lg:col-span-7">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Compass className="h-4 w-4 text-[#0F172A]" />
                      <h2 className="font-display text-sm font-bold">
                        {lang === 'en'
                          ? 'Sectoral Distribution & Quota Map'
                          : 'Peta Sebaran & Ketersediaan Sektoral'}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500">
                      Topographic relay paths &amp; live Bounded Counter quota status
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setMapFilter('all')}
                      className={`rounded px-2.5 py-1 text-xs font-bold ${
                        mapFilter === 'all' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      All Posts
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapFilter('critical')}
                      className={`rounded px-2.5 py-1 text-xs font-bold ${
                        mapFilter === 'critical'
                          ? 'bg-white text-[#DC2626] shadow-xs'
                          : 'text-slate-500'
                      }`}
                    >
                      Critical ({criticalPostCount})
                    </button>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-medium text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#DC2626]" />
                    Critical (&lt;=15%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#B45309]" />
                    Low (15-35%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#059669]" />
                    Safe / Surplus (&gt;85%)
                  </span>
                </div>

                {/* Topographic SVG Map with responsive % pins */}
                <div className="relative h-[320px] w-full overflow-hidden bg-[#EEF2F6]">
                  <svg
                    className="h-full w-full"
                    viewBox="0 0 800 320"
                    preserveAspectRatio="xMidYMid slice"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <pattern
                        id="topo-grid"
                        width="32"
                        height="32"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 32 0 L 0 0 0 32"
                          fill="none"
                          stroke="#CBD5E1"
                          strokeWidth="0.6"
                          strokeDasharray="2,2"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="#F1F5F9" />
                    <rect width="100%" height="100%" fill="url(#topo-grid)" />
                    <path
                      d="M-20,90 Q140,40 280,85 T560,65 T820,105"
                      fill="none"
                      stroke="#94A3B8"
                      strokeWidth="1.2"
                      strokeDasharray="4,3"
                      opacity="0.55"
                    />
                    <path
                      d="M-20,160 Q160,110 320,145 T620,125 T820,180"
                      fill="none"
                      stroke="#94A3B8"
                      strokeWidth="1"
                      opacity="0.45"
                    />
                    <path
                      d="M-20,235 Q180,190 360,220 T660,200 T820,255"
                      fill="none"
                      stroke="#94A3B8"
                      strokeWidth="1.2"
                      strokeDasharray="4,3"
                      opacity="0.55"
                    />
                    <path
                      d="M144,82 L640,205"
                      fill="none"
                      stroke="#0F172A"
                      strokeWidth="2.5"
                      strokeDasharray="6,5"
                      opacity="0.8"
                    />
                  </svg>

                  {/* Pin 1: Posko A-04 (Live from active node Sembako quota) */}
                  {(!poskoA04Critical && mapFilter === 'critical') ? null : (
                    <div className="absolute left-[18%] top-[26%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                      <div className="relative flex items-center justify-center">
                        {poskoA04Critical && (
                          <span className="absolute h-8 w-8 animate-ping rounded-full bg-red-500/25" />
                        )}
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-md ${
                            poskoA04Critical ? 'bg-[#DC2626]' : 'bg-[#059669]'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      </div>
                      <div
                        className={`mt-1 rounded-md border bg-white px-2 py-0.5 text-center shadow-xs ${
                          poskoA04Critical ? 'border-red-300' : 'border-emerald-300'
                        }`}
                      >
                        <div
                          className={`text-[11px] font-bold ${
                            poskoA04Critical ? 'text-[#DC2626]' : 'text-[#059669]'
                          }`}
                        >
                          Posko A-04
                        </div>
                        <div className="font-mono text-[10px] font-semibold text-slate-600">
                          {poskoA04Pct.toFixed(1)}% {poskoA04Critical ? 'Critical' : 'Safe'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pin 2: Posko C-02 (Critical) */}
                  <div className="absolute left-[46%] top-[64%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#DC2626] shadow-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                    <div className="mt-1 rounded-md border border-red-300 bg-white px-2 py-0.5 text-center shadow-xs">
                      <div className="text-[11px] font-bold text-[#DC2626]">Posko C-02</div>
                      <div className="font-mono text-[10px] font-medium text-slate-600">
                        12.5% Critical
                      </div>
                    </div>
                  </div>

                  {/* Pin 3: Posko B-07 (Green Surplus pin — explicitly kept visible!) */}
                  {mapFilter === 'all' && (
                    <div className="absolute left-[80%] top-[64%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                      <div className="relative flex items-center justify-center">
                        <span className="absolute h-7 w-7 rounded-full bg-emerald-500/20" />
                        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#059669] shadow-md">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      </div>
                      <div className="mt-1 rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-center shadow-xs">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-[#059669]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
                          Posko B-07
                        </div>
                        <div className="font-mono text-[10px] font-semibold text-slate-700">
                          185% Surplus
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Courier badge */}
                  <div className="absolute left-[44%] top-[33%] flex items-center gap-1.5 rounded-md border border-slate-700 bg-[#0F172A] px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
                    <Truck className="h-3.5 w-3.5 text-[#059669]" />
                    <span>Fleet #02 En Route</span>
                    <span className="font-mono font-normal text-slate-300">• ETA 14m</span>
                  </div>
                </div>
              </div>

              {/* Sectoral Quota Audit Table */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold">
                    {lang === 'en' ? 'Sectoral Quota Deviation Audit' : 'Audit Deviasi Kuota Sektoral'}
                  </h3>
                  <span className="text-xs text-slate-500">Live Bounded Counter view</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                        <th className="pb-2">Post</th>
                        <th className="pb-2">Sector</th>
                        <th className="pb-2">Quota Status</th>
                        <th className="pb-2 text-right">Local Rights</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        {
                          post: 'Posko A-04',
                          sector: 'North Sector',
                          badge: `${poskoA04Pct.toFixed(1)}% ${poskoA04Critical ? 'Critical' : 'Safe'}`,
                          critical: poskoA04Critical,
                          surplus: false,
                          rights: sembako ? `${sembako.localRights} / ${sembako.granted}` : '15 / 100',
                        },
                        {
                          post: 'Posko C-02',
                          sector: 'West Slope',
                          badge: '12.5% Critical',
                          critical: true,
                          surplus: false,
                          rights: '10 / 80',
                        },
                        {
                          post: 'Posko B-07',
                          sector: 'South Coast',
                          badge: '185% Surplus',
                          critical: false,
                          surplus: true,
                          rights: '200 / 200',
                        },
                      ]
                        .filter((r) =>
                          !searchTerm.trim()
                            ? true
                            : `${r.post} ${r.sector}`.toLowerCase().includes(searchTerm.toLowerCase()),
                        )
                        .map((row) => (
                          <tr key={row.post}>
                            <td className="py-2.5 font-bold">
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    row.critical
                                      ? 'bg-[#DC2626]'
                                      : row.surplus
                                        ? 'bg-[#059669]'
                                        : 'bg-[#059669]'
                                  }`}
                                />
                                {row.post}
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-500">{row.sector}</td>
                            <td className="py-2.5">
                              <span
                                className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                                  row.critical
                                    ? 'bg-red-100 text-[#DC2626]'
                                    : 'bg-emerald-100 text-[#059669]'
                                }`}
                              >
                                {row.badge}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold tabular-nums">
                              {row.rights}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right 5 cols: Actionable Demands & Emergency Override Audit */}
            <div className="flex flex-col gap-4 lg:col-span-5">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="font-display text-sm font-bold">
                      {lang === 'en' ? 'Urgent Actions' : 'Tindakan Mendesak'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Top-up queue requests &amp; emergency override audits
                    </p>
                  </div>
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-extrabold text-[#DC2626]">
                    {openSembakoReq || poskoA04Critical ? '2 Urgent' : '1 Audit'}
                  </span>
                </div>

                {/* Top-Up Request Card with Approve Reroute */}
                <div className="flex flex-col gap-2.5 rounded-xl border border-red-200 bg-slate-50 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#DC2626]">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {poskoA04Critical
                          ? `Critical Quota (${poskoA04Pct.toFixed(0)}%) • Posko A-04`
                          : 'Quota Replenished • Posko A-04'}
                      </span>
                      <div className="mt-0.5 font-display text-sm font-bold">
                        Top-Up Request: +100 Koli Paket Sembako
                      </div>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase text-white ${
                        poskoA04Critical ? 'bg-[#DC2626]' : 'bg-[#059669]'
                      }`}
                    >
                      {poskoA04Critical ? 'Critical' : 'Healthy'}
                    </span>
                  </div>
                  <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-600">
                    “New flood evacuee influx (+45 households) at Sector A-04. Transfer quota rights
                    from surplus <strong>Posko B-07</strong>.”
                  </p>
                  <button
                    type="button"
                    onClick={() => onApproveReroute('sembako', 100, openSembakoReq?.tag)}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#0F172A] px-3 text-xs font-bold text-white shadow-xs hover:bg-[#1E293B]"
                  >
                    <Check className="h-4 w-4" />
                    <span>{t.approveReroute} (+100 Quota)</span>
                  </button>
                </div>

                {/* Live Emergency Overrides from CRDT distributionLog (never hidden) */}
                {overrideEntries.map(({ tag, el }) => {
                  const ratified = ratifiedOverrides.includes(tag);
                  return (
                    <div
                      key={tag}
                      className="flex flex-col gap-2.5 rounded-xl border border-amber-300 bg-amber-50/70 p-3.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#B45309]">
                            <Zap className="h-3.5 w-3.5" />
                            Emergency Override (Live)
                          </span>
                          <div className="mt-0.5 font-display text-sm font-bold">
                            {el.itemId} (-{el.qty} units)
                          </div>
                        </div>
                        <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#B45309]">
                          {ratified ? t.ratifiedDone : 'Audit'}
                        </span>
                      </div>
                      <p className="rounded-lg border border-amber-200 bg-white p-2.5 text-xs text-slate-700">
                        Reason: {el.reason ?? 'Emergency override'}
                      </p>
                      <button
                        type="button"
                        disabled={ratified}
                        onClick={() => onRatifyOverride(tag)}
                        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#B45309] px-3 text-xs font-bold text-white shadow-xs hover:bg-amber-800 disabled:opacity-60"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>{ratified ? t.ratifiedDone : t.ratifyOverride}</span>
                      </button>
                    </div>
                  );
                })}

                {/* Baseline Override Audit Item */}
                <div className="flex flex-col gap-2.5 rounded-xl border border-amber-300 bg-amber-50/60 p-3.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#B45309]">
                        <Zap className="h-3.5 w-3.5" />
                        Emergency Override
                      </span>
                      <div className="mt-0.5 font-display text-sm font-bold">
                        Valley Post (+50 Medical Kits)
                      </div>
                    </div>
                    <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#B45309]">
                      {baselineRatified ? t.ratifiedDone : 'Ratify'}
                    </span>
                  </div>
                  <p className="rounded-lg border border-amber-200 bg-white p-2.5 text-xs text-slate-700">
                    Emergency triage: Pediatric hypothermia evacuation at Alfa-3. Daily quota bypassed
                    offline by field medic.
                  </p>
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                    <span>Hash: #E9A4-F29D</span>
                    <span>Audit Flag Active • 14:10 WIB</span>
                  </div>
                  <button
                    type="button"
                    disabled={baselineRatified}
                    onClick={() => onRatifyOverride('#E9A4-F29D')}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#B45309] px-3 text-xs font-bold text-white shadow-xs hover:bg-amber-800 disabled:opacity-60"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>{baselineRatified ? t.ratifiedDone : t.ratifyOverride}</span>
                  </button>
                </div>

                {/* Auto-rebalance shortcut */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase text-[#059669]">
                      Auto Rebalance Ready
                    </div>
                    <div className="text-xs font-bold">Posko B-07 → Posko A-04 (100 Koli)</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onApproveReroute('sembako', 100, openSembakoReq?.tag)}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#059669] px-3 text-xs font-bold text-white"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Dispatch</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
