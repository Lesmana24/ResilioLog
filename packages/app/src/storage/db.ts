import { createReplica, type NodeId, type Replica, type ResilioState } from '@resiliolog/crdt-core';
import Dexie, { type Table } from 'dexie';

const NODE_ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const NODE_ID_LENGTH = 8;

export interface KvRow {
  readonly key: 'nodeId' | 'clock';
  readonly value: string | number;
}

export interface StateRow {
  readonly key: 'main';
  readonly value: ResilioState;
}

export interface CursorRow {
  readonly peerId: NodeId;
  readonly until: number;
  readonly lastSyncAt?: string;
}

export class ResilioDatabase extends Dexie {
  kv!: Table<KvRow, 'nodeId' | 'clock'>;
  state!: Table<StateRow, 'main'>;
  cursors!: Table<CursorRow, NodeId>;

  constructor(name = 'resiliolog') {
    super(name);
    this.version(1).stores({
      kv: 'key',
      state: 'key',
      cursors: 'peerId',
    });
  }
}

export const db = new ResilioDatabase();

export function generateNodeId(): NodeId {
  const bytes = new Uint8Array(NODE_ID_LENGTH);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < NODE_ID_LENGTH; i++) {
    out += NODE_ID_ALPHABET[bytes[i]! % NODE_ID_ALPHABET.length]!;
  }
  return out;
}

/**
 * Loads the local Replica from IndexedDB, or initializes a new one on first launch.
 * Generates and persists an 8-char [a-z0-9] nodeId via crypto.getRandomValues.
 */
export async function loadReplica(database: ResilioDatabase = db): Promise<Replica> {
  return database.transaction('rw', database.kv, database.state, async () => {
    const nodeIdRow = await database.kv.get('nodeId');
    const clockRow = await database.kv.get('clock');
    const stateRow = await database.state.get('main');

    if (
      nodeIdRow &&
      typeof nodeIdRow.value === 'string' &&
      clockRow &&
      typeof clockRow.value === 'number' &&
      stateRow
    ) {
      return {
        nodeId: nodeIdRow.value,
        clock: clockRow.value,
        state: stateRow.value,
      };
    }

    const nodeId =
      nodeIdRow && typeof nodeIdRow.value === 'string' ? nodeIdRow.value : generateNodeId();
    const initial = createReplica(nodeId);

    await database.kv.put({ key: 'nodeId', value: initial.nodeId });
    await database.kv.put({ key: 'clock', value: initial.clock });
    await database.state.put({ key: 'main', value: initial.state });

    return initial;
  });
}

/**
 * Persists state AND clock atomically in a single Dexie transaction.
 */
export async function saveReplica(
  replica: Replica,
  database: ResilioDatabase = db,
): Promise<void> {
  await database.transaction('rw', database.kv, database.state, async () => {
    await database.kv.put({ key: 'nodeId', value: replica.nodeId });
    await database.kv.put({ key: 'clock', value: replica.clock });
    await database.state.put({ key: 'main', value: replica.state });
  });
}

export async function getCursor(
  peerId: NodeId,
  database: ResilioDatabase = db,
): Promise<number> {
  const row = await database.cursors.get(peerId);
  return row?.until ?? 0;
}

export async function setCursor(
  peerId: NodeId,
  until: number,
  database: ResilioDatabase = db,
  lastSyncAt: string = new Date().toISOString(),
): Promise<void> {
  await database.cursors.put({ peerId, until, lastSyncAt });
}

export async function listCursors(
  database: ResilioDatabase = db,
): Promise<readonly CursorRow[]> {
  return database.cursors.toArray();
}

export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
