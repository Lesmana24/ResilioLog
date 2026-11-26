const envRuns = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env?.FC_RUNS;

export const NUM_RUNS = Number(envRuns ?? 1000);
