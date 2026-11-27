function compareLex(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** UTF-8 JSON, object keys sorted lexicographically, no insignificant whitespace. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => (item === undefined ? 'null' : canonicalJson(item)));
    return `[${parts.join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort(compareLex);
  const entries: string[] = [];
  for (const key of keys) {
    const val = obj[key];
    if (val !== undefined) {
      entries.push(`${JSON.stringify(key)}:${canonicalJson(val)}`);
    }
  }
  return `{${entries.join(',')}}`;
}
