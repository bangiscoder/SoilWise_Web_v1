export type SyncItemType = 'seed_order' | 'learning_progress' | 'farm_analysis' | 'user_profile';

export type SyncItemStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface SyncItem<T = any> {
  id: string;
  type: SyncItemType;
  payload: T;
  userId?: string | null;
  createdAt: string;
  status: SyncItemStatus;
  retryCount: number;
  lastError?: string;
  syncedAt?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  items: SyncItem[];
}
