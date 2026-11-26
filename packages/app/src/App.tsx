import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  Monitor,
  Smartphone,
  X,
} from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { AppLanguage } from './engine/errorMessages';
import { useReplica } from './state/useReplica';
import { CommandCenterScreen } from './ui/CommandCenterScreen';
import { InventarisScreen } from './ui/InventarisScreen';
import type { MobileTab } from './ui/MobileBottomNav';
import { P2PSyncScreen } from './ui/P2PSyncScreen';

type ViewMode = 'mobile' | 'command';

function ResilioShell() {
  // Default UI language: EN (UI-CONTRACT.md §4)
  const [lang, setLang] = useState<AppLanguage>('en');
  const [viewMode, setViewMode] = useState<ViewMode>('mobile');
  const [mobileTab, setMobileTab] = useState<MobileTab>('inventaris');
  const [dismissStorageBanner, setDismissStorageBanner] = useState(false);

  const {
    dbReady,
    activeNodeParam,
    persistenceGranted,
    replica,
    itemsList,
    distributionEntries,
    topUpRequests,
    cursors,
    nearbyPeers,
    unsyncedCount,
    ratifiedOverrides,
    qrProgress,
    toast,
    dismissToast,
    doReceive,
    doIssue,
    doEmergencyIssue,
    doRequestTopUp,
    doApproveReroute,
    doVoidLog,
    doRatifyOverride,
    broadcastDelta,
    getQrChunks,
    importQrFrame,
    simulateCourierArrival,
    exportLogJson,
  } = useReplica(lang);

  return (
    <div className="min-h-screen bg-slate-200/70">
      {/* Top Demo & Multi-Tab Isolation Bar */}
      <div className="bg-[#0F172A] px-4 py-2 text-xs text-slate-200">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-display font-bold text-white">ResilioLog Demo</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-emerald-300">
              ?node={activeNodeParam}
            </span>
            <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
              nodeId: {replica?.nodeId ?? '...'} | clock: {replica?.clock ?? 0}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                persistenceGranted
                  ? 'bg-emerald-950 text-emerald-300'
                  : 'bg-amber-950 text-amber-300'
              }`}
            >
              <Database className="h-3 w-3" />
              {persistenceGranted ? 'Storage Persistent' : 'Storage Best-Effort'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="?node=posko-a04"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
            >
              <span>?node=posko-a04</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="?node=relawan-b"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
            >
              <span>?node=relawan-b</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <div className="inline-flex rounded-lg bg-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('mobile')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  viewMode === 'mobile' ? 'bg-white text-[#0F172A]' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobile Volunteer</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('command')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  viewMode === 'command'
                    ? 'bg-white text-[#0F172A]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>Command Center</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Storage Warning Banner (UI-CONTRACT.md §1) */}
      {persistenceGranted === false && !dismissStorageBanner && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#B45309]" />
              <span>
                {lang === 'en'
                  ? 'Persistent browser storage was not granted; browser eviction is possible under disk pressure.'
                  : 'Penyimpanan persisten browser belum diizinkan; data berisiko dibersihkan saat memori penuh.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDismissStorageBanner(true)}
              aria-label="Dismiss storage warning"
              className="rounded p-1 hover:bg-amber-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!dbReady || !replica ? (
        <div className="flex min-h-[60vh] items-center justify-center p-6 text-sm font-medium text-slate-600">
          Initializing IndexedDB ({activeNodeParam})...
        </div>
      ) : viewMode === 'command' ? (
        <CommandCenterScreen
          lang={lang}
          onChangeLang={setLang}
          nodeParam={activeNodeParam}
          items={itemsList}
          distributionEntries={distributionEntries}
          topUpRequests={topUpRequests}
          cursors={cursors}
          ratifiedOverrides={ratifiedOverrides}
          onApproveReroute={doApproveReroute}
          onRatifyOverride={doRatifyOverride}
          onExportLog={exportLogJson}
          onSyncNow={broadcastDelta}
        />
      ) : (
        <div className="py-0 sm:py-6">
          {mobileTab === 'sync' ? (
            <P2PSyncScreen
              activeTab={mobileTab}
              onChangeTab={setMobileTab}
              lang={lang}
              onChangeLang={setLang}
              nodeParam={activeNodeParam}
              nodeId={replica.nodeId}
              items={itemsList}
              distributionEntries={distributionEntries}
              cursors={cursors}
              nearbyPeers={nearbyPeers}
              unsyncedCount={unsyncedCount}
              qrProgress={qrProgress}
              onBroadcastDelta={broadcastDelta}
              getQrChunks={getQrChunks}
              onImportQrFrame={importQrFrame}
              onSimulateCourierArrival={simulateCourierArrival}
            />
          ) : (
            <InventarisScreen
              activeTab={mobileTab}
              onChangeTab={setMobileTab}
              lang={lang}
              onChangeLang={setLang}
              nodeParam={activeNodeParam}
              items={itemsList}
              distributionEntries={distributionEntries}
              unsyncedCount={unsyncedCount}
              onReceive={doReceive}
              onIssue={doIssue}
              onEmergencyIssue={doEmergencyIssue}
              onRequestTopUp={doRequestTopUp}
              onVoidLog={doVoidLog}
            />
          )}
        </div>
      )}

      {/* Floating Feedback Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-2.5 rounded-xl bg-[#0F172A] p-3.5 text-white shadow-xl border border-slate-700">
          {toast.tone === 'error' ? (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          ) : toast.tone === 'warning' ? (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#059669]" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold">{toast.title}</div>
            <div className="mt-0.5 text-xs text-slate-300">{toast.detail}</div>
          </div>
          <button
            type="button"
            onClick={dismissToast}
            className="rounded p-0.5 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ResilioShell />
    </ErrorBoundary>
  );
}
