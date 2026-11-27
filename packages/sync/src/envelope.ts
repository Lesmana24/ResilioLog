import type { Replica } from '@resiliolog/crdt-core';
import { deflateSync, inflateSync } from 'fflate';
import { canonicalJson } from './canonical-json';
import { crc32Hex } from './crc32';
import { makeDelta } from './delta';
import { SyncError } from './errors';
import { SignalEnvelopeSchema, SyncEnvelopeSchema } from './schemas';

export interface SignalEnvelopeLike {
  readonly v: 1;
  readonly type: 'signal';
  readonly msgId: string;
  readonly from: string;
  readonly kind: 'offer' | 'answer';
  readonly sdp: string;
}

export interface SyncEnvelopeLike {
  readonly v: 1;
  readonly type: 'delta' | 'full';
  readonly msgId: string;
  readonly from: string;
  readonly to?: string;
  readonly since: number;
  readonly until: number;
  readonly crc32: string;
  readonly payload: unknown;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  if (str.length === 0 || str.length % 4 === 1 || !BASE64URL_RE.test(str)) {
    throw new SyncError('BAD_ENCODING', 'Invalid base64url string');
  }
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  } catch {
    throw new SyncError('BAD_ENCODING', 'Failed to decode base64url string');
  }
}

export function buildEnvelope(
  replica: Replica,
  since: number,
  type: 'delta' | 'full',
  to?: string,
): SyncEnvelopeLike {
  const payload = type === 'full' ? replica.state : makeDelta(replica, since);
  const crc32 = crc32Hex(textEncoder.encode(canonicalJson(payload)));
  const msgId = crc32.slice(0, 6);

  return {
    v: 1,
    type,
    msgId,
    from: replica.nodeId,
    ...(to !== undefined ? { to } : {}),
    since,
    until: replica.clock,
    crc32,
    payload,
  };
}

/** JSON -> deflate (level 9) -> base64url */
export function encodeEnvelope(env: SyncEnvelopeLike): string {
  const json = JSON.stringify(env);
  const compressed = deflateSync(textEncoder.encode(json), { level: 9 });
  return toBase64Url(compressed);
}

/** base64url -> inflate -> JSON -> Zod validate -> crc32 verify. Throws SyncError. */
export function decodeEnvelope(blob: string): SyncEnvelopeLike {
  const compressed = fromBase64Url(blob);

  let inflated: Uint8Array;
  try {
    inflated = inflateSync(compressed);
  } catch {
    throw new SyncError('BAD_COMPRESSION', 'Failed to inflate envelope');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textDecoder.decode(inflated));
  } catch {
    throw new SyncError('BAD_JSON', 'Invalid JSON or UTF-8 in envelope');
  }

  if (parsed !== null && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if ('v' in obj && obj.v !== 1) {
      throw new SyncError('SCHEMA_VERSION_MISMATCH', `Unsupported envelope version: ${String(obj.v)}`);
    }
    if (
      'payload' in obj &&
      obj.payload !== null &&
      typeof obj.payload === 'object' &&
      'schemaVersion' in (obj.payload as Record<string, unknown>) &&
      (obj.payload as Record<string, unknown>).schemaVersion !== 1
    ) {
      throw new SyncError(
        'SCHEMA_VERSION_MISMATCH',
        `Unsupported payload schemaVersion: ${String((obj.payload as Record<string, unknown>).schemaVersion)}`,
      );
    }
  }

  const result = SyncEnvelopeSchema.safeParse(parsed);
  if (!result.success) {
    throw new SyncError('SCHEMA_INVALID', result.error.message);
  }

  const expectedCrc = crc32Hex(textEncoder.encode(canonicalJson(result.data.payload)));
  if (expectedCrc !== result.data.crc32) {
    throw new SyncError(
      'CRC_MISMATCH',
      `CRC mismatch: expected ${expectedCrc}, got ${result.data.crc32}`,
    );
  }

  const { to, ...rest } = result.data;
  return to !== undefined ? { ...rest, to } : rest;
}

export function encodeSignalEnvelope(env: SignalEnvelopeLike): string {
  const json = JSON.stringify(env);
  const compressed = deflateSync(textEncoder.encode(json), { level: 9 });
  return toBase64Url(compressed);
}

export function decodeSignalEnvelope(blob: string): SignalEnvelopeLike {
  const compressed = fromBase64Url(blob);

  let inflated: Uint8Array;
  try {
    inflated = inflateSync(compressed);
  } catch {
    throw new SyncError('BAD_COMPRESSION', 'Failed to inflate signal envelope');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textDecoder.decode(inflated));
  } catch {
    throw new SyncError('BAD_JSON', 'Invalid JSON in signal envelope');
  }

  if (parsed !== null && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if ('v' in obj && obj.v !== 1) {
      throw new SyncError('SCHEMA_VERSION_MISMATCH', `Unsupported signal version: ${String(obj.v)}`);
    }
  }

  const result = SignalEnvelopeSchema.safeParse(parsed);
  if (!result.success) {
    throw new SyncError('SCHEMA_INVALID', result.error.message);
  }
  return result.data;
}
