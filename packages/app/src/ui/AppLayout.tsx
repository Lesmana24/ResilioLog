import { type ReactNode } from 'react';
import { useLang } from '../i18n/useLang';
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
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', labelKey: 'nav_dashboard', icon: '⊞' },
  { id: 'field', labelKey: 'nav_field', icon: '📦' },
  { id: 'command-center', labelKey: 'nav_commandCenter', icon: '🎯' },
  { id: 'inventory', labelKey: 'nav_inventory', icon: '📋' },
  { id: 'sync', labelKey: 'nav_sync', icon: '🔄' },
  { id: 'activity-log', labelKey: 'nav_activityLog', icon: '📝' },
  { id: 'settings', labelKey: 'nav_settings', icon: '⚙️' },
];

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
      {/* Global base styles */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
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
            background: 'rgba(0,0,0,0.4)',
            zIndex: 99,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className="resilio-sidebar"
        style={{
          width: layout.sidebarWidth,
          minWidth: layout.sidebarWidth,
          background: colors.sidebar,
          display: 'flex',
          flexDirection: 'column',
          padding: `${space.lg}px ${space.md}px`,
          gap: space.sm,
          zIndex: 100,
          position: 'fixed' as const,
          top: 0,
          bottom: 0,
          transition: 'left 0.25s ease',
          overflowY: 'auto',
        }}
        aria-label="Sidebar navigation"
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: space.sm,
            marginBottom: space.md,
            paddingBottom: space.md,
            borderBottom: `1px solid rgba(255,255,255,0.1)`,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: radius.md,
              background: colors.teal,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              color: '#fff',
              fontWeight: font.weightBold,
              flexShrink: 0,
            }}
          >
            R
          </div>
          <div>
            <div
              style={{
                fontSize: font.sizeLg,
                fontWeight: font.weightBold,
                color: '#ffffff',
                lineHeight: 1.2,
              }}
            >
              {t('appName')}
            </div>
            <div
              style={{
                fontSize: 10,
                color: colors.sidebarMuted,
                lineHeight: 1.3,
              }}
            >
              Relief Logistics
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav aria-label="Primary navigation" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { onNavigate(item.id); onToggleSidebar(); }}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: space.md,
                  padding: `10px ${space.md}px`,
                  borderRadius: radius.md,
                  border: 'none',
                  background: isActive ? colors.sidebarActiveBg : 'transparent',
                  color: isActive ? colors.sidebarActiveText : colors.sidebarText,
                  fontSize: font.sizeMd,
                  fontWeight: isActive ? font.weightSemibold : font.weightNormal,
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 0.15s, color 0.15s',
                  minHeight: 40,
                }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                <span>{t(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        {/* Language switcher at bottom */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: space.md,
            borderTop: `1px solid rgba(255,255,255,0.1)`,
            display: 'flex',
            gap: space.sm,
          }}
        >
          <button
            type="button"
            onClick={() => setLang('en')}
            style={{
              flex: 1,
              padding: '6px 0',
              borderRadius: radius.sm,
              border: 'none',
              background: lang === 'en' ? colors.teal : 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: font.sizeSm,
              fontWeight: font.weightMedium,
              minHeight: 32,
            }}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang('id')}
            style={{
              flex: 1,
              padding: '6px 0',
              borderRadius: radius.sm,
              border: 'none',
              background: lang === 'id' ? colors.teal : 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontSize: font.sizeSm,
              fontWeight: font.weightMedium,
              minHeight: 32,
            }}
          >
            ID
          </button>
        </div>
      </aside>

      {/* Main area: header + content */}
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

        {/* Header */}
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
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          {/* Hamburger */}
          <button
            type="button"
            className="resilio-hamburger"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              color: colors.textMuted,
              padding: '4px 6px',
              borderRadius: radius.sm,
              cursor: 'pointer',
              alignItems: 'center',
              minHeight: 40,
            }}
          >
            ☰
          </button>

          {/* Page title */}
          <span
            style={{
              fontSize: font.sizeLg,
              fontWeight: font.weightSemibold,
              color: colors.text,
              flex: 1,
            }}
          >
            {NAV_ITEMS.find((n) => n.id === page) ? t(NAV_ITEMS.find((n) => n.id === page)!.labelKey) : ''}
          </span>

          {/* Install button */}
          {installPrompt && (
            <button
              type="button"
              onClick={installPrompt}
              style={{
                padding: '6px 14px',
                background: colors.teal,
                color: '#fff',
                border: 'none',
                borderRadius: radius.md,
                fontSize: font.sizeSm,
                fontWeight: font.weightSemibold,
                minHeight: 36,
              }}
            >
              {t('installApp')}
            </button>
          )}

          {/* Node ID chip */}
          <div
            style={{
              padding: '4px 10px',
              background: colors.tealLight,
              color: colors.tealDark,
              borderRadius: radius.pill,
              fontSize: 11,
              fontWeight: font.weightSemibold,
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="Your Node ID"
          >
            <span>🔑</span>
            <span>{nodeId ?? '...'}</span>
          </div>
        </header>

        {/* Storage warning banner */}
        {!loading && storagePersistent === false && (
          <div
            role="alert"
            style={{
              padding: '10px 24px',
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

        {/* Scrollable content area */}
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
