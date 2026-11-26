import type { BoundedCounter, NodeId, Result } from './types';
import { notImplemented } from './errors';

export function bcEmpty(): BoundedCounter {
  return notImplemented('B-08');
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
export function bcMerge(_a: BoundedCounter, _b: BoundedCounter): BoundedCounter {
  return notImplemented('B-08');
}
