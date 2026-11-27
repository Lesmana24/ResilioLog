import { Component, type ErrorInfo, type ReactNode } from 'react';
import { translations, type Lang } from '../i18n/translations';
import { btn, card, colors, font, space } from './styles';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly message: string;
}

function readLangSafe(): Lang {
  try {
    const v = localStorage.getItem('resiliolog_lang');
    if (v === 'en' || v === 'id') return v;
  } catch {
    // ignore
  }
  return 'en';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || translations[readLangSafe()].errBoundary_default!,
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ResilioLog UI error:', error, info);
  }

  override render() {
    if (this.state.hasError) {
      const lang = readLangSafe();
      const dict = translations[lang];
      return (
        <div
          role="alert"
          style={{
            ...card,
            margin: space.lg,
            border: `2px solid ${colors.danger}`,
            backgroundColor: colors.dangerBg,
            fontFamily: font.family,
          }}
        >
          <h2 style={{ marginTop: 0, color: colors.dangerText }}>{dict.errBoundary_title}</h2>
          <p style={{ fontSize: font.sizeMd, color: colors.dangerText }}>{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={btn.primary}
          >
            {dict.errBoundary_reload}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
