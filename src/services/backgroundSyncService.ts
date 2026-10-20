import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { SyncItem, SyncItemType, SyncStatus } from '../types/sync';
import { SeedOrder } from '../types/marketplace';
import { UserLearningProgress } from '../types/learning';

const SYNC_QUEUE_KEY = 'soilwise_offline_sync_queue_v1';
const LAST_SYNC_KEY = 'soilwise_last_sync_timestamp';

type SyncListener = (status: SyncStatus) => void;
const listeners = new Set<SyncListener>();

let isSyncInProgress = false;

/**
 * Loads the current queued sync items from local storage
 */
export function getSyncQueue(): SyncItem[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[BackgroundSync] Error reading sync queue:', err);
    return [];
  }
}

/**
 * Saves sync queue to local storage and alerts listeners
 */
function saveSyncQueue(items: SyncItem[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items));
    notifyListeners();
  } catch (err) {
    console.warn('[BackgroundSync] Error saving sync queue:', err);
  }
}

/**
 * Enqueues an offline transaction or progress update
 */
export function enqueueSyncItem<T = any>(
  type: SyncItemType,
  payload: T,
  userId?: string | null
): SyncItem<T> {
  const queue = getSyncQueue();
  const newItem: SyncItem<T> = {
    id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    payload,
    userId: userId || null,
    createdAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };

  // If there is already an existing pending learning_progress or user_profile item for this user, replace with latest
  if (type === 'learning_progress' || type === 'user_profile') {
    const filtered = queue.filter(
      (item) => !(item.type === type && item.userId === userId && item.status === 'pending')
    );
    filtered.unshift(newItem);
    saveSyncQueue(filtered);
  } else {
    queue.unshift(newItem);
    saveSyncQueue(queue);
  }

  console.log(`[BackgroundSync] Enqueued offline ${type} (ID: ${newItem.id}). Pending: ${getPendingCount()}`);

  // If online, immediately schedule a flush
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    setTimeout(() => {
      syncAllPending();
    }, 500);
  }

  return newItem;
}

/**
 * Returns number of items awaiting synchronization
 */
export function getPendingCount(): number {
  return getSyncQueue().filter((item) => item.status === 'pending' || item.status === 'failed').length;
}

/**
 * Returns current status of background sync
 */
export function getSyncStatus(): SyncStatus {
  const queue = getSyncQueue();
  const pending = queue.filter((i) => i.status === 'pending' || i.status === 'failed').length;
  let lastSyncTime: string | null = null;
  if (typeof localStorage !== 'undefined') {
    lastSyncTime = localStorage.getItem(LAST_SYNC_KEY);
  }

  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: isSyncInProgress,
    pendingCount: pending,
    lastSyncTime,
    items: queue,
  };
}

/**
 * Subscribes to sync state changes
 */
export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(getSyncStatus());
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(): void {
  const status = getSyncStatus();
  listeners.forEach((cb) => {
    try {
      cb(status);
    } catch (e) {
      console.warn('[BackgroundSync] Listener error:', e);
    }
  });
}

/**
 * Synchronizes all pending queued items with remote Firestore database
 */
export async function syncAllPending(): Promise<{ synced: number; failed: number }> {
  if (isSyncInProgress) {
    return { synced: 0, failed: 0 };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[BackgroundSync] Cannot sync while offline. Queue will sync when online.');
    return { synced: 0, failed: getPendingCount() };
  }

  isSyncInProgress = true;
  notifyListeners();

  const queue = getSyncQueue();
  let syncedCount = 0;
  let failedCount = 0;

  try {
    for (const item of queue) {
      if (item.status === 'synced') continue;

      item.status = 'syncing';
      saveSyncQueue(queue);

      try {
        if (item.type === 'seed_order') {
          await syncSeedOrderItem(item.payload as SeedOrder);
        } else if (item.type === 'learning_progress') {
          await syncLearningProgressItem(item.payload as UserLearningProgress, item.userId);
        } else if (item.type === 'user_profile') {
          await syncUserProfileItem(item.payload, item.userId);
        }

        item.status = 'synced';
        item.syncedAt = new Date().toISOString();
        syncedCount++;
      } catch (err: any) {
        console.warn(`[BackgroundSync] Failed to sync item ${item.id}:`, err);
        item.status = 'failed';
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = err?.message || 'Sync failed';
        failedCount++;
      }
    }

    // Keep synced items for 48 hours for audit trail, remove older synced items
    const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
    const prunedQueue = queue.filter((item) => {
      if (item.status === 'synced' && item.syncedAt) {
        return new Date(item.syncedAt).getTime() > twoDaysAgo;
      }
      return true;
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    }

    saveSyncQueue(prunedQueue);
    console.log(`[BackgroundSync] Sync complete. Synced: ${syncedCount}, Failed: ${failedCount}`);
  } finally {
    isSyncInProgress = false;
    notifyListeners();
  }

  return { synced: syncedCount, failed: failedCount };
}

/**
 * Synchronizes an individual seed order to Firestore
 */
async function syncSeedOrderItem(order: SeedOrder): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    // If Firebase is not configured in environment, local order is primary
    return;
  }

  const orderRef = doc(db, 'marketplace_orders', order.id);
  await setDoc(
    orderRef,
    {
      ...order,
      syncedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // If order was paid via Paystack, also verify seed stock was adjusted in Firestore
  if (order.seedId && order.quantityKg > 0) {
    try {
      const seedRef = doc(db, 'marketplace_seeds', order.seedId);
      const seedSnap = await getDoc(seedRef);
      if (seedSnap.exists()) {
        const currentStock = Number(seedSnap.data().stockKg) || 0;
        const newStock = Math.max(0, currentStock - order.quantityKg);
        await updateDoc(seedRef, {
          stockKg: newStock,
          inStock: newStock > 0,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (stockErr) {
      console.warn('[BackgroundSync] Stock sync warning (non-fatal):', stockErr);
    }
  }
}

/**
 * Synchronizes user learning progress to Firestore
 */
async function syncLearningProgressItem(
  progress: UserLearningProgress,
  userId?: string | null
): Promise<void> {
  if (!userId || !isFirebaseConfigured || !db) {
    return;
  }

  const docRef = doc(db, 'users', userId, 'learning', 'progress');
  await setDoc(
    docRef,
    {
      ...progress,
      lastSyncedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Synchronizes updated user profile data to Firestore
 */
async function syncUserProfileItem(
  profilePayload: Record<string, any>,
  userId?: string | null
): Promise<void> {
  const targetUid = userId || profilePayload?.uid;
  if (!targetUid || !isFirebaseConfigured || !db) {
    return;
  }

  const userDocRef = doc(db, 'users', targetUid);
  await setDoc(
    userDocRef,
    {
      ...profilePayload,
      uid: targetUid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// Automatically listen for network connectivity restore
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[BackgroundSync] Online connection restored! Triggering queue flush...');
    notifyListeners();
    syncAllPending();
  });

  window.addEventListener('offline', () => {
    console.log('[BackgroundSync] Application went offline. Offline transactions will be queued.');
    notifyListeners();
  });

  // Periodically check if pending items need flush (every 45s when online)
  setInterval(() => {
    if (navigator.onLine && getPendingCount() > 0 && !isSyncInProgress) {
      syncAllPending();
    }
  }, 45000);
}
