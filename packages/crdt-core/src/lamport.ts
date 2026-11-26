import type { Lamport, NodeId, Tag } from './types';

const NODE_ID_RE = /^[a-z0-9]{4,16}$/;
const NAT_STR_RE = /^[0-9]+$/;

function compareStrings(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Total order: by c, then n (lexicographic). */
export function compareLamport(a: Lamport, b: Lamport): number {
  if (a.c !== b.c) {
    return a.c < b.c ? -1 : 1;
  }
  return compareStrings(a.n, b.n);
}

/** Formats a Lamport timestamp into its unique string tag `${n}:${c}`. */
export function tagOf(l: Lamport): Tag {
  return `${l.n}:${l.c}`;
}

/** Parses a `${nodeId}:${counter}` tag back into a Lamport timestamp. */
export function parseTag(t: Tag): Lamport {
  const sep = t.indexOf(':');
  if (sep === -1 || t.indexOf(':', sep + 1) !== -1) {
    throw new Error(`Invalid tag format: "${t}"`);
  }
  const n = t.slice(0, sep);
  const cStr = t.slice(sep + 1);
  if (!NODE_ID_RE.test(n) || !NAT_STR_RE.test(cStr)) {
    throw new Error(`Invalid tag components: "${t}"`);
  }
  const c = Number(cStr);
  if (!Number.isSafeInteger(c) || c < 0) {
    throw new RangeError(`Invalid tag counter: "${t}"`);
  }
  return { c, n };
}

/** Advances a local Lamport clock by 1. */
export function tick(clock: number): number {
  if (!Number.isSafeInteger(clock) || clock < 0) {
    throw new RangeError(`Invalid Lamport clock: ${clock}`);
  }
  return clock + 1;
}

/** Advances local clock upon receiving a remote clock: max(local, remote) + 1. */
export function receive(local: number, remote: number): number {
  if (!Number.isSafeInteger(local) || local < 0) {
    throw new RangeError(`Invalid local Lamport clock: ${local}`);
  }
  if (!Number.isSafeInteger(remote) || remote < 0) {
    throw new RangeError(`Invalid remote Lamport clock: ${remote}`);
  }
  return Math.max(local, remote) + 1;
}

/** Returns the greater of two Lamport timestamps under compareLamport. */
export function maxLamport(a: Lamport, b: Lamport): Lamport {
  return compareLamport(a, b) >= 0 ? a : b;
}

/** Constructs a validated Lamport timestamp. */
export function makeLamport(c: number, n: NodeId): Lamport {
  if (!Number.isSafeInteger(c) || c < 0) {
    throw new RangeError(`Invalid Lamport counter: ${c}`);
  }
  if (!NODE_ID_RE.test(n)) {
    throw new Error(`Invalid NodeId: "${n}"`);
  }
  return { c, n };
}
