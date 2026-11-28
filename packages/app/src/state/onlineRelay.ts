import type { NodeId } from '@resiliolog/crdt-core';

const DEFAULT_RELAY_BASE = 'https://ntfy.sh/resiliolog-mesh-v1';

function getRelayBaseUrl(): string {
  const configured =
    typeof import.meta !== 'undefined'
      ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[
          'VITE_SYNC_RELAY_URL'
        ]
      : undefined;
  return configured && configured.trim().length > 0 ? configured.trim().replace(/\/+$/, '') : DEFAULT_RELAY_BASE;
}

export interface OnlineRelayMessage {
  fromNodeId: NodeId;
  fromNodeParam: string;
  blob: string;
}

export async function publishOnlineEnvelope(
  nodeId: NodeId,
  nodeParam: string,
  blob: string,
): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  if (typeof fetch !== 'function' || !blob) {
    return false;
  }
  try {
    const res = await fetch(getRelayBaseUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
      body: JSON.stringify({
        fromNodeId: nodeId,
        fromNodeParam: nodeParam,
        blob,
      } satisfies OnlineRelayMessage),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function subscribeOnlineEnvelopes(
  myNodeId: NodeId,
  onEnvelope: (msg: OnlineRelayMessage) => void,
): () => void {
  if (
    typeof window === 'undefined' ||
    typeof EventSource === 'undefined' ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  ) {
    return () => {};
  }

  const sseUrl = `${getRelayBaseUrl()}/sse?since=10m`;
  let source: EventSource | null = null;
  try {
    source = new EventSource(sseUrl);
    source.onmessage = (event: MessageEvent<string>) => {
      try {
        const wrapper = JSON.parse(event.data) as { event?: string; message?: string };
        if (wrapper.event && wrapper.event !== 'message') return;
        const payloadStr = typeof wrapper.message === 'string' ? wrapper.message : event.data;
        const parsed = JSON.parse(payloadStr) as Partial<OnlineRelayMessage>;
        if (
          typeof parsed.fromNodeId === 'string' &&
          parsed.fromNodeId !== myNodeId &&
          typeof parsed.fromNodeParam === 'string' &&
          typeof parsed.blob === 'string' &&
          parsed.blob.length > 0
        ) {
          onEnvelope({
            fromNodeId: parsed.fromNodeId,
            fromNodeParam: parsed.fromNodeParam,
            blob: parsed.blob,
          });
        }
      } catch {
        // Ignore non-JSON or malformed relay messages
      }
    };
    source.onerror = () => {
      // EventSource automatically reconnects; stay silent when offline
    };
  } catch {
    return () => {};
  }

  return () => {
    source?.close();
  };
}
