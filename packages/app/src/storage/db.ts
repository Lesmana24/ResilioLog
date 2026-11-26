import Dexie, { type Table } from 'dexie';
import type {
  DistributionEntry,
  ItemState,
  NodeId,
  Replica,
  ResilioState,
  TopUpRequest,
} from '@resiliolog/crdt-core';
import { SCHEMA_VERSION } from '@resiliolog/crdt-core';

export interface KvRow {
  key: string;
  value: string;
}

export interface ReplicaRow {
  id: 'current';
  nodeId: NodeId;
  clock: number;
  state: ResilioState;
  updatedAt: string;
}

export interface PeerCursorRow {
  peerId: string;
  until: number;
  lastSyncAt: string;
  label?: string;
}

export function getNodeParam(): string {
  if (typeof window === 'undefined') return 'posko-a04';
  const raw = new URLSearchParams(window.location.search).get('node')?.trim();
  if (!raw) return 'posko-a04';
  return raw.toLowerCase().replace(/[^a-z0-9\-_]/g, '') || 'posko-a04';
}

export const ACTIVE_NODE_PARAM = getNodeParam();
export const DB_NAME = `resiliolog_${ACTIVE_NODE_PARAM}`;

class ResilioDexieDB extends Dexie {
  kv!: Table<KvRow, string>;
  state!: Table<ReplicaRow, 'current'>;
  cursors!: Table<PeerCursorRow, string>;

  constructor(name: string) {
    super(name);
    // Avoid indexing boolean columns in IndexedDB (DataError on IDBKeyRange.bound)
    this.version(1).stores({
      kv: 'key',
      state: 'id',
      cursors: 'peerId',
    });
  }
}

export const db = new ResilioDexieDB(DB_NAME);

function generateNodeId(): NodeId {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) {
      bytes[i] = (i * 37 + 13) % 256;
    }
  }
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[(bytes[i] ?? 0) % chars.length] ?? 'a';
  }
  return id;
}

export async function getOrCreateNodeId(): Promise<NodeId> {
  const existing = await db.kv.get('nodeId');
  if (existing && /^[a-z0-9]{4,16}$/.test(existing.value)) {
    return existing.value;
  }
  const created = generateNodeId();
  await db.kv.put({ key: 'nodeId', value: created });
  return created;
}

export async function requestPersistentStorage(interactive = false): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }
  try {
    if (
      interactive &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default'
    ) {
      await Notification.requestPermission().catch(() => 'denied');
    }
    const granted = await navigator.storage.persist();
    if (granted) return true;
    if (typeof navigator.storage.persisted === 'function') {
      return await navigator.storage.persisted();
    }
    return false;
  } catch {
    return false;
  }
}

export async function saveReplicaAtomic(replica: Replica): Promise<void> {
  await db.transaction('rw', db.state, async () => {
    await db.state.put({
      id: 'current',
      nodeId: replica.nodeId,
      clock: replica.clock,
      state: replica.state,
      updatedAt: new Date().toISOString(),
    });
  });
}

function buildInitialSeedState(nodeId: NodeId): Replica {
  const sembako: ItemState = {
    meta: {
      name: 'Paket Sembako',
      unit: 'Koli',
      category: 'food',
      createdBy: nodeId,
      createdAt: { c: 1, n: nodeId },
    },
    ledger: {
      p: { [nodeId]: 300 },
      n: { [nodeId]: 85 },
    },
    quota: {
      R: {
        [nodeId]: { [nodeId]: 100 },
        'posko-b07': { 'posko-b07': 200 },
      },
      U: { [nodeId]: 85 },
      O: {},
    },
    touchedAt: { c: 4, n: nodeId },
  };

  const air: ItemState = {
    meta: {
      name: 'Air Bersih 19L',
      unit: 'Unit',
      category: 'water',
      createdBy: nodeId,
      createdAt: { c: 2, n: nodeId },
    },
    ledger: {
      p: { [nodeId]: 500 },
      n: { [nodeId]: 80 },
    },
    quota: {
      R: { [nodeId]: { [nodeId]: 500 } },
      U: { [nodeId]: 80 },
      O: {},
    },
    touchedAt: { c: 5, n: nodeId },
  };

  const trauma: ItemState = {
    meta: {
      name: 'Obat Trauma Kit B',
      unit: 'Set',
      category: 'medicine',
      createdBy: nodeId,
      createdAt: { c: 3, n: nodeId },
    },
    ledger: {
      p: { [nodeId]: 50 },
      n: { [nodeId]: 12 },
    },
    quota: {
      R: { [nodeId]: { [nodeId]: 50 } },
      U: { [nodeId]: 12 },
      O: {},
    },
    touchedAt: { c: 6, n: nodeId },
  };

  const logAdds: Record<string, DistributionEntry> = {
    [`${nodeId}:4`]: {
      kind: 'receive',
      itemId: 'sembako',
      qty: 25,
      by: nodeId,
      ts: { c: 4, n: nodeId },
      counterparty: 'Petugas #04',
      wallTime: '14:22',
    },
    [`${nodeId}:5`]: {
      kind: 'receive',
      itemId: 'air-19l',
      qty: 50,
      by: nodeId,
      ts: { c: 5, n: nodeId },
      counterparty: 'Tangki 2',
      wallTime: '14:15',
    },
    [`${nodeId}:6`]: {
      kind: 'issue',
      itemId: 'trauma-kit',
      qty: 5,
      by: nodeId,
      ts: { c: 6, n: nodeId },
      counterparty: 'Medis 1',
      wallTime: '13:58',
    },
  };

  const queueAdds: Record<string, TopUpRequest> = {
    [`${nodeId}:7`]: {
      itemId: 'sembako',
      requester: nodeId,
      ts: { c: 7, n: nodeId },
    },
  };

  return {
    nodeId,
    clock: 7,
    state: {
      schemaVersion: SCHEMA_VERSION,
      items: {
        sembako,
        'air-19l': air,
        'trauma-kit': trauma,
      },
      distributionLog: {
        adds: logAdds,
        removed: [],
      },
      topUpQueue: {
        adds: queueAdds,
        removed: [],
      },
    },
  };
}

export async function ensureSeededReplica(): Promise<Replica> {
  await db.open();
  const nodeId = await getOrCreateNodeId();
  const existing = await db.state.get('current');
  if (existing) {
    return {
      nodeId: existing.nodeId,
      clock: existing.clock,
      state: existing.state,
    };
  }
  const seeded = buildInitialSeedState(nodeId);
  await saveReplicaAtomic(seeded);
  return seeded;
}

export async function getRatifiedOverrides(): Promise<string[]> {
  const row = await db.kv.get('ratifiedOverrides');
  if (!row) return [];
  try {
    const parsed: unknown = JSON.parse(row.value);
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function addRatifiedOverride(id: string): Promise<string[]> {
  const prev = await getRatifiedOverrides();
  if (prev.includes(id)) return prev;
  const next = [...prev, id];
  await db.kv.put({ key: 'ratifiedOverrides', value: JSON.stringify(next) });
  return next;
}
