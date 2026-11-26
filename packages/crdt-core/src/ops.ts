import type { CreateItemArgs, ItemId, NodeId, OpMeta, Replica, Result, Tag } from './types';
import { notImplemented } from './errors';

export function createReplica(_nodeId: NodeId): Replica {
  return notImplemented('B-09');
}
export function createItem(
  _r: Replica,
  _args: CreateItemArgs,
): Result<{ replica: Replica; itemId: ItemId }> {
  return notImplemented('B-09');
}
export function receiveGoods(_r: Replica, _itemId: ItemId, _qty: number, _meta?: OpMeta): Result<Replica> {
  return notImplemented('B-09');
}
/** Enforces quota; may enqueue a top-up request (B-10). */
export function issue(_r: Replica, _itemId: ItemId, _qty: number, _meta?: OpMeta): Result<Replica> {
  return notImplemented('B-09');
}
export function transferRights(_r: Replica, _itemId: ItemId, _to: NodeId, _qty: number): Result<Replica> {
  return notImplemented('B-09');
}
export function emergencyIssue(
  _r: Replica,
  _itemId: ItemId,
  _qty: number,
  _meta: OpMeta & { readonly reason: string },
): Result<Replica> {
  return notImplemented('B-09');
}
/** Display-only: counters unchanged. */
export function voidLogEntry(_r: Replica, _tag: Tag): Result<Replica> {
  return notImplemented('B-09');
}
export function resolveTopUp(_r: Replica, _tag: Tag): Result<Replica> {
  return notImplemented('B-10');
}
