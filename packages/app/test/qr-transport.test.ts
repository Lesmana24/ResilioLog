import {
  createItem,
  createReplica,
  type ResilioState,
} from '@resiliolog/crdt-core';
import { decodeEnvelope } from '@resiliolog/sync';
import { describe, expect, it, vi } from 'vitest';
import { prepareQrExport } from '../src/transport/qr-export';
import { QrScanSession } from '../src/transport/qr-scan';

describe('app/transport/qr (F-06)', () => {
  it('prepareQrExport -> QrScanSession reassembles out-of-order and duplicate frames', async () => {
    let r = createReplica('aaaa1111');
    const created = createItem(r, {
      name: 'Rice',
      unit: 'kg',
      category: 'food',
      initialQty: 100,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    r = created.value.replica;

    const exported = prepareQrExport(r, 0, 'bbbb2222');
    expect(exported.type).toBe('full');
    expect(exported.exceedsRecommendedLimit).toBe(false);
    expect(exported.warningMessage).toBeNull();

    const onProgress = vi.fn();
    const onError = vi.fn();
    let completedBlob = '';
    const session = new QrScanSession({
      onProgress,
      onError,
      onComplete: (blob) => {
        completedBlob = blob;
      },
    });

    // Feed reversed + duplicated frames
    for (const ch of [...exported.chunks].reverse()) {
      session.handleFrame(ch);
      session.handleFrame(ch);
    }

    expect(onError).not.toHaveBeenCalled();
    expect(completedBlob).toBe(exported.blob);
    const decoded = decodeEnvelope(completedBlob);
    expect((decoded.payload as ResilioState).items[created.value.itemId]?.meta.name).toBe('Rice');
  });

  it('flags >20 chunks with a clear warning message and resets on msgId change', () => {
    let r = createReplica('aaaa1111');
    for (let i = 0; i < 65; i++) {
      const created = createItem(r, {
        name: `Relief Supply Item Number ${i} Long Description`,
        unit: 'box',
        category: 'other',
        initialQty: i + 1,
      });
      if (created.ok) r = created.value.replica;
    }

    const largeExport = prepareQrExport(r, 0);
    if (largeExport.chunks.length > 20) {
      expect(largeExport.exceedsRecommendedLimit).toBe(true);
      expect(largeExport.warningMessage).toContain('20 QR chunks');
    }

    const onProgress = vi.fn();
    const onError = vi.fn();
    const onComplete = vi.fn();
    const session = new QrScanSession({ onProgress, onError, onComplete });

    // Start one msgId then switch to a new msgId
    session.handleFrame('RL1|aaaaaa|1/2|AAAA');
    const p = session.handleFrame('RL1|bbbbbb|1/2|BBBB');
    expect(p).toEqual({ msgId: 'bbbbbb', received: 1, total: 2, complete: false });

    // Invalid frame triggers onError
    session.handleFrame('invalid-frame');
    expect(onError).toHaveBeenCalledWith('BAD_ENCODING');
  });
});
