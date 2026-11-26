import type { Replica, ResilioState } from './types';
import { notImplemented } from './errors';

export function emptyState(): ResilioState {
  return notImplemented('B-06');
}
export function mergeStates(_a: ResilioState, _b: ResilioState): ResilioState {
  return notImplemented('B-06');
}
/** clock = receive(local.clock, remoteClock) */
export function mergeIntoReplica(_r: Replica, _remote: ResilioState, _remoteClock: number): Replica {
  return notImplemented('B-06');
}
