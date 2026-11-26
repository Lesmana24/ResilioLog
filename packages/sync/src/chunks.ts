import { notImplemented } from './errors';

export const DEFAULT_CHUNK_SIZE = 800;
/** `RL1|<msgId>|<i>/<n>|<slice>`, i is 1-based. */
export function chunkBlob(_blob: string, _msgId: string, _size: number = DEFAULT_CHUNK_SIZE): string[] {
  return notImplemented('B-11');
}
export interface ChunkProgress {
  readonly msgId: string;
  readonly received: number;
  readonly total: number;
  readonly complete: boolean;
}
export class ChunkCollector {
  add(_chunk: string): ChunkProgress {
    return notImplemented('B-11');
  }
  /** Throws SyncError('INCOMPLETE_CHUNKS') if not complete. */
  assemble(): string {
    return notImplemented('B-11');
  }
}
