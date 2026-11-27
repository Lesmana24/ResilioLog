import type { NodeId, Replica, ResilioState } from '@resiliolog/crdt-core';
import {
  buildEnvelope,
  canonicalJson,
  chunkBlob,
  crc32Hex,
  decodeSignalEnvelope,
  encodeSignalEnvelope,
  SyncEnvelopeSchema,
  SyncError,
  type SignalEnvelopeLike,
  type SyncEnvelopeLike,
} from '@resiliolog/sync';

export const WEBRTC_MAX_CHUNK_BYTES = 16 * 1024; // 16 KB
const ICE_GATHER_TIMEOUT_MS = 5000;
const DC_FRAME_RE = /^RLDC1\|([a-z0-9]{6})\|([0-9]+)\/([0-9]+)\|([\s\S]*)$/;

export function splitDataChannelMessage(
  json: string,
  msgId: string,
  maxBytes: number = WEBRTC_MAX_CHUNK_BYTES,
): string[] {
  if (json.length <= maxBytes) {
    return [json];
  }
  const total = Math.ceil(json.length / maxBytes);
  const parts: string[] = [];
  for (let i = 0; i < total; i++) {
    parts.push(`RLDC1|${msgId}|${i + 1}/${total}|${json.slice(i * maxBytes, (i + 1) * maxBytes)}`);
  }
  return parts;
}

export class DataChannelAssembler {
  private msgId: string | null = null;
  private total = 0;
  private readonly parts = new Map<number, string>();

  push(raw: string): SyncEnvelopeLike | null {
    const match = DC_FRAME_RE.exec(raw);
    let jsonStr: string;

    if (!match) {
      jsonStr = raw;
    } else {
      const id = match[1]!;
      const index = Number(match[2]!);
      const total = Number(match[3]!);
      const slice = match[4]!;
      if (this.msgId !== id) {
        this.msgId = id;
        this.total = total;
        this.parts.clear();
      }
      this.parts.set(index, slice);
      if (this.parts.size < this.total) {
        return null;
      }
      const assembled: string[] = [];
      for (let i = 1; i <= this.total; i++) {
        assembled.push(this.parts.get(i) ?? '');
      }
      jsonStr = assembled.join('');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new SyncError('BAD_JSON', 'Invalid JSON received over WebRTC DataChannel');
    }

    const validated = SyncEnvelopeSchema.safeParse(parsed);
    if (!validated.success) {
      throw new SyncError('SCHEMA_INVALID', validated.error.message);
    }

    const expectedCrc = crc32Hex(
      new TextEncoder().encode(canonicalJson(validated.data.payload)),
    );
    if (expectedCrc !== validated.data.crc32) {
      throw new SyncError('CRC_MISMATCH', 'CRC mismatch on WebRTC SyncEnvelope');
    }

    const { to, ...rest } = validated.data;
    return to !== undefined ? { ...rest, to } : rest;
  }
}

async function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return;

  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', onState);
      resolve();
    }, ICE_GATHER_TIMEOUT_MS);

    const onState = () => {
      if (pc.iceGatheringState === 'complete') {
        window.clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', onState);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', onState);
  });
}

export function encodeSignalToQrChunks(
  nodeId: NodeId,
  kind: 'offer' | 'answer',
  sdp: string,
): { readonly msgId: string; readonly chunks: readonly string[] } {
  const msgId = crc32Hex(new TextEncoder().encode(`${nodeId}:${kind}:${sdp}`)).slice(0, 6);
  const env: SignalEnvelopeLike = {
    v: 1,
    type: 'signal',
    msgId,
    from: nodeId,
    kind,
    sdp,
  };
  const blob = encodeSignalEnvelope(env);
  return {
    msgId,
    chunks: chunkBlob(blob, msgId),
  };
}

export function decodeSignalFromBlob(blob: string): SignalEnvelopeLike {
  return decodeSignalEnvelope(blob);
}

export interface WebRtcCallbacks {
  readonly onChannelOpen: () => void;
  readonly onEnvelope: (env: SyncEnvelopeLike) => void | Promise<void>;
  readonly onError: (message: string) => void;
}

export class WebRtcSyncPeer {
  private readonly pc: RTCPeerConnection;
  private channel: RTCDataChannel | null = null;
  private readonly assembler = new DataChannelAssembler();

  constructor(private readonly callbacks: WebRtcCallbacks) {
    if (typeof RTCPeerConnection === 'undefined') {
      throw new Error('WebRTC is not supported in this browser. Use QR sync instead.');
    }
    this.pc = new RTCPeerConnection({ iceServers: [] });
    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === 'failed' || this.pc.connectionState === 'disconnected') {
        this.callbacks.onError(
          `WebRTC connection ${this.pc.connectionState}. Hotspot client isolation may block peer traffic — use QR sync instead.`,
        );
      }
    };
  }

  private attachChannel(dc: RTCDataChannel): void {
    this.channel = dc;
    dc.onopen = () => {
      this.callbacks.onChannelOpen();
    };
    dc.onerror = () => {
      this.callbacks.onError('WebRTC DataChannel error. Use QR sync instead.');
    };
    dc.onmessage = (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const env = this.assembler.push(event.data);
        if (env) {
          void this.callbacks.onEnvelope(env);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to parse WebRTC message';
        this.callbacks.onError(`${msg}. Use QR sync instead.`);
      }
    };
  }

  async createOfferSignal(nodeId: NodeId): Promise<{ readonly msgId: string; readonly chunks: readonly string[] }> {
    const dc = this.pc.createDataChannel('sync');
    this.attachChannel(dc);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await waitForIceGathering(this.pc);

    const sdp = this.pc.localDescription?.sdp ?? '';
    return encodeSignalToQrChunks(nodeId, 'offer', sdp);
  }

  async acceptOfferAndCreateAnswer(
    nodeId: NodeId,
    offerSdp: string,
  ): Promise<{ readonly msgId: string; readonly chunks: readonly string[] }> {
    this.pc.ondatachannel = (event) => {
      if (event.channel.label === 'sync') {
        this.attachChannel(event.channel);
      }
    };

    await this.pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await waitForIceGathering(this.pc);

    const sdp = this.pc.localDescription?.sdp ?? '';
    return encodeSignalToQrChunks(nodeId, 'answer', sdp);
  }

  async acceptAnswer(answerSdp: string): Promise<void> {
    await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
  }

  sendReplica(replica: Replica, sinceCursor: number, peerNodeId?: NodeId): void {
    if (!this.channel || this.channel.readyState !== 'open') {
      throw new Error('WebRTC DataChannel is not open. Use QR sync instead.');
    }
    const type = sinceCursor === 0 ? 'full' : 'delta';
    const env = buildEnvelope(replica, sinceCursor, type, peerNodeId);
    const json = JSON.stringify(env);
    for (const part of splitDataChannelMessage(json, env.msgId)) {
      this.channel.send(part);
    }
  }

  close(): void {
    this.channel?.close();
    this.pc.close();
  }
}

export type { ResilioState };
