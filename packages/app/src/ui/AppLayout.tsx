import { type ReactNode } from 'react';
import { useLang } from '../i18n/useLang';
import {
  IconBell,
  IconClipboardList,
  IconCommand,
  IconDashboard,
  IconFileText,
  IconKey,
  IconMenu,
  IconPackage,
  IconQrCode,
  IconRefresh,
  IconSettings,
  ResilioLogo,
} from './Icons';
import { colors, font, layout, radius, space } from './styles';

export type Page =
  | 'dashboard'
  | 'field'
  | 'command-center'
  | 'inventory'
  | 'sync'
  | 'activity-log'
  | 'settings';

interface NavItem {
  id: Page;
  labelKey: string;
  renderIcon: (color: string) => ReactNode;
}

const MAIN_NAV: NavItem[] = [
  { id: 'dashboard', labelKey: 'nav_dashboard', renderIcon: (c) => <IconDashboard size={17} color={c} /> },
  { id: 'field', labelKey: 'nav_field', renderIcon: (c) => <IconPackage size={17} color={c} /> },
  { id: 'command-center', labelKey: 'nav_commandCenter', renderIcon: (c) => <IconCommand size={17} color={c} /> },
  { id: 'inventory', labelKey: 'nav_inventory', renderIcon: (c) => <IconClipboardList size={17} color={c} /> },
  { id: 'activity-log', labelKey: 'nav_activityLog', renderIcon: (c) => <IconFileText size={17} color={c} /> },
];

const SYSTEM_NAV: NavItem[] = [
  { id: 'sync', labelKey: 'nav_sync', renderIcon: (c) => <IconRefresh size={17} color={c} /> },
  { id: 'settings', labelKey: 'nav_settings', renderIcon: (c) => <IconSettings size={17} color={c} /> },
];

const ALL_NAV = [...MAIN_NAV, ...SYSTEM_NAV];

interface AppLayoutProps {
  page: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
  installPrompt?: (() => void) | null;
  storagePersistent?: boolean | null;
  loading?: boolean;
  nodeId?: string | undefined;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function AppLayout({
  page,
  onNavigate,
  children,
  installPrompt,
  storagePersistent,
  loading,
  nodeId,
  sidebarOpen,
  onToggleSidebar,
}: AppLayoutProps) {
  const { t, lang, setLang } = useLang();

  function renderNavGroup(items: NavItem[]) {
    return items.map((item) => {
      const isActive = page === item.id;
      const iconColor = isActive ? colors.sidebarActiveText : colors.sidebarText;
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            onNavigate(item.id);
            if (sidebarOpen) onToggleSidebar();
          }}
          aria-current={isActive ? 'page' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 12px',
            borderRadius: radius.md,
            border: 'none',
            background: isActive ? colors.sidebarActiveBg : 'transparent',
            color: isActive ? colors.sidebarActiveText : colors.sidebarText,
            fontSize: font.sizeMd,
            fontWeight: isActive ? font.weightSemibold : font.weightMedium,
            textAlign: 'left',
            width: '100%',
            transition: 'background 0.15s, color 0.15s',
            minHeight: 38,
          }}
        >
          {item.renderIcon(iconColor)}
          <span>{t(item.labelKey)}</span>
        </button>
      );
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        fontFamily: font.family,
        background: colors.pageBg,
        color: colors.text,
        position: 'relative',
      }}
    >
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; font-family: ${font.family}; background: ${colors.pageBg}; }
        button, input, select, textarea { font-family: inherit; }
        button { cursor: pointer; }
        .resilio-sidebar {
          left: 0;
        }
        .resilio-main-area {
          margin-left: ${layout.sidebarWidth}px;
        }
        .resilio-hamburger {
          display: none !important;
        }
        @media (max-width: 768px) {
          .resilio-sidebar {
            left: ${sidebarOpen ? '0' : `-${layout.sidebarWidth}px`};
          }
          .resilio-main-area {
            margin-left: 0;
          }
          .resilio-hamburger {
            display: flex !important;
          }
          .sidebar-overlay { display: block !important; }
        }
      `}</style>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={onToggleSidebar}
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 39, 0.28)',
            zIndex: 99,
          }}
        />
      )}

      {/* Clean Light Sidebar (Prodex style) */}
      <aside
        className="resilio-sidebar"
        style={{
          width: layout.sidebarWidth,
          minWidth: layout.sidebarWidth,
          background: colors.sidebar,
          borderRight: `1px solid ${colors.sidebarBorder}`,
          display: 'flex',
          flexDirection: 'column',
          padding: `${space.md}px ${space.md}px`,
          gap: space.md,
          zIndex: 100,
          position: 'fixed' as const,
          top: 0,
          bottom: 0,
          transition: 'left 0.25s ease',
          overflowY: 'auto',
        }}
        aria-label="Sidebar navigation"
      >
        {/* Brand Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '4px 4px',
          }}
        >
          <ResilioLogo size={30} />
          <div
            style={{
              fontSize: 17,
              fontWeight: font.weightBold,
              color: colors.text,
              letterSpacing: '-0.02em',
            }}
          >
            {t('appName')}
          </div>
        </div>

        {/* Node Identity Pill Card (like Uxerflow selector in Prodex) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            background: '#ffffff',
            border: `1px solid ${colors.borderLight}`,
            borderRadius: radius.md,
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
          title="Local Node ID"
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: '#111827',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconKey size={12} color="#ffffff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: font.sizeSm,
                fontWeight: font.weightSemibold,
                color: colors.text,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {nodeId ?? '...'}
            </div>
            <div style={{ fontSize: 10, color: colors.textMuted }}>Offline-First Node</div>
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav aria-label="Primary navigation" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: font.weightSemibold,
              color: colors.textSubtle,
              letterSpacing: '0.06em',
              padding: '6px 12px 4px',
            }}
          >
            {t('nav_groupMain')}
          </div>
          {renderNavGroup(MAIN_NAV)}

          <div
            style={{
              fontSize: 10.5,
              fontWeight: font.weightSemibold,
              color: colors.textSubtle,
              letterSpacing: '0.06em',
              padding: '14px 12px 4px',
            }}
          >
            {t('nav_groupSystem')}
          </div>
          {renderNavGroup(SYSTEM_NAV)}
        </nav>

        {/* Bottom Quick Sync & Language Card */}
        <div
          style={{
            marginTop: 'auto',
            padding: 12,
            background: '#ffffff',
            border: `1px solid ${colors.borderLight}`,
            borderRadius: radius.lg,
            display: 'grid',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={() => {
              onNavigate('sync');
              if (sidebarOpen) onToggleSidebar();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '9px 12px',
              background: '#111827',
              color: '#ffffff',
              border: 'none',
              borderRadius: radius.md,
              fontSize: font.sizeSm,
              fontWeight: font.weightMedium,
              minHeight: 36,
            }}
          >
            <IconQrCode size={15} color="#ffffff" />
            <span>{t('dashboard_goSync')}</span>
          </button>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => setLang('en')}
              style={{
                flex: 1,
                padding: '5px 0',
                borderRadius: radius.sm,
                border: lang === 'en' ? `1px solid ${colors.teal}` : `1px solid ${colors.borderLight}`,
                background: lang === 'en' ? colors.tealLight : '#f9fafb',
                color: lang === 'en' ? colors.tealDark : colors.sidebarText,
                fontSize: 11.5,
                fontWeight: font.weightSemibold,
                minHeight: 30,
              }}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang('id')}
              style={{
                flex: 1,
                padding: '5px 0',
                borderRadius: radius.sm,
                border: lang === 'id' ? `1px solid ${colors.teal}` : `1px solid ${colors.borderLight}`,
                background: lang === 'id' ? colors.tealLight : '#f9fafb',
                color: lang === 'id' ? colors.tealDark : colors.sidebarText,
                fontSize: 11.5,
                fontWeight: font.weightSemibold,
                minHeight: 30,
              }}
            >
              ID
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div
        className="resilio-main-area"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'margin-left 0.25s ease',
        }}
      >
        {/* Clean White Header */}
        <header
          style={{
            height: layout.headerHeight,
            background: colors.headerBg,
            borderBottom: `1px solid ${colors.headerBorder}`,
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${layout.contentPadding}px`,
            gap: space.md,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="resilio-hamburger"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            style={{
              background: 'none',
              border: 'none',
              color: colors.text,
              padding: '4px 6px',
              borderRadius: radius.sm,
              alignItems: 'center',
              minHeight: 40,
            }}
          >
            <IconMenu size={20} color={colors.text} />
          </button>

          <span
            style={{
              fontSize: 18,
              fontWeight: font.weightSemibold,
              color: colors.text,
              flex: 1,
            }}
          >
            {ALL_NAV.find((n) => n.id === page) ? t(ALL_NAV.find((n) => n.id === page)!.labelKey) : ''}
          </span>

          {installPrompt && (
            <button
              type="button"
              onClick={installPrompt}
              style={{
                padding: '7px 14px',
                background: colors.teal,
                color: '#fff',
                border: 'none',
                borderRadius: radius.md,
                fontSize: font.sizeSm,
                fontWeight: font.weightMedium,
                minHeight: 34,
              }}
            >
              {t('installApp')}
            </button>
          )}

          {/* Quick Command Center Bell */}
          <button
            type="button"
            onClick={() => onNavigate('command-center')}
            title={t('nav_commandCenter')}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#f3f4f6',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.text,
            }}
          >
            <IconBell size={17} color={colors.text} />
          </button>

          {/* Node ID Pill */}
          <div
            style={{
              padding: '5px 12px',
              background: colors.tealLight,
              color: colors.tealDark,
              borderRadius: radius.pill,
              fontSize: 12,
              fontWeight: font.weightSemibold,
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Your Node ID"
          >
            <IconKey size={13} color={colors.tealDark} />
            <span>{nodeId ?? '...'}</span>
          </div>
        </header>

        {/* Storage warning banner */}
        {!loading && storagePersistent === false && (
          <div
            role="alert"
            style={{
              padding: '9px 24px',
              backgroundColor: colors.warningBg,
              borderBottom: `1px solid ${colors.warningBorder}`,
              color: '#92400e',
              fontSize: font.sizeSm,
              flexShrink: 0,
            }}
          >
            <strong>{t('storageNotPersistent')}</strong> {t('storageWarningDetail')}
          </div>
        )}

        {/* Scrollable Content */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: layout.contentPadding,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
