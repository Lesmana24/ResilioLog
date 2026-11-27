import { SyncError } from './errors';

export const DEFAULT_CHUNK_SIZE = 800;

const MSG_ID_RE = /^[a-z0-9]{6}$/;
const CHUNK_RE = /^RL1\|([a-z0-9]{6})\|([0-9]{1,3})\/([0-9]{1,3})\|([A-Za-z0-9_-]+)$/;

/** `RL1|<msgId>|<i>/<n>|<slice>`, i is 1-based. */
export function chunkBlob(
  blob: string,
  msgId: string,
  size: number = DEFAULT_CHUNK_SIZE,
): string[] {
  if (!MSG_ID_RE.test(msgId)) {
    throw new SyncError('BAD_ENCODING', `Invalid msgId: "${msgId}"`);
  }
  if (!Number.isSafeInteger(size) || size < 1) {
    throw new RangeError(`Chunk size must be a positive integer, got ${size}`);
  }
  if (blob.length === 0) {
    throw new SyncError('BAD_ENCODING', 'Cannot chunk an empty blob');
  }

  const total = Math.ceil(blob.length / size);
  if (total > 999) {
    throw new RangeError(`Too many chunks (${total} > 999)`);
  }

  const chunks: string[] = [];
  for (let i = 0; i < total; i++) {
    const slice = blob.slice(i * size, (i + 1) * size);
    chunks.push(`RL1|${msgId}|${i + 1}/${total}|${slice}`);
  }
  return chunks;
}

export interface ChunkProgress {
  readonly msgId: string;
  readonly received: number;
  readonly total: number;
  readonly complete: boolean;
}

export class ChunkCollector {
  private currentMsgId: string | null = null;
  private total = 0;
  private readonly slices = new Map<number, string>();

  add(chunk: string): ChunkProgress {
    const match = CHUNK_RE.exec(chunk);
    if (!match) {
      throw new SyncError('BAD_ENCODING', 'Invalid QR chunk format');
    }

    const msgId = match[1]!;
    const index = Number(match[2]!);
    const total = Number(match[3]!);
    const slice = match[4]!;

    if (total < 1 || index < 1 || index > total) {
      throw new SyncError('BAD_ENCODING', `Invalid chunk index ${index}/${total}`);
    }

    if (this.currentMsgId !== msgId) {
      this.currentMsgId = msgId;
      this.total = total;
      this.slices.clear();
    } else if (this.total !== total) {
      throw new SyncError(
        'BAD_ENCODING',
        `Inconsistent total chunks for ${msgId}: expected ${this.total}, got ${total}`,
      );
    }

    this.slices.set(index, slice);

    return {
      msgId,
      received: this.slices.size,
      total: this.total,
      complete: this.slices.size === this.total,
    };
  }

  /** Throws SyncError('INCOMPLETE_CHUNKS') if not complete. */
  assemble(): string {
    if (this.currentMsgId === null || this.slices.size !== this.total) {
      throw new SyncError('INCOMPLETE_CHUNKS', 'Missing one or more chunks');
    }

    const parts: string[] = [];
    for (let i = 1; i <= this.total; i++) {
      const part = this.slices.get(i);
      if (part === undefined) {
        throw new SyncError('INCOMPLETE_CHUNKS', `Missing chunk ${i}/${this.total}`);
      }
      parts.push(part);
    }
    return parts.join('');
  }
}
