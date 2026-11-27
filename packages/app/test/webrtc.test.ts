import { createItem, createReplica, type ResilioState } from '@resiliolog/crdt-core';
import { buildEnvelope, ChunkCollector, SyncError } from '@resiliolog/sync';
import { describe, expect, it } from 'vitest';
import {
  DataChannelAssembler,
  decodeSignalFromBlob,
  encodeSignalToQrChunks,
  splitDataChannelMessage,
  WEBRTC_MAX_CHUNK_BYTES,
} from '../src/transport/webrtc';

describe('app/transport/webrtc (F-07)', () => {
  it('encodes and decodes SignalEnvelope (offer/answer) via QR chunks', () => {
    const { msgId, chunks } = encodeSignalToQrChunks('aaaa1111', 'offer', 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\n');
    expect(chunks.length).toBeGreaterThanOrEqual(1);

    const collector = new ChunkCollector();
    for (const ch of [...chunks].reverse()) {
      collector.add(ch);
    }
    const decoded = decodeSignalFromBlob(collector.assemble());
    expect(decoded).toMatchObject({
      v: 1,
      type: 'signal',
      msgId,
      from: 'aaaa1111',
      kind: 'offer',
    });
  });

  it('splits SyncEnvelope strings > 16 KB and reassembles them cleanly', () => {
    let r = createReplica('aaaa1111');
    for (let i = 0; i < 60; i++) {
      const created = createItem(r, {
        name: `Emergency Item ${i} With Extra Name`,
        unit: 'box',
        category: 'medicine',
        initialQty: i + 1,
      });
      if (created.ok) r = created.value.replica;
    }

    const env = buildEnvelope(r, 0, 'full', 'bbbb2222');
    const json = JSON.stringify(env);
    expect(json.length).toBeGreaterThan(WEBRTC_MAX_CHUNK_BYTES);

    const parts = splitDataChannelMessage(json, env.msgId);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) {
      expect(p.startsWith(`RLDC1|${env.msgId}|`)).toBe(true);
    }

    const assembler = new DataChannelAssembler();
    let assembled = null;
    for (const p of parts) {
      assembled = assembler.push(p);
    }
    expect(assembled).not.toBeNull();
    expect(Object.keys((assembled!.payload as ResilioState).items)).toHaveLength(60);
  });

  it('rejects tampered CRC on WebRTC DataChannel SyncEnvelope', () => {
    const r = createReplica('aaaa1111');
    const env = buildEnvelope(r, 0, 'full');
    const bad = { ...env, crc32: env.crc32 === '00000000' ? 'ffffffff' : '00000000' };

    const assembler = new DataChannelAssembler();
    try {
      assembler.push(JSON.stringify(bad));
      expect.fail('Expected CRC_MISMATCH');
    } catch (e) {
      expect(e).toBeInstanceOf(SyncError);
      expect((e as SyncError).code).toBe('CRC_MISMATCH');
    }
  });
});
