import { err, ok } from './errors';
import type { BoundedCounter, NatMap, NodeId, Result } from './types';

/*
 * Why stale views remain safe (Balegas et al., 2015):
 * Every entry in R, U, and O is grow-only and merged by pointwise max.
 * Only node `i` writes its own consumption `U[i]` and outgoing transfers `R[i][k]` (k != i),
 * so node `i` always has exact, up-to-date knowledge of everything it has spent or given away.
 * A stale view can only under-estimate incoming grants `R[k][i]` (k != i) from other nodes
 * that have not yet arrived via sync. Thus `bcLocalRights(s, i)` on a stale view is never
 * greater than `i`'s true rights, ensuring `localRights(i) >= 0` and `value >= 0` (when O = 0)
 * across all merged states without central coordination.
 */

function isPositiveInt(n: number): boolean {
  return Number.isSafeInteger(n) && n >= 1;
}

function sumNatMap(m: NatMap): number {
  let total = 0;
  for (const v of Object.values(m)) {
    total += v;
  }
  return total;
}

function mergeNatMap(a: NatMap, b: NatMap): NatMap {
  const out: Record<NodeId, number> = {};
  for (const k of Object.keys(a)) {
    out[k] = a[k] ?? 0;
  }
  for (const k of Object.keys(b)) {
    const bv = b[k] ?? 0;
    const av = out[k] ?? 0;
    out[k] = bv > av ? bv : av;
  }
  return out;
}

function cloneR(r: Readonly<Record<NodeId, NatMap>>): Record<NodeId, NatMap> {
  const out: Record<NodeId, NatMap> = {};
  for (const k of Object.keys(r)) {
    const row = r[k];
    if (row !== undefined) {
      out[k] = { ...row };
    }
  }
  return out;
}

export function bcEmpty(): BoundedCounter {
  return { R: {}, U: {}, O: {} };
}

export function bcIncrement(s: BoundedCounter, i: NodeId, k: number): BoundedCounter {
  if (!isPositiveInt(k)) {
    throw new RangeError(`Increment k must be a positive safe integer (>= 1), got ${k}`);
  }
  const R = cloneR(s.R);
  const row = R[i] ?? {};
  R[i] = { ...row, [i]: (row[i] ?? 0) + k };
  return {
    R,
    U: { ...s.U },
    O: { ...s.O },
  };
}

export function bcGranted(s: BoundedCounter, i: NodeId): number {
  let total = 0;
  for (const k of Object.keys(s.R)) {
    total += s.R[k]?.[i] ?? 0;
  }
  return total;
}

export function bcLocalRights(s: BoundedCounter, i: NodeId): number {
  const row = s.R[i] ?? {};
  let transferredOut = 0;
  for (const k of Object.keys(row)) {
    if (k !== i) {
      transferredOut += row[k] ?? 0;
    }
  }
  return bcGranted(s, i) - transferredOut - (s.U[i] ?? 0);
}

export function bcRemainingRatio(s: BoundedCounter, i: NodeId): number {
  const granted = bcGranted(s, i);
  if (granted === 0) return 0;
  return bcLocalRights(s, i) / granted;
}

export function bcConsume(
  s: BoundedCounter,
  i: NodeId,
  n: number,
): Result<BoundedCounter, 'INVALID_QTY' | 'INSUFFICIENT_RIGHTS'> {
  if (!isPositiveInt(n)) {
    return err('INVALID_QTY');
  }
  if (bcLocalRights(s, i) < n) {
    return err('INSUFFICIENT_RIGHTS');
  }
  return ok({
    R: cloneR(s.R),
    U: { ...s.U, [i]: (s.U[i] ?? 0) + n },
    O: { ...s.O },
  });
}

export function bcTransfer(
  s: BoundedCounter,
  i: NodeId,
  j: NodeId,
  m: number,
): Result<BoundedCounter, 'INVALID_QTY' | 'INSUFFICIENT_RIGHTS' | 'SELF_TRANSFER'> {
  if (i === j) {
    return err('SELF_TRANSFER');
  }
  if (!isPositiveInt(m)) {
    return err('INVALID_QTY');
  }
  if (bcLocalRights(s, i) < m) {
    return err('INSUFFICIENT_RIGHTS');
  }
  const R = cloneR(s.R);
  const row = R[i] ?? {};
  R[i] = { ...row, [j]: (row[j] ?? 0) + m };
  return ok({
    R,
    U: { ...s.U },
    O: { ...s.O },
  });
}

export function bcOverrideConsume(
  s: BoundedCounter,
  i: NodeId,
  n: number,
): Result<BoundedCounter, 'INVALID_QTY'> {
  if (!isPositiveInt(n)) {
    return err('INVALID_QTY');
  }
  return ok({
    R: cloneR(s.R),
    U: { ...s.U },
    O: { ...s.O, [i]: (s.O[i] ?? 0) + n },
  });
}

export function bcValue(s: BoundedCounter): number {
  let added = 0;
  for (const i of Object.keys(s.R)) {
    added += s.R[i]?.[i] ?? 0;
  }
  return added - sumNatMap(s.U) - sumNatMap(s.O);
}

export function bcMerge(a: BoundedCounter, b: BoundedCounter): BoundedCounter {
  const R: Record<NodeId, NatMap> = {};
  for (const i of Object.keys(a.R)) {
    const row = a.R[i];
    if (row !== undefined) {
      R[i] = { ...row };
    }
  }
  for (const i of Object.keys(b.R)) {
    const bRow = b.R[i];
    if (bRow !== undefined) {
      const aRow = R[i];
      R[i] = aRow !== undefined ? mergeNatMap(aRow, bRow) : { ...bRow };
    }
  }
  return {
    R,
    U: mergeNatMap(a.U, b.U),
    O: mergeNatMap(a.O, b.O),
  };
}
