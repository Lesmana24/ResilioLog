import type { ErrorCode } from '@resiliolog/crdt-core';
import type { SyncErrorCode } from '@resiliolog/sync';
import type { Lang } from '../i18n/translations';

const ENGINE_ERROR_MESSAGES: Record<Lang, Record<ErrorCode, string>> = {
  en: {
    INVALID_QTY: 'Enter a whole number of at least 1.',
    INSUFFICIENT_RIGHTS:
      'Not enough local quota for this item. Request a top-up or use emergency override.',
    UNKNOWN_ITEM: 'This item is not known on this device yet. Sync first.',
    SELF_TRANSFER: 'Choose a different device.',
    REASON_REQUIRED: 'A reason is required for emergency override.',
    SCHEMA_MISMATCH: 'This data comes from an incompatible app version.',
  },
  id: {
    INVALID_QTY: 'Masukkan bilangan bulat minimal 1.',
    INSUFFICIENT_RIGHTS:
      'Kuota lokal tidak cukup untuk item ini. Minta top-up atau gunakan override darurat.',
    UNKNOWN_ITEM: 'Item ini belum dikenal di perangkat ini. Sinkronkan terlebih dahulu.',
    SELF_TRANSFER: 'Pilih perangkat yang berbeda.',
    REASON_REQUIRED: 'Alasan wajib diisi untuk override darurat.',
    SCHEMA_MISMATCH: 'Data ini berasal dari versi aplikasi yang tidak kompatibel.',
  },
};

const SYNC_ERROR_MESSAGES: Record<Lang, Record<SyncErrorCode | 'NOT_READY', string>> = {
  en: {
    BAD_ENCODING: 'The scanned data is damaged. Try again.',
    BAD_COMPRESSION: 'The scanned data is damaged. Try again.',
    BAD_JSON: 'The scanned data is damaged. Try again.',
    SCHEMA_INVALID: 'The scanned data is damaged. Try again.',
    CRC_MISMATCH: 'The scanned data is damaged. Try again.',
    SCHEMA_VERSION_MISMATCH: 'Update the app on both devices.',
    INCOMPLETE_CHUNKS: 'Some QR frames are missing. Keep scanning.',
    NOT_READY: 'Local replica is still loading. Try again.',
  },
  id: {
    BAD_ENCODING: 'Data yang dipindai rusak. Coba lagi.',
    BAD_COMPRESSION: 'Data yang dipindai rusak. Coba lagi.',
    BAD_JSON: 'Data yang dipindai rusak. Coba lagi.',
    SCHEMA_INVALID: 'Data yang dipindai rusak. Coba lagi.',
    CRC_MISMATCH: 'Data yang dipindai rusak. Coba lagi.',
    SCHEMA_VERSION_MISMATCH: 'Perbarui aplikasi di kedua perangkat.',
    INCOMPLETE_CHUNKS: 'Beberapa frame QR hilang. Lanjutkan pemindaian.',
    NOT_READY: 'Replika lokal masih dimuat. Coba lagi.',
  },
};

export function getEngineErrorMessage(code: ErrorCode, lang: Lang = 'en'): string {
  return ENGINE_ERROR_MESSAGES[lang][code];
}

export function getSyncErrorMessage(code: SyncErrorCode | 'NOT_READY', lang: Lang = 'en'): string {
  return SYNC_ERROR_MESSAGES[lang][code];
}

export function parsePositiveIntQty(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^[0-9]+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return null;
  return parsed;
}
