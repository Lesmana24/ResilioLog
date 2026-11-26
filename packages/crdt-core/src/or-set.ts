import { compareLamport, parseTag } from './lamport';
import type { ORSet, Tag } from './types';

function compareLex(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function canonicalRemoved(tags: Iterable<Tag>): readonly Tag[] {
  return Array.from(new Set(tags)).sort(compareLex);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA).filter((k) => objA[k] !== undefined);
  const keysB = Object.keys(objB).filter((k) => objB[k] !== undefined);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (!deepEqual(objA[key], objB[key])) return false;
  }
  return true;
}

/** Returns an empty OR-Set. */
export function orsEmpty<T>(): ORSet<T> {
  return { adds: {}, removed: [] };
}

/** Adds an element under a fresh tag. Throws if the tag already exists in `adds`. */
export function orsAdd<T>(s: ORSet<T>, tag: Tag, el: T): ORSet<T> {
  parseTag(tag);
  if (Object.prototype.hasOwnProperty.call(s.adds, tag)) {
    throw new Error(`OR-Set tag must be fresh, duplicate tag: "${tag}"`);
  }
  return {
    adds: { ...s.adds, [tag]: el },
    removed: canonicalRemoved(s.removed),
  };
}

/** Marks observed tags as removed. */
export function orsRemove<T>(s: ORSet<T>, tags: readonly Tag[]): ORSet<T> {
  return {
    adds: { ...s.adds },
    removed: canonicalRemoved([...s.removed, ...tags]),
  };
}

/** Returns active elements sorted by Lamport order of their tag. */
export function orsElements<T>(s: ORSet<T>): ReadonlyArray<{ tag: Tag; el: T }> {
  const removedSet = new Set(s.removed);
  const active: Array<{ tag: Tag; el: T }> = [];
  for (const tag of Object.keys(s.adds)) {
    if (!removedSet.has(tag)) {
      const el = s.adds[tag];
      if (el !== undefined) {
        active.push({ tag, el });
      }
    }
  }
  active.sort((a, b) => compareLamport(parseTag(a.tag), parseTag(b.tag)));
  return active;
}

/** Joins two OR-Sets (union of adds and removed). Throws if the same tag maps to different elements. */
export function orsMerge<T>(a: ORSet<T>, b: ORSet<T>): ORSet<T> {
  const mergedAdds: Record<Tag, T> = { ...a.adds };
  for (const tag of Object.keys(b.adds)) {
    const bEl = b.adds[tag] as T;
    if (Object.prototype.hasOwnProperty.call(mergedAdds, tag)) {
      const aEl = mergedAdds[tag] as T;
      if (!deepEqual(aEl, bEl)) {
        throw new Error(`OR-Set tag conflict for "${tag}": same tag maps to different elements`);
      }
    } else {
      mergedAdds[tag] = bEl;
    }
  }
  return {
    adds: mergedAdds,
    removed: canonicalRemoved([...a.removed, ...b.removed]),
  };
}
