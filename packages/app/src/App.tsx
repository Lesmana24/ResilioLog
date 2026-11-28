import { useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import type { AppLanguage } from './engine/errorMessages';
import { COPY } from './i18n/translations';
import { useReplica } from './state/useReplica';
import { CommandCenterScreen } from './ui/CommandCenterScreen';
import { InventarisScreen } from './ui/InventarisScreen';
import { LoginScreen, type EntityRole } from './ui/LoginScreen';
import type { MobileTab } from './ui/MobileBottomNav';
import { P2PSyncScreen } from './ui/P2PSyncScreen';

type ViewMode = 'mobile' | 'command';

interface AuthSession {
  mode: ViewMode;
  role: EntityRole;
  officerId: string;
}

function readStoredSession(storageKey: string): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (
      (parsed.mode === 'mobile' || parsed.mode === 'command') &&
      typeof parsed.officerId === 'string' &&
      parsed.officerId.trim().length > 0
    ) {
      const role: EntityRole =
        parsed.role === 'courier' || parsed.role === 'command' || parsed.role === 'volunteer'
          ? parsed.role
          : parsed.mode === 'command'
            ? 'command'
            : 'volunteer';
      return { mode: parsed.mode, role, officerId: parsed.officerId };
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredSession(storageKey: string, session: AuthSession | null): void {
  try {
    if (!session) {
      window.localStorage.removeItem(storageKey);
    } else {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    }
  } catch {
    // Ignore storage quota / private mode errors
  }
}

function ResilioShell() {
  // Default UI language: EN (UI-CONTRACT.md §4)
  const [lang, setLang] = useState<AppLanguage>('en');

  const t = COPY[lang];

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
    requestPersistenceNow,
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

  const sessionStorageKey = `resiliolog_session_${activeNodeParam}`;
  const [session, setSession] = useState<AuthSession | null>(() =>
    readStoredSession(sessionStorageKey),
  );
  const [mobileTab, setMobileTab] = useState<MobileTab>(() =>
    session?.role === 'courier' ? 'sync' : 'inventaris',
  );

  function handleLogin(mode: ViewMode, role: EntityRole, officerId: string) {
    const next: AuthSession = { mode, role, officerId };
    setSession(next);
    setMobileTab(role === 'courier' ? 'sync' : 'inventaris');
    writeStoredSession(sessionStorageKey, next);
  }

  function handleLogout() {
    setSession(null);
    writeStoredSession(sessionStorageKey, null);
  }

  const isMobileSession = session?.mode === 'mobile';
  const mobileRole: 'volunteer' | 'courier' =
    session?.role === 'courier' ? 'courier' : 'volunteer';

  return (
    <div
      className={
        isMobileSession
          ? 'flex h-[100dvh] flex-col overflow-hidden bg-slate-200/70'
          : 'flex min-h-screen flex-col bg-[#F8FAFC]'
      }
    >
      {/* Main Content */}
      {!session ? (
        <LoginScreen
          lang={lang}
          onChangeLang={setLang}
          persistenceGranted={persistenceGranted}
          onRequestPersistence={requestPersistenceNow}
          onLogin={handleLogin}
        />
      ) : !dbReady || !replica ? (
        <div className="flex min-h-[60vh] items-center justify-center p-6 text-sm font-medium text-slate-600">
          {t.initializingDb}...
        </div>
      ) : session.mode === 'command' ? (
        <CommandCenterScreen
          lang={lang}
          onChangeLang={setLang}
          officerId={session.officerId}
          onLogout={handleLogout}
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
        <div className="flex min-h-0 flex-1 justify-center py-0 sm:py-4">
          {mobileTab === 'sync' ? (
            <P2PSyncScreen
              activeTab={mobileTab}
              onChangeTab={setMobileTab}
              lang={lang}
              onChangeLang={setLang}
              role={mobileRole}
              nodeId={replica.nodeId}
              officerId={session.officerId}
              onLogout={handleLogout}
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
              role={mobileRole}
              officerId={session.officerId}
              onLogout={handleLogout}
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
        <div className="fixed bottom-6 right-6 z-50 flex max-w-sm items-start gap-2.5 rounded-xl border border-slate-700 bg-[#0F172A] p-3.5 text-white shadow-xl">
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
