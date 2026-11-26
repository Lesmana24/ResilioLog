import type { NodeId, PNCounter } from './types';
import { notImplemented } from './errors';

export function pnEmpty(): PNCounter {
  return notImplemented('B-04');
}
export function pnInc(_s: PNCounter, _node: NodeId, _k: number): PNCounter {
  return notImplemented('B-04');
}
export function pnDec(_s: PNCounter, _node: NodeId, _k: number): PNCounter {
  return notImplemented('B-04');
}
export function pnValue(_s: PNCounter): number {
  return notImplemented('B-04');
}
export function pnMerge(_a: PNCounter, _b: PNCounter): PNCounter {
  return notImplemented('B-04');
}
