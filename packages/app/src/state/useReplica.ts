import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ok,
  err,
  type ItemId,
  type NodeId,
  type Replica,
  type ResilioState,
  type Result,
  type Tag,
} from '@resiliolog/crdt-core';
import { SyncError, type ChunkProgress } from '@resiliolog/sync';
import {
  ChunkCollector,
  DEFAULT_CHUNK_SIZE,
  applyDelta,
  bcGranted,
  bcLocalRights,
  bcRemainingRatio,
  buildEnvelope,
  chunkBlob,
  decodeEnvelope,
  encodeEnvelope,
  emergencyIssue,
  issue,
  itemSummary,
  orsElements,
  receiveGoods,
  requestTopUpManual,
  resolveTopUp,
  transferRightsFromDonor,
  voidLogEntry,
} from '../engine/resilioEngine';
import {
  getErrorMessage,
  type AnyEngineErrorCode,
  type AppLanguage,
} from '../engine/errorMessages';
import {
  ACTIVE_NODE_PARAM,
  DISPATCH_QR_PREFIX,
  addRatifiedOverride,
  db,
  decodeCourierDispatchQr,
  encodeCourierDispatchQr,
  ensureSeededReplica,
  getRatifiedOverrides,
  markCourierDispatchStopDelivered,
  normalizeCourierDispatch,
  requestPersistentStorage,
  saveReplicaAtomic,
  upsertCourierDispatch,
  type CourierDispatch,
  type DispatchLineItem,
  type DispatchStop,
  type KvRow,
  type PeerCursorRow,
  type ReplicaRow,
} from '../storage/db';

interface MeshMessage {
  kind: 'envelope' | 'ping';
  fromNodeParam: string;
  fromNodeId: NodeId;
  blob?: string;
}

export interface ToastNotice {
  id: number;
  tone: 'success' | 'warning' | 'error';
  title: string;
  detail: string;
}

export interface ItemViewModel {
  id: ItemId;
  name: string;
  unit: string;
  category: string;
  stock: number;
  ledgerIn: number;
  ledgerOut: number;
  granted: number;
  localRights: number;
  remainingRatio: number;
  deficit: number;
  priority: number;
}

const MESH_CHANNEL_NAME = 'resiliolog-mesh';

function priorityForCategory(category: string): number {
  if (category === 'medicine' || category === 'food') return 1;
  if (category === 'water') return 2;
  return 3;
}

function formatNowIso(): string {
  return new Date().toISOString();
}

export function useReplica(lang: AppLanguage) {
  const [dbReady, setDbReady] = useState(false);
  const [persistenceGranted, setPersistenceGranted] = useState<boolean | null>(null);
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const [nearbyPeers, setNearbyPeers] = useState<Record<string, string>>({});
  const [qrProgress, setQrProgress] = useState<ChunkProgress | null>(null);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const collectorRef = useRef<ChunkCollector>(new ChunkCollector());
  const replicaRef = useRef<Replica | null>(null);
  const langRef = useRef<AppLanguage>(lang);
  langRef.current = lang;

  const pushToast = useCallback(
    (tone: ToastNotice['tone'], title: string, detail: string) => {
      setToast({ id: Date.now(), tone, title, detail });
    },
    [],
  );

  // Clear toast automatically after 3.8s
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast((cur) => (cur?.id === toast.id ? null : cur));
    }, 3800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Boot Dexie DB, seed idempotently, and request persistent storage
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const seeded = await ensureSeededReplica();
        const persisted = await requestPersistentStorage(false);
        if (!active) return;
        replicaRef.current = seeded;
        setPersistenceGranted(persisted);
        setDbReady(true);
      } catch (e) {
        console.error('Failed to boot Dexie replica:', e);
        if (active) setDbReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const requestPersistenceNow = useCallback(async (): Promise<boolean> => {
    const granted = await requestPersistentStorage(true);
    setPersistenceGranted(granted);
    const l = langRef.current;
    if (granted) {
      pushToast(
        'success',
        l === 'en' ? 'Persistent Storage Enabled' : 'Penyimpanan Persisten Aktif',
        l === 'en'
          ? 'IndexedDB is now protected from browser storage eviction.'
          : 'IndexedDB kini terlindungi dari pembersihan otomatis browser.',
      );
    } else {
      pushToast(
        'warning',
        l === 'en' ? 'Persistence Not Granted' : 'Penyimpanan Persisten Belum Diizinkan',
        l === 'en'
          ? 'Allow notifications or install as PWA to enable persistent storage in Chrome.'
          : 'Izinkan notifikasi atau pasang sebagai PWA untuk mengaktifkan penyimpanan persisten.',
      );
    }
    return granted;
  }, [pushToast]);

  const currentRow = useLiveQuery<ReplicaRow | undefined>(
    async () => (dbReady ? await db.state.get('current') : undefined),
    [dbReady],
  );

  const cursors =
    useLiveQuery<PeerCursorRow[]>(
      async () => (dbReady ? await db.cursors.toArray() : []),
      [dbReady],
    ) ?? [];

  const ratifiedRow = useLiveQuery<KvRow | undefined>(
    async () => (dbReady ? await db.kv.get('ratifiedOverrides') : undefined),
    [dbReady],
  );

  const ratifiedOverrides = useMemo<string[]>(() => {
    if (!ratifiedRow) return [];
    try {
      const parsed: unknown = JSON.parse(ratifiedRow.value);
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === 'string')
        : [];
    } catch {
      return [];
    }
  }, [ratifiedRow]);

  const dispatchRow = useLiveQuery<KvRow | undefined>(
    async () => (dbReady ? await db.kv.get('courierDispatches') : undefined),
    [dbReady],
  );

  const courierDispatches = useMemo<CourierDispatch[]>(() => {
    if (!dispatchRow) return [];
    try {
      const parsed: unknown = JSON.parse(dispatchRow.value);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => normalizeCourierDispatch(item))
        .filter((x): x is CourierDispatch => x !== null);
    } catch {
      return [];
    }
  }, [dispatchRow]);

  const replica: Replica | null = useMemo(() => {
    if (!currentRow) return null;
    const r: Replica = {
      nodeId: currentRow.nodeId,
      clock: currentRow.clock,
      state: currentRow.state,
    };
    replicaRef.current = r;
    return r;
  }, [currentRow]);

  // Helper to apply incoming encoded envelope and persist atomically
  const mergeEncodedEnvelope = useCallback(
    async (blob: string, peerLabel?: string): Promise<Result<Replica, AnyEngineErrorCode>> => {
      const current = replicaRef.current;
      if (!current) return err('SCHEMA_INVALID');
      try {
        const env = decodeEnvelope(blob);
        if (env.from === current.nodeId) {
          return ok(current);
        }
        const remoteState = env.payload as ResilioState;
        if (!remoteState || remoteState.schemaVersion !== 1) {
          return err('SCHEMA_VERSION_MISMATCH');
        }
        const merged = applyDelta(current, remoteState, env.until);
        await saveReplicaAtomic(merged);
        await db.cursors.put({
          peerId: env.from,
          until: env.until,
          lastSyncAt: new Date().toISOString(),
          ...(peerLabel !== undefined ? { label: peerLabel } : {}),
        });
        replicaRef.current = merged;
        return ok(merged);
      } catch (e) {
        if (e instanceof SyncError) {
          return err(e.code);
        }
        return err('BAD_JSON');
      }
    },
    [],
  );

  // Open BroadcastChannel('resiliolog-mesh') for cross-tab P2P mesh sync
  useEffect(() => {
    if (!dbReady || !replica?.nodeId || typeof BroadcastChannel === 'undefined') {
      return;
    }
    const ch = new BroadcastChannel(MESH_CHANNEL_NAME);
    channelRef.current = ch;

    const myNodeId = replica.nodeId;
    ch.postMessage({
      kind: 'ping',
      fromNodeParam: ACTIVE_NODE_PARAM,
      fromNodeId: myNodeId,
    } satisfies MeshMessage);

    ch.onmessage = async (event: MessageEvent<MeshMessage>) => {
      const msg = event.data;
      if (!msg || msg.fromNodeId === myNodeId) return;

      setNearbyPeers((prev) => ({
        ...prev,
        [msg.fromNodeId]: msg.fromNodeParam,
      }));

      if (msg.kind === 'ping') {
        ch.postMessage({
          kind: 'envelope',
          fromNodeParam: ACTIVE_NODE_PARAM,
          fromNodeId: myNodeId,
          blob: replicaRef.current
            ? encodeEnvelope(buildEnvelope(replicaRef.current, 0, 'full'))
            : '',
        } satisfies MeshMessage);
        return;
      }

      if (msg.kind === 'envelope' && msg.blob) {
        const res = await mergeEncodedEnvelope(msg.blob, msg.fromNodeParam);
        const l = langRef.current;
        if (res.ok) {
          pushToast(
            'success',
            l === 'en' ? 'P2P Mesh Converged' : 'Mesh P2P Konvergen',
            l === 'en'
              ? `Merged state from ${msg.fromNodeParam} (${msg.fromNodeId}).`
              : `State digabungkan dari ${msg.fromNodeParam} (${msg.fromNodeId}).`,
          );
        } else {
          pushToast(
            'error',
            l === 'en' ? 'Sync Error' : 'Gagal Sinkronisasi',
            getErrorMessage(res.error, l),
          );
        }
      }
    };

    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, [dbReady, replica?.nodeId, mergeEncodedEnvelope, pushToast]);

  const commitOperation = useCallback(
    async (
      result: Result<Replica, AnyEngineErrorCode>,
      successTitle: string,
      successDetail: string,
      tone: ToastNotice['tone'] = 'success',
    ): Promise<Result<Replica, AnyEngineErrorCode>> => {
      if (!result.ok) {
        pushToast(
          'error',
          langRef.current === 'en' ? 'Action Blocked' : 'Aksi Ditolak',
          getErrorMessage(result.error, langRef.current),
        );
        return result;
      }
      await saveReplicaAtomic(result.value);
      replicaRef.current = result.value;
      pushToast(tone, successTitle, successDetail);
      return result;
    },
    [pushToast],
  );

  const doReceive = useCallback(
    async (itemId: ItemId, qty: number, counterparty?: string, note?: string) => {
      const current = replicaRef.current;
      if (!current) return err('UNKNOWN_ITEM');
      const res = receiveGoods(current, itemId, qty, {
        wallTime: formatNowIso(),
        counterparty: counterparty || (langRef.current === 'en' ? 'Field Volunteer' : 'Petugas Lapangan'),
        ...(note ? { note } : {}),
      });
      return commitOperation(
        res,
        langRef.current === 'en' ? 'Saved Offline' : 'Tersimpan di Memori Lokal',
        langRef.current === 'en'
          ? `+${qty} units persisted atomically to IndexedDB.`
          : `+${qty} unit disimpan atomik ke IndexedDB.`,
      );
    },
    [commitOperation],
  );

  const doIssue = useCallback(
    async (itemId: ItemId, qty: number, counterparty?: string, note?: string) => {
      const current = replicaRef.current;
      if (!current) return err('UNKNOWN_ITEM');
      const res = issue(current, itemId, qty, {
        wallTime: formatNowIso(),
        counterparty: counterparty || (langRef.current === 'en' ? 'Distribution Team' : 'Tim Penyalur'),
        ...(note ? { note } : {}),
      });
      return commitOperation(
        res,
        langRef.current === 'en' ? 'Distribution Recorded' : 'Penyaluran Tercatat',
        langRef.current === 'en'
          ? `-${qty} units deducted from local quota & persisted.`
          : `-${qty} unit dipotong dari kuota lokal & disimpan.`,
      );
    },
    [commitOperation],
  );

  const doEmergencyIssue = useCallback(
    async (itemId: ItemId, qty: number, reason: string) => {
      const current = replicaRef.current;
      if (!current) return err('UNKNOWN_ITEM');
      const res = emergencyIssue(current, itemId, qty, {
        reason,
        wallTime: formatNowIso(),
        counterparty: ACTIVE_NODE_PARAM,
      });
      return commitOperation(
        res,
        langRef.current === 'en' ? 'Emergency Override Logged' : 'Bypass Darurat Dicatat',
        langRef.current === 'en'
          ? `-${qty} units issued under audit flag.`
          : `-${qty} unit disalurkan dengan tanda audit.`,
        'warning',
      );
    },
    [commitOperation],
  );

  const doRequestTopUp = useCallback(
    async (itemId: ItemId) => {
      const current = replicaRef.current;
      if (!current) return err('UNKNOWN_ITEM');
      const res = requestTopUpManual(current, itemId);
      return commitOperation(
        res,
        langRef.current === 'en' ? 'Top-Up Requested' : 'Permintaan Kuota Dikirim',
        langRef.current === 'en'
          ? 'Added to OR-Set top-up queue for Command Center.'
          : 'Ditambahkan ke antrean top-up OR-Set untuk Command Center.',
      );
    },
    [commitOperation],
  );

  const doApproveReroute = useCallback(
    async (itemId: ItemId, qty: number, topUpTag?: Tag) => {
      const current = replicaRef.current;
      if (!current) return err('UNKNOWN_ITEM');

      // Transfer quota from surplus Posko B-07 (nodeId 'poskob07') to active node
      const transferred = transferRightsFromDonor(current, itemId, 'poskob07', current.nodeId, qty);
      if (!transferred.ok) {
        return commitOperation(transferred, '', '');
      }
      let nextReplica = transferred.value;
      if (topUpTag) {
        const resolved = resolveTopUp(nextReplica, topUpTag);
        if (resolved.ok) nextReplica = resolved.value;
      }

      // Broadcast updated state to other open tabs as well
      const res = await commitOperation(
        ok(nextReplica),
        langRef.current === 'en' ? 'Reroute Approved' : 'Reroute Disetujui',
        langRef.current === 'en'
          ? `Transferred +${qty} quota rights from Posko B-07.`
          : `Mentransfer +${qty} hak kuota dari Posko B-07.`,
      );
      if (res.ok && channelRef.current) {
        const blob = encodeEnvelope(buildEnvelope(res.value, 0, 'full'));
        channelRef.current.postMessage({
          kind: 'envelope',
          fromNodeParam: ACTIVE_NODE_PARAM,
          fromNodeId: res.value.nodeId,
          blob,
        } satisfies MeshMessage);
      }
      return res;
    },
    [commitOperation],
  );

  const doVoidLog = useCallback(
    async (tag: Tag) => {
      const current = replicaRef.current;
      if (!current) return err('UNKNOWN_ITEM');
      const res = voidLogEntry(current, tag);
      return commitOperation(
        res,
        langRef.current === 'en' ? 'Log Entry Hidden' : 'Entri Log Disembunyikan',
        langRef.current === 'en'
          ? 'Removed from OR-Set display; CRDT counters preserved.'
          : 'Dihapus dari tampilan OR-Set; penghitung CRDT tetap utuh.',
      );
    },
    [commitOperation],
  );

  const doRatifyOverride = useCallback(
    async (overrideId: string) => {
      await addRatifiedOverride(overrideId);
      await getRatifiedOverrides();
      pushToast(
        'success',
        langRef.current === 'en' ? 'Override Ratified' : 'Override Diratifikasi',
        langRef.current === 'en'
          ? `Audit record ${overrideId} marked as ratified.`
          : `Catatan audit ${overrideId} ditandai telah diratifikasi.`,
      );
    },
    [pushToast],
  );

  const broadcastDelta = useCallback(async () => {
    const current = replicaRef.current;
    if (!current) return;
    const env = buildEnvelope(current, 0, 'full');
    const blob = encodeEnvelope(env);

    channelRef.current?.postMessage({
      kind: 'envelope',
      fromNodeParam: ACTIVE_NODE_PARAM,
      fromNodeId: current.nodeId,
      blob,
    } satisfies MeshMessage);

    await db.cursors.put({
      peerId: 'mesh-broadcast',
      until: current.clock,
      lastSyncAt: new Date().toISOString(),
      label: 'BroadcastChannel',
    });

    pushToast(
      'success',
      langRef.current === 'en' ? 'Mesh Delta Broadcasted' : 'Delta Mesh Dikirim',
      langRef.current === 'en'
        ? `Sent ${blob.length} chars (CRC ${env.crc32}) to open tabs.`
        : `Mengirim ${blob.length} karakter (CRC ${env.crc32}) ke tab terbuka.`,
    );
  }, [pushToast]);

  const getQrChunks = useCallback((): {
    chunks: string[];
    msgId: string;
    crc32: string;
    totalChars: number;
  } => {
    const current = replicaRef.current;
    if (!current) {
      return { chunks: [], msgId: '', crc32: '', totalChars: 0 };
    }
    const env = buildEnvelope(current, 0, 'full');
    const blob = encodeEnvelope(env);
    const chunks = chunkBlob(blob, env.msgId, DEFAULT_CHUNK_SIZE);
    return {
      chunks,
      msgId: env.msgId,
      crc32: env.crc32,
      totalChars: blob.length,
    };
  }, []);

  const importQrFrame = useCallback(
    async (frameText: string): Promise<Result<ChunkProgress, AnyEngineErrorCode>> => {
      const trimmed = frameText.trim();
      if (trimmed.startsWith(DISPATCH_QR_PREFIX)) {
        const parsed = decodeCourierDispatchQr(trimmed);
        if (!parsed) {
          pushToast(
            'error',
            langRef.current === 'en' ? 'Invalid Dispatch QR' : 'QR Tugas Tidak Valid',
            langRef.current === 'en'
              ? 'Could not parse RLD1 dispatch payload.'
              : 'Gagal membaca payload QR tugas RLD1.',
          );
          return err('BAD_ENCODING');
        }
        await upsertCourierDispatch(parsed);
        const l = langRef.current;
        const totalLines = parsed.stops.reduce((acc, s) => acc + s.items.length, 0);
        pushToast(
          'success',
          l === 'en' ? 'Dispatch Task Received' : 'Tugas Pengiriman Diterima',
          l === 'en'
            ? `${parsed.id}: ${parsed.stops.length} post(s), ${totalLines} item(s) loaded.`
            : `${parsed.id}: ${parsed.stops.length} posko, ${totalLines} jenis logistik diterima.`,
        );
        return ok({ msgId: parsed.id, received: 1, total: 1, complete: true });
      }
      try {
        const progress = collectorRef.current.add(frameText);
        setQrProgress(progress);
        if (!progress.complete) {
          return ok(progress);
        }
        const blob = collectorRef.current.assemble();
        const merged = await mergeEncodedEnvelope(blob, 'qr-courier');
        collectorRef.current = new ChunkCollector();
        if (!merged.ok) {
          pushToast(
            'error',
            langRef.current === 'en' ? 'QR Import Failed' : 'Impor QR Gagal',
            getErrorMessage(merged.error, langRef.current),
          );
          return err(merged.error);
        }
        pushToast(
          'success',
          langRef.current === 'en' ? 'QR Sync Complete' : 'Sinkronisasi QR Selesai',
          langRef.current === 'en'
            ? `Reassembled ${progress.total} frames & merged CRDT state.`
            : `Menggabungkan ${progress.total} frame & menyatukan state CRDT.`,
        );
        return ok(progress);
      } catch (e) {
        const code: AnyEngineErrorCode = e instanceof SyncError ? e.code : 'BAD_ENCODING';
        pushToast(
          'error',
          langRef.current === 'en' ? 'Invalid QR Frame' : 'Frame QR Tidak Valid',
          getErrorMessage(code, langRef.current),
        );
        return err(code);
      }
    },
    [mergeEncodedEnvelope, pushToast],
  );

  const simulateCourierArrival = useCallback(async () => {
    const current = replicaRef.current;
    if (!current) return;
    const env = buildEnvelope(current, 0, 'full', 'command1');
    const blob = encodeEnvelope(env);
    const frames = chunkBlob(blob, env.msgId, DEFAULT_CHUNK_SIZE);

    channelRef.current?.postMessage({
      kind: 'envelope',
      fromNodeParam: ACTIVE_NODE_PARAM,
      fromNodeId: current.nodeId,
      blob,
    } satisfies MeshMessage);

    await db.cursors.put({
      peerId: 'command-center',
      until: env.until,
      lastSyncAt: new Date().toISOString(),
      label: 'Courier QR Relay',
    });

    pushToast(
      'success',
      langRef.current === 'en' ? 'Courier Relay Delivered' : 'Relai Kurir Diterima Pusat',
      langRef.current === 'en'
        ? `Transferred ${frames.length} QR frame(s) (CRC ${env.crc32}) to Command Center.`
        : `Mentransfer ${frames.length} frame QR (CRC ${env.crc32}) ke Command Center.`,
    );
  }, [pushToast]);

  const createCourierDispatch = useCallback(
    async (input: {
      courierId: string;
      stops: Array<{ toPost: string; items: DispatchLineItem[]; note?: string }>;
      from?: string;
    }): Promise<{ dispatch: CourierDispatch; qrText: string }> => {
      const stops: DispatchStop[] = input.stops.map((s, idx) => ({
        id: `STOP-${idx + 1}`,
        toPost: s.toPost,
        items: s.items.map((it) => ({
          itemId: it.itemId,
          qty: Math.max(1, Math.round(it.qty)),
        })),
        ...(s.note && s.note.trim() ? { note: s.note.trim() } : {}),
        status: 'pending' as const,
      }));
      const dispatch: CourierDispatch = {
        id: `DSP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        from: input.from ?? 'CMD-ALFA7',
        courierId: input.courierId,
        stops,
        createdAt: formatNowIso(),
        status: 'assigned',
      };
      await upsertCourierDispatch(dispatch);
      const totalLines = stops.reduce((acc, s) => acc + s.items.length, 0);
      const l = langRef.current;
      pushToast(
        'success',
        l === 'en' ? 'Dispatch Assigned' : 'Tugas Kurir Dibuat',
        l === 'en'
          ? `${dispatch.id} for ${dispatch.courierId}: ${stops.length} post(s), ${totalLines} item(s).`
          : `${dispatch.id} untuk ${dispatch.courierId}: ${stops.length} posko, ${totalLines} jenis.`,
      );
      return { dispatch, qrText: encodeCourierDispatchQr(dispatch) };
    },
    [pushToast],
  );

  const completeCourierDispatchStop = useCallback(
    async (dispatchId: string, stopId: string, courierOfficerId: string): Promise<boolean> => {
      const dispatch = courierDispatches.find((d) => d.id === dispatchId);
      const stop = dispatch?.stops.find((s) => s.id === stopId);
      if (!dispatch || !stop || stop.status === 'delivered') return false;

      for (const line of stop.items) {
        const res = await doReceive(
          line.itemId,
          line.qty,
          `${courierOfficerId} → ${stop.toPost}`,
          `${dispatch.id}/${stop.id}${stop.note ? `: ${stop.note}` : ''}`,
        );
        if (!res.ok) return false;
      }

      await markCourierDispatchStopDelivered(dispatchId, stopId);
      const l = langRef.current;
      pushToast(
        'success',
        l === 'en' ? 'Handover QR Ready' : 'QR Serah Terima Siap',
        l === 'en'
          ? `Recorded ${stop.items.length} item(s) for ${stop.toPost} in CRDT. Show Relay QR to sync.`
          : `${stop.items.length} jenis logistik untuk ${stop.toPost} tercatat di CRDT. Tunjukkan QR Relay.`,
      );
      return true;
    },
    [courierDispatches, doReceive, pushToast],
  );

  const exportLogJson = useCallback(() => {
    const current = replicaRef.current;
    if (!current) return;
    const payload = JSON.stringify(current, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resiliolog-${ACTIVE_NODE_PARAM}-clock${current.clock}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast(
      'success',
      langRef.current === 'en' ? 'Log Exported' : 'Log Diekspor',
      langRef.current === 'en'
        ? `Downloaded JSON snapshot at clock ${current.clock}.`
        : `Snapshot JSON pada clock ${current.clock} telah diunduh.`,
    );
  }, [pushToast]);

  const itemsList = useMemo<ItemViewModel[]>(() => {
    if (!replica) return [];
    return Object.entries(replica.state.items).map(([id, item]) => {
      const summary = itemSummary(replica.state, id);
      return {
        id,
        name: item.meta.name,
        unit: item.meta.unit,
        category: item.meta.category,
        stock: summary?.value ?? 0,
        ledgerIn: summary?.ledgerIn ?? 0,
        ledgerOut: summary?.ledgerOut ?? 0,
        granted: bcGranted(item.quota, replica.nodeId),
        localRights: bcLocalRights(item.quota, replica.nodeId),
        remainingRatio: bcRemainingRatio(item.quota, replica.nodeId),
        deficit: summary?.deficit ?? 0,
        priority: priorityForCategory(item.meta.category),
      };
    });
  }, [replica]);

  const distributionEntries = useMemo(() => {
    if (!replica) return [];
    return [...orsElements(replica.state.distributionLog)].reverse();
  }, [replica]);

  const topUpRequests = useMemo(() => {
    if (!replica) return [];
    return orsElements(replica.state.topUpQueue);
  }, [replica]);

  const unsyncedCount = useMemo(() => {
    if (!replica) return 0;
    const maxSyncedClock = cursors.reduce((max, c) => Math.max(max, c.until), 0);
    return distributionEntries.filter(({ el }) => el.ts.c > maxSyncedClock).length;
  }, [replica, cursors, distributionEntries]);

  return {
    dbReady,
    activeNodeParam: ACTIVE_NODE_PARAM,
    persistenceGranted,
    replica,
    itemsList,
    distributionEntries,
    topUpRequests,
    cursors,
    nearbyPeers,
    unsyncedCount,
    ratifiedOverrides,
    courierDispatches,
    qrProgress,
    toast,
    dismissToast: () => setToast(null),
    requestPersistenceNow,
    doReceive,
    doIssue,
    doEmergencyIssue,
    doRequestTopUp,
    doApproveReroute,
    doVoidLog,
    doRatifyOverride,
    broadcastDelta,
    getQrChunks,
    importQrFrame,
    simulateCourierArrival,
    createCourierDispatch,
    completeCourierDispatchStop,
    exportLogJson,
  };
}
