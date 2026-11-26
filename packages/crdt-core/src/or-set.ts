import type { ORSet, Tag } from './types';
import { notImplemented } from './errors';

export function orsEmpty<T>(): ORSet<T> {
  return notImplemented('B-05');
}
export function orsAdd<T>(_s: ORSet<T>, _tag: Tag, _el: T): ORSet<T> {
  return notImplemented('B-05');
}
export function orsRemove<T>(_s: ORSet<T>, _tags: readonly Tag[]): ORSet<T> {
  return notImplemented('B-05');
}
/** Sorted by Lamport order of the tag. */
export function orsElements<T>(_s: ORSet<T>): ReadonlyArray<{ tag: Tag; el: T }> {
  return notImplemented('B-05');
}
/** Throws if the same tag maps to different elements (programmer error). */
export function orsMerge<T>(_a: ORSet<T>, _b: ORSet<T>): ORSet<T> {
  return notImplemented('B-05');
}
