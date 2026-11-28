import Dexie, { type Table } from 'dexie';
import type {
  DistributionEntry,
  ItemId,
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

const GENESIS_NODE_ID: NodeId = 'genesis1';

function buildInitialSeedState(nodeId: NodeId): Replica {
  const sembako: ItemState = {
    meta: {
      name: 'Paket Sembako',
      unit: 'Koli',
      category: 'food',
      createdBy: GENESIS_NODE_ID,
      createdAt: { c: 1, n: GENESIS_NODE_ID },
    },
    ledger: {
      p: { [GENESIS_NODE_ID]: 300 },
      n: { [GENESIS_NODE_ID]: 85 },
    },
    quota: {
      R: {
        [nodeId]: { [nodeId]: 100 },
        poskob07: { poskob07: 200 },
      },
      U: { [nodeId]: 85 },
      O: {},
    },
    touchedAt: { c: 4, n: GENESIS_NODE_ID },
  };

  const air: ItemState = {
    meta: {
      name: 'Air Bersih 19L',
      unit: 'Unit',
      category: 'water',
      createdBy: GENESIS_NODE_ID,
      createdAt: { c: 2, n: GENESIS_NODE_ID },
    },
    ledger: {
      p: { [GENESIS_NODE_ID]: 500 },
      n: { [GENESIS_NODE_ID]: 80 },
    },
    quota: {
      R: { [nodeId]: { [nodeId]: 500 } },
      U: { [nodeId]: 80 },
      O: {},
    },
    touchedAt: { c: 5, n: GENESIS_NODE_ID },
  };

  const trauma: ItemState = {
    meta: {
      name: 'Obat Trauma Kit B',
      unit: 'Set',
      category: 'medicine',
      createdBy: GENESIS_NODE_ID,
      createdAt: { c: 3, n: GENESIS_NODE_ID },
    },
    ledger: {
      p: { [GENESIS_NODE_ID]: 50 },
      n: { [GENESIS_NODE_ID]: 12 },
    },
    quota: {
      R: { [nodeId]: { [nodeId]: 50 } },
      U: { [nodeId]: 12 },
      O: {},
    },
    touchedAt: { c: 6, n: GENESIS_NODE_ID },
  };

  const logAdds: Record<string, DistributionEntry> = {
    [`${GENESIS_NODE_ID}:4`]: {
      kind: 'receive',
      itemId: 'sembako',
      qty: 25,
      by: GENESIS_NODE_ID,
      ts: { c: 4, n: GENESIS_NODE_ID },
      counterparty: 'Petugas #04',
      wallTime: '2026-11-26T07:22:00.000Z',
    },
    [`${GENESIS_NODE_ID}:5`]: {
      kind: 'receive',
      itemId: 'air-19l',
      qty: 50,
      by: GENESIS_NODE_ID,
      ts: { c: 5, n: GENESIS_NODE_ID },
      counterparty: 'Tangki 2',
      wallTime: '2026-11-26T07:15:00.000Z',
    },
    [`${GENESIS_NODE_ID}:6`]: {
      kind: 'issue',
      itemId: 'trauma-kit',
      qty: 5,
      by: GENESIS_NODE_ID,
      ts: { c: 6, n: GENESIS_NODE_ID },
      counterparty: 'Medis 1',
      wallTime: '2026-11-26T06:58:00.000Z',
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

function sanitizeLegacyReplica(replica: Replica): { replica: Replica; changed: boolean } {
  let changed = false;
  const nextItems: Record<string, ItemState> = {};

  for (const [id, item] of Object.entries(replica.state.items)) {
    const legacyRow = item.quota.R['posko-b07'];
    if (legacyRow !== undefined) {
      changed = true;
      const nextR: Record<string, Record<string, number>> = {};
      for (const [k, row] of Object.entries(item.quota.R)) {
        const mappedKey = k === 'posko-b07' ? 'poskob07' : k;
        const nextRow: Record<string, number> = {};
        for (const [target, val] of Object.entries(row)) {
          nextRow[target === 'posko-b07' ? 'poskob07' : target] = val;
        }
        nextR[mappedKey] = nextRow;
      }
      nextItems[id] = {
        ...item,
        quota: {
          ...item.quota,
          R: nextR,
        },
      };
    } else {
      nextItems[id] = item;
    }
  }

  const nextLogAdds: Record<string, DistributionEntry> = {};
  for (const [tag, entry] of Object.entries(replica.state.distributionLog.adds)) {
    if (entry.wallTime && !entry.wallTime.includes('T')) {
      changed = true;
      nextLogAdds[tag] = {
        ...entry,
        wallTime: `2026-11-26T07:00:00.000Z`,
      };
    } else {
      nextLogAdds[tag] = entry;
    }
  }

  if (!changed) return { replica, changed: false };
  return {
    changed: true,
    replica: {
      ...replica,
      state: {
        ...replica.state,
        items: nextItems,
        distributionLog: {
          ...replica.state.distributionLog,
          adds: nextLogAdds,
        },
      },
    },
  };
}

export async function ensureSeededReplica(): Promise<Replica> {
  await db.open();
  const nodeId = await getOrCreateNodeId();
  const existing = await db.state.get('current');
  if (existing) {
    const loaded: Replica = {
      nodeId: existing.nodeId,
      clock: existing.clock,
      state: existing.state,
    };
    const sanitized = sanitizeLegacyReplica(loaded);
    if (sanitized.changed) {
      await saveReplicaAtomic(sanitized.replica);
    }
    return sanitized.replica;
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

export interface CourierDispatch {
  id: string;
  from: string;
  toPost: string;
  courierId: string;
  itemId: ItemId;
  qty: number;
  note?: string;
  createdAt: string;
  status: 'assigned' | 'in_transit' | 'delivered';
  deliveredAt?: string;
}

export const DISPATCH_QR_PREFIX = 'RLD1:';

export function encodeCourierDispatchQr(dispatch: CourierDispatch): string {
  const compact = {
    id: dispatch.id,
    from: dispatch.from,
    toPost: dispatch.toPost,
    courierId: dispatch.courierId,
    itemId: dispatch.itemId,
    qty: dispatch.qty,
    ...(dispatch.note ? { note: dispatch.note } : {}),
    createdAt: dispatch.createdAt,
  };
  return `${DISPATCH_QR_PREFIX}${JSON.stringify(compact)}`;
}

export function decodeCourierDispatchQr(raw: string): CourierDispatch | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(DISPATCH_QR_PREFIX)) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(DISPATCH_QR_PREFIX.length)) as Partial<CourierDispatch>;
    if (
      typeof parsed.id === 'string' &&
      typeof parsed.toPost === 'string' &&
      typeof parsed.courierId === 'string' &&
      typeof parsed.itemId === 'string' &&
      typeof parsed.qty === 'number' &&
      Number.isInteger(parsed.qty) &&
      parsed.qty > 0
    ) {
      return {
        id: parsed.id,
        from: typeof parsed.from === 'string' ? parsed.from : 'CMD-ALFA7',
        toPost: parsed.toPost,
        courierId: parsed.courierId,
        itemId: parsed.itemId,
        qty: parsed.qty,
        ...(typeof parsed.note === 'string' && parsed.note.trim() ? { note: parsed.note.trim() } : {}),
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
        status: 'in_transit',
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCourierDispatches(): Promise<CourierDispatch[]> {
  const row = await db.kv.get('courierDispatches');
  if (!row) return [];
  try {
    const parsed: unknown = JSON.parse(row.value);
    return Array.isArray(parsed) ? (parsed as CourierDispatch[]) : [];
  } catch {
    return [];
  }
}

export async function upsertCourierDispatch(dispatch: CourierDispatch): Promise<CourierDispatch[]> {
  const prev = await getCourierDispatches();
  const idx = prev.findIndex((d) => d.id === dispatch.id);
  const next =
    idx >= 0 ? prev.map((d) => (d.id === dispatch.id ? dispatch : d)) : [dispatch, ...prev];
  await db.kv.put({ key: 'courierDispatches', value: JSON.stringify(next) });
  return next;
}

export async function markCourierDispatchDelivered(id: string): Promise<CourierDispatch[]> {
  const prev = await getCourierDispatches();
  const now = new Date().toISOString();
  const next = prev.map((d) =>
    d.id === id ? { ...d, status: 'delivered' as const, deliveredAt: now } : d,
  );
  await db.kv.put({ key: 'courierDispatches', value: JSON.stringify(next) });
  return next;
}
