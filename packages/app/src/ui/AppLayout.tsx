import { type ReactNode } from 'react';
import { useLang } from '../i18n/useLang';
import {
  IconClipboardList,
  IconCommand,
  IconDashboard,
  IconFileText,
  IconKey,
  IconMenu,
  IconPackage,
  IconRefresh,
  IconSettings,
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

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', labelKey: 'nav_dashboard', renderIcon: (c) => <IconDashboard size={18} color={c} /> },
  { id: 'field', labelKey: 'nav_field', renderIcon: (c) => <IconPackage size={18} color={c} /> },
  { id: 'command-center', labelKey: 'nav_commandCenter', renderIcon: (c) => <IconCommand size={18} color={c} /> },
  { id: 'inventory', labelKey: 'nav_inventory', renderIcon: (c) => <IconClipboardList size={18} color={c} /> },
  { id: 'sync', labelKey: 'nav_sync', renderIcon: (c) => <IconRefresh size={18} color={c} /> },
  { id: 'activity-log', labelKey: 'nav_activityLog', renderIcon: (c) => <IconFileText size={18} color={c} /> },
  { id: 'settings', labelKey: 'nav_settings', renderIcon: (c) => <IconSettings size={18} color={c} /> },
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
        body { margin: 0; font-family: ${font.family}; }
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
            background: 'rgba(15, 23, 42, 0.3)',
            backdropFilter: 'blur(2px)',
            zIndex: 99,
          }}
        />
      )}

      {/* Light Theme Sidebar */}
      <aside
        className="resilio-sidebar"
        style={{
          width: layout.sidebarWidth,
          minWidth: layout.sidebarWidth,
          background: colors.sidebar,
          backdropFilter: 'blur(12px)',
          borderRight: `1px solid ${colors.sidebarBorder}`,
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
            borderBottom: `1px solid ${colors.borderLight}`,
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
                color: colors.text,
                lineHeight: 1.2,
              }}
            >
              {t('appName')}
            </div>
            <div
              style={{
                fontSize: 10,
                color: colors.textMuted,
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
                  gap: 12,
                  padding: `10px ${space.md}px`,
                  borderRadius: radius.md,
                  border: 'none',
                  background: isActive ? colors.sidebarActiveBg : 'transparent',
                  color: isActive ? colors.sidebarActiveText : colors.sidebarText,
                  fontSize: font.sizeMd,
                  fontWeight: isActive ? font.weightSemibold : font.weightMedium,
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 0.15s, color 0.15s',
                  minHeight: 40,
                }}
              >
                {item.renderIcon(iconColor)}
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
            borderTop: `1px solid ${colors.borderLight}`,
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
              border: lang === 'en' ? 'none' : `1px solid ${colors.borderLight}`,
              background: lang === 'en' ? colors.sidebarActiveBg : '#f8fafc',
              color: lang === 'en' ? '#ffffff' : colors.sidebarText,
              fontSize: font.sizeSm,
              fontWeight: font.weightSemibold,
              minHeight: 34,
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
              border: lang === 'id' ? 'none' : `1px solid ${colors.borderLight}`,
              background: lang === 'id' ? colors.sidebarActiveBg : '#f8fafc',
              color: lang === 'id' ? '#ffffff' : colors.sidebarText,
              fontSize: font.sizeSm,
              fontWeight: font.weightSemibold,
              minHeight: 34,
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
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${colors.headerBorder}`,
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${layout.contentPadding}px`,
            gap: space.md,
            flexShrink: 0,
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
              color: colors.textMuted,
              padding: '4px 6px',
              borderRadius: radius.sm,
              cursor: 'pointer',
              alignItems: 'center',
              minHeight: 40,
            }}
          >
            <IconMenu size={22} color={colors.text} />
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
              padding: '5px 12px',
              background: colors.tealLight,
              color: colors.tealDark,
              borderRadius: radius.pill,
              fontSize: 12,
              fontWeight: font.weightSemibold,
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Your Node ID"
          >
            <IconKey size={14} color={colors.tealDark} />
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
