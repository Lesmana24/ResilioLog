import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { chunkBlob, ChunkCollector, DEFAULT_CHUNK_SIZE, SyncError } from '../src';

describe('sync/chunks (B-11)', () => {
  it('W5 & C3 split/reassemble with shuffled order and duplicates returns original blob', () => {
    expect(DEFAULT_CHUNK_SIZE).toBe(800);

    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z0-9_-]{50,2500}$/),
        fc.integer({ min: 20, max: 300 }),
        (blob, chunkSize) => {
          const msgId = 'abc123';
          const chunks = chunkBlob(blob, msgId, chunkSize);
          expect(chunks.length).toBe(Math.ceil(blob.length / chunkSize));
          for (let i = 0; i < chunks.length; i++) {
            expect(chunks[i]!.startsWith(`RL1|${msgId}|${i + 1}/${chunks.length}|`)).toBe(true);
          }

          // Duplicate and reverse/shuffle chunks
          const delivered = [...chunks, ...chunks.slice().reverse()];
          const collector = new ChunkCollector();
          let lastProgress = { msgId, received: 0, total: chunks.length, complete: false };

          for (const ch of delivered) {
            lastProgress = collector.add(ch);
          }

          expect(lastProgress).toEqual({
            msgId,
            received: chunks.length,
            total: chunks.length,
            complete: true,
          });
          expect(collector.assemble()).toBe(blob);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('W6 missing chunk throws SyncError(INCOMPLETE_CHUNKS)', () => {
    const blob = 'A'.repeat(2000);
    const chunks = chunkBlob(blob, 'k3x9ab', 800);
    expect(chunks).toHaveLength(3);

    const collector = new ChunkCollector();
    const p1 = collector.add(chunks[0]!);
    expect(p1).toEqual({ msgId: 'k3x9ab', received: 1, total: 3, complete: false });

    const p2 = collector.add(chunks[2]!);
    expect(p2).toEqual({ msgId: 'k3x9ab', received: 2, total: 3, complete: false });

    try {
      collector.assemble();
      expect.fail('Expected INCOMPLETE_CHUNKS');
    } catch (e) {
      expect(e).toBeInstanceOf(SyncError);
      expect((e as SyncError).code).toBe('INCOMPLETE_CHUNKS');
    }
  });

  it('resets collection when a different msgId arrives mid-scan', () => {
    const chunksA = chunkBlob('A'.repeat(200), 'aaaaaa', 100);
    const chunksB = chunkBlob('B'.repeat(200), 'bbbbbb', 100);

    const collector = new ChunkCollector();
    collector.add(chunksA[0]!);
    const p = collector.add(chunksB[0]!);
    expect(p).toEqual({ msgId: 'bbbbbb', received: 1, total: 2, complete: false });
    collector.add(chunksB[1]!);
    expect(collector.assemble()).toBe('B'.repeat(200));
  });
});
