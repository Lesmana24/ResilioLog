import type { BoundedCounter, NatMap, NodeId, Result } from './types';
import { notImplemented } from './errors';

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

export function bcEmpty(): BoundedCounter {
  return { R: {}, U: {}, O: {} };
}
export function bcIncrement(_s: BoundedCounter, _i: NodeId, _k: number): BoundedCounter {
  return notImplemented('B-08');
}
export function bcGranted(_s: BoundedCounter, _i: NodeId): number {
  return notImplemented('B-08');
}
export function bcLocalRights(_s: BoundedCounter, _i: NodeId): number {
  return notImplemented('B-08');
}
export function bcRemainingRatio(_s: BoundedCounter, _i: NodeId): number {
  return notImplemented('B-08');
}
export function bcConsume(
  _s: BoundedCounter,
  _i: NodeId,
  _n: number,
): Result<BoundedCounter, 'INVALID_QTY' | 'INSUFFICIENT_RIGHTS'> {
  return notImplemented('B-08');
}
export function bcTransfer(
  _s: BoundedCounter,
  _i: NodeId,
  _j: NodeId,
  _m: number,
): Result<BoundedCounter, 'INVALID_QTY' | 'INSUFFICIENT_RIGHTS' | 'SELF_TRANSFER'> {
  return notImplemented('B-08');
}
export function bcOverrideConsume(
  _s: BoundedCounter,
  _i: NodeId,
  _n: number,
): Result<BoundedCounter, 'INVALID_QTY'> {
  return notImplemented('B-08');
}
export function bcValue(_s: BoundedCounter): number {
  return notImplemented('B-08');
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
