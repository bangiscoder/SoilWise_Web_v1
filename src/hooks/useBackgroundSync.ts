import { useState, useEffect } from 'react';
import { getSyncStatus, subscribeSyncStatus, syncAllPending } from '../services/backgroundSyncService';
import { SyncStatus } from '../types/sync';

export function useBackgroundSync(): SyncStatus & { syncNow: () => Promise<{ synced: number; failed: number }> } {
  const [status, setStatus] = useState<SyncStatus>(() => getSyncStatus());

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  return {
    ...status,
    syncNow: syncAllPending,
  };
}
