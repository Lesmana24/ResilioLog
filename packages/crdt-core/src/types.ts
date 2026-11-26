// Source of truth: docs/SPEC-CRDT.md. Must stay consistent with docs/schema/schema.json (LOCKED).

export const SCHEMA_VERSION = 1 as const;
/** remainingRatio at or below this value enqueues a top-up request (D-010, D-012). */
export const TOP_UP_THRESHOLD = 0.15;

export type NodeId = string; // /^[a-z0-9]{4,16}$/
export type Tag = string; // `${nodeId}:${counter}`
export type ItemId = string; // `<slug>-<c>-<nodeId>`
export type Nat = number; // non-negative safe integer

export interface Lamport {
  readonly c: Nat;
  readonly n: NodeId;
}

export type NatMap = Readonly<Record<NodeId, Nat>>;

export interface PNCounter {
  readonly p: NatMap;
  readonly n: NatMap;
}

export interface BoundedCounter {
  /** R[i][i] = increments at i; R[i][j] (i != j) = rights transferred i -> j */
  readonly R: Readonly<Record<NodeId, NatMap>>;
  /** units consumed (issued) at node */
  readonly U: NatMap;
  /** units issued via emergency override at node */
  readonly O: NatMap;
}

export interface ORSet<T> {
  readonly adds: Readonly<Record<Tag, T>>;
  /** set of removed tags; canonical form is sorted and de-duplicated */
  readonly removed: readonly Tag[];
}

export type Category = 'food' | 'water' | 'medicine' | 'shelter' | 'hygiene' | 'other';

export interface ItemMeta {
  readonly name: string;
  readonly unit: string;
  readonly category: Category;
  readonly createdBy: NodeId;
  readonly createdAt: Lamport;
}

export interface ItemState {
  readonly meta: ItemMeta;
  readonly ledger: PNCounter;
  readonly quota: BoundedCounter;
  readonly touchedAt: Lamport;
}

export type DistributionKind = 'receive' | 'issue' | 'override_issue';

export interface DistributionEntry {
  readonly kind: DistributionKind;
  readonly itemId: ItemId;
  readonly qty: number; // integer >= 1
  readonly by: NodeId;
  readonly ts: Lamport;
  readonly wallTime?: string; // informational only, never used for ordering
  readonly counterparty?: string;
  readonly note?: string;
  readonly reason?: string; // required when kind === 'override_issue'
}

export interface TopUpRequest {
  readonly itemId: ItemId;
  readonly requester: NodeId;
  readonly ts: Lamport;
}

export interface ResilioState {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly items: Readonly<Record<ItemId, ItemState>>;
  readonly distributionLog: ORSet<DistributionEntry>;
  readonly topUpQueue: ORSet<TopUpRequest>;
}

export interface Replica {
  readonly nodeId: NodeId;
  /** Lamport counter. MUST be persisted together with state. */
  readonly clock: number;
  readonly state: ResilioState;
}

export type ErrorCode =
  | 'INVALID_QTY'
  | 'INSUFFICIENT_RIGHTS'
  | 'UNKNOWN_ITEM'
  | 'SELF_TRANSFER'
  | 'REASON_REQUIRED'
  | 'SCHEMA_MISMATCH';

export type Result<T, E extends string = ErrorCode> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export interface OpMeta {
  readonly counterparty?: string;
  readonly note?: string;
  readonly wallTime?: string;
}

export interface CreateItemArgs {
  readonly name: string;
  readonly unit: string;
  readonly category: Category;
  readonly initialQty: number;
  readonly wallTime?: string;
}

export interface ItemSummary {
  readonly value: number;
  readonly deficit: number;
  readonly ledgerIn: number;
  readonly ledgerOut: number;
  readonly rights: Readonly<Record<NodeId, number>>;
}
