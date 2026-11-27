import 'fake-indexeddb/auto';
import {
  canonicalize,
  createItem,
  issue,
  receiveGoods,
} from '@resiliolog/crdt-core';
import { describe, expect, it, vi } from 'vitest';
import {
  clearLocalData,
  getCursor,
  loadReplica,
  requestPersistence,
  ResilioDatabase,
  saveReplica,
  setCursor,
} from '../src/storage/db';

let dbSeq = 0;
function uniqueDbName(): string {
  dbSeq += 1;
  return `resiliolog-test-${dbSeq}`;
}

describe('app/storage/db (F-02)', () => {
  it('generates an 8-char [a-z0-9] nodeId on first launch and keeps it identical across reloads', async () => {
    const name = uniqueDbName();
    const db1 = new ResilioDatabase(name);
    const r1 = await loadReplica(db1);
    expect(r1.nodeId).toMatch(/^[a-z0-9]{8}$/);
    expect(r1.clock).toBe(0);
    db1.close();

    // Simulate reload with a fresh Dexie instance pointing at the same IndexedDB
    const db2 = new ResilioDatabase(name);
    const r2 = await loadReplica(db2);
    expect(r2.nodeId).toBe(r1.nodeId);
    expect(r2.clock).toBe(0);
    db2.close();
  });

  it('saves state and clock atomically in one transaction', async () => {
    const name = uniqueDbName();
    const db = new ResilioDatabase(name);
    const r0 = await loadReplica(db);

    const created = createItem(r0, {
      name: 'Rice',
      unit: 'kg',
      category: 'food',
      initialQty: 50,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const r1 = created.value.replica;

    await saveReplica(r1, db);
    const clockRow = await db.kv.get('clock');
    const stateRow = await db.state.get('main');
    expect(clockRow?.value).toBe(r1.clock);
    expect(canonicalize(stateRow!.value)).toEqual(canonicalize(r1.state));

    // Simulate a failure mid-transaction on the state table -> clock must NOT advance partially
    const iss = issue(r1, created.value.itemId, 10);
    expect(iss.ok).toBe(true);
    if (!iss.ok) return;
    const r2 = iss.value;

    const putSpy = vi.spyOn(db.state, 'put').mockRejectedValueOnce(new Error('disk full'));
    await expect(saveReplica(r2, db)).rejects.toThrow('disk full');
    putSpy.mockRestore();

    const reloaded = await loadReplica(db);
    expect(reloaded.clock).toBe(r1.clock);
    expect(canonicalize(reloaded.state)).toEqual(canonicalize(r1.state));
    db.close();
  });

  it('reload produces identical canonical state and preserves peer cursors', async () => {
    const name = uniqueDbName();
    const db1 = new ResilioDatabase(name);
    let r = await loadReplica(db1);

    const created = createItem(r, {
      name: 'Water',
      unit: 'L',
      category: 'water',
      initialQty: 40,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    r = created.value.replica;

    const rec = receiveGoods(r, created.value.itemId, 15, { counterparty: 'Hub' });
    expect(rec.ok).toBe(true);
    if (!rec.ok) return;
    r = rec.value;

    await saveReplica(r, db1);
    await setCursor('bbbb2222', r.clock, db1);
    db1.close();

    // Reload
    const db2 = new ResilioDatabase(name);
    const reloaded = await loadReplica(db2);
    expect(reloaded.nodeId).toBe(r.nodeId);
    expect(reloaded.clock).toBe(r.clock);
    expect(canonicalize(reloaded.state)).toEqual(canonicalize(r.state));
    expect(await getCursor('bbbb2222', db2)).toBe(r.clock);
    expect(await getCursor('cccc3333', db2)).toBe(0);
    db2.close();
  });

  it('requestPersistence handles missing and present navigator.storage.persist()', async () => {
    expect(await requestPersistence()).toBe(false);

    vi.stubGlobal('navigator', {
      storage: {
        persist: vi.fn().mockResolvedValue(true),
      },
    });
    expect(await requestPersistence()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('clearLocalData wipes state/cursors and generates a fresh nodeId on next loadReplica', async () => {
    const name = uniqueDbName();
    const db = new ResilioDatabase(name);
    const r1 = await loadReplica(db);
    await setCursor('bbbb2222', 3, db);

    await clearLocalData(db);
    const r2 = await loadReplica(db);
    expect(r2.clock).toBe(0);
    expect(Object.keys(r2.state.items)).toHaveLength(0);
    expect(await getCursor('bbbb2222', db)).toBe(0);
    expect(r2.nodeId).toMatch(/^[a-z0-9]{8}$/);
    expect(r2.nodeId).not.toBe(r1.nodeId);
    db.close();
  });
});
