import type { ErrorCode } from '@resiliolog/crdt-core';
import type { SyncErrorCode } from '@resiliolog/sync';

const ENGINE_ERROR_MESSAGES: Record<ErrorCode, string> = {
  INVALID_QTY: 'Enter a whole number of at least 1.',
  INSUFFICIENT_RIGHTS:
    'Not enough local quota for this item. Request a top-up or use emergency override.',
  UNKNOWN_ITEM: 'This item is not known on this device yet. Sync first.',
  SELF_TRANSFER: 'Choose a different device.',
  REASON_REQUIRED: 'A reason is required for emergency override.',
  SCHEMA_MISMATCH: 'This data comes from an incompatible app version.',
};

const SYNC_ERROR_MESSAGES: Record<SyncErrorCode | 'NOT_READY', string> = {
  BAD_ENCODING: 'The scanned data is damaged. Try again.',
  BAD_COMPRESSION: 'The scanned data is damaged. Try again.',
  BAD_JSON: 'The scanned data is damaged. Try again.',
  SCHEMA_INVALID: 'The scanned data is damaged. Try again.',
  CRC_MISMATCH: 'The scanned data is damaged. Try again.',
  SCHEMA_VERSION_MISMATCH: 'Update the app on both devices.',
  INCOMPLETE_CHUNKS: 'Some QR frames are missing. Keep scanning.',
  NOT_READY: 'Local replica is still loading. Try again.',
};

export function getEngineErrorMessage(code: ErrorCode): string {
  return ENGINE_ERROR_MESSAGES[code];
}

export function getSyncErrorMessage(code: SyncErrorCode | 'NOT_READY'): string {
  return SYNC_ERROR_MESSAGES[code];
}

export function parsePositiveIntQty(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^[0-9]+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return null;
  return parsed;
}
