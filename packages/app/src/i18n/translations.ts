import type { AppLanguage } from '../engine/errorMessages';

export const COPY: Record<
  AppLanguage,
  {
    postBannerPrefix: string;
    courierBannerPrefix: string;
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
    enablePersistentStorage: string;
    mobileVolunteerBtn: string;
    commandCenterBtn: string;
    initializingDb: string;
    loginSubtitle: string;
    loginCardTitle: string;
    loginCardSub: string;
    officerIdLabel: string;
    officerIdPlaceholder: string;
    pinLabel: string;
    pinPlaceholder: string;
    signInBtn: string;
    prototypeDivider: string;
    quickEnterVolunteerA: string;
    quickEnterVolunteerASub: string;
    quickEnterVolunteerB: string;
    quickEnterVolunteerBSub: string;
    quickEnterVolunteerC: string;
    quickEnterVolunteerCSub: string;
    quickEnterCourier: string;
    quickEnterCourierSub: string;
    quickEnterCommand: string;
    quickEnterCommandSub: string;
    signOutBtn: string;
    signedInAs: string;
    courierRelayTab: string;
    courierManifestTab: string;
    courierRelayTitle: string;
    courierManifestTitle: string;
    courierReadySub: string;
    scanFromPostBtn: string;
    showRelayQrBtn: string;
    carriedLogsLabel: string;
    syncedPostsLabel: string;
    qrFramesLabel: string;
    carriedStockTitle: string;
    syncedPeersTitle: string;
    noPeersSyncedYet: string;
    manifestAuditTitle: string;
    dispatchFormTitle: string;
    dispatchFormSub: string;
    dispatchCourierLabel: string;
    dispatchDestLabel: string;
    dispatchAssignBtn: string;
    dispatchQrModalTitle: string;
    dispatchQrModalSub: string;
    dispatchActiveListTitle: string;
    courierActiveTasksTitle: string;
    courierNoTasksSub: string;
    confirmDeliverBtn: string;
    deliveredBadge: string;
    inTransitBadge: string;
    assignedBadge: string;
    addToManifestBtn: string;
    draftManifestTitle: string;
    confirmStopDeliverBtn: string;
    stopsLabel: string;
    itemsLineLabel: string;
  }
> = {
  en: {
    postBannerPrefix: 'Forward Post',
    courierBannerPrefix: 'Logistics Courier',
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
    enablePersistentStorage: 'Enable Persistent Storage',
    mobileVolunteerBtn: 'Mobile Volunteer',
    commandCenterBtn: 'Command Center',
    initializingDb: 'Initializing IndexedDB',
    loginSubtitle: 'Offline-First Disaster Logistics',
    loginCardTitle: 'Field Access Sign In',
    loginCardSub: 'Authenticate locally on this device — works 100% offline',
    officerIdLabel: 'Officer / Post ID',
    officerIdPlaceholder: 'e.g. POSKO-A04',
    pinLabel: 'Access PIN',
    pinPlaceholder: 'Enter 6-digit PIN',
    signInBtn: 'Sign In',
    prototypeDivider: 'Prototype Quick Access',
    quickEnterVolunteerA: 'Field Volunteer — Posko A-04',
    quickEnterVolunteerASub: 'North Sector • Inventory, P2P Sync & History',
    quickEnterVolunteerB: 'Field Volunteer — Posko B-07',
    quickEnterVolunteerBSub: 'Surplus Depot • Secondary field peer for sync',
    quickEnterVolunteerC: 'Field Volunteer — Posko C-02',
    quickEnterVolunteerCSub: 'South Sector • Critical supply outpost',
    quickEnterCourier: 'Logistics Courier — Fleet #04',
    quickEnterCourierSub: 'QR Relay Mode • Opens directly on QR Sync & Scan',
    quickEnterCommand: 'Enter as Command Center',
    quickEnterCommandSub: 'Desktop dashboard • Map, Quota & CvRDT Log',
    signOutBtn: 'Sign Out',
    signedInAs: 'Signed in as',
    courierRelayTab: 'QR Relay',
    courierManifestTab: 'Manifest',
    courierRelayTitle: 'Offline QR Relay',
    courierManifestTitle: 'Courier Manifest',
    courierReadySub: 'Carry CRDT deltas between disconnected posts via QR',
    scanFromPostBtn: 'Scan QR from Post',
    showRelayQrBtn: 'Show Relay QR',
    carriedLogsLabel: 'Carried Logs',
    syncedPostsLabel: 'Synced Posts',
    qrFramesLabel: 'QR Frames',
    carriedStockTitle: 'Carried Stock Snapshot (Read-Only)',
    syncedPeersTitle: 'Posts & Peers Synced',
    noPeersSyncedYet: 'No QR sync recorded yet. Scan a post QR to start relaying.',
    manifestAuditTitle: 'Carried Logistics Audit Trail',
    dispatchFormTitle: 'Assign Courier Aid Delivery',
    dispatchFormSub: 'Create an offline dispatch order and generate a QR task for the courier',
    dispatchCourierLabel: 'Courier Unit',
    dispatchDestLabel: 'Destination Post',
    dispatchAssignBtn: 'Assign & Generate Dispatch QR',
    dispatchQrModalTitle: 'Courier Dispatch QR (RLD1)',
    dispatchQrModalSub: 'Courier scans this QR at Command Center before departing',
    dispatchActiveListTitle: 'Assigned Deliveries',
    courierActiveTasksTitle: 'Active Delivery Tasks',
    courierNoTasksSub: 'No active dispatch yet. Scan a Dispatch QR (RLD1) from Command Center.',
    confirmDeliverBtn: 'Confirm Arrival & Generate Handover QR',
    deliveredBadge: 'Delivered',
    inTransitBadge: 'In Transit',
    assignedBadge: 'Assigned',
    addToManifestBtn: '+ Add to Manifest',
    draftManifestTitle: 'Draft Delivery Manifest',
    confirmStopDeliverBtn: 'Confirm Arrival & Handover QR',
    stopsLabel: 'post(s)',
    itemsLineLabel: 'item(s)',
  },
  id: {
    postBannerPrefix: 'Posko Terdepan',
    courierBannerPrefix: 'Kurir Logistik',
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
    enablePersistentStorage: 'Aktifkan Penyimpanan Persisten',
    mobileVolunteerBtn: 'Relawan Lapangan',
    commandCenterBtn: 'Command Center',
    initializingDb: 'Menyiapkan IndexedDB',
    loginSubtitle: 'Logistik Bencana Offline-First',
    loginCardTitle: 'Masuk Akses Lapangan',
    loginCardSub: 'Autentikasi lokal di perangkat ini — berjalan 100% offline',
    officerIdLabel: 'ID Petugas / Posko',
    officerIdPlaceholder: 'cth. POSKO-A04',
    pinLabel: 'PIN Akses',
    pinPlaceholder: 'Masukkan PIN 6 digit',
    signInBtn: 'Masuk',
    prototypeDivider: 'Akses Cepat Prototipe',
    quickEnterVolunteerA: 'Relawan Lapangan — Posko A-04',
    quickEnterVolunteerASub: 'Sektor Utara • Inventaris, P2P Sync & Riwayat',
    quickEnterVolunteerB: 'Relawan Lapangan — Posko B-07',
    quickEnterVolunteerBSub: 'Posko Surplus • Relawan peer kedua untuk sinkronisasi',
    quickEnterVolunteerC: 'Relawan Lapangan — Posko C-02',
    quickEnterVolunteerCSub: 'Sektor Selatan • Posko darurat stok kritis',
    quickEnterCourier: 'Kurir Logistik — Armada #04',
    quickEnterCourierSub: 'Mode Relay QR • Langsung buka tab QR Sync & Scan',
    quickEnterCommand: 'Masuk sebagai Command Center',
    quickEnterCommandSub: 'Dashboard desktop • Peta, Kuota & Log CvRDT',
    signOutBtn: 'Keluar',
    signedInAs: 'Masuk sebagai',
    courierRelayTab: 'Relay QR',
    courierManifestTab: 'Manifest',
    courierRelayTitle: 'Relay QR Offline',
    courierManifestTitle: 'Manifest Kurir',
    courierReadySub: 'Bawa delta CRDT antar posko terputus melalui QR',
    scanFromPostBtn: 'Scan QR dari Posko',
    showRelayQrBtn: 'Tampilkan QR Relay',
    carriedLogsLabel: 'Log Dibawa',
    syncedPostsLabel: 'Posko Tersinkron',
    qrFramesLabel: 'Frame QR',
    carriedStockTitle: 'Ringkasan Stok Terbawa (Baca Saja)',
    syncedPeersTitle: 'Posko & Peer Tersinkron',
    noPeersSyncedYet: 'Belum ada sinkronisasi QR. Scan QR posko untuk mulai relay.',
    manifestAuditTitle: 'Riwayat Logistik Terbawa',
    dispatchFormTitle: 'Tugaskan Pengiriman Bantuan Kurir',
    dispatchFormSub: 'Buat perintah pengiriman offline dan hasilkan QR tugas untuk kurir',
    dispatchCourierLabel: 'Unit Kurir',
    dispatchDestLabel: 'Posko Tujuan',
    dispatchAssignBtn: 'Tugaskan & Buat QR Tugas',
    dispatchQrModalTitle: 'QR Tugas Kurir (RLD1)',
    dispatchQrModalSub: 'Kurir memindai QR ini di Command Center sebelum berangkat',
    dispatchActiveListTitle: 'Daftar Penugasan Kurir',
    courierActiveTasksTitle: 'Tugas Pengiriman Aktif',
    courierNoTasksSub: 'Belum ada tugas aktif. Scan QR Tugas (RLD1) dari Command Center.',
    confirmDeliverBtn: 'Tiba & Serahkan (Buat QR Serah Terima)',
    deliveredBadge: 'Terkirim',
    inTransitBadge: 'Dalam Perjalanan',
    assignedBadge: 'Ditugaskan',
    addToManifestBtn: '+ Tambah ke Muatan',
    draftManifestTitle: 'Daftar Muatan Pengiriman',
    confirmStopDeliverBtn: 'Tiba & Serahkan (QR)',
    stopsLabel: 'posko',
    itemsLineLabel: 'jenis',
  },
};
