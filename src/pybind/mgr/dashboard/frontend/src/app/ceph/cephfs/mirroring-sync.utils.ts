import { MirroringFsSyncInfo, MirrorStatusResponse } from '~/app/shared/models/cephfs.model';

export function extractLatestMirrorSync(status: MirrorStatusResponse): MirroringFsSyncInfo {
  let latestSyncTime = '';
  let latestMetricsUpdatedAt: number | string | undefined;
  let latestSnapName = '';
  let latestBytes = '';
  let latestSyncPath = '';

  for (const [dirPath, dirMetrics] of Object.entries(status.metrics ?? {})) {
    for (const dir of Object.values(dirMetrics.peer ?? {})) {
      const snap = dir.last_synced_snap;
      if (!snap) {
        continue;
      }

      const syncTime = String(snap.sync_time_stamp ?? '');
      const snapName = snap.name ?? '';
      const metricsUpdatedAt = dir.metrics_updated_at;
      if (isNewerMirrorSync(syncTime, metricsUpdatedAt, latestSyncTime, latestMetricsUpdatedAt)) {
        latestSyncTime = syncTime;
        latestMetricsUpdatedAt = metricsUpdatedAt;
        latestSnapName = snapName;
        latestBytes = String(snap.sync_bytes ?? '');
        latestSyncPath = dirPath;
      } else if (!latestSnapName && snapName) {
        latestSnapName = snapName;
        latestBytes = latestBytes || String(snap.sync_bytes ?? '');
        latestSyncPath = dirPath;
        latestMetricsUpdatedAt = latestMetricsUpdatedAt ?? metricsUpdatedAt;
      }
    }
  }

  return {
    bytesSynced: latestBytes || '-',
    path: latestSyncPath,
    snapName: latestSnapName,
    syncedAt: null
  };
}

function isNewerMirrorSync(
  syncTime: string,
  metricsUpdatedAt: number | string | undefined,
  latestSyncTime: string,
  latestMetricsUpdatedAt: number | string | undefined
): boolean {
  const newMetricsEpoch = mirrorMetricsUpdatedAtToEpoch(metricsUpdatedAt);
  const latestMetricsEpoch = mirrorMetricsUpdatedAtToEpoch(latestMetricsUpdatedAt);
  if (newMetricsEpoch !== null && latestMetricsEpoch !== null) {
    return newMetricsEpoch >= latestMetricsEpoch;
  }
  return Boolean(syncTime && syncTime >= latestSyncTime);
}

function mirrorMetricsUpdatedAtToEpoch(
  metricsUpdatedAt: number | string | undefined
): number | null {
  if (metricsUpdatedAt === undefined || metricsUpdatedAt === null || metricsUpdatedAt === '') {
    return null;
  }
  const epoch =
    typeof metricsUpdatedAt === 'number'
      ? metricsUpdatedAt
      : parseFloat(String(metricsUpdatedAt));
  if (!Number.isFinite(epoch) || epoch <= 0) {
    return null;
  }
  return Math.floor(epoch);
}
