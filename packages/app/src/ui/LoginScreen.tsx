import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Database,
  Download,
  Lock,
  MapPin,
  Monitor,
  ShieldCheck,
  Smartphone,
  Truck,
  UserCheck,
  Users,
} from 'lucide-react';
import type { AppLanguage } from '../engine/errorMessages';
import { COPY } from '../i18n/translations';
import { usePwaInstall } from '../state/usePwaInstall';

export type EntityRole = 'volunteer' | 'courier' | 'command';

interface LoginScreenProps {
  lang: AppLanguage;
  onChangeLang: (lang: AppLanguage) => void;
  persistenceGranted: boolean | null;
  onRequestPersistence: () => Promise<boolean>;
  onLogin: (mode: 'mobile' | 'command', role: EntityRole, officerId: string) => void;
}

export function LoginScreen({
  lang,
  onChangeLang,
  persistenceGranted,
  onRequestPersistence,
  onLogin,
}: LoginScreenProps) {
  const t = COPY[lang];
  const [officerId, setOfficerId] = useState('POSKO-A04');
  const [pin, setPin] = useState('');
  const [showInstallHint, setShowInstallHint] = useState(false);
  const { canInstall, isInstalled, isIos, promptInstall } = usePwaInstall();

  async function handleInstallClick() {
    if (canInstall) {
      const outcome = await promptInstall();
      if (outcome === 'unavailable') {
        setShowInstallHint(true);
      }
      return;
    }
    setShowInstallHint((v) => !v);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const id = officerId.trim() || 'POSKO-A04';
    const upper = id.toUpperCase();
    if (upper.startsWith('KURIR') || upper.startsWith('COURIER')) {
      onLogin('mobile', 'courier', id);
      return;
    }
    if (upper.startsWith('CMD')) {
      onLogin('command', 'command', id);
      return;
    }
    onLogin('mobile', 'volunteer', id);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#F8FAFC] px-4 py-8 text-[#0F172A]">
      <div className="w-full max-w-md">
        {/* Top Brand + Language Toggle */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="ResilioLog"
              className="h-11 w-11 shrink-0 rounded-xl shadow-sm"
            />
            <div>
              <h1 className="font-display text-xl font-extrabold tracking-tight text-[#0F172A]">
                ResilioLog
              </h1>
              <p className="text-xs font-medium text-slate-500">{t.loginSubtitle}</p>
            </div>
          </div>

          <div
            className="inline-flex select-none items-center gap-1 rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-medium shadow-xs"
            role="group"
            aria-label="Language toggle"
          >
            <button
              type="button"
              onClick={() => onChangeLang('id')}
              className={`cursor-pointer transition-colors ${
                lang === 'id' ? 'font-bold text-[#0F172A]' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              ID
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`cursor-pointer transition-colors ${
                lang === 'en' ? 'font-bold text-[#0F172A]' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Main Login Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="font-display text-lg font-extrabold tracking-tight text-[#0F172A]">
              {t.loginCardTitle}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{t.loginCardSub}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="officer-id"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                {t.officerIdLabel}
              </label>
              <div className="relative">
                <UserCheck className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="officer-id"
                  type="text"
                  value={officerId}
                  onChange={(e) => setOfficerId(e.target.value)}
                  placeholder={t.officerIdPlaceholder}
                  autoComplete="username"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-10 pr-3.5 text-sm font-semibold text-[#0F172A] outline-none transition-colors focus:border-[#0F172A] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="access-pin"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                {t.pinLabel}
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="access-pin"
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={t.pinPlaceholder}
                  autoComplete="current-password"
                  className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-10 pr-3.5 text-sm font-semibold text-[#0F172A] outline-none transition-colors focus:border-[#0F172A] focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.99]"
            >
              <span>{t.signInBtn}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Prototype Quick Access directly below Login button */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t.prototypeDivider}
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => onLogin('mobile', 'volunteer', 'POSKO-A04')}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-left transition-all hover:border-[#059669]/40 hover:bg-emerald-50/50 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#059669]">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">{t.quickEnterVolunteerA}</div>
                  <div className="text-[11px] text-slate-500">{t.quickEnterVolunteerASub}</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onLogin('mobile', 'volunteer', 'POSKO-B07')}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-left transition-all hover:border-sky-400/50 hover:bg-sky-50/60 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">{t.quickEnterVolunteerB}</div>
                  <div className="text-[11px] text-slate-500">{t.quickEnterVolunteerBSub}</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onLogin('mobile', 'volunteer', 'POSKO-C02')}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-left transition-all hover:border-rose-400/50 hover:bg-rose-50/60 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">{t.quickEnterVolunteerC}</div>
                  <div className="text-[11px] text-slate-500">{t.quickEnterVolunteerCSub}</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onLogin('mobile', 'courier', 'KURIR-04')}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-left transition-all hover:border-amber-400/60 hover:bg-amber-50/60 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-[#B45309]">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">{t.quickEnterCourier}</div>
                  <div className="text-[11px] text-slate-500">{t.quickEnterCourierSub}</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => onLogin('command', 'command', 'CMD-ALFA7')}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-left transition-all hover:border-[#0F172A]/40 hover:bg-slate-100 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-[#0F172A]">
                  <Monitor className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">{t.quickEnterCommand}</div>
                  <div className="text-[11px] text-slate-500">{t.quickEnterCommandSub}</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Subtle Offline Storage & PWA Install Footer */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {persistenceGranted === true ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-[#059669]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{t.storagePersistent}</span>
              </div>
            ) : persistenceGranted === false ? (
              <button
                type="button"
                onClick={onRequestPersistence}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-[#B45309] transition-colors hover:bg-amber-100"
              >
                <Database className="h-3.5 w-3.5" />
                <span>{t.enablePersistentStorage}</span>
              </button>
            ) : null}

            {isInstalled ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-[#0F172A]">
                <Smartphone className="h-3.5 w-3.5 text-[#059669]" />
                <span>{t.appInstalledBadge}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-[#0F172A] shadow-2xs transition-colors hover:bg-slate-100"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t.installAppBtn}</span>
              </button>
            )}
          </div>

          {showInstallHint && !isInstalled && (
            <p className="max-w-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-[11px] text-slate-600 shadow-2xs">
              {isIos ? t.installIosHint : t.installManualHint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
