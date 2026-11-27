import { describe, expect, it } from 'vitest';
import exampleEnvelope from '../../../docs/schema/example-envelope.json';
import schemaJson from '../../../docs/schema/schema.json';
import { canonicalJson } from '../src/canonical-json';
import { crc32Hex } from '../src/crc32';
import {
  DistributionEntrySchema,
  EnvelopeSchema,
  QrChunkSchema,
  SignalEnvelopeSchema,
  SyncEnvelopeSchema,
} from '../src/schemas';

describe('sync/schema-example (B-02, B-11)', () => {
  it('W7 schema.json examples[0] validates against Zod and its crc32 verifies', () => {
    const ex0 = schemaJson.examples[0];
    expect(ex0).toBeDefined();

    const parsed0 = SyncEnvelopeSchema.parse(ex0);
    const parsedFile = EnvelopeSchema.parse(exampleEnvelope);
    expect(parsedFile).toEqual(parsed0);

    const canonicalPayload = canonicalJson(parsed0.payload);
    const computedCrc = crc32Hex(new TextEncoder().encode(canonicalPayload));
    expect(computedCrc).toBe('4bd32532');
    expect(computedCrc).toBe(parsed0.crc32);
  });

  it('enforces strict objects, override reason, SignalEnvelope, and QrChunk format', () => {
    expect(
      DistributionEntrySchema.safeParse({
        kind: 'override_issue',
        itemId: 'rice-1-aaaa1111',
        qty: 5,
        by: 'aaaa1111',
        ts: { c: 3, n: 'aaaa1111' },
      }).success,
    ).toBe(false);

    expect(
      DistributionEntrySchema.safeParse({
        kind: 'issue',
        itemId: 'rice-1-aaaa1111',
        qty: 5,
        by: 'aaaa1111',
        ts: { c: 3, n: 'aaaa1111' },
        extraField: 'not allowed',
      }).success,
    ).toBe(false);

    expect(
      SignalEnvelopeSchema.safeParse({
        v: 1,
        type: 'signal',
        msgId: 'abc123',
        from: 'aaaa1111',
        kind: 'offer',
        sdp: 'v=0\r\n...',
      }).success,
    ).toBe(true);

    expect(QrChunkSchema.safeParse('RL1|abc123|1/3|eJwLycgsVgE').success).toBe(true);
    expect(QrChunkSchema.safeParse('RL1|BAD|1/3|eJw').success).toBe(false);
  });
});
