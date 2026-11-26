import type { ItemId, ItemSummary, ResilioState } from './types';
import { notImplemented } from './errors';

export function itemSummary(_state: ResilioState, _itemId: ItemId): ItemSummary | undefined {
  return notImplemented('B-09');
}
