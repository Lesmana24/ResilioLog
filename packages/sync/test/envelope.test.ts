import { createItem, createReplica, issue, receiveGoods } from '@resiliolog/crdt-core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { deflateSync } from 'fflate';
import {
  buildEnvelope,
  decodeEnvelope,
  encodeEnvelope,
  SyncError,
  type SyncEnvelopeLike,
} from '../src';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('sync/envelope (B-11)', () => {
  it('W1 decode(encode(env)) equals env for random envelopes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 50 }),
        fc.constantFrom('delta', 'full' as const),
        (inQty, outQty, type) => {
          let r = createReplica('aaaa1111');
          const created = createItem(r, {
            name: 'Rice',
            unit: 'kg',
            category: 'food',
            initialQty: inQty,
          });
          if (!created.ok) throw new Error(created.error);
          r = created.value.replica;
          const itemId = created.value.itemId;

          const rec = receiveGoods(r, itemId, 10, { counterparty: 'Hub' });
          if (rec.ok) r = rec.value;

          const iss = issue(r, itemId, Math.min(outQty, inQty));
          if (iss.ok) r = iss.value;

          const env = buildEnvelope(r, 0, type, 'bbbb2222');
          const blob = encodeEnvelope(env);
          const decoded = decodeEnvelope(blob);
          expect(decoded).toEqual(env);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('W2 corrupting one char throws SyncError and does not touch replica', () => {
    let r = createReplica('aaaa1111');
    const created = createItem(r, {
      name: 'Water',
      unit: 'L',
      category: 'water',
      initialQty: 50,
    });
    if (!created.ok) throw new Error(created.error);
    r = created.value.replica;
    const snap = structuredClone(r);

    const blob = encodeEnvelope(buildEnvelope(r, 0, 'delta'));
    const mid = Math.floor(blob.length / 2);
    const replacement = blob[mid] === 'A' ? 'B' : 'A';
    const corrupted = blob.slice(0, mid) + replacement + blob.slice(mid + 1);

    expect(() => decodeEnvelope(corrupted)).toThrow(SyncError);
    expect(r).toEqual(snap);
  });

  it('W3 wrong crc32 throws SyncError(CRC_MISMATCH)', () => {
    const r = createReplica('aaaa1111');
    const env = buildEnvelope(r, 0, 'full');
    const badEnv: SyncEnvelopeLike = {
      ...env,
      crc32: env.crc32 === '00000000' ? 'ffffffff' : '00000000',
    };
    const blob = encodeEnvelope(badEnv);

    try {
      decodeEnvelope(blob);
      expect.fail('Expected CRC_MISMATCH');
    } catch (e) {
      expect(e).toBeInstanceOf(SyncError);
      expect((e as SyncError).code).toBe('CRC_MISMATCH');
    }
  });

  it('W4 schemaVersion != 1 or v != 1 throws SyncError(SCHEMA_VERSION_MISMATCH)', () => {
    const r = createReplica('aaaa1111');
    const env = buildEnvelope(r, 0, 'full');

    const badPayloadVersion = {
      ...env,
      payload: { ...(env.payload as object), schemaVersion: 2 },
    };
    const blob1 = toBase64Url(
      deflateSync(new TextEncoder().encode(JSON.stringify(badPayloadVersion)), { level: 9 }),
    );
    try {
      decodeEnvelope(blob1);
      expect.fail('Expected SCHEMA_VERSION_MISMATCH');
    } catch (e) {
      expect(e).toBeInstanceOf(SyncError);
      expect((e as SyncError).code).toBe('SCHEMA_VERSION_MISMATCH');
    }

    const badEnvVersion = { ...env, v: 2 };
    const blob2 = toBase64Url(
      deflateSync(new TextEncoder().encode(JSON.stringify(badEnvVersion)), { level: 9 }),
    );
    try {
      decodeEnvelope(blob2);
      expect.fail('Expected SCHEMA_VERSION_MISMATCH');
    } catch (e) {
      expect(e).toBeInstanceOf(SyncError);
      expect((e as SyncError).code).toBe('SCHEMA_VERSION_MISMATCH');
    }
  });

  it('throws BAD_ENCODING, BAD_COMPRESSION, BAD_JSON, and SCHEMA_INVALID on malformed inputs', () => {
    expect(() => decodeEnvelope('not!base64url!')).toThrow(SyncError);
    try {
      decodeEnvelope('not!base64url!');
    } catch (e) {
      expect((e as SyncError).code).toBe('BAD_ENCODING');
    }

    const badDeflate = toBase64Url(new Uint8Array([1, 2, 3, 4, 5]));
    try {
      decodeEnvelope(badDeflate);
    } catch (e) {
      expect((e as SyncError).code).toBe('BAD_COMPRESSION');
    }

    const badJson = toBase64Url(deflateSync(new TextEncoder().encode('{bad json')));
    try {
      decodeEnvelope(badJson);
    } catch (e) {
      expect((e as SyncError).code).toBe('BAD_JSON');
    }

    const badSchema = toBase64Url(deflateSync(new TextEncoder().encode(JSON.stringify({ v: 1 }))));
    try {
      decodeEnvelope(badSchema);
    } catch (e) {
      expect((e as SyncError).code).toBe('SCHEMA_INVALID');
    }
  });
});
