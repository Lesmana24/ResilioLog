import { History, Package, RefreshCw } from 'lucide-react';

export type MobileTab = 'inventaris' | 'sync' | 'history';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onChangeTab: (tab: MobileTab) => void;
  unsyncedCount: number;
  labels: {
    inventaris: string;
    sync: string;
    history: string;
  };
}

export function MobileBottomNav({
  activeTab,
  onChangeTab,
  unsyncedCount,
  labels,
}: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Mobile navigation"
      className="shrink-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-xl"
    >
      <div className="flex h-[72px] items-center justify-around px-4">
        <button
          type="button"
          onClick={() => onChangeTab('inventaris')}
          aria-current={activeTab === 'inventaris' ? 'page' : undefined}
          className={`flex min-h-[48px] min-w-[76px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors ${
            activeTab === 'inventaris'
              ? 'bg-slate-100/90 font-bold text-[#0F172A]'
              : 'font-medium text-slate-500 hover:text-[#0F172A]'
          }`}
        >
          <Package className="h-5 w-5" />
          <span className="text-xs">{labels.inventaris}</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('sync')}
          aria-current={activeTab === 'sync' ? 'page' : undefined}
          className={`flex min-h-[48px] min-w-[76px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors ${
            activeTab === 'sync'
              ? 'bg-slate-100/90 font-bold text-[#0F172A]'
              : 'font-medium text-slate-500 hover:text-[#0F172A]'
          }`}
        >
          <div className="relative flex items-center justify-center">
            <RefreshCw className="h-5 w-5" />
            {unsyncedCount > 0 && (
              <span className="absolute -right-3 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-bold text-white shadow-xs">
                {unsyncedCount}
              </span>
            )}
          </div>
          <span className="text-xs">{labels.sync}</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('history')}
          aria-current={activeTab === 'history' ? 'page' : undefined}
          className={`flex min-h-[48px] min-w-[76px] flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 transition-colors ${
            activeTab === 'history'
              ? 'bg-slate-100/90 font-bold text-[#0F172A]'
              : 'font-medium text-slate-500 hover:text-[#0F172A]'
          }`}
        >
          <History className="h-5 w-5" />
          <span className="text-xs">{labels.history}</span>
        </button>
      </div>
    </nav>
  );
}
