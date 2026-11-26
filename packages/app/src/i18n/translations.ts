import type { AppLanguage } from '../engine/errorMessages';

export const COPY: Record<
  AppLanguage,
  {
    postBannerPrefix: string;
    inventarisTitle: string;
    p2pTitle: string;
    historyTitle: string;
    scanKoli: string;
    inputCode: string;
    recordCardTitle: string;
    recordCardSub: string;
    receiveBtn: string;
    issueBtn: string;
    commodityLabel: string;
    qtyLabel: string;
    remainingQuota: string;
    criticalBadge: string;
    healthyBadge: string;
    requestQuotaBtn: string;
    saveOfflineReceive: string;
    saveOfflineIssue: string;
    emergencyOverrideBtn: string;
    unsyncedLogsTitle: string;
    unsyncedLogsSub: string;
    savedLocalBadge: string;
    navInventaris: string;
    navSync: string;
    navHistory: string;
    readyToSyncTitle: string;
    readyToSyncSub: string;
    activeBadge: string;
    verifiedStockTitle: string;
    nearbySyncTitle: string;
    nearbySyncSub: string;
    courierQrTitle: string;
    courierQrSub: string;
    outgoingQueueTitle: string;
    readySyncPill: string;
    cmdSubtitle: string;
    cmdTitle: string;
    cvrdtActive: string;
    exportLog: string;
    calcRebalance: string;
    approveReroute: string;
    ratifyOverride: string;
    ratifiedDone: string;
    storagePersistent: string;
    storageBestEffort: string;
    storageWarningBanner: string;
    mobileVolunteerBtn: string;
    commandCenterBtn: string;
    initializingDb: string;
  }
> = {
  en: {
    postBannerPrefix: 'Forward Post',
    inventarisTitle: 'Inventory',
    p2pTitle: 'P2P Sync',
    historyTitle: 'Distribution Log',
    scanKoli: 'Scan Crate',
    inputCode: 'Input Code',
    recordCardTitle: 'Record Logistics Flow',
    recordCardSub: 'Saved locally on device without network',
    receiveBtn: '+ Receive',
    issueBtn: '- Issue',
    commodityLabel: 'Commodity',
    qtyLabel: 'Quantity',
    remainingQuota: 'Remaining Quota',
    criticalBadge: 'Critical',
    healthyBadge: 'Available',
    requestQuotaBtn: '+ Request Quota',
    saveOfflineReceive: 'Save Offline Receive',
    saveOfflineIssue: 'Save Offline Record',
    emergencyOverrideBtn: 'Emergency Quota Override',
    unsyncedLogsTitle: 'Pending Local Logs',
    unsyncedLogsSub: 'Safely persisted in IndexedDB • Ready to sync',
    savedLocalBadge: 'Saved Local',
    navInventaris: 'Inventory',
    navSync: 'P2P Sync',
    navHistory: 'History',
    readyToSyncTitle: 'Ready to Sync (Offline)',
    readyToSyncSub: 'BroadcastChannel mesh active across local tabs',
    activeBadge: 'Active',
    verifiedStockTitle: 'Verified Total Stock',
    nearbySyncTitle: 'Nearby P2P Sync',
    nearbySyncSub: 'Exchange CRDT delta envelope with open local tabs',
    courierQrTitle: 'Courier Transfer (QR)',
    courierQrSub: 'Chunked QR frames for offline courier relay',
    outgoingQueueTitle: 'Outgoing Queue',
    readySyncPill: 'Ready',
    cmdSubtitle: 'Integrated Disaster Emergency Cluster',
    cmdTitle: 'Convergence & Emergency Logistics Monitor',
    cvrdtActive: 'CvRDT Active & Synced',
    exportLog: 'Export Log',
    calcRebalance: 'Calculate Rebalance',
    approveReroute: 'Approve Reroute',
    ratifyOverride: 'Ratify Override Quota',
    ratifiedDone: 'Ratified',
    storagePersistent: 'Storage Persistent',
    storageBestEffort: 'Storage Best-Effort',
    storageWarningBanner:
      'Persistent browser storage was not granted; browser eviction is possible under disk pressure.',
    mobileVolunteerBtn: 'Mobile Volunteer',
    commandCenterBtn: 'Command Center',
    initializingDb: 'Initializing IndexedDB',
  },
  id: {
    postBannerPrefix: 'Posko Terdepan',
    inventarisTitle: 'Inventaris',
    p2pTitle: 'P2P Sync',
    historyTitle: 'Riwayat',
    scanKoli: 'Scan Koli',
    inputCode: 'Input Kode',
    recordCardTitle: 'Catat Alur Logistik',
    recordCardSub: 'Tersimpan langsung di perangkat tanpa sinyal',
    receiveBtn: '+ Barang Masuk',
    issueBtn: '- Barang Keluar',
    commodityLabel: 'Komoditas',
    qtyLabel: 'Jumlah Volume',
    remainingQuota: 'Sisa Kuota',
    criticalBadge: 'Kritis',
    healthyBadge: 'Aman',
    requestQuotaBtn: '+ Minta Kuota',
    saveOfflineReceive: 'Simpan Barang Masuk Offline',
    saveOfflineIssue: 'Simpan Catatan Offline',
    emergencyOverrideBtn: 'Bypass Kuota Darurat',
    unsyncedLogsTitle: 'Log Menunggu Sinkronisasi',
    unsyncedLogsSub: 'Tersimpan aman di memori lokal • Siap sinkron',
    savedLocalBadge: 'Tersimpan Lokal',
    navInventaris: 'Inventaris',
    navSync: 'P2P Sync',
    navHistory: 'Riwayat',
    readyToSyncTitle: 'Siap Sinkronisasi (Offline)',
    readyToSyncSub: 'Mesh lokal aktif antar tab perangkat',
    activeBadge: 'Aktif',
    verifiedStockTitle: 'Total Stok Terverifikasi',
    nearbySyncTitle: 'Sinkronisasi P2P Dekat',
    nearbySyncSub: 'Tukar delta CRDT langsung ke tab/perangkat sekitar',
    courierQrTitle: 'Transfer ke Kurir (QR)',
    courierQrSub: 'Frame QR terkompresi untuk kurir armada logistik',
    outgoingQueueTitle: 'Antrean Pengiriman',
    readySyncPill: 'Siap Sync',
    cmdSubtitle: 'Kluster Tanggap Darurat Bencana Terpadu',
    cmdTitle: 'Monitoring Konvergensi & Logistik Darurat',
    cvrdtActive: 'CvRDT Aktif & Tersinkron',
    exportLog: 'Ekspor Log',
    calcRebalance: 'Kalkulasi Rebalance',
    approveReroute: 'Setujui Reroute',
    ratifyOverride: 'Ratifikasi Kuota Override',
    ratifiedDone: 'Teratifikasi',
    storagePersistent: 'Penyimpanan Persisten',
    storageBestEffort: 'Penyimpanan Standar',
    storageWarningBanner:
      'Penyimpanan persisten browser belum diizinkan; data berisiko dibersihkan saat memori penuh.',
    mobileVolunteerBtn: 'Relawan Lapangan',
    commandCenterBtn: 'Command Center',
    initializingDb: 'Menyiapkan IndexedDB',
  },
};
