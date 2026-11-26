import type { Lamport, NodeId, Tag } from './types';
import { notImplemented } from './errors';

/** Total order: by c, then n (lexicographic). */
export function compareLamport(_a: Lamport, _b: Lamport): number {
  return notImplemented('B-03');
}
export function tagOf(_l: Lamport): Tag {
  return notImplemented('B-03');
}
export function parseTag(_t: Tag): Lamport {
  return notImplemented('B-03');
}
export function tick(_clock: number): number {
  return notImplemented('B-03');
}
/** max(local, remote) + 1 */
export function receive(_local: number, _remote: number): number {
  return notImplemented('B-03');
}
export function maxLamport(_a: Lamport, _b: Lamport): Lamport {
  return notImplemented('B-03');
}
export function makeLamport(_c: number, _n: NodeId): Lamport {
  return notImplemented('B-03');
}
