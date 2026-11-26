import { notImplemented } from './errors';
/** CRC-32 (IEEE) as 8 lowercase hex chars. Must reproduce docs/schema/example-envelope.json crc32 = 4bd32532. */
export function crc32Hex(_bytes: Uint8Array): string {
  return notImplemented('B-11');
}
