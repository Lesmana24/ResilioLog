import type { ORSet, ResilioState, Tag } from './types';

function compareLex(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function sortRecordKeys<T extends object>(obj: T): T {
  const record = obj as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort(compareLex)) {
    const val = record[key];
    if (val !== undefined) {
      sorted[key] = canonicalizeValue(val);
    }
  }
  return sorted as T;
}

function canonicalizeValue(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map(canonicalizeValue);
  }
  if (val !== null && typeof val === 'object') {
    return sortRecordKeys(val as Record<string, unknown>);
  }
  return val;
}

function canonicalizeORSet<T>(set: ORSet<T>): ORSet<T> {
  const sortedAdds: Record<Tag, T> = {};
  for (const tag of Object.keys(set.adds).sort(compareLex)) {
    const entry = set.adds[tag];
    if (entry !== undefined) {
      sortedAdds[tag] = canonicalizeValue(entry) as T;
    }
  }
  const uniqueSortedRemoved = Array.from(new Set(set.removed)).sort(compareLex);
  return {
    adds: sortedAdds,
    removed: uniqueSortedRemoved,
  };
}

/** Sorted keys, de-duplicated + sorted `removed`. Used for equality in tests and for crc32 input upstream. */
export function canonicalize(state: ResilioState): ResilioState {
  const sortedItems: Record<string, ResilioState['items'][string]> = {};
  for (const itemId of Object.keys(state.items).sort(compareLex)) {
    const item = state.items[itemId];
    if (item !== undefined) {
      sortedItems[itemId] = sortRecordKeys(item);
    }
  }

  return sortRecordKeys({
    schemaVersion: state.schemaVersion,
    items: sortedItems,
    distributionLog: canonicalizeORSet(state.distributionLog),
    topUpQueue: canonicalizeORSet(state.topUpQueue),
  });
}
