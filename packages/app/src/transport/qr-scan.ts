import {
  ChunkCollector,
  SyncError,
  type ChunkProgress,
  type SyncErrorCode,
} from '@resiliolog/sync';
import QrScanner from 'qr-scanner';

/*
 * Camera access (`navigator.mediaDevices.getUserMedia` used by `QrScanner`)
 * requires a secure context: HTTPS (e.g. `@vitejs/plugin-basic-ssl` in dev or
 * static HTTPS hosting) or `localhost`. Plain `http://192.168.x.x` on phones
 * will be blocked by the browser.
 */

export interface QrScanCallbacks {
  readonly onProgress: (progress: ChunkProgress) => void;
  readonly onComplete: (assembledBlob: string) => void | Promise<void>;
  readonly onError: (code: SyncErrorCode) => void;
}

export class QrScanSession {
  private readonly collector = new ChunkCollector();
  private completedMsgId: string | null = null;
  private scanner: QrScanner | null = null;

  constructor(private readonly callbacks: QrScanCallbacks) {}

  handleFrame(rawChunk: string): ChunkProgress | null {
    try {
      const progress = this.collector.add(rawChunk.trim());
      this.callbacks.onProgress(progress);

      if (progress.complete && this.completedMsgId !== progress.msgId) {
        this.completedMsgId = progress.msgId;
        const blob = this.collector.assemble();
        void this.callbacks.onComplete(blob);
      }
      return progress;
    } catch (e) {
      if (e instanceof SyncError) {
        this.callbacks.onError(e.code);
        return null;
      }
      throw e;
    }
  }

  async startCamera(videoEl: HTMLVideoElement): Promise<void> {
    this.stopCamera();
    this.scanner = new QrScanner(
      videoEl,
      (result) => {
        this.handleFrame(result.data);
      },
      {
        preferredCamera: 'environment',
        highlightScanRegion: true,
        highlightCodeOutline: true,
        returnDetailedScanResult: true,
      },
    );
    await this.scanner.start();
  }

  stopCamera(): void {
    if (this.scanner) {
      this.scanner.stop();
      this.scanner.destroy();
      this.scanner = null;
    }
  }
}
