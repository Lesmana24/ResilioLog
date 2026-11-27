import type { ErrorCode } from '@resiliolog/crdt-core';
import type { SyncErrorCode } from '@resiliolog/sync';

export type AppLanguage = 'en' | 'id';
export type AnyEngineErrorCode = ErrorCode | SyncErrorCode;

const ERROR_MESSAGES: Record<AppLanguage, Record<AnyEngineErrorCode, string>> = {
  en: {
    INVALID_QTY: 'Enter a whole number of at least 1.',
    INSUFFICIENT_RIGHTS:
      'Not enough local quota for this item. Request a top-up or use emergency override.',
    UNKNOWN_ITEM: 'This item is not known on this device yet. Sync first.',
    SELF_TRANSFER: 'Choose a different device.',
    REASON_REQUIRED: 'A reason is required for emergency override.',
    SCHEMA_MISMATCH: 'This data comes from an incompatible app version.',
    BAD_ENCODING: 'The scanned data is damaged. Try again.',
    BAD_COMPRESSION: 'The scanned data is damaged. Try again.',
    BAD_JSON: 'The scanned data is damaged. Try again.',
    SCHEMA_INVALID: 'The scanned data is damaged. Try again.',
    CRC_MISMATCH: 'The scanned data is damaged. Try again.',
    SCHEMA_VERSION_MISMATCH: 'Update the app on both devices.',
    INCOMPLETE_CHUNKS: 'Some QR frames are missing. Keep scanning.',
  },
  id: {
    INVALID_QTY: 'Masukkan bilangan bulat minimal 1.',
    INSUFFICIENT_RIGHTS:
      'Kuota lokal untuk komoditas ini tidak mencukupi. Ajukan top-up atau gunakan bypass darurat.',
    UNKNOWN_ITEM: 'Komoditas ini belum terdaftar di perangkat ini. Lakukan sinkronisasi terlebih dahulu.',
    SELF_TRANSFER: 'Pilih perangkat tujuan yang berbeda.',
    REASON_REQUIRED: 'Alasan wajib diisi untuk bypass kuota darurat.',
    SCHEMA_MISMATCH: 'Data berasal dari versi aplikasi yang tidak kompatibel.',
    BAD_ENCODING: 'Data hasil pindai rusak. Coba lagi.',
    BAD_COMPRESSION: 'Data hasil pindai rusak. Coba lagi.',
    BAD_JSON: 'Data hasil pindai rusak. Coba lagi.',
    SCHEMA_INVALID: 'Data hasil pindai rusak. Coba lagi.',
    CRC_MISMATCH: 'Data hasil pindai rusak. Coba lagi.',
    SCHEMA_VERSION_MISMATCH: 'Perbarui aplikasi di kedua perangkat.',
    INCOMPLETE_CHUNKS: 'Sebagian frame QR belum lengkap. Lanjutkan pemindaian.',
  },
};

export function getErrorMessage(code: AnyEngineErrorCode, lang: AppLanguage): string {
  return ERROR_MESSAGES[lang][code];
}
