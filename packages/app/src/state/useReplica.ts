import {
  err,
  ok,
  type Replica,
  type ResilioState,
  type Result,
} from '@resiliolog/crdt-core';
import {
  applyDelta,
  decodeEnvelope,
  SyncError,
  type SyncErrorCode,
} from '@resiliolog/sync';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  loadReplica,
  requestPersistence,
  saveReplica,
  setCursor,
} from '../storage/db';

export type ReplicaOp = (replica: Replica) => Result<Replica>;

export interface ReplicaContextValue {
  readonly replica: Replica | null;
  readonly loading: boolean;
  readonly storagePersistent: boolean | null;
  readonly run: (op: ReplicaOp) => Promise<Result<Replica>>;
  readonly importEnvelope: (
    blob: string,
  ) => Promise<Result<Replica, SyncErrorCode | 'NOT_READY'>>;
}

const ReplicaContext = createContext<ReplicaContextValue | null>(null);

export function ReplicaProvider({ children }: { readonly children: ReactNode }) {
  const [replica, setReplica] = useState<Replica | null>(null);
  const [loading, setLoading] = useState(true);
  const [storagePersistent, setStoragePersistent] = useState<boolean | null>(null);
  const replicaRef = useRef<Replica | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [loaded, persisted] = await Promise.all([
          loadReplica(),
          requestPersistence(),
        ]);
        if (!active) return;
        replicaRef.current = loaded;
        setReplica(loaded);
        setStoragePersistent(persisted);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const run = useCallback(async (op: ReplicaOp): Promise<Result<Replica>> => {
    const current = replicaRef.current;
    if (!current) {
      throw new Error('Replica is not loaded yet');
    }
    const res = op(current);
    if (!res.ok) {
      return res;
    }
    await saveReplica(res.value);
    replicaRef.current = res.value;
    setReplica(res.value);
    return res;
  }, []);

  const importEnvelope = useCallback(
    async (
      blob: string,
    ): Promise<Result<Replica, SyncErrorCode | 'NOT_READY'>> => {
      const current = replicaRef.current;
      if (!current) {
        return err('NOT_READY');
      }
      try {
        const env = decodeEnvelope(blob);
        const updated = applyDelta(
          current,
          env.payload as ResilioState,
          env.until,
        );
        await saveReplica(updated);
        await setCursor(env.from, env.until);
        replicaRef.current = updated;
        setReplica(updated);
        return ok(updated);
      } catch (e) {
        if (e instanceof SyncError) {
          return err(e.code);
        }
        throw e;
      }
    },
    [],
  );

  return createElement(
    ReplicaContext.Provider,
    {
      value: {
        replica,
        loading,
        storagePersistent,
        run,
        importEnvelope,
      },
    },
    children,
  );
}

export function useReplica(): ReplicaContextValue {
  const ctx = useContext(ReplicaContext);
  if (!ctx) {
    throw new Error('useReplica must be used within a ReplicaProvider');
  }
  return ctx;
}
