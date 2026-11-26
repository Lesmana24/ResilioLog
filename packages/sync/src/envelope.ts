import type { Replica } from '@resiliolog/crdt-core';
import { notImplemented } from './errors';

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

export function buildEnvelope(_replica: Replica, _since: number, _type: 'delta' | 'full', _to?: string): SyncEnvelopeLike {
  return notImplemented('B-11');
}
/** JSON -> deflate (level 9) -> base64url */
export function encodeEnvelope(_env: SyncEnvelopeLike): string {
  return notImplemented('B-11');
}
/** base64url -> inflate -> JSON -> Zod validate -> crc32 verify. Throws SyncError. */
export function decodeEnvelope(_blob: string): SyncEnvelopeLike {
  return notImplemented('B-11');
}
