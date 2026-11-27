import { describe, expect, it } from 'vitest';
import type { Replica, ResilioState } from '@resiliolog/crdt-core';
import {
  ChunkCollector,
  SCHEMA_VERSION,
  TOP_UP_THRESHOLD,
  applyDelta,
  bcLocalRights,
  bcRemainingRatio,
  buildEnvelope,
  canonicalize,
  chunkBlob,
  createItem,
  decodeEnvelope,
  emergencyIssue,
  encodeEnvelope,
  issue,
  itemSummary,
  orsElements,
  receiveGoods,
  requestTopUpManual,
  resolveTopUp,
  transferRightsFromDonor,
} from '../src/engine/resilioEngine';
import { getErrorMessage } from '../src/engine/errorMessages';

function makeSeededReplica(nodeId: string): Replica {
  return {
    nodeId,
    clock: 7,
    state: {
      schemaVersion: SCHEMA_VERSION,
      items: {
        sembako: {
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
              poskob07: { poskob07: 200 },
            },
            U: { [nodeId]: 85 },
            O: {},
          },
          touchedAt: { c: 4, n: nodeId },
        },
        'air-19l': {
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
        },
        'trauma-kit': {
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
        },
      },
      distributionLog: {
        adds: {
          [`${nodeId}:4`]: {
            kind: 'receive',
            itemId: 'sembako',
            qty: 25,
            by: nodeId,
            ts: { c: 4, n: nodeId },
            counterparty: 'Petugas #04',
            wallTime: '2026-11-26T07:22:00.000Z',
          },
          [`${nodeId}:5`]: {
            kind: 'receive',
            itemId: 'air-19l',
            qty: 50,
            by: nodeId,
            ts: { c: 5, n: nodeId },
            counterparty: 'Tangki 2',
            wallTime: '2026-11-26T07:15:00.000Z',
          },
          [`${nodeId}:6`]: {
            kind: 'issue',
            itemId: 'trauma-kit',
            qty: 5,
            by: nodeId,
            ts: { c: 6, n: nodeId },
            counterparty: 'Medis 1',
            wallTime: '2026-11-26T06:58:00.000Z',
          },
        },
        removed: [],
      },
      topUpQueue: {
        adds: {
          [`${nodeId}:7`]: {
            itemId: 'sembako',
            requester: nodeId,
            ts: { c: 7, n: nodeId },
          },
        },
        removed: [],
      },
    },
  };
}

describe('packages/app integration with real crdt-core & sync', () => {
  it('1. seeded state passes real buildEnvelope -> encodeEnvelope (fflate) -> chunkBlob -> ChunkCollector -> decodeEnvelope (Zod + CRC32)', () => {
    const r = makeSeededReplica('poskoa04');
    const env = buildEnvelope(r, 0, 'full', 'command1');
    const blob = encodeEnvelope(env);
    const chunks = chunkBlob(blob, env.msgId);

    expect(chunks.length).toBeGreaterThanOrEqual(1);
    const collector = new ChunkCollector();
    let progress = collector.add(chunks[0]!);
    for (let i = 1; i < chunks.length; i++) {
      progress = collector.add(chunks[i]!);
    }
    expect(progress.complete).toBe(true);

    const decoded = decodeEnvelope(collector.assemble());
    expect(decoded.crc32).toBe(env.crc32);
    expect(canonicalize(decoded.payload as ResilioState)).toEqual(canonicalize(r.state));
  });

  it('2. Inventaris - Issue deducts localRights & stock, and blocks overselling with INSUFFICIENT_RIGHTS', () => {
    const r = makeSeededReplica('poskoa04');
    const issued = issue(r, 'sembako', 5, {
      wallTime: '2026-11-27T08:00:00.000Z',
      counterparty: 'Distribution Team',
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    const sembako = issued.value.state.items['sembako']!;
    expect(bcLocalRights(sembako.quota, 'poskoa04')).toBe(10);
    expect(itemSummary(issued.value.state, 'sembako')?.value).toBe(210);

    const oversell = issue(issued.value, 'sembako', 20);
    expect(oversell.ok).toBe(false);
    if (!oversell.ok) {
      expect(oversell.error).toBe('INSUFFICIENT_RIGHTS');
      expect(getErrorMessage(oversell.error, 'en')).toContain('Not enough local quota');
      expect(getErrorMessage(oversell.error, 'id')).toContain('Kuota lokal');
    }
  });

  it('3. Inventaris + Receive increments stock & localRights and appends ISO-8601 log', () => {
    const r = makeSeededReplica('poskoa04');
    const received = receiveGoods(r, 'sembako', 25, {
      wallTime: '2026-11-27T08:05:00.000Z',
      counterparty: 'Armada Kurir #02',
    });
    expect(received.ok).toBe(true);
    if (!received.ok) return;

    const sembako = received.value.state.items['sembako']!;
    expect(itemSummary(received.value.state, 'sembako')?.value).toBe(240);
    expect(bcLocalRights(sembako.quota, 'poskoa04')).toBe(40);
    expect(orsElements(received.value.state.distributionLog)).toHaveLength(4);
  });

  it('4. Emergency Quota Override enforces reason and passes real Zod envelope validation', () => {
    const r = makeSeededReplica('poskoa04');
    const emptyReason = emergencyIssue(r, 'sembako', 20, { reason: '   ' });
    expect(emptyReason.ok).toBe(false);
    if (!emptyReason.ok) {
      expect(emptyReason.error).toBe('REASON_REQUIRED');
    }

    const validOverride = emergencyIssue(r, 'sembako', 20, {
      reason: 'Flood triage test',
      wallTime: '2026-11-27T08:10:00.000Z',
      counterparty: 'poskoa04',
    });
    expect(validOverride.ok).toBe(true);
    if (!validOverride.ok) return;

    const env = buildEnvelope(validOverride.value, 0, 'full');
    const decoded = decodeEnvelope(encodeEnvelope(env));
    const logs = orsElements((decoded.payload as ResilioState).distributionLog);
    expect(logs.some(({ el }) => el.kind === 'override_issue' && el.reason === 'Flood triage test')).toBe(true);
  });

  it('5. Command Center Approve Reroute transfers +100 rights from poskob07 and clears topUpQueue', () => {
    const r = makeSeededReplica('poskoa04');
    const openTopUps = orsElements(r.state.topUpQueue);
    expect(openTopUps).toHaveLength(1);

    const rerouted = transferRightsFromDonor(r, 'sembako', 'poskob07', 'poskoa04', 100);
    expect(rerouted.ok).toBe(true);
    if (!rerouted.ok) return;

    const resolved = resolveTopUp(rerouted.value, openTopUps[0]!.tag);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const sembako = resolved.value.state.items['sembako']!;
    expect(bcLocalRights(sembako.quota, 'poskoa04')).toBe(115);
    expect(bcRemainingRatio(sembako.quota, 'poskoa04')).toBeGreaterThan(TOP_UP_THRESHOLD);
    expect(orsElements(resolved.value.state.topUpQueue)).toHaveLength(0);

    // Must still pass real Zod + CRC32 wire round-trip
    const env = buildEnvelope(resolved.value, 0, 'full');
    expect(() => decodeEnvelope(encodeEnvelope(env))).not.toThrow();
  });

  it('6. 2-node divergent offline operations converge to identical canonical state over real QR chunks', () => {
    let nodeA = makeSeededReplica('poskoa04');
    let nodeB: Replica = {
      nodeId: 'relawanb',
      clock: 0,
      state: makeSeededReplica('poskoa04').state,
    };

    // Divergent ops on A and B while disconnected
    const opA = issue(nodeA, 'sembako', 10, { wallTime: '2026-11-27T08:15:00.000Z' });
    expect(opA.ok).toBe(true);
    if (!opA.ok) return;
    nodeA = opA.value;

    const manualTopUp = requestTopUpManual(nodeA, 'air-19l');
    expect(manualTopUp.ok).toBe(true);
    if (manualTopUp.ok) nodeA = manualTopUp.value;

    const opB1 = createItem(nodeB, {
      name: 'Family Tent 4x6',
      unit: 'Unit',
      category: 'shelter',
      initialQty: 12,
      wallTime: '2026-11-27T08:16:00.000Z',
    });
    expect(opB1.ok).toBe(true);
    if (!opB1.ok) return;
    nodeB = opB1.value.replica;

    const opB2 = receiveGoods(nodeB, 'trauma-kit', 15, {
      wallTime: '2026-11-27T08:17:00.000Z',
      counterparty: 'PMI Relay',
    });
    expect(opB2.ok).toBe(true);
    if (!opB2.ok) return;
    nodeB = opB2.value;

    // A -> B via QR chunks
    const envA = buildEnvelope(nodeA, 0, 'full');
    const chunksA = chunkBlob(encodeEnvelope(envA), envA.msgId);
    const colA = new ChunkCollector();
    for (const c of chunksA) colA.add(c);
    const decA = decodeEnvelope(colA.assemble());
    nodeB = applyDelta(nodeB, decA.payload as ResilioState, decA.until);

    // B -> A via QR chunks
    const envB = buildEnvelope(nodeB, 0, 'full');
    const chunksB = chunkBlob(encodeEnvelope(envB), envB.msgId);
    const colB = new ChunkCollector();
    for (const c of chunksB) colB.add(c);
    const decB = decodeEnvelope(colB.assemble());
    nodeA = applyDelta(nodeA, decB.payload as ResilioState, decB.until);

    expect(canonicalize(nodeA.state)).toEqual(canonicalize(nodeB.state));
  });
});
