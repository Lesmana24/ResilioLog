import type { Replica, ResilioState } from '@resiliolog/crdt-core';
import { notImplemented } from './errors';

/** Item-granular delta: items with touchedAt.c > since, log/queue entries with tag counter > since. */
export function makeDelta(_replica: Replica, _since: number): ResilioState {
  return notImplemented('B-11');
}
export function applyDelta(_replica: Replica, _delta: ResilioState, _remoteClock: number): Replica {
  return notImplemented('B-11');
}
