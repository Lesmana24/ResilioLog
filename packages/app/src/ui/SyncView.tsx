import type { ChunkProgress } from '@resiliolog/sync';
import { useEffect, useRef, useState } from 'react';
import { useReplica } from '../state/useReplica';
import { getCursor } from '../storage/db';
import {
  DEFAULT_QR_CYCLE_MS,
  prepareQrExport,
  renderQrDataUrl,
  type PreparedQrExport,
} from '../transport/qr-export';
import { QrScanSession } from '../transport/qr-scan';
import {
  decodeSignalFromBlob,
  WebRtcSyncPeer,
} from '../transport/webrtc';
import { getSyncErrorMessage } from './error-messages';

export function SyncView() {
  const { replica, loading, importEnvelope } = useReplica();

  // Export state
  const [peerNodeId, setPeerNodeId] = useState('');
  const [exported, setExported] = useState<PreparedQrExport | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Scan state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sessionRef = useRef<QrScanSession | null>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<ChunkProgress | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);

  // WebRTC (P1) optional state
  const rtcPeerRef = useRef<WebRtcSyncPeer | null>(null);
  const [rtcChunks, setRtcChunks] = useState<readonly string[] | null>(null);
  const [rtcFrameIdx, setRtcFrameIdx] = useState(0);
  const [rtcQrUrl, setRtcQrUrl] = useState<string | null>(null);
  const [rtcSignalInput, setRtcSignalInput] = useState('');
  const [rtcOpen, setRtcOpen] = useState(false);
  const [rtcStatus, setRtcStatus] = useState<string | null>(null);
  const [rtcError, setRtcError] = useState<string | null>(null);

  useEffect(() => {
    if (!rtcChunks || rtcChunks.length === 0) {
      setRtcQrUrl(null);
      return;
    }
    const timer = window.setInterval(() => {
      setRtcFrameIdx((p) => (p + 1) % rtcChunks.length);
    }, DEFAULT_QR_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [rtcChunks]);

  useEffect(() => {
    if (!rtcChunks || rtcChunks.length === 0) return;
    let active = true;
    void renderQrDataUrl(rtcChunks[rtcFrameIdx % rtcChunks.length]!).then((url) => {
      if (active) setRtcQrUrl(url);
    });
    return () => {
      active = false;
    };
  }, [rtcChunks, rtcFrameIdx]);

  useEffect(() => {
    return () => {
      rtcPeerRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!exported || exported.chunks.length === 0 || paused) return;
    const timer = window.setInterval(() => {
      setFrameIdx((prev) => (prev + 1) % exported.chunks.length);
    }, DEFAULT_QR_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [exported, paused]);

  useEffect(() => {
    if (!exported || exported.chunks.length === 0) {
      setQrDataUrl(null);
      return;
    }
    const chunk = exported.chunks[frameIdx % exported.chunks.length]!;
    let active = true;
    void renderQrDataUrl(chunk).then((url) => {
      if (active) setQrDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [exported, frameIdx]);

  useEffect(() => {
    return () => {
      sessionRef.current?.stopCamera();
    };
  }, []);

  if (loading || !replica) {
    return (
      <section>
        <h2>QR Sync</h2>
        <p>Loading local replica...</p>
      </section>
    );
  }

  async function handleGenerateExport() {
    if (!replica) return;
    const trimmedPeer = peerNodeId.trim();
    const cursor = trimmedPeer ? await getCursor(trimmedPeer) : 0;
    const prepared = prepareQrExport(
      replica,
      cursor,
      trimmedPeer ? trimmedPeer : undefined,
    );
    setExported(prepared);
    setFrameIdx(0);
    setPaused(false);
  }

  async function handleStartScan() {
    setScanError(null);
    setScanSuccess(null);
    setProgress(null);

    if (!videoRef.current) return;

    const session = new QrScanSession({
      onProgress: (p) => {
        setProgress(p);
      },
      onError: (code) => {
        setScanError(getSyncErrorMessage(code));
      },
      onComplete: async (blob) => {
        const res = await importEnvelope(blob);
        if (!res.ok) {
          setScanError(getSyncErrorMessage(res.error));
          return;
        }
        session.stopCamera();
        setScanning(false);
        setScanSuccess(`Synced successfully (clock ${res.value.clock}).`);
      },
    });

    sessionRef.current = session;
    try {
      await session.startCamera(videoRef.current);
      setScanning(true);
    } catch {
      setScanError('Camera access failed. Ensure HTTPS is enabled and camera permission is granted.');
      setScanning(false);
    }
  }

  function handleStopScan() {
    sessionRef.current?.stopCamera();
    setScanning(false);
  }

  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <h2>QR Sync (Offline)</h2>

      <div style={{ padding: 12, border: '1px solid #d1d5db', borderRadius: 6, display: 'grid', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Export Delta as QR</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={peerNodeId}
            onChange={(e) => setPeerNodeId(e.target.value)}
            placeholder="Peer nodeId (leave blank for full)"
          />
          <button type="button" onClick={() => void handleGenerateExport()}>
            Generate QR Frames
          </button>
        </div>

        {exported && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 13 }}>
              Type: <strong>{exported.type}</strong> · msgId: <code>{exported.msgId}</code> · Frame{' '}
              {(frameIdx % exported.chunks.length) + 1} of {exported.chunks.length}
            </div>

            {exported.warningMessage && (
              <div role="alert" style={{ padding: 8, backgroundColor: '#fef3c7', color: '#92400e', borderRadius: 4, fontSize: 13 }}>
                {exported.warningMessage}
              </div>
            )}

            {qrDataUrl && (
              <div>
                <img
                  src={qrDataUrl}
                  alt={`QR frame ${(frameIdx % exported.chunks.length) + 1} of ${exported.chunks.length}`}
                  width={280}
                  height={280}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setPaused((p) => !p)}>
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaused(true);
                  setFrameIdx((prev) => (prev - 1 + exported.chunks.length) % exported.chunks.length);
                }}
              >
                Prev Step
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaused(true);
                  setFrameIdx((prev) => (prev + 1) % exported.chunks.length);
                }}
              >
                Next Step
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: 12, border: '1px solid #d1d5db', borderRadius: 6, display: 'grid', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Scan QR Chunks</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {!scanning ? (
            <button type="button" onClick={() => void handleStartScan()}>
              Start Camera Scan
            </button>
          ) : (
            <button type="button" onClick={handleStopScan}>
              Stop Camera
            </button>
          )}
        </div>

        <video
          ref={videoRef}
          style={{
            width: '100%',
            maxWidth: 320,
            borderRadius: 6,
            backgroundColor: '#111827',
            display: scanning ? 'block' : 'none',
          }}
        />

        {progress && (
          <div style={{ fontSize: 13 }}>
            {progress.received} of {progress.total} scanned (msgId: <code>{progress.msgId}</code>)
          </div>
        )}
        {scanError && (
          <div role="alert" style={{ color: '#991b1b', fontSize: 13 }}>
            {scanError}
          </div>
        )}
        {scanSuccess && (
          <div style={{ color: '#166534', fontSize: 13, fontWeight: 600 }}>{scanSuccess}</div>
        )}
      </div>

      <div style={{ padding: 12, border: '1px solid #d1d5db', borderRadius: 6, display: 'grid', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>WebRTC Local Sync (P1 Optional)</h3>
        <p style={{ margin: 0, fontSize: 12, color: '#4b5563' }}>
          Works on same LAN/hotspot without internet. If blocked by hotspot isolation, use QR Sync above.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              setRtcError(null);
              setRtcStatus('Gathering ICE candidates...');
              try {
                rtcPeerRef.current?.close();
                const peer = new WebRtcSyncPeer({
                  onChannelOpen: () => {
                    setRtcOpen(true);
                    setRtcStatus('DataChannel "sync" open.');
                  },
                  onEnvelope: async (env) => {
                    const encoded = JSON.stringify(env);
                    setRtcStatus(`Received SyncEnvelope (${encoded.length} bytes) from ${env.from}.`);
                  },
                  onError: (msg) => {
                    setRtcError(msg);
                    setRtcOpen(false);
                  },
                });
                rtcPeerRef.current = peer;
                void peer
                  .createOfferSignal(replica.nodeId)
                  .then((sig) => {
                    setRtcChunks(sig.chunks);
                    setRtcFrameIdx(0);
                    setRtcStatus(`Offer ready (${sig.chunks.length} QR chunks).`);
                  })
                  .catch((err) => {
                    setRtcError(err instanceof Error ? err.message : 'WebRTC offer failed. Use QR sync above.');
                  });
              } catch (err) {
                setRtcError(err instanceof Error ? err.message : 'WebRTC unavailable. Use QR sync above.');
              }
            }}
          >
            Create WebRTC Offer
          </button>

          {rtcOpen && (
            <button
              type="button"
              onClick={() => {
                try {
                  rtcPeerRef.current?.sendReplica(replica, 0);
                  setRtcStatus('Sent SyncEnvelope over DataChannel.');
                } catch (err) {
                  setRtcError(err instanceof Error ? err.message : 'Send failed. Use QR sync above.');
                }
              }}
            >
              Send State via WebRTC
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={rtcSignalInput}
            onChange={(e) => setRtcSignalInput(e.target.value)}
            placeholder="Paste SignalEnvelope blob"
          />
          <button
            type="button"
            onClick={() => {
              setRtcError(null);
              try {
                const sig = decodeSignalFromBlob(rtcSignalInput.trim());
                if (sig.kind === 'offer') {
                  rtcPeerRef.current?.close();
                  const peer = new WebRtcSyncPeer({
                    onChannelOpen: () => {
                      setRtcOpen(true);
                      setRtcStatus('DataChannel "sync" open.');
                    },
                    onEnvelope: (env) => {
                      setRtcStatus(`Received SyncEnvelope from ${env.from}.`);
                    },
                    onError: (msg) => {
                      setRtcError(msg);
                      setRtcOpen(false);
                    },
                  });
                  rtcPeerRef.current = peer;
                  void peer
                    .acceptOfferAndCreateAnswer(replica.nodeId, sig.sdp)
                    .then((ans) => {
                      setRtcChunks(ans.chunks);
                      setRtcFrameIdx(0);
                      setRtcStatus(`Answer ready (${ans.chunks.length} QR chunks).`);
                    })
                    .catch((err) => {
                      setRtcError(err instanceof Error ? err.message : 'Failed to accept offer. Use QR sync above.');
                    });
                } else if (rtcPeerRef.current) {
                  void rtcPeerRef.current
                    .acceptAnswer(sig.sdp)
                    .then(() => setRtcStatus('Answer accepted; connecting...'))
                    .catch((err) => {
                      setRtcError(err instanceof Error ? err.message : 'Failed to accept answer. Use QR sync above.');
                    });
                }
              } catch {
                setRtcError('Invalid SignalEnvelope. Use QR Sync above as fallback.');
              }
            }}
          >
            Apply Signal Blob
          </button>
        </div>

        {rtcQrUrl && rtcChunks && (
          <div>
            <div style={{ fontSize: 12 }}>
              Signal QR {(rtcFrameIdx % rtcChunks.length) + 1} of {rtcChunks.length}
            </div>
            <img src={rtcQrUrl} alt="WebRTC Signal QR" width={220} height={220} />
          </div>
        )}
        {rtcStatus && <div style={{ fontSize: 13 }}>{rtcStatus}</div>}
        {rtcError && (
          <div role="alert" style={{ color: '#991b1b', fontSize: 13 }}>
            {rtcError} — <strong>Fallback:</strong> Use QR Sync above.
          </div>
        )}
      </div>
    </section>
  );
}
