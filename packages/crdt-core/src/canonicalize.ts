import type { ResilioState } from './types';
import { notImplemented } from './errors';

/** Sorted keys, de-duplicated + sorted `removed`. Used for equality in tests and for crc32 input upstream. */
export function canonicalize(_state: ResilioState): ResilioState {
  return notImplemented('B-03');
}
