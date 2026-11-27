import type { ChunkProgress } from '@resiliolog/sync';
import { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/useLang';
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
import { alert, btn, card, colors, font, input as inputStyle, radius, space } from './styles';

export function SyncView() {
  const { replica, loading, importEnvelope } = useReplica();
  const { t, lang } = useLang();

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
      <div style={{ color: colors.textMuted, padding: space.lg }}>{t('loadingReplica')}</div>
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
        setScanError(getSyncErrorMessage(code, lang));
      },
      onComplete: async (blob) => {
        const res = await importEnvelope(blob);
        if (!res.ok) {
          setScanError(getSyncErrorMessage(res.error, lang));
          return;
        }
        session.stopCamera();
        setScanning(false);
        setScanSuccess(`${t('sync_syncedSuccess')} (${t('clock')} ${res.value.clock}).`);
      },
    });

    sessionRef.current = session;
    try {
      await session.startCamera(videoRef.current);
      setScanning(true);
    } catch {
      setScanError(t('sync_cameraError'));
      setScanning(false);
    }
  }

  function handleStopScan() {
    sessionRef.current?.stopCamera();
    setScanning(false);
  }

  return (
    <div style={{ display: 'grid', gap: space.xl }}>
      <div>
        <h1 style={{ margin: 0, fontSize: font.sizeXl, fontWeight: font.weightBold }}>{t('sync_title')}</h1>
      </div>

      {/* Export QR */}
      <div style={{ ...card, display: 'grid', gap: space.md }}>
        <h2 style={{ margin: 0, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>{t('sync_exportTitle')}</h2>
        <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={peerNodeId}
            onChange={(e) => setPeerNodeId(e.target.value)}
            placeholder={t('sync_peerNodeId')}
            style={{ ...inputStyle, flex: 1, minWidth: 220 }}
          />
          <button type="button" onClick={() => void handleGenerateExport()} style={btn.primary}>
            {t('sync_prepare')}
          </button>
        </div>

        {exported && (
          <div style={{ display: 'grid', gap: space.md }}>
            <div style={{ fontSize: font.sizeMd, color: colors.textMuted }}>
              <strong>{exported.type}</strong> · msgId: <code>{exported.msgId}</code> · {t('sync_frame')}{' '}
              {(frameIdx % exported.chunks.length) + 1} {t('sync_of')} {exported.chunks.length}
            </div>

            {exported.warningMessage && (
              <div role="alert" style={alert.warning}>
                {exported.chunks.length > 20 ? t('sync_chunkWarning') : exported.warningMessage}
              </div>
            )}

            {qrDataUrl && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: space.md, background: '#fff', borderRadius: radius.md, border: `1px solid ${colors.borderLight}` }}>
                <img
                  src={qrDataUrl}
                  alt={`QR frame ${(frameIdx % exported.chunks.length) + 1} of ${exported.chunks.length}`}
                  width={280}
                  height={280}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setPaused((p) => !p)} style={btn.secondary}>
                {paused ? t('sync_resume') : t('sync_pause')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaused(true);
                  setFrameIdx((prev) => (prev - 1 + exported.chunks.length) % exported.chunks.length);
                }}
                style={btn.secondary}
              >
                {t('sync_prev')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaused(true);
                  setFrameIdx((prev) => (prev + 1) % exported.chunks.length);
                }}
                style={btn.secondary}
              >
                {t('sync_next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scan QR */}
      <div style={{ ...card, display: 'grid', gap: space.md }}>
        <h2 style={{ margin: 0, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>{t('sync_scanTitle')}</h2>
        <div style={{ fontSize: font.sizeSm, color: colors.textMuted }}>{t('sync_cameraNote')}</div>
        <div style={{ display: 'flex', gap: space.sm }}>
          {!scanning ? (
            <button type="button" onClick={() => void handleStartScan()} style={btn.primary}>
              {t('sync_scanStart')}
            </button>
          ) : (
            <button type="button" onClick={handleStopScan} style={btn.danger}>
              {t('sync_scanStop')}
            </button>
          )}
        </div>

        <video
          ref={videoRef}
          style={{
            width: '100%',
            maxWidth: 340,
            borderRadius: radius.md,
            backgroundColor: '#111827',
            display: scanning ? 'block' : 'none',
          }}
        />

        {progress && (
          <div style={{ fontSize: font.sizeMd }}>
            {progress.received} {t('sync_of')} {progress.total} {t('sync_scanProgress')} (msgId: <code>{progress.msgId}</code>)
          </div>
        )}
        {scanError && (
          <div role="alert" style={alert.danger}>
            {scanError}
          </div>
        )}
        {scanSuccess && (
          <div style={alert.success}>{scanSuccess}</div>
        )}
      </div>

      {/* WebRTC P1 */}
      <div style={{ ...card, display: 'grid', gap: space.md }}>
        <h2 style={{ margin: 0, fontSize: font.sizeLg, fontWeight: font.weightSemibold }}>{t('sync_webrtcTitle')}</h2>
        <p style={{ margin: 0, fontSize: font.sizeMd, color: colors.textMuted }}>
          {t('sync_webrtcSub')}
        </p>

        <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
          <button
            type="button"
            style={btn.secondary}
            onClick={() => {
              setRtcError(null);
              setRtcStatus(t('sync_webrtcGathering'));
              try {
                rtcPeerRef.current?.close();
                const peer = new WebRtcSyncPeer({
                  onChannelOpen: () => {
                    setRtcOpen(true);
                    setRtcStatus(t('sync_webrtcChannelOpen'));
                  },
                  onEnvelope: async (env) => {
                    const encoded = JSON.stringify(env);
                    setRtcStatus(`SyncEnvelope (${encoded.length} bytes) — ${env.from}`);
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
                    setRtcStatus(`Offer (${sig.chunks.length} QR chunks).`);
                  })
                  .catch((err) => {
                    setRtcError(err instanceof Error ? err.message : t('sync_webrtcError'));
                  });
              } catch (err) {
                setRtcError(err instanceof Error ? err.message : t('sync_webrtcError'));
              }
            }}
          >
            {t('sync_webrtcCreateOffer')}
          </button>

          {rtcOpen && (
            <button
              type="button"
              style={btn.primary}
              onClick={() => {
                try {
                  rtcPeerRef.current?.sendReplica(replica, 0);
                  setRtcStatus(t('sync_webrtcSent'));
                } catch (err) {
                  setRtcError(err instanceof Error ? err.message : t('sync_webrtcError'));
                }
              }}
            >
              {t('sync_webrtcSendState')}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: space.sm, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={rtcSignalInput}
            onChange={(e) => setRtcSignalInput(e.target.value)}
            placeholder={t('sync_webrtcPlaceholder')}
            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          />
          <button
            type="button"
            style={btn.secondary}
            onClick={() => {
              setRtcError(null);
              try {
                const sig = decodeSignalFromBlob(rtcSignalInput.trim());
                if (sig.kind === 'offer') {
                  rtcPeerRef.current?.close();
                  const peer = new WebRtcSyncPeer({
                    onChannelOpen: () => {
                      setRtcOpen(true);
                      setRtcStatus(t('sync_webrtcChannelOpen'));
                    },
                    onEnvelope: (env) => {
                      setRtcStatus(`SyncEnvelope — ${env.from}`);
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
                      setRtcStatus(`Answer (${ans.chunks.length} QR chunks).`);
                    })
                    .catch((err) => {
                      setRtcError(err instanceof Error ? err.message : t('sync_webrtcError'));
                    });
                } else if (rtcPeerRef.current) {
                  void rtcPeerRef.current
                    .acceptAnswer(sig.sdp)
                    .then(() => setRtcStatus('Answer accepted; connecting...'))
                    .catch((err) => {
                      setRtcError(err instanceof Error ? err.message : t('sync_webrtcError'));
                    });
                }
              } catch {
                setRtcError(t('sync_webrtcError'));
              }
            }}
          >
            {t('sync_webrtcApplySignal')}
          </button>
        </div>

        {rtcQrUrl && rtcChunks && (
          <div style={{ display: 'grid', gap: space.xs }}>
            <div style={{ fontSize: font.sizeSm, color: colors.textMuted }}>
              Signal QR {(rtcFrameIdx % rtcChunks.length) + 1} {t('sync_of')} {rtcChunks.length}
            </div>
            <img src={rtcQrUrl} alt="WebRTC Signal QR" width={220} height={220} />
          </div>
        )}
        {rtcStatus && <div style={{ fontSize: font.sizeMd }}>{rtcStatus}</div>}
        {rtcError && (
          <div role="alert" style={alert.danger}>
            {rtcError} — <strong>{t('sync_webrtcFallbackLabel')}</strong> {t('sync_webrtcUseQr')}
          </div>
        )}
      </div>
    </div>
  );
}
