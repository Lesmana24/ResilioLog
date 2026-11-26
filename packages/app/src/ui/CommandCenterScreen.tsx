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

type CommandSection = 'map' | 'quota' | 'convergence' | 'fleet';

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
  const [activeSection, setActiveSection] = useState<CommandSection>('map');
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

  // Align strictly with the critical posts shown on map & audit table (Posko A-04 + Posko C-02)
  const criticalPostCount = (poskoA04Critical ? 1 : 0) + 1;
  const criticalPostsLabel = poskoA04Critical ? 'Posko A-04, C-02' : 'Posko C-02';

  const lastUplink = cursors[0]?.lastSyncAt
    ? new Date(cursors[0].lastSyncAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : lang === 'en'
      ? '2 min ago (Fleet #04)'
      : '2 mnt lalu (Armada #04)';

  const baselineRatified = ratifiedOverrides.includes('#E9A4-F29D');

  const itemNamesById = useMemo(() => {
    const map: Record<string, { name: string; unit: string }> = {};
    for (const item of items) {
      map[item.id] = { name: item.name, unit: item.unit };
    }
    return map;
  }, [items]);

  const filteredEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return distributionEntries;
    return distributionEntries.filter(({ tag, el }) => {
      const name = itemNamesById[el.itemId]?.name ?? el.itemId;
      return `${tag} ${name} ${el.kind} ${el.counterparty ?? ''} ${el.reason ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [distributionEntries, itemNamesById, searchTerm]);

  const navItems: ReadonlyArray<{
    id: CommandSection;
    labelEn: string;
    labelId: string;
    icon: typeof MapIcon;
  }> = [
    { id: 'map', labelEn: 'Map & Stock', labelId: 'Peta & Stok', icon: MapIcon },
    { id: 'quota', labelEn: 'Post Quota Allocation', labelId: 'Alokasi Kuota Posko', icon: PieChart },
    { id: 'convergence', labelEn: 'CvRDT Convergence Log', labelId: 'Log Konvergensi CvRDT', icon: GitCompareArrows },
    { id: 'fleet', labelEn: 'Courier Fleet', labelId: 'Armada Kurir', icon: Truck },
  ];

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
            <nav aria-label="Command Center sections" className="flex flex-row gap-1 overflow-x-auto px-3 pb-3 lg:flex-col">
              {navItems.map((nav) => {
                const Icon = nav.icon;
                const isActive = activeSection === nav.id;
                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => setActiveSection(nav.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                      isActive
                        ? 'bg-[#0F172A] font-bold text-white shadow-xs'
                        : 'font-semibold text-slate-600 hover:bg-slate-100 hover:text-[#0F172A]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{lang === 'en' ? nav.labelEn : nav.labelId}</span>
                  </button>
                );
              })}
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
                <div className="truncate text-xs font-bold">
                  {lang === 'en' ? 'Central Logistics Coord' : 'Koord. Logistik Pusat'}
                </div>
                <div className="truncate text-[11px] text-slate-500">
                  {lang === 'en' ? 'Main Command Post' : 'Posko Komando Utama'}
                </div>
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
                    {lang === 'en' ? `Sector Alfa-7 (${nodeParam})` : `Sektor Alfa-7 (${nodeParam})`}
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
                  className={`cursor-pointer ${lang === 'id' ? 'font-bold text-[#0F172A]' : 'text-slate-400'}`}
                >
                  ID
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => onChangeLang('en')}
                  className={`cursor-pointer ${lang === 'en' ? 'font-bold text-[#0F172A]' : 'text-slate-400'}`}
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
                  <span className="font-medium text-slate-500">
                    {lang === 'en' ? '18 Connected Sector Nodes' : '18 Node Posko Terhubung'}
                  </span>
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
                  {lang === 'en' ? 'Dismiss' : 'Tutup'}
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
                    ? 'Search posts, commodities, or CvRDT transfer logs...'
                    : 'Cari posko, komoditas, atau log transfer CvRDT...'
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
                <span className="text-xs font-normal text-slate-500">
                  {lang === 'en' ? 'units' : 'unit'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-[#059669]">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>{lang === 'en' ? 'Log Integrity 100%' : 'Integritas Log 100%'}</span>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-2 rounded-xl border border-red-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#DC2626]">
                  {lang === 'en' ? 'Critical Posts (<15%)' : 'Posko Kritis (<15%)'}
                </span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-[#DC2626]">
                  {lang === 'en' ? 'Action' : 'Aksi'}
                </span>
              </div>
              <div className="font-display text-2xl font-extrabold text-[#DC2626] tabular-nums">
                {criticalPostCount}{' '}
                <span className="text-xs font-normal text-slate-500">
                  {lang === 'en'
                    ? criticalPostCount === 1
                      ? 'Post'
                      : 'Posts'
                    : 'Posko'}
                </span>
              </div>
              <div className="text-xs font-medium text-[#DC2626]">{criticalPostsLabel}</div>
            </div>

            <div className="flex flex-col justify-between gap-2 rounded-xl border border-emerald-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#059669]">
                  {lang === 'en' ? 'Surplus Posts (>85%)' : 'Posko Surplus (>85%)'}
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-[#059669]">
                  {lang === 'en' ? 'Ready' : 'Siap'}
                </span>
              </div>
              <div className="font-display text-2xl font-extrabold text-[#059669] tabular-nums">
                2{' '}
                <span className="text-xs font-normal text-slate-500">
                  {lang === 'en' ? 'Posts' : 'Posko'}
                </span>
              </div>
              <div className="text-xs font-medium text-slate-600">
                Posko B-07 (+340 {lang === 'en' ? 'units' : 'unit'})
              </div>
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
                <span>
                  {ratifiedOverrides.length} {lang === 'en' ? 'ratified' : 'teratifikasi'}
                </span>
              </div>
            </div>
          </section>

          {/* Active Sidebar Section Content */}
          {activeSection === 'map' && (
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
                        {lang === 'en'
                          ? 'Topographic relay paths & live Bounded Counter quota status'
                          : 'Topografi jalur relai fisik & status kuota Bounded Counter'}
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
                        {lang === 'en' ? 'All Posts' : 'Semua Posko'}
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
                        {lang === 'en' ? 'Critical' : 'Kritis'} ({criticalPostCount})
                      </button>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-medium text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#DC2626]" />
                      {lang === 'en' ? 'Critical (<=15%)' : 'Kritis (<=15%)'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#B45309]" />
                      {lang === 'en' ? 'Low (15-35%)' : 'Rendah (15-35%)'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#059669]" />
                      {lang === 'en' ? 'Safe / Surplus (>85%)' : 'Aman / Surplus (>85%)'}
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
                    {!poskoA04Critical && mapFilter === 'critical' ? null : (
                      <div className="absolute left-[18%] top-[26%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
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
                            {poskoA04Pct.toFixed(1)}%{' '}
                            {poskoA04Critical
                              ? lang === 'en'
                                ? 'Critical'
                                : 'Kritis'
                              : lang === 'en'
                                ? 'Safe'
                                : 'Aman'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pin 2: Posko C-02 (Critical) */}
                    <div className="absolute left-[46%] top-[64%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#DC2626] shadow-md">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>
                      <div className="mt-1 rounded-md border border-red-300 bg-white px-2 py-0.5 text-center shadow-xs">
                        <div className="text-[11px] font-bold text-[#DC2626]">Posko C-02</div>
                        <div className="font-mono text-[10px] font-medium text-slate-600">
                          12.5% {lang === 'en' ? 'Critical' : 'Kritis'}
                        </div>
                      </div>
                    </div>

                    {/* Pin 3: Posko B-07 (Green Surplus pin) */}
                    {mapFilter === 'all' && (
                      <div className="absolute left-[80%] top-[64%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
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
                      <span>{lang === 'en' ? 'Fleet #02 En Route' : 'Armada #02 Bergerak'}</span>
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
                    <span className="text-xs text-slate-500">
                      {lang === 'en' ? 'Live Bounded Counter view' : 'Tampilan Bounded Counter Langsung'}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                          <th className="pb-2">{lang === 'en' ? 'Post' : 'Posko'}</th>
                          <th className="pb-2">{lang === 'en' ? 'Sector' : 'Sektor'}</th>
                          <th className="pb-2">{lang === 'en' ? 'Quota Status' : 'Status Kuota'}</th>
                          <th className="pb-2 text-right">{lang === 'en' ? 'Local Rights' : 'Hak Kuota'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[
                          {
                            post: 'Posko A-04',
                            sector: lang === 'en' ? 'North Sector' : 'Sektor Utara',
                            badge: `${poskoA04Pct.toFixed(1)}% ${
                              poskoA04Critical
                                ? lang === 'en'
                                  ? 'Critical'
                                  : 'Kritis'
                                : lang === 'en'
                                  ? 'Safe'
                                  : 'Aman'
                            }`,
                            critical: poskoA04Critical,
                            rights: sembako ? `${sembako.localRights} / ${sembako.granted}` : '15 / 100',
                          },
                          {
                            post: 'Posko C-02',
                            sector: lang === 'en' ? 'West Slope' : 'Lereng Barat',
                            badge: `12.5% ${lang === 'en' ? 'Critical' : 'Kritis'}`,
                            critical: true,
                            rights: '10 / 80',
                          },
                          {
                            post: 'Posko B-07',
                            sector: lang === 'en' ? 'South Coast' : 'Pesisir Selatan',
                            badge: '185% Surplus',
                            critical: false,
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
                                      row.critical ? 'bg-[#DC2626]' : 'bg-[#059669]'
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
                        {lang === 'en'
                          ? 'Top-up queue requests & emergency override audits'
                          : 'Permintaan kuota & audit override darurat'}
                      </p>
                    </div>
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-extrabold text-[#DC2626]">
                      {openSembakoReq || poskoA04Critical
                        ? lang === 'en'
                          ? '2 Urgent'
                          : '2 Mendesak'
                        : '1 Audit'}
                    </span>
                  </div>

                  {/* Top-Up Request Card with Approve Reroute */}
                  <div className="flex flex-col gap-2.5 rounded-xl border border-red-200 bg-slate-50 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#DC2626]">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {poskoA04Critical
                            ? `${lang === 'en' ? 'Critical Quota' : 'Kuota Kritis'} (${poskoA04Pct.toFixed(0)}%) • Posko A-04`
                            : `${lang === 'en' ? 'Quota Replenished' : 'Kuota Terisi'} • Posko A-04`}
                        </span>
                        <div className="mt-0.5 font-display text-sm font-bold">
                          {lang === 'en'
                            ? 'Top-Up Request: +100 Koli Paket Sembako'
                            : 'Permintaan Top-Up: +100 Koli Paket Sembako'}
                        </div>
                      </div>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase text-white ${
                          poskoA04Critical ? 'bg-[#DC2626]' : 'bg-[#059669]'
                        }`}
                      >
                        {poskoA04Critical
                          ? lang === 'en'
                            ? 'Critical'
                            : 'Kritis'
                          : lang === 'en'
                            ? 'Healthy'
                            : 'Aman'}
                      </span>
                    </div>
                    <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-600">
                      {lang === 'en' ? (
                        <>
                          “New flood evacuee influx (+45 households) at Sector A-04. Transfer quota
                          rights from surplus <strong>Posko B-07</strong>.”
                        </>
                      ) : (
                        <>
                          “Lonjakan pengungsi baru (+45 KK) di Sektor A-04. Transfer hak kuota dari
                          surplus <strong>Posko B-07</strong>.”
                        </>
                      )}
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
                              {itemNamesById[el.itemId]?.name ?? el.itemId} (-{el.qty}{' '}
                              {itemNamesById[el.itemId]?.unit ?? 'units'})
                            </div>
                          </div>
                          <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#B45309]">
                            {ratified ? t.ratifiedDone : 'Audit'}
                          </span>
                        </div>
                        <p className="rounded-lg border border-amber-200 bg-white p-2.5 text-xs text-slate-700">
                          {lang === 'en' ? 'Reason' : 'Alasan'}:{' '}
                          {el.reason ?? 'Emergency override'}
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
                          {lang === 'en'
                            ? 'Valley Post (+50 Medical Kits)'
                            : 'Posko Lembah (+50 Paket Medis)'}
                        </div>
                      </div>
                      <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#B45309]">
                        {baselineRatified
                          ? t.ratifiedDone
                          : lang === 'en'
                            ? 'Ratify'
                            : 'Ratifikasi'}
                      </span>
                    </div>
                    <p className="rounded-lg border border-amber-200 bg-white p-2.5 text-xs text-slate-700">
                      {lang === 'en'
                        ? 'Emergency triage: Pediatric hypothermia evacuation at Alfa-3. Daily quota bypassed offline by field medic.'
                        : 'Triage darurat: Evakuasi anak-anak hipotermia di Alfa-3. Limit harian diabaikan petugas offline.'}
                    </p>
                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                      <span>Hash: #E9A4-F29D</span>
                      <span>
                        {lang === 'en'
                          ? 'Audit Flag Active • 14:10 WIB'
                          : 'Audit Flag Aktif • 14:10 WIB'}
                      </span>
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
                        {lang === 'en' ? 'Auto Rebalance Ready' : 'Rebalance Otomatis Siap'}
                      </div>
                      <div className="text-xs font-bold">Posko B-07 → Posko A-04 (100 Koli)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onApproveReroute('sembako', 100, openSembakoReq?.tag)}
                      className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#059669] px-3 text-xs font-bold text-white"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{lang === 'en' ? 'Dispatch' : 'Kirim'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'quota' && (
            <section className="px-6 pb-10">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="font-display text-base font-bold">
                      {lang === 'en'
                        ? 'Bounded Counter Quota Allocation'
                        : 'Alokasi Kuota Bounded Counter'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {lang === 'en'
                        ? 'Live local rights vs granted quota per commodity at active node'
                        : 'Hak kuota lokal vs kuota teralokasi per komoditas di posko aktif'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onApproveReroute('sembako', 100, openSembakoReq?.tag)}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-[#0F172A] px-3 text-xs font-bold text-white"
                  >
                    <Check className="h-4 w-4" />
                    <span>{t.approveReroute} (+100 Sembako)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {items.map((item) => {
                    const pct = Math.round(item.remainingRatio * 100);
                    const critical = pct <= 15;
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-display text-sm font-bold">{item.name}</div>
                            <div className="text-xs text-slate-500">
                              Stock: <strong className="font-mono text-[#0F172A]">{item.stock}</strong>{' '}
                              {item.unit}
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${
                              critical ? 'bg-[#DC2626]' : 'bg-[#059669]'
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${
                              critical ? 'bg-[#DC2626]' : 'bg-[#059669]'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                          />
                        </div>
                        <div className="flex justify-between font-mono text-xs text-slate-600">
                          <span>Rights: {item.localRights}</span>
                          <span>Granted: {item.granted}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {activeSection === 'convergence' && (
            <section className="px-6 pb-10">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="font-display text-base font-bold">
                      {lang === 'en' ? 'CvRDT Convergence Log (OR-Set)' : 'Log Konvergensi CvRDT (OR-Set)'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {lang === 'en'
                        ? 'Ordered by Lamport timestamp; overrides remain visible for audit'
                        : 'Diurutkan berdasar Lamport timestamp; override selalu tampil untuk audit'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onExportLog}
                    className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold"
                  >
                    <Download className="h-4 w-4" />
                    <span>{t.exportLog}</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                        <th className="pb-2">Tag (Lamport)</th>
                        <th className="pb-2">{lang === 'en' ? 'Kind' : 'Jenis'}</th>
                        <th className="pb-2">{lang === 'en' ? 'Commodity' : 'Komoditas'}</th>
                        <th className="pb-2">{lang === 'en' ? 'Qty' : 'Jumlah'}</th>
                        <th className="pb-2">{lang === 'en' ? 'Actor / Note' : 'Petugas / Catatan'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredEntries.map(({ tag, el }) => {
                        const meta = itemNamesById[el.itemId];
                        const isOverride = el.kind === 'override_issue';
                        return (
                          <tr key={tag} className={isOverride ? 'bg-amber-50/70' : ''}>
                            <td className="py-2.5 font-mono text-[11px] text-slate-600">{tag}</td>
                            <td className="py-2.5">
                              <span
                                className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                                  el.kind === 'receive'
                                    ? 'bg-emerald-100 text-[#059669]'
                                    : isOverride
                                      ? 'bg-amber-200 text-[#B45309]'
                                      : 'bg-red-100 text-[#DC2626]'
                                }`}
                              >
                                {el.kind}
                              </span>
                            </td>
                            <td className="py-2.5 font-semibold">{meta?.name ?? el.itemId}</td>
                            <td className="py-2.5 font-mono font-bold tabular-nums">
                              {el.kind === 'receive' ? '+' : '-'}
                              {el.qty} {meta?.unit ?? ''}
                            </td>
                            <td className="py-2.5 text-slate-600">
                              {el.counterparty ?? el.by}
                              {el.reason ? ` — ${el.reason}` : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'fleet' && (
            <section className="px-6 pb-10">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="font-display text-base font-bold">
                      {lang === 'en' ? 'Courier Fleet & Peer Sync Cursors' : 'Armada Kurir & Kursor Sinkronisasi'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {lang === 'en'
                        ? 'Data mules carrying QR delta envelopes between disconnected posts'
                        : 'Kurir data pembawa frame QR delta antar posko tanpa sinyal'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onSyncNow}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-[#059669] px-3 text-xs font-bold text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{lang === 'en' ? 'Broadcast Mesh Sync' : 'Kirim Sinkron Mesh'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold">Fleet #02 (Data Mule)</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-[#059669]">
                        ETA 14m
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Route: Posko B-07 → Posko A-04 • Carrying RL1 QR envelope
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold">Fleet #04 (Medical Relay)</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        Standby
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Last uplink: {lastUplink}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {lang === 'en' ? 'Recorded Peer Cursors (IndexedDB)' : 'Kursor Peer Tercatat (IndexedDB)'}
                  </h3>
                  {cursors.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                      {lang === 'en'
                        ? 'No peer sync cursors recorded yet. Run Nearby P2P Sync or Simulate Courier Arrival.'
                        : 'Belum ada kursor sinkronisasi. Jalankan P2P Sync atau Simulasi Kurir.'}
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                      {cursors.map((c) => (
                        <div key={c.peerId} className="flex items-center justify-between px-4 py-2.5 text-xs">
                          <div>
                            <span className="font-mono font-bold">{c.peerId}</span>
                            {c.label && <span className="ml-2 text-slate-500">({c.label})</span>}
                          </div>
                          <div className="font-mono text-slate-600">
                            until clock {c.until} • {new Date(c.lastSyncAt).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
