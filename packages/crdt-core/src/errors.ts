import type { Result } from './types';

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E extends string>(error: E): Result<never, E> => ({ ok: false, error });

/** Placeholder for unimplemented scaffold functions. Remove when the PLAN.md task is done. */
export function notImplemented(task: string): never {
  throw new Error(`NOT_IMPLEMENTED(${task})`);
}
