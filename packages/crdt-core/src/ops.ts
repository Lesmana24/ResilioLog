import {
  bcConsume,
  bcEmpty,
  bcIncrement,
  bcOverrideConsume,
  bcRemainingRatio,
  bcTransfer,
} from './bounded-counter';
import { err, ok } from './errors';
import { makeLamport, tagOf, tick } from './lamport';
import { orsAdd, orsElements, orsRemove } from './or-set';
import { pnDec, pnEmpty, pnInc } from './pn-counter';
import { emptyState } from './state';
import {
  TOP_UP_THRESHOLD,
  type CreateItemArgs,
  type DistributionEntry,
  type ItemId,
  type ItemState,
  type NodeId,
  type OpMeta,
  type Replica,
  type Result,
  type Tag,
} from './types';

const NODE_ID_RE = /^[a-z0-9]{4,16}$/;
const MAX_ITEM_ID_LEN = 48;

function isValidQty(qty: number): boolean {
  return Number.isSafeInteger(qty) && qty >= 1;
}

function makeSlug(name: string, c: number, nodeId: NodeId): string {
  const raw = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const base = raw.length > 0 ? raw : 'item';
  const suffixLen = 2 + String(c).length + nodeId.length;
  const maxSlugLen = Math.max(1, MAX_ITEM_ID_LEN - suffixLen);
  const trimmed = base.slice(0, maxSlugLen).replace(/-+$/g, '');
  return trimmed.length > 0 ? trimmed : 'i';
}

function optionalEntryFields(meta?: OpMeta): Partial<DistributionEntry> {
  if (!meta) return {};
  return {
    ...(meta.wallTime !== undefined ? { wallTime: meta.wallTime } : {}),
    ...(meta.counterparty !== undefined ? { counterparty: meta.counterparty } : {}),
    ...(meta.note !== undefined ? { note: meta.note } : {}),
  };
}

export function createReplica(nodeId: NodeId): Replica {
  if (!NODE_ID_RE.test(nodeId)) {
    throw new Error(`Invalid NodeId: "${nodeId}"`);
  }
  return {
    nodeId,
    clock: 0,
    state: emptyState(),
  };
}

export function createItem(
  r: Replica,
  args: CreateItemArgs,
): Result<{ replica: Replica; itemId: ItemId }> {
  if (!Number.isSafeInteger(args.initialQty) || args.initialQty < 0) {
    return err('INVALID_QTY');
  }

  const c1 = tick(r.clock);
  const createdAt = makeLamport(c1, r.nodeId);
  const itemId: ItemId = `${makeSlug(args.name, c1, r.nodeId)}-${c1}-${r.nodeId}`;

  let clock = c1;
  let ledger = pnEmpty();
  let quota = bcEmpty();
  let touchedAt = createdAt;
  let distributionLog = r.state.distributionLog;

  if (args.initialQty > 0) {
    const c2 = tick(c1);
    clock = c2;
    const logTs = makeLamport(c2, r.nodeId);
    touchedAt = logTs;
    ledger = pnInc(ledger, r.nodeId, args.initialQty);
    quota = bcIncrement(quota, r.nodeId, args.initialQty);
    const entry: DistributionEntry = {
      kind: 'receive',
      itemId,
      qty: args.initialQty,
      by: r.nodeId,
      ts: logTs,
      ...(args.wallTime !== undefined ? { wallTime: args.wallTime } : {}),
    };
    distributionLog = orsAdd(distributionLog, tagOf(logTs), entry);
  }

  const itemState: ItemState = {
    meta: {
      name: args.name,
      unit: args.unit,
      category: args.category,
      createdBy: r.nodeId,
      createdAt,
    },
    ledger,
    quota,
    touchedAt,
  };

  const replica: Replica = {
    nodeId: r.nodeId,
    clock,
    state: {
      ...r.state,
      items: { ...r.state.items, [itemId]: itemState },
      distributionLog,
    },
  };

  return ok({ replica, itemId });
}

export function receiveGoods(
  r: Replica,
  itemId: ItemId,
  qty: number,
  meta?: OpMeta,
): Result<Replica> {
  const item = r.state.items[itemId];
  if (!item) {
    return err('UNKNOWN_ITEM');
  }
  if (!isValidQty(qty)) {
    return err('INVALID_QTY');
  }

  const c = tick(r.clock);
  const ts = makeLamport(c, r.nodeId);
  const entry: DistributionEntry = {
    kind: 'receive',
    itemId,
    qty,
    by: r.nodeId,
    ts,
    ...optionalEntryFields(meta),
  };

  return ok({
    nodeId: r.nodeId,
    clock: c,
    state: {
      ...r.state,
      items: {
        ...r.state.items,
        [itemId]: {
          ...item,
          ledger: pnInc(item.ledger, r.nodeId, qty),
          quota: bcIncrement(item.quota, r.nodeId, qty),
          touchedAt: ts,
        },
      },
      distributionLog: orsAdd(r.state.distributionLog, tagOf(ts), entry),
    },
  });
}

/** Enforces quota; may enqueue a top-up request (B-10). */
export function issue(
  r: Replica,
  itemId: ItemId,
  qty: number,
  meta?: OpMeta,
): Result<Replica> {
  const item = r.state.items[itemId];
  if (!item) {
    return err('UNKNOWN_ITEM');
  }
  const quotaRes = bcConsume(item.quota, r.nodeId, qty);
  if (!quotaRes.ok) {
    return quotaRes;
  }

  const c1 = tick(r.clock);
  const issueTs = makeLamport(c1, r.nodeId);
  const entry: DistributionEntry = {
    kind: 'issue',
    itemId,
    qty,
    by: r.nodeId,
    ts: issueTs,
    ...optionalEntryFields(meta),
  };

  let finalClock = c1;
  let topUpQueue = r.state.topUpQueue;

  if (bcRemainingRatio(quotaRes.value, r.nodeId) <= TOP_UP_THRESHOLD) {
    const hasOpenRequest = orsElements(topUpQueue).some(
      (req) => req.el.itemId === itemId && req.el.requester === r.nodeId,
    );
    if (!hasOpenRequest) {
      const c2 = tick(c1);
      finalClock = c2;
      const topUpTs = makeLamport(c2, r.nodeId);
      topUpQueue = orsAdd(topUpQueue, tagOf(topUpTs), {
        itemId,
        requester: r.nodeId,
        ts: topUpTs,
      });
    }
  }

  return ok({
    nodeId: r.nodeId,
    clock: finalClock,
    state: {
      ...r.state,
      items: {
        ...r.state.items,
        [itemId]: {
          ...item,
          ledger: pnDec(item.ledger, r.nodeId, qty),
          quota: quotaRes.value,
          touchedAt: issueTs,
        },
      },
      distributionLog: orsAdd(r.state.distributionLog, tagOf(issueTs), entry),
      topUpQueue,
    },
  });
}

export function transferRights(
  r: Replica,
  itemId: ItemId,
  to: NodeId,
  qty: number,
): Result<Replica> {
  const item = r.state.items[itemId];
  if (!item) {
    return err('UNKNOWN_ITEM');
  }
  const quotaRes = bcTransfer(item.quota, r.nodeId, to, qty);
  if (!quotaRes.ok) {
    return quotaRes;
  }

  const c = tick(r.clock);
  const ts = makeLamport(c, r.nodeId);

  return ok({
    nodeId: r.nodeId,
    clock: c,
    state: {
      ...r.state,
      items: {
        ...r.state.items,
        [itemId]: {
          ...item,
          quota: quotaRes.value,
          touchedAt: ts,
        },
      },
    },
  });
}

export function emergencyIssue(
  r: Replica,
  itemId: ItemId,
  qty: number,
  meta: OpMeta & { readonly reason: string },
): Result<Replica> {
  const item = r.state.items[itemId];
  if (!item) {
    return err('UNKNOWN_ITEM');
  }
  const reason = meta.reason.trim();
  if (reason.length < 3 || reason.length > 200) {
    return err('REASON_REQUIRED');
  }
  const quotaRes = bcOverrideConsume(item.quota, r.nodeId, qty);
  if (!quotaRes.ok) {
    return quotaRes;
  }

  const c = tick(r.clock);
  const ts = makeLamport(c, r.nodeId);
  const entry: DistributionEntry = {
    kind: 'override_issue',
    itemId,
    qty,
    by: r.nodeId,
    ts,
    reason,
    ...optionalEntryFields(meta),
  };

  return ok({
    nodeId: r.nodeId,
    clock: c,
    state: {
      ...r.state,
      items: {
        ...r.state.items,
        [itemId]: {
          ...item,
          ledger: pnDec(item.ledger, r.nodeId, qty),
          quota: quotaRes.value,
          touchedAt: ts,
        },
      },
      distributionLog: orsAdd(r.state.distributionLog, tagOf(ts), entry),
    },
  });
}

/** Display-only: counters unchanged. */
export function voidLogEntry(r: Replica, tag: Tag): Result<Replica> {
  return ok({
    nodeId: r.nodeId,
    clock: r.clock,
    state: {
      ...r.state,
      distributionLog: orsRemove(r.state.distributionLog, [tag]),
    },
  });
}

export function resolveTopUp(r: Replica, tag: Tag): Result<Replica> {
  return ok({
    nodeId: r.nodeId,
    clock: r.clock,
    state: {
      ...r.state,
      topUpQueue: orsRemove(r.state.topUpQueue, [tag]),
    },
  });
}
