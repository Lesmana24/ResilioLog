import {
  createItem,
  createReplica,
  issue,
  receiveGoods,
  type Replica,
} from '@resiliolog/crdt-core';
import { describe, expect, it } from 'vitest';
import { buildEnvelope, chunkBlob, DEFAULT_CHUNK_SIZE, encodeEnvelope } from '../src';

function generateDataset(itemCount: number, opsPerItem: number): Replica {
  let r = createReplica('aaaa1111');
  const itemIds: string[] = [];

  for (let i = 0; i < itemCount; i++) {
    const created = createItem(r, {
      name: `Relief Item ${i + 1}`,
      unit: 'kg',
      category: 'food',
      initialQty: 500,
    });
    if (!created.ok) throw new Error(created.error);
    r = created.value.replica;
    itemIds.push(created.value.itemId);
  }

  for (let i = 0; i < itemIds.length; i++) {
    const itemId = itemIds[i]!;
    for (let j = 0; j < opsPerItem; j++) {
      if (j % 2 === 0) {
        const res = receiveGoods(r, itemId, 10, { counterparty: 'Warehouse' });
        if (res.ok) r = res.value;
      } else {
        const res = issue(r, itemId, 5, { counterparty: `Shelter ${j}` });
        if (res.ok) r = res.value;
      }
    }
  }
  return r;
}

describe('sync/size-report (B-11)', () => {
  it('W8 print blob size + chunk count for small/medium/large datasets', () => {
    const datasets = [
      { label: 'small (3 items, 10 ops)', replica: generateDataset(3, 3) },
      { label: 'medium (10 items, 60 ops)', replica: generateDataset(10, 6) },
      { label: 'large (20 items, 200 ops)', replica: generateDataset(20, 10) },
    ];

    for (const ds of datasets) {
      const env = buildEnvelope(ds.replica, 0, 'full');
      const blob = encodeEnvelope(env);
      const chunks = chunkBlob(blob, env.msgId, DEFAULT_CHUNK_SIZE);
      console.info(`[W8] ${ds.label}: blob=${blob.length} chars, chunks=${chunks.length}`);
      expect(blob.length).toBeGreaterThan(0);
      expect(chunks.length).toBeGreaterThan(0);
    }
  });
});
