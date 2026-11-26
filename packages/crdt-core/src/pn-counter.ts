import type { NatMap, NodeId, PNCounter } from './types';

function assertPositiveQty(k: number): void {
  if (!Number.isSafeInteger(k) || k < 1) {
    throw new RangeError(`Quantity k must be a positive safe integer (>= 1), got ${k}`);
  }
}

function sumNatMap(m: NatMap): number {
  let total = 0;
  for (const v of Object.values(m)) {
    total += v;
  }
  return total;
}

function mergeNatMaps(a: NatMap, b: NatMap): NatMap {
  const out: Record<NodeId, number> = {};
  for (const key of Object.keys(a)) {
    out[key] = a[key] ?? 0;
  }
  for (const key of Object.keys(b)) {
    const bv = b[key] ?? 0;
    const av = out[key] ?? 0;
    out[key] = bv > av ? bv : av;
  }
  return out;
}

/** Returns an empty PN-Counter. */
export function pnEmpty(): PNCounter {
  return { p: {}, n: {} };
}

/** Increments the positive side for `node` by `k` (k >= 1). */
export function pnInc(s: PNCounter, node: NodeId, k: number): PNCounter {
  assertPositiveQty(k);
  return {
    p: { ...s.p, [node]: (s.p[node] ?? 0) + k },
    n: { ...s.n },
  };
}

/** Increments the negative side for `node` by `k` (k >= 1). */
export function pnDec(s: PNCounter, node: NodeId, k: number): PNCounter {
  assertPositiveQty(k);
  return {
    p: { ...s.p },
    n: { ...s.n, [node]: (s.n[node] ?? 0) + k },
  };
}

/** Computes net value: sum(p) - sum(n). */
export function pnValue(s: PNCounter): number {
  return sumNatMap(s.p) - sumNatMap(s.n);
}

/** Joins two PN-Counters by pointwise maximum on both sides. */
export function pnMerge(a: PNCounter, b: PNCounter): PNCounter {
  return {
    p: mergeNatMaps(a.p, b.p),
    n: mergeNatMaps(a.n, b.n),
  };
}
