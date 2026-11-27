import {
  createItem,
  emergencyIssue,
  issue,
  receiveGoods,
  transferRights,
  type Replica,
  type Result,
  type ErrorCode,
} from '@resiliolog/crdt-core';

export function buildSampleData(r: Replica): Result<Replica, ErrorCode> {
  const now = new Date().toISOString();

  const c1 = createItem(r, { name: 'Rice', unit: 'kg', category: 'food', initialQty: 250, wallTime: now });
  if (!c1.ok) return c1;
  const c2 = createItem(c1.value.replica, { name: 'Clean Water', unit: 'L', category: 'water', initialQty: 400, wallTime: now });
  if (!c2.ok) return c2;
  const c3 = createItem(c2.value.replica, { name: 'First Aid Kits', unit: 'box', category: 'medicine', initialQty: 30, wallTime: now });
  if (!c3.ok) return c3;
  const c4 = createItem(c3.value.replica, { name: 'Emergency Tents', unit: 'unit', category: 'shelter', initialQty: 45, wallTime: now });
  if (!c4.ok) return c4;
  const c5 = createItem(c4.value.replica, { name: 'Hygiene Kits', unit: 'pack', category: 'hygiene', initialQty: 120, wallTime: now });
  if (!c5.ok) return c5;

  let cur = c5.value.replica;

  const rec1 = receiveGoods(cur, c1.value.itemId, 50, { counterparty: 'BNPB Central Warehouse', wallTime: now });
  if (!rec1.ok) return rec1;
  cur = rec1.value;

  const iss1 = issue(cur, c1.value.itemId, 110, { counterparty: 'Shelter Posko A', wallTime: now });
  if (!iss1.ok) return iss1;
  cur = iss1.value;

  const iss2 = issue(cur, c2.value.itemId, 140, { counterparty: 'Shelter Posko B', wallTime: now });
  if (!iss2.ok) return iss2;
  cur = iss2.value;

  // Issue ~88% of Hygiene Kits so remainingRatio <= 0.15 triggers an open top-up request
  const iss3 = issue(cur, c5.value.itemId, 106, { counterparty: 'Medical Post 1', wallTime: now });
  if (!iss3.ok) return iss3;
  cur = iss3.value;

  const xfer = transferRights(cur, c4.value.itemId, 'bbbb2222', 15);
  if (!xfer.ok) return xfer;
  cur = xfer.value;

  const ovr = emergencyIssue(cur, c3.value.itemId, 35, {
    reason: 'Critical trauma response at Posko Utara',
    counterparty: 'Emergency Clinic',
    wallTime: now,
  });
  if (!ovr.ok) return ovr;

  return { ok: true, value: ovr.value };
}
