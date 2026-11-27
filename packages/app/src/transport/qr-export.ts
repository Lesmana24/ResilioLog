import type { NodeId, Replica } from '@resiliolog/crdt-core';
import {
  buildEnvelope,
  chunkBlob,
  DEFAULT_CHUNK_SIZE,
  encodeEnvelope,
} from '@resiliolog/sync';
import QRCode from 'qrcode';

export const MAX_RECOMMENDED_QR_CHUNKS = 20;
export const DEFAULT_QR_CYCLE_MS = 400; // 2.5 QR frames per second (within 2-3/s)

export interface PreparedQrExport {
  readonly msgId: string;
  readonly type: 'delta' | 'full';
  readonly blob: string;
  readonly chunks: readonly string[];
  readonly exceedsRecommendedLimit: boolean;
  readonly warningMessage: string | null;
}

export function prepareQrExport(
  replica: Replica,
  sinceCursor: number,
  peerNodeId?: NodeId,
): PreparedQrExport {
  const type = sinceCursor === 0 ? 'full' : 'delta';
  const env = buildEnvelope(replica, sinceCursor, type, peerNodeId);
  const blob = encodeEnvelope(env);
  const chunks = chunkBlob(blob, env.msgId, DEFAULT_CHUNK_SIZE);
  const exceedsRecommendedLimit = chunks.length > MAX_RECOMMENDED_QR_CHUNKS;

  return {
    msgId: env.msgId,
    type,
    blob,
    chunks,
    exceedsRecommendedLimit,
    warningMessage: exceedsRecommendedLimit
      ? `This sync payload requires ${chunks.length} QR chunks (above ${MAX_RECOMMENDED_QR_CHUNKS}). Use full-file or WebRTC sync instead.`
      : null,
  };
}

export async function renderQrDataUrl(chunk: string): Promise<string> {
  return QRCode.toDataURL(chunk, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
  });
}
