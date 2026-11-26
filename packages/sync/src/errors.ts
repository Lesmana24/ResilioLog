export type SyncErrorCode =
  | 'BAD_ENCODING'
  | 'BAD_COMPRESSION'
  | 'BAD_JSON'
  | 'SCHEMA_INVALID'
  | 'CRC_MISMATCH'
  | 'SCHEMA_VERSION_MISMATCH'
  | 'INCOMPLETE_CHUNKS';

export class SyncError extends Error {
  constructor(
    public readonly code: SyncErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'SyncError';
  }
}

export function notImplemented(task: string): never {
  throw new Error(`NOT_IMPLEMENTED(${task})`);
}
