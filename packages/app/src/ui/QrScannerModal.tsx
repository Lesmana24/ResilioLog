import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { Camera, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import type { Result } from '@resiliolog/crdt-core';
import type { ChunkProgress } from '@resiliolog/sync';
import type { AnyEngineErrorCode, AppLanguage } from '../engine/errorMessages';

interface QrScannerModalProps {
  open: boolean;
  lang: AppLanguage;
  qrProgress: ChunkProgress | null;
  onScanFrame: (frameText: string) => Promise<Result<ChunkProgress, AnyEngineErrorCode>>;
  onClose: () => void;
}

export function QrScannerModal({
  open,
  lang,
  qrProgress,
  onScanFrame,
  onClose,
}: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastScannedRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const busyRef = useRef(false);
  const onScanFrameRef = useRef(onScanFrame);
  onScanFrameRef.current = onScanFrame;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !videoRef.current) return;
    let active = true;
    setCameraError(null);
    setStatusNote(null);

    const scanner = new QrScanner(
      videoRef.current,
      async (result) => {
        if (!active || busyRef.current) return;
        const text = result.data.trim();
        if (!text) return;

        const now = Date.now();
        if (
          lastScannedRef.current.text === text &&
          now - lastScannedRef.current.at < 400
        ) {
          return;
        }
        lastScannedRef.current = { text, at: now };

        busyRef.current = true;
        try {
          const res = await onScanFrameRef.current(text);
          if (!active) return;
          if (res.ok) {
            setStatusNote(
              lang === 'en'
                ? `Scanned frame ${res.value.received} of ${res.value.total}`
                : `Frame ${res.value.received} dari ${res.value.total} terpindai`,
            );
            if (res.value.complete) {
              window.setTimeout(() => {
                if (active) onCloseRef.current();
              }, 450);
            }
          }
        } finally {
          busyRef.current = false;
        }
      },
      {
        preferredCamera: 'environment',
        highlightScanRegion: true,
        highlightCodeOutline: true,
        maxScansPerSecond: 6,
        returnDetailedScanResult: true,
      },
    );

    scanner.start().catch((err: unknown) => {
      if (!active) return;
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(
        lang === 'en'
          ? `Camera unavailable (${msg}). Ensure HTTPS and camera permission are granted.`
          : `Kamera tidak tersedia (${msg}). Pastikan akses lewat HTTPS dan izin kamera aktif.`,
      );
    });

    return () => {
      active = false;
      scanner.stop();
      scanner.destroy();
    };
  }, [open, lang]);

  if (!open) return null;

  const pct =
    qrProgress && qrProgress.total > 0
      ? Math.round((qrProgress.received / qrProgress.total) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-[#0F172A]" />
            <h3 className="font-display text-base font-bold text-[#0F172A]">
              {lang === 'en' ? 'Scan Peer QR (Offline)' : 'Pindai QR Peer (Offline)'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {cameraError ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
            <span>{cameraError}</span>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-slate-900">
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-square w-full object-cover"
            />
          </div>
        )}

        {qrProgress && (
          <div className="space-y-1.5 rounded-xl bg-slate-100 p-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-[#059669]">
                <CheckCircle2 className="h-4 w-4" />
                {lang === 'en' ? 'Collecting RL1 Frames' : 'Mengumpulkan Frame RL1'}
              </span>
              <span className="font-mono text-[#0F172A]">
                {qrProgress.received} / {qrProgress.total}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-[#059669] transition-all duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {statusNote && !qrProgress?.complete && (
          <p className="text-center text-xs font-medium text-slate-600">{statusNote}</p>
        )}

        <p className="text-center text-[11px] text-slate-500">
          {lang === 'en'
            ? 'Point this camera at the other phone’s QR screen. Frames merge automatically in any order.'
            : 'Arahkan kamera ke layar QR HP lain. Frame otomatis digabung walau urutan acak.'}
        </p>
      </div>
    </div>
  );
}
