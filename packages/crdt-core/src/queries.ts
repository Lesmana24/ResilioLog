import { bcLocalRights, bcValue } from './bounded-counter';
import type { ItemId, ItemSummary, NatMap, NodeId, ResilioState } from './types';

function sumNatMap(m: NatMap): number {
  let total = 0;
  for (const v of Object.values(m)) {
    total += v;
  }
  return total;
}

export function itemSummary(state: ResilioState, itemId: ItemId): ItemSummary | undefined {
  const item = state.items[itemId];
  if (!item) {
    return undefined;
  }

  const value = bcValue(item.quota);
  const deficit = Math.max(0, -value);
  const ledgerIn = sumNatMap(item.ledger.p);
  const ledgerOut = sumNatMap(item.ledger.n);

  const nodes = new Set<NodeId>();
  for (const from of Object.keys(item.quota.R)) {
    nodes.add(from);
    const row = item.quota.R[from];
    if (row) {
      for (const to of Object.keys(row)) {
        nodes.add(to);
      }
    }
  }
  for (const n of Object.keys(item.quota.U)) nodes.add(n);
  for (const n of Object.keys(item.quota.O)) nodes.add(n);

  const rights: Record<NodeId, number> = {};
  for (const n of nodes) {
    rights[n] = bcLocalRights(item.quota, n);
  }

  return {
    value,
    deficit,
    ledgerIn,
    ledgerOut,
    rights,
  };
}
