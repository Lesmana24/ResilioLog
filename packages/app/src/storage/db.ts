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

export interface DispatchLineItem {
  itemId: ItemId;
  qty: number;
}

export interface DispatchStop {
  id: string;
  toPost: string;
  items: DispatchLineItem[];
  note?: string;
  status: 'pending' | 'delivered';
  deliveredAt?: string;
}

export interface CourierDispatch {
  id: string;
  from: string;
  courierId: string;
  stops: DispatchStop[];
  createdAt: string;
  status: 'assigned' | 'in_transit' | 'delivered';
  deliveredAt?: string;
}

export const DISPATCH_QR_PREFIX = 'RLD1:';

export function normalizeCourierDispatch(raw: unknown): CourierDispatch | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj['id'] !== 'string' || typeof obj['courierId'] !== 'string') return null;

  const from = typeof obj['from'] === 'string' ? obj['from'] : 'CMD-ALFA7';
  const createdAt =
    typeof obj['createdAt'] === 'string' ? obj['createdAt'] : new Date().toISOString();
  const status: CourierDispatch['status'] =
    obj['status'] === 'delivered' || obj['status'] === 'in_transit' || obj['status'] === 'assigned'
      ? obj['status']
      : 'in_transit';

  let stops: DispatchStop[] = [];
  if (Array.isArray(obj['stops'])) {
    stops = obj['stops']
      .map((s, idx): DispatchStop | null => {
        if (!s || typeof s !== 'object') return null;
        const so = s as Record<string, unknown>;
        if (typeof so['toPost'] !== 'string' || !Array.isArray(so['items'])) return null;
        const items: DispatchLineItem[] = so['items']
          .map((li): DispatchLineItem | null => {
            if (!li || typeof li !== 'object') return null;
            const lo = li as Record<string, unknown>;
            if (
              typeof lo['itemId'] === 'string' &&
              typeof lo['qty'] === 'number' &&
              Number.isInteger(lo['qty']) &&
              lo['qty'] > 0
            ) {
              return { itemId: lo['itemId'], qty: lo['qty'] };
            }
            return null;
          })
          .filter((x): x is DispatchLineItem => x !== null);
        if (items.length === 0) return null;
        const stopStatus: DispatchStop['status'] =
          so['status'] === 'delivered' ? 'delivered' : 'pending';
        return {
          id: typeof so['id'] === 'string' ? so['id'] : `STOP-${idx + 1}`,
          toPost: so['toPost'],
          items,
          ...(typeof so['note'] === 'string' && so['note'].trim()
            ? { note: so['note'].trim() }
            : {}),
          status: stopStatus,
          ...(typeof so['deliveredAt'] === 'string' ? { deliveredAt: so['deliveredAt'] } : {}),
        };
      })
      .filter((x): x is DispatchStop => x !== null);
  } else if (
    typeof obj['toPost'] === 'string' &&
    typeof obj['itemId'] === 'string' &&
    typeof obj['qty'] === 'number' &&
    Number.isInteger(obj['qty']) &&
    obj['qty'] > 0
  ) {
    // Legacy single-stop format compatibility
    stops = [
      {
        id: 'STOP-1',
        toPost: obj['toPost'],
        items: [{ itemId: obj['itemId'], qty: obj['qty'] }],
        ...(typeof obj['note'] === 'string' && obj['note'].trim()
          ? { note: obj['note'].trim() }
          : {}),
        status: status === 'delivered' ? 'delivered' : 'pending',
        ...(typeof obj['deliveredAt'] === 'string' ? { deliveredAt: obj['deliveredAt'] } : {}),
      },
    ];
  }

  if (stops.length === 0) return null;

  return {
    id: obj['id'],
    from,
    courierId: obj['courierId'],
    stops,
    createdAt,
    status,
    ...(typeof obj['deliveredAt'] === 'string' ? { deliveredAt: obj['deliveredAt'] } : {}),
  };
}

export function encodeCourierDispatchQr(dispatch: CourierDispatch): string {
  const compact = {
    id: dispatch.id,
    from: dispatch.from,
    courierId: dispatch.courierId,
    stops: dispatch.stops.map((s) => ({
      id: s.id,
      toPost: s.toPost,
      items: s.items,
      ...(s.note ? { note: s.note } : {}),
    })),
    createdAt: dispatch.createdAt,
  };
  return `${DISPATCH_QR_PREFIX}${JSON.stringify(compact)}`;
}

export function decodeCourierDispatchQr(raw: string): CourierDispatch | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(DISPATCH_QR_PREFIX)) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed.slice(DISPATCH_QR_PREFIX.length));
    const normalized = normalizeCourierDispatch(parsed);
    if (!normalized) return null;
    return {
      ...normalized,
      status: 'in_transit',
      stops: normalized.stops.map((s) => ({ ...s, status: 'pending' as const })),
    };
  } catch {
    return null;
  }
}

export async function getCourierDispatches(): Promise<CourierDispatch[]> {
  const row = await db.kv.get('courierDispatches');
  if (!row) return [];
  try {
    const parsed: unknown = JSON.parse(row.value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeCourierDispatch(item))
      .filter((x): x is CourierDispatch => x !== null);
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

export async function markCourierDispatchStopDelivered(
  dispatchId: string,
  stopId: string,
): Promise<CourierDispatch[]> {
  const prev = await getCourierDispatches();
  const now = new Date().toISOString();
  const next = prev.map((d) => {
    if (d.id !== dispatchId) return d;
    const nextStops = d.stops.map((s) =>
      s.id === stopId ? { ...s, status: 'delivered' as const, deliveredAt: now } : s,
    );
    const allDelivered = nextStops.every((s) => s.status === 'delivered');
    return {
      ...d,
      stops: nextStops,
      status: allDelivered ? ('delivered' as const) : d.status,
      ...(allDelivered ? { deliveredAt: now } : {}),
    };
  });
  await db.kv.put({ key: 'courierDispatches', value: JSON.stringify(next) });
  return next;
}
