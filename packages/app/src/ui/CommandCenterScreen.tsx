import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Clock,
  Compass,
  Download,
  GitCompareArrows,
  LogOut,
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
  Smartphone,
  Truck,
  User,
  X,
  Zap,
} from 'lucide-react';
import type { DistributionEntry, ItemId, Tag, TopUpRequest } from '@resiliolog/crdt-core';
import type { AppLanguage } from '../engine/errorMessages';
import { COPY } from '../i18n/translations';
import type { ItemViewModel } from '../state/useReplica';
import type { PeerCursorRow } from '../storage/db';

type CommandSection = 'map' | 'quota' | 'convergence' | 'fleet';
type MapPostId = 'posko-a04' | 'posko-c02' | 'posko-b07';

interface CommandCenterScreenProps {
  lang: AppLanguage;
  onChangeLang: (lang: AppLanguage) => void;
  officerId: string;
  onSwitchToVolunteer: () => void;
  onLogout: () => void;
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

function formatClockTime(iso: string, lang: AppLanguage): string {
  const formatted = new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return lang === 'id' ? `${formatted} WIB` : formatted;
}

export function CommandCenterScreen({
  lang,
  onChangeLang,
  officerId,
  onSwitchToVolunteer,
  onLogout,
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
  const [selectedPostId, setSelectedPostId] = useState<MapPostId | null>('posko-a04');

  const sembako = useMemo(
    () => items.find((i) => i.id === 'sembako') ?? items[0],
    [items],
  );
  const airItem = useMemo(() => items.find((i) => i.id === 'air-19l'), [items]);
  const traumaItem = useMemo(() => items.find((i) => i.id === 'trauma-kit'), [items]);

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

  const criticalPostCount = (poskoA04Critical ? 1 : 0) + 1;
  const criticalPostsLabel = poskoA04Critical ? 'Posko A-04, C-02' : 'Posko C-02';

  const lastUplink = cursors[0]?.lastSyncAt
    ? formatClockTime(cursors[0].lastSyncAt, lang)
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

  const query = searchTerm.trim().toLowerCase();

  const filteredEntries = useMemo(() => {
    if (!query) return distributionEntries;
    return distributionEntries.filter(({ tag, el }) => {
      const name = itemNamesById[el.itemId]?.name ?? el.itemId;
      return `${tag} ${name} ${el.kind} ${el.counterparty ?? ''} ${el.reason ?? ''}`
        .toLowerCase()
        .includes(query);
    });
  }, [distributionEntries, itemNamesById, query]);

  const filteredItems = useMemo(() => {
    if (!query) return items;
    return items.filter((item) =>
      `${item.name} ${item.id} ${item.category} ${item.unit}`.toLowerCase().includes(query),
    );
  }, [items, query]);

  const postDetails = useMemo(
    () => ({
      'posko-a04': {
        id: 'posko-a04' as const,
        name: 'Posko A-04',
        sector: lang === 'en' ? 'North Sector' : 'Sektor Utara',
        critical: poskoA04Critical,
        statusLabel: `${poskoA04Pct.toFixed(1)}% ${
          poskoA04Critical
            ? lang === 'en'
              ? 'Critical'
              : 'Kritis'
            : lang === 'en'
              ? 'Safe'
              : 'Aman'
        }`,
        commodities: [
          {
            name: sembako?.name ?? 'Paket Sembako',
            stock: `${sembako?.stock ?? 215} ${sembako?.unit ?? 'Koli'}`,
            rights: `${sembako?.localRights ?? 15} / ${sembako?.granted ?? 100}`,
          },
          {
            name: airItem?.name ?? 'Air Bersih 19L',
            stock: `${airItem?.stock ?? 420} ${airItem?.unit ?? 'Unit'}`,
            rights: `${airItem?.localRights ?? 420} / ${airItem?.granted ?? 500}`,
          },
          {
            name: traumaItem?.name ?? 'Obat Trauma Kit B',
            stock: `${traumaItem?.stock ?? 38} ${traumaItem?.unit ?? 'Set'}`,
            rights: `${traumaItem?.localRights ?? 38} / ${traumaItem?.granted ?? 50}`,
          },
        ],
      },
      'posko-c02': {
        id: 'posko-c02' as const,
        name: 'Posko C-02',
        sector: lang === 'en' ? 'West Slope' : 'Lereng Barat',
        critical: true,
        statusLabel: `12.5% ${lang === 'en' ? 'Critical' : 'Kritis'}`,
        commodities: [
          { name: 'Paket Sembako', stock: '64 Koli', rights: '10 / 80' },
          { name: 'Air Bersih 19L', stock: '110 Unit', rights: '25 / 150' },
          { name: 'Obat Trauma Kit B', stock: '9 Set', rights: '4 / 30' },
        ],
      },
      'posko-b07': {
        id: 'posko-b07' as const,
        name: 'Posko B-07',
        sector: lang === 'en' ? 'South Coast' : 'Pesisir Selatan',
        critical: false,
        statusLabel: '185% Surplus',
        commodities: [
          { name: 'Paket Sembako', stock: '540 Koli', rights: '200 / 200' },
          { name: 'Air Bersih 19L', stock: '820 Unit', rights: '400 / 400' },
          { name: 'Obat Trauma Kit B', stock: '92 Set', rights: '60 / 60' },
        ],
      },
    }),
    [lang, poskoA04Critical, poskoA04Pct, sembako, airItem, traumaItem],
  );

  const selectedPost = selectedPostId ? postDetails[selectedPostId] : null;

  // Urgent Actions search matching
  const matchesTopUp =
    !query ||
    'top-up request permintaan kuota posko a-04 posko b-07 paket sembako food aid'
      .toLowerCase()
      .includes(query);
  const matchingOverrides = overrideEntries.filter(({ tag, el }) => {
    if (!query) return true;
    const itemName = itemNamesById[el.itemId]?.name ?? el.itemId;
    return `${tag} ${itemName} ${el.reason ?? ''} emergency override`.toLowerCase().includes(query);
  });
  const matchesBaselineOverride =
    !query ||
    'valley post posko lembah medical kits paket medis emergency override alfa-3 e9a4-f29d'
      .toLowerCase()
      .includes(query);
  const matchesAutoRebalance =
    !query || 'auto rebalance posko b-07 posko a-04 paket sembako 100 koli'.toLowerCase().includes(query);

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
        <aside className="flex w-full shrink-0 flex-col justify-between border-b border-slate-200 bg-white lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r">
          <div>
            <div className="flex h-14 items-center gap-3 border-b border-slate-200 bg-slate-50 px-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F172A] text-white">
                <Radar className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-display truncate text-sm font-extrabold">ResilioLog</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Command Center
                </div>
              </div>
            </div>

            <div className="px-4 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {lang === 'en' ? 'Field Operations' : 'Operasi Lapangan'}
            </div>
            <nav aria-label="Command Center sections" className="flex flex-row gap-1 overflow-x-auto px-3 pb-2 lg:flex-col">
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
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#059669]" />
                <span className="text-xs font-semibold">
                  {lang === 'en' ? 'Local Cluster #01' : 'Kluster Lokal #01'}
                </span>
              </div>
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#059669]">
                Mesh OK
              </span>
            </div>
            <div className="flex items-center gap-2.5 p-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F172A] text-white">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold">
                  {lang === 'en' ? 'Central Logistics Coord' : 'Koord. Logistik Pusat'}
                </div>
                <div className="truncate text-[11px] text-slate-500">{officerId}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 border-t border-slate-200 px-3 py-2.5">
              <button
                type="button"
                onClick={onSwitchToVolunteer}
                className="flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Smartphone className="h-3 w-3" />
                <span className="truncate">{t.switchToVolunteer}</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-red-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-3 w-3" />
                <span>{t.signOutBtn}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="flex flex-1 flex-col">
          {/* Desktop Top Header */}
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-5 py-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[#0F172A]">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-bold">
                    {lang === 'en' ? 'Regional Disaster Command Post' : 'Posko Komando Wilayah Bencana'}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    {lang === 'en' ? 'Sector Alfa-7' : 'Sektor Alfa-7'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">{t.cmdSubtitle}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
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
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-[#0F172A] shadow-xs hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{lang === 'en' ? 'Sync Now' : 'Sinkronkan'}</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                title={t.signOutBtn}
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-red-600 shadow-xs hover:bg-red-50 lg:hidden"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{t.signOutBtn}</span>
              </button>
            </div>
          </header>

          {/* Operational Title + Search + Actions */}
          <section className="flex flex-col gap-2.5 px-5 py-3">
            <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-bold tracking-wide text-[#059669]">
                    <span className="h-2 w-2 rounded-full bg-[#059669]" />
                    {t.cvrdtActive}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-medium text-slate-500">
                    {lang === 'en' ? '18 Connected Sector Nodes' : '18 Simpul Posko Terhubung'}
                  </span>
                </div>
                <h1 className="font-display mt-0.5 text-xl font-extrabold tracking-tight text-[#0F172A]">
                  {t.cmdTitle}
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onExportLog}
                  className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-bold text-[#0F172A] shadow-xs hover:bg-slate-50"
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
                  className="flex h-9 items-center gap-2 rounded-lg bg-[#0F172A] px-3.5 text-xs font-bold text-white shadow-xs hover:bg-[#1E293B]"
                >
                  <Route className="h-4 w-4" />
                  <span>{t.calcRebalance}</span>
                </button>
              </div>
            </div>

            {rebalanceBanner && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-medium text-emerald-900">
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

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-xs">
              <Search className="ml-1 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  lang === 'en'
                    ? 'Search posts, commodities, or CvRDT transfer logs...'
                    : 'Cari posko, komoditas, atau log transfer CvRDT...'
                }
                className="h-7 flex-1 text-xs focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </section>

          {/* 4 Compact KPI Cards */}
          <section className="grid grid-cols-1 gap-3 px-5 pb-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col justify-between gap-1.5 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <span>{lang === 'en' ? 'Total Logistics (Node)' : 'Total Logistik (Simpul)'}</span>
                <Package className="h-4 w-4 text-slate-400" />
              </div>
              <div className="font-display text-xl font-extrabold tabular-nums">
                {totalUnits.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">
                  {lang === 'en' ? 'units' : 'unit'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-[#059669]">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>{lang === 'en' ? 'Log Integrity 100%' : 'Integritas Log 100%'}</span>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-1.5 rounded-xl border border-red-200 bg-white p-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#DC2626]">
                  {lang === 'en' ? 'Critical Posts (<15%)' : 'Posko Kritis (<15%)'}
                </span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-[#DC2626]">
                  {lang === 'en' ? 'Action' : 'Aksi'}
                </span>
              </div>
              <div className="font-display text-xl font-extrabold text-[#DC2626] tabular-nums">
                {criticalPostCount}{' '}
                <span className="text-xs font-normal text-slate-500">
                  {lang === 'en'
                    ? criticalPostCount === 1
                      ? 'Post'
                      : 'Posts'
                    : 'Posko'}
                </span>
              </div>
              <div className="text-[11px] font-medium text-[#DC2626]">{criticalPostsLabel}</div>
            </div>

            <div className="flex flex-col justify-between gap-1.5 rounded-xl border border-emerald-200 bg-white p-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#059669]">
                  {lang === 'en' ? 'Surplus Posts (>85%)' : 'Posko Surplus (>85%)'}
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-[#059669]">
                  {lang === 'en' ? 'Ready' : 'Siap'}
                </span>
              </div>
              <div className="font-display text-xl font-extrabold text-[#059669] tabular-nums">
                2{' '}
                <span className="text-xs font-normal text-slate-500">
                  {lang === 'en' ? 'Posts' : 'Posko'}
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-600">
                Posko B-07 (+340 {lang === 'en' ? 'units' : 'unit'})
              </div>
            </div>

            <div className="flex flex-col justify-between gap-1.5 rounded-xl border border-amber-200 bg-white p-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B45309]">
                  {lang === 'en' ? 'Overrides Audited' : 'Audit Override Darurat'}
                </span>
                <ShieldCheck className="h-4 w-4 text-[#B45309]" />
              </div>
              <div className="font-display text-xl font-extrabold text-[#B45309] tabular-nums">
                {overrideEntries.length + 1}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {ratifiedOverrides.length} {lang === 'en' ? 'ratified' : 'teratifikasi'}
                </span>
              </div>
            </div>
          </section>

          {/* Active Sidebar Section Content */}
          {activeSection === 'map' && (
            <section className="grid grid-cols-1 gap-4 px-5 pb-6 lg:grid-cols-12">
              {/* Left 7 cols: Topographic Map + Selected Post Detail + Sectoral Audit Table */}
              <div className="flex flex-col gap-3.5 lg:col-span-7">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <Compass className="h-4 w-4 text-[#0F172A]" />
                        <h2 className="font-display text-sm font-bold">
                          {lang === 'en'
                            ? 'Sectoral Distribution & Quota Map'
                            : 'Peta Sebaran & Ketersediaan Sektoral'}
                        </h2>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {lang === 'en'
                          ? 'Click a post pin to inspect live stock & Bounded Counter rights'
                          : 'Klik pin posko untuk melihat detail stok & hak kuota Bounded Counter'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => setMapFilter('all')}
                        className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                          mapFilter === 'all' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        {lang === 'en' ? 'All Posts' : 'Semua Posko'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMapFilter('critical')}
                        className={`rounded px-2 py-0.5 text-[11px] font-bold ${
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
                  <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50 px-3.5 py-1.5 text-[11px] font-medium text-slate-600">
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

                  {/* Compact Topographic SVG Map with >=32px bottom clearance */}
                  <div className="relative h-[230px] w-full overflow-hidden bg-[#EEF2F6]">
                    <svg
                      className="h-full w-full"
                      viewBox="0 0 800 240"
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
                        d="M-20,65 Q140,25 280,60 T560,45 T820,80"
                        fill="none"
                        stroke="#94A3B8"
                        strokeWidth="1.2"
                        strokeDasharray="4,3"
                        opacity="0.55"
                      />
                      <path
                        d="M-20,120 Q160,85 320,115 T620,100 T820,145"
                        fill="none"
                        stroke="#94A3B8"
                        strokeWidth="1"
                        opacity="0.45"
                      />
                      <path
                        d="M-20,180 Q180,150 360,175 T660,160 T820,200"
                        fill="none"
                        stroke="#94A3B8"
                        strokeWidth="1.2"
                        strokeDasharray="4,3"
                        opacity="0.55"
                      />
                      <path
                        d="M144,67 L640,130"
                        fill="none"
                        stroke="#0F172A"
                        strokeWidth="2.5"
                        strokeDasharray="6,5"
                        opacity="0.8"
                      />
                    </svg>

                    {/* Pin 1: Posko A-04 */}
                    {!poskoA04Critical && mapFilter === 'critical' ? null : (
                      <button
                        type="button"
                        onClick={() => setSelectedPostId('posko-a04')}
                        className={`absolute left-[18%] top-[28%] flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center focus:outline-none ${
                          selectedPostId === 'posko-a04' ? 'z-20 scale-105' : 'z-10 hover:scale-105'
                        }`}
                      >
                        <div className="relative flex items-center justify-center">
                          {poskoA04Critical && (
                            <span className="absolute h-7 w-7 animate-ping rounded-full bg-red-500/25" />
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
                            selectedPostId === 'posko-a04'
                              ? 'ring-2 ring-[#0F172A]/30 '
                              : ''
                          }${poskoA04Critical ? 'border-red-300' : 'border-emerald-300'}`}
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
                      </button>
                    )}

                    {/* Pin 2: Posko C-02 (>=32px above bottom edge) */}
                    <button
                      type="button"
                      onClick={() => setSelectedPostId('posko-c02')}
                      className={`absolute left-[48%] top-[54%] flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center focus:outline-none ${
                        selectedPostId === 'posko-c02' ? 'z-20 scale-105' : 'z-10 hover:scale-105'
                      }`}
                    >
                      <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#DC2626] shadow-md">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>
                      <div
                        className={`mt-1 rounded-md border border-red-300 bg-white px-2 py-0.5 text-center shadow-xs ${
                          selectedPostId === 'posko-c02' ? 'ring-2 ring-[#0F172A]/30' : ''
                        }`}
                      >
                        <div className="text-[11px] font-bold text-[#DC2626]">Posko C-02</div>
                        <div className="font-mono text-[10px] font-medium text-slate-600">
                          12.5% {lang === 'en' ? 'Critical' : 'Kritis'}
                        </div>
                      </div>
                    </button>

                    {/* Pin 3: Posko B-07 (Green Surplus pin, >=32px above bottom edge) */}
                    {mapFilter === 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedPostId('posko-b07')}
                        className={`absolute left-[80%] top-[54%] flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center focus:outline-none ${
                          selectedPostId === 'posko-b07' ? 'z-20 scale-105' : 'z-10 hover:scale-105'
                        }`}
                      >
                        <div className="relative flex items-center justify-center">
                          <span className="absolute h-7 w-7 rounded-full bg-emerald-500/20" />
                          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#059669] shadow-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          </div>
                        </div>
                        <div
                          className={`mt-1 rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-center shadow-xs ${
                            selectedPostId === 'posko-b07' ? 'ring-2 ring-[#0F172A]/30' : ''
                          }`}
                        >
                          <div className="flex items-center gap-1 text-[11px] font-bold text-[#059669]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" />
                            Posko B-07
                          </div>
                          <div className="font-mono text-[10px] font-semibold text-slate-700">
                            185% Surplus
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Courier badge */}
                    <div className="absolute left-[46%] top-[20%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-md border border-slate-700 bg-[#0F172A] px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
                      <Truck className="h-3.5 w-3.5 text-[#059669]" />
                      <span>{lang === 'en' ? 'Fleet #02 En Route' : 'Armada #02 Bergerak'}</span>
                      <span className="font-mono font-normal text-slate-300">• ETA 14m</span>
                    </div>
                  </div>

                  {/* Interactive Pin Detail Card */}
                  {selectedPost && (
                    <div className="border-t border-slate-200 bg-slate-50 px-3.5 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              selectedPost.critical ? 'bg-[#DC2626]' : 'bg-[#059669]'
                            }`}
                          />
                          <span className="font-display text-xs font-bold text-[#0F172A]">
                            {selectedPost.name}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            • {selectedPost.sector}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              selectedPost.critical
                                ? 'bg-red-100 text-[#DC2626]'
                                : 'bg-emerald-100 text-[#059669]'
                            }`}
                          >
                            {selectedPost.statusLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedPost.id === 'posko-a04' && poskoA04Critical && (
                            <button
                              type="button"
                              onClick={() => onApproveReroute('sembako', 100, openSembakoReq?.tag)}
                              className="rounded-md bg-[#0F172A] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#1E293B]"
                            >
                              {t.approveReroute} (+100)
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedPostId(null)}
                            aria-label="Close post details"
                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {selectedPost.commodities.map((c) => (
                          <div
                            key={c.name}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px]"
                          >
                            <div className="truncate font-semibold text-[#0F172A]">{c.name}</div>
                            <div className="mt-0.5 flex items-center justify-between font-mono text-slate-600">
                              <span>
                                {lang === 'en' ? 'Stock' : 'Stok'}: <strong className="text-[#0F172A]">{c.stock}</strong>
                              </span>
                              <span>
                                {lang === 'en' ? 'Rights' : 'Hak'}: <strong className="text-[#0F172A]">{c.rights}</strong>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sectoral Quota Audit Table */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold">
                      {lang === 'en' ? 'Sectoral Quota Deviation Audit' : 'Audit Deviasi Kuota Sektoral'}
                    </h3>
                    <span className="text-[11px] text-slate-500">
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
                            id: 'posko-a04' as const,
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
                            id: 'posko-c02' as const,
                            post: 'Posko C-02',
                            sector: lang === 'en' ? 'West Slope' : 'Lereng Barat',
                            badge: `12.5% ${lang === 'en' ? 'Critical' : 'Kritis'}`,
                            critical: true,
                            rights: '10 / 80',
                          },
                          {
                            id: 'posko-b07' as const,
                            post: 'Posko B-07',
                            sector: lang === 'en' ? 'South Coast' : 'Pesisir Selatan',
                            badge: '185% Surplus',
                            critical: false,
                            rights: '200 / 200',
                          },
                        ]
                          .filter((r) =>
                            !query
                              ? true
                              : `${r.post} ${r.sector} ${r.badge}`.toLowerCase().includes(query),
                          )
                          .map((row) => (
                            <tr
                              key={row.post}
                              onClick={() => setSelectedPostId(row.id)}
                              className="cursor-pointer transition-colors hover:bg-slate-50"
                            >
                              <td className="py-2 font-bold">
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className={`h-2 w-2 rounded-full ${
                                      row.critical ? 'bg-[#DC2626]' : 'bg-[#059669]'
                                    }`}
                                  />
                                  {row.post}
                                </span>
                              </td>
                              <td className="py-2 text-slate-500">{row.sector}</td>
                              <td className="py-2">
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
                              <td className="py-2 text-right font-mono font-bold tabular-nums">
                                {row.rights}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right 5 cols: Urgent Actions & Emergency Override Audit */}
              <div className="flex flex-col gap-3 lg:col-span-5">
                <div className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <h2 className="font-display text-sm font-bold">
                        {lang === 'en' ? 'Urgent Actions' : 'Tindakan Mendesak'}
                      </h2>
                      <p className="text-[11px] text-slate-500">
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
                  {matchesTopUp && (
                    <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-slate-50 p-3">
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
                      <p className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600">
                        {lang === 'en' ? (
                          <>
                            “New flood evacuee influx (+45 households) at Sector A-04. Transfer quota
                            rights from surplus <strong>Posko B-07</strong>.”
                          </>
                        ) : (
                          <>
                            “Lonjakan pengungsi baru (+45 KK) di Sektor A-04. Transfer hak kuota
                            dari surplus <strong>Posko B-07</strong>.”
                          </>
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => onApproveReroute('sembako', 100, openSembakoReq?.tag)}
                        className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#0F172A] px-3 text-xs font-bold text-white shadow-xs hover:bg-[#1E293B]"
                      >
                        <Check className="h-4 w-4" />
                        <span>
                          {t.approveReroute} ({lang === 'en' ? '+100 Quota' : '+100 Kuota'})
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Live Emergency Overrides from CRDT distributionLog (never hidden) */}
                  {matchingOverrides.map(({ tag, el }) => {
                    const ratified = ratifiedOverrides.includes(tag);
                    return (
                      <div
                        key={tag}
                        className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50/70 p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#B45309]">
                              <Zap className="h-3.5 w-3.5" />
                              {lang === 'en'
                                ? 'Emergency Override (Live)'
                                : 'Emergency Override (Langsung)'}
                            </span>
                            <div className="mt-0.5 font-display text-sm font-bold">
                              {itemNamesById[el.itemId]?.name ?? el.itemId} (-{el.qty}{' '}
                              {itemNamesById[el.itemId]?.unit ?? (lang === 'en' ? 'units' : 'unit')})
                            </div>
                          </div>
                          <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#B45309]">
                            {ratified ? t.ratifiedDone : 'Audit'}
                          </span>
                        </div>
                        <p className="rounded-lg border border-amber-200 bg-white p-2 text-xs text-slate-700">
                          {lang === 'en' ? 'Reason' : 'Alasan'}:{' '}
                          {el.reason ?? 'Emergency override'}
                        </p>
                        <button
                          type="button"
                          disabled={ratified}
                          onClick={() => onRatifyOverride(tag)}
                          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#B45309] px-3 text-xs font-bold text-white shadow-xs hover:bg-amber-800 disabled:opacity-60"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>{ratified ? t.ratifiedDone : t.ratifyOverride}</span>
                        </button>
                      </div>
                    );
                  })}

                  {/* Baseline Override Audit Item */}
                  {matchesBaselineOverride && (
                    <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50/60 p-3">
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
                      <p className="rounded-lg border border-amber-200 bg-white p-2 text-xs text-slate-700">
                        {lang === 'en'
                          ? 'Emergency triage: Pediatric hypothermia evacuation at Alfa-3. Daily quota bypassed offline by field medic.'
                          : 'Triage darurat: Evakuasi anak-anak hipotermia di Alfa-3. Limit harian diabaikan petugas offline.'}
                      </p>
                      <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                        <span>Hash: #E9A4-F29D</span>
                        <span>
                          {lang === 'en'
                            ? 'Audit Flag Active • 14:10 WIB'
                            : 'Flag Audit Aktif • 14:10 WIB'}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={baselineRatified}
                        onClick={() => onRatifyOverride('#E9A4-F29D')}
                        className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#B45309] px-3 text-xs font-bold text-white shadow-xs hover:bg-amber-800 disabled:opacity-60"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>{baselineRatified ? t.ratifiedDone : t.ratifyOverride}</span>
                      </button>
                    </div>
                  )}

                  {/* Auto-rebalance shortcut */}
                  {matchesAutoRebalance && (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
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
                  )}

                  {!matchesTopUp &&
                    matchingOverrides.length === 0 &&
                    !matchesBaselineOverride &&
                    !matchesAutoRebalance && (
                      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                        {lang === 'en'
                          ? 'No urgent actions match your search.'
                          : 'Tidak ada tindakan mendesak yang cocok dengan pencarian.'}
                      </div>
                    )}
                </div>
              </div>
            </section>
          )}

          {activeSection === 'quota' && (
            <section className="px-5 pb-8">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
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
                    <span>
                      {t.approveReroute} ({lang === 'en' ? '+100 Sembako' : '+100 Sembako'})
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {filteredItems.map((item) => {
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
                              {lang === 'en' ? 'Stock' : 'Stok'}:{' '}
                              <strong className="font-mono text-[#0F172A]">{item.stock}</strong>{' '}
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
                          <span>
                            {lang === 'en' ? 'Rights' : 'Hak'}: {item.localRights}
                          </span>
                          <span>
                            {lang === 'en' ? 'Granted' : 'Kuota'}: {item.granted}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {activeSection === 'convergence' && (
            <section className="px-5 pb-8">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="font-display text-base font-bold">
                      {lang === 'en'
                        ? 'CvRDT Convergence Log (OR-Set)'
                        : 'Log Konvergensi CvRDT (OR-Set)'}
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
            <section className="px-5 pb-8">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="font-display text-base font-bold">
                      {lang === 'en'
                        ? 'Courier Fleet & Peer Sync Cursors'
                        : 'Armada Kurir & Kursor Sinkronisasi'}
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
                      <span className="font-display text-sm font-bold">
                        {lang === 'en' ? 'Fleet #02 (Data Mule)' : 'Armada #02 (Kurir Data)'}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-[#059669]">
                        ETA 14m
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {lang === 'en'
                        ? 'Route: Posko B-07 → Posko A-04 • Carrying RL1 QR envelope'
                        : 'Rute: Posko B-07 → Posko A-04 • Membawa envelope QR RL1'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-bold">
                        {lang === 'en'
                          ? 'Fleet #04 (Medical Relay)'
                          : 'Armada #04 (Relai Medis)'}
                      </span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                        {lang === 'en' ? 'Standby' : 'Siaga'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {lang === 'en' ? 'Last uplink' : 'Uplink terakhir'}: {lastUplink}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    {lang === 'en'
                      ? 'Recorded Peer Cursors (IndexedDB)'
                      : 'Kursor Peer Tercatat (IndexedDB)'}
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
                        <div
                          key={c.peerId}
                          className="flex items-center justify-between px-4 py-2.5 text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold">{c.peerId}</span>
                            {c.label && <span className="ml-2 text-slate-500">({c.label})</span>}
                          </div>
                          <div className="font-mono text-slate-600">
                            {lang === 'en' ? 'until clock' : 'sampai clock'} {c.until} •{' '}
                            {formatClockTime(c.lastSyncAt, lang)}
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
