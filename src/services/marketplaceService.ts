import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  serverTimestamp, 
  increment 
} from 'firebase/firestore';
import { db, isFirebaseConfigured, auth, AUTHORIZED_ADMIN_EMAIL } from '../lib/firebase';
import { CropSeed, SeedOrder, SeedOrderStatus } from '../types/marketplace';
import { INITIAL_SEEDS_CATALOGUE } from '../data/initialSeedsCatalogue';
import { enqueueSyncItem } from './backgroundSyncService';

const SEEDS_COLLECTION = 'marketplace_seeds';
const ORDERS_COLLECTION = 'marketplace_orders';
const LOCAL_STORAGE_CUSTOM_SEEDS_KEY = 'soilwise_custom_admin_seeds';
const LOCAL_STORAGE_ORDERS_KEY = 'soilwise_seed_orders';

/**
 * Checks whether current logged in user is the authorized SoilWise admin.
 */
function isUserAdmin(): boolean {
  const email = auth?.currentUser?.email;
  return Boolean(email && email.toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase());
}

/**
 * Retrieve custom seeds saved locally in fallback mode.
 */
function getLocalCustomSeeds(): CropSeed[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_SEEDS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

/**
 * Save custom seeds locally.
 */
function saveLocalCustomSeeds(seeds: CropSeed[]) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_SEEDS_KEY, JSON.stringify(seeds));
  } catch (e) {
    console.warn('Failed to save local custom seeds', e);
  }
}

/**
 * Fetch all available crop seeds for the marketplace.
 * Merges built-in initial catalogue with any admin-created seeds or stock adjustments in Firestore.
 */
export async function fetchAllMarketplaceSeeds(): Promise<CropSeed[]> {
  const baseMap = new Map<string, CropSeed>();
  INITIAL_SEEDS_CATALOGUE.forEach(seed => {
    baseMap.set(seed.id, { ...seed });
  });

  // Load from local storage custom seeds
  const localSeeds = getLocalCustomSeeds();
  localSeeds.forEach(seed => {
    baseMap.set(seed.id, { ...seed });
  });

  if (!isFirebaseConfigured || !db) {
    return Array.from(baseMap.values());
  }

  try {
    const seedsRef = collection(db, SEEDS_COLLECTION);
    const snap = await getDocs(seedsRef);

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const seedObj: CropSeed = {
        id: docSnap.id,
        varietyName: data.varietyName || 'Unknown Crop Variety',
        cropType: data.cropType || 'other',
        category: data.category || 'cereals',
        description: data.description || '',
        maturityDays: data.maturityDays || '85-95 days',
        yieldPotential: data.yieldPotential || '3.5 - 5.0 t/ha',
        germinationRate: Number(data.germinationRate) || 90,
        suitableAgroZone: Array.isArray(data.suitableAgroZone) ? data.suitableAgroZone : ['Savanna'],
        pricePerKg: Number(data.pricePerKg) || 1500,
        stockKg: Number(data.stockKg) || 0,
        minOrderKg: Number(data.minOrderKg) || 1,
        recommendedRateKgPerHa: Number(data.recommendedRateKgPerHa) || 20,
        breederOrg: data.breederOrg || 'NASC Certified',
        packagingOptions: Array.isArray(data.packagingOptions) ? data.packagingOptions : ['5kg bag', '10kg bag'],
        imageUrl: data.imageUrl,
        inStock: typeof data.inStock === 'boolean' ? data.inStock : (Number(data.stockKg) > 0),
        featured: Boolean(data.featured),
        tags: Array.isArray(data.tags) ? data.tags : [],
        plantingSeason: data.plantingSeason,
        isCustomAdminSeed: Boolean(data.isCustomAdminSeed),
        createdAt: data.createdAt ? (typeof data.createdAt === 'string' ? data.createdAt : new Date(data.createdAt.seconds * 1000).toISOString()) : new Date().toISOString(),
        updatedAt: data.updatedAt ? (typeof data.updatedAt === 'string' ? data.updatedAt : new Date(data.updatedAt.seconds * 1000).toISOString()) : new Date().toISOString(),
      };
      baseMap.set(seedObj.id, seedObj);
    });

    return Array.from(baseMap.values());
  } catch (err) {
    console.warn('Firestore fetch marketplace seeds failed, using cached base catalogue:', err);
    return Array.from(baseMap.values());
  }
}

/**
 * Creates and adds a new crop seed variety to the library/catalogue.
 * Only authorized administrator can perform this action.
 */
export async function createAdminCropSeed(seedData: Omit<CropSeed, 'id' | 'createdAt' | 'updatedAt'>): Promise<CropSeed> {
  const newId = `seed-${seedData.cropType}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const nowStr = new Date().toISOString();

  const newSeed: CropSeed = {
    ...seedData,
    id: newId,
    isCustomAdminSeed: true,
    inStock: seedData.stockKg > 0,
    createdAt: nowStr,
    updatedAt: nowStr,
  };

  // Local storage save
  const existingLocal = getLocalCustomSeeds();
  saveLocalCustomSeeds([newSeed, ...existingLocal]);

  if (isFirebaseConfigured && db && isUserAdmin()) {
    try {
      const docRef = doc(db, SEEDS_COLLECTION, newId);
      await setDoc(docRef, {
        ...newSeed,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error saving new seed to Firestore:', err);
    }
  }

  return newSeed;
}

/**
 * Updates stock kilograms and/or pricing for an existing crop seed in the library.
 */
export async function updateSeedStock(
  seedId: string, 
  newStockKg: number, 
  pricePerKg?: number,
  inStock?: boolean
): Promise<void> {
  const nowStr = new Date().toISOString();

  // Update in local custom seeds if present
  const localSeeds = getLocalCustomSeeds();
  const foundIndex = localSeeds.findIndex(s => s.id === seedId);
  if (foundIndex >= 0) {
    localSeeds[foundIndex].stockKg = Math.max(0, newStockKg);
    localSeeds[foundIndex].inStock = typeof inStock === 'boolean' ? inStock : newStockKg > 0;
    if (typeof pricePerKg === 'number') {
      localSeeds[foundIndex].pricePerKg = pricePerKg;
    }
    localSeeds[foundIndex].updatedAt = nowStr;
    saveLocalCustomSeeds(localSeeds);
  }

  if (isFirebaseConfigured && db && isUserAdmin()) {
    try {
      const docRef = doc(db, SEEDS_COLLECTION, seedId);
      const docSnap = await getDoc(docRef);

      const updatePayload: Record<string, any> = {
        stockKg: Math.max(0, newStockKg),
        inStock: typeof inStock === 'boolean' ? inStock : newStockKg > 0,
        updatedAt: serverTimestamp(),
      };
      if (typeof pricePerKg === 'number') {
        updatePayload.pricePerKg = pricePerKg;
      }

      if (docSnap.exists()) {
        await updateDoc(docRef, updatePayload);
      } else {
        // If it was a built-in seed being updated for the first time, clone it into Firestore with the new stock!
        const baseSeed = INITIAL_SEEDS_CATALOGUE.find(s => s.id === seedId);
        if (baseSeed) {
          await setDoc(docRef, {
            ...baseSeed,
            ...updatePayload,
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.error(`Failed to update seed stock in Firestore for ${seedId}:`, err);
    }
  }
}

/**
 * Removes a crop seed from the library (Admin only).
 */
export async function deleteCropSeed(seedId: string): Promise<void> {
  // Remove from local storage
  const localSeeds = getLocalCustomSeeds().filter(s => s.id !== seedId);
  saveLocalCustomSeeds(localSeeds);

  if (isFirebaseConfigured && db && isUserAdmin()) {
    try {
      const docRef = doc(db, SEEDS_COLLECTION, seedId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error(`Failed to delete seed ${seedId} from Firestore:`, err);
      throw err;
    }
  }
}

/**
 * Places a farmer seed order specifying crop and kilograms.
 * Automatically records the order and decrements available stock.
 */
export async function placeSeedOrder(
  orderPayload: Omit<SeedOrder, 'id' | 'orderNumber' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<SeedOrder> {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderNumber = `SW-SEED-${new Date().getFullYear()}-${randomSuffix}`;
  const orderId = `order-${Date.now().toString(36)}-${randomSuffix}`;
  const nowIso = new Date().toISOString();

  const isPaid = orderPayload.paymentStatus === 'paid';

  const newOrder: SeedOrder = {
    ...orderPayload,
    id: orderId,
    orderNumber,
    status: isPaid ? 'confirmed' : 'pending',
    paymentStatus: orderPayload.paymentStatus || 'unpaid',
    paymentMethod: orderPayload.paymentMethod || 'paystack',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // 1. Save order locally for user history
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
      const existingOrders: SeedOrder[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify([newOrder, ...existingOrders]));
    } catch (e) {
      console.warn('Failed to save order to localStorage:', e);
    }
  }

  // 2. Decrement local stock if possible
  const localSeeds = getLocalCustomSeeds();
  const localSeedIdx = localSeeds.findIndex(s => s.id === orderPayload.seedId);
  if (localSeedIdx >= 0) {
    localSeeds[localSeedIdx].stockKg = Math.max(0, localSeeds[localSeedIdx].stockKg - orderPayload.quantityKg);
    localSeeds[localSeedIdx].inStock = localSeeds[localSeedIdx].stockKg > 0;
    saveLocalCustomSeeds(localSeeds);
  }

  // 3. Persist order and decrement stock in Firestore if available and online
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline && isFirebaseConfigured && db) {
    try {
      const orderRef = doc(db, ORDERS_COLLECTION, orderId);
      await setDoc(orderRef, {
        ...newOrder,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Decrement stock in Firestore
      const seedRef = doc(db, SEEDS_COLLECTION, orderPayload.seedId);
      const seedSnap = await getDoc(seedRef);
      if (seedSnap.exists()) {
        const currentStock = Number(seedSnap.data().stockKg) || 0;
        const newStock = Math.max(0, currentStock - orderPayload.quantityKg);
        await updateDoc(seedRef, {
          stockKg: newStock,
          inStock: newStock > 0,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn('Failed to write seed order to Firestore, queueing for background sync:', err);
      enqueueSyncItem('seed_order', newOrder, orderPayload.userId);
    }
  } else {
    // Application is offline or Firebase is not connected -> Queue for background sync!
    console.log('[Marketplace] Offline transaction detected. Queuing seed order for background sync.');
    enqueueSyncItem('seed_order', newOrder, orderPayload.userId);
  }

  return newOrder;
}

/**
 * Fetch orders for the current user.
 */
export async function fetchUserSeedOrders(userId?: string | null): Promise<SeedOrder[]> {
  const localOrders: SeedOrder[] = [];
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localOrders.push(...parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to read local orders:', e);
    }
  }

  if (!isFirebaseConfigured || !db || !userId) {
    return localOrders;
  }

  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    const q = query(ordersRef, where('userId', '==', userId));
    const snap = await getDocs(q);

    const firestoreOrders: SeedOrder[] = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      firestoreOrders.push({
        id: docSnap.id,
        orderNumber: d.orderNumber || docSnap.id,
        seedId: d.seedId,
        seedName: d.seedName,
        cropType: d.cropType || 'other',
        quantityKg: Number(d.quantityKg) || 0,
        pricePerKg: Number(d.pricePerKg) || 0,
        totalPrice: Number(d.totalPrice) || 0,
        currency: d.currency || 'NGN',
        farmerName: d.farmerName,
        farmerPhone: d.farmerPhone,
        farmerEmail: d.farmerEmail,
        state: d.state || '',
        lga: d.lga || '',
        farmLocationOrAddress: d.farmLocationOrAddress || '',
        deliveryMethod: d.deliveryMethod || 'pickup_depot',
        deliveryNotes: d.deliveryNotes,
        status: (d.status as SeedOrderStatus) || 'pending',
        paymentStatus: d.paymentStatus || (d.status === 'confirmed' ? 'paid' : 'unpaid'),
        paymentMethod: d.paymentMethod || 'paystack',
        paystackReference: d.paystackReference,
        paidAt: d.paidAt,
        amountPaidKobo: d.amountPaidKobo,
        userId: d.userId,
        createdAt: d.createdAt ? (typeof d.createdAt === 'string' ? d.createdAt : new Date(d.createdAt.seconds * 1000).toISOString()) : new Date().toISOString(),
        updatedAt: d.updatedAt ? (typeof d.updatedAt === 'string' ? d.updatedAt : new Date(d.updatedAt.seconds * 1000).toISOString()) : new Date().toISOString(),
      });
    });

    // Merge and deduplicate by id
    const map = new Map<string, SeedOrder>();
    localOrders.forEach(o => map.set(o.id, o));
    firestoreOrders.forEach(o => map.set(o.id, o));
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Firestore fetch user orders failed:', err);
    return localOrders;
  }
}

/**
 * Fetch all seed orders (Admin only).
 */
export async function fetchAllSeedOrders(): Promise<SeedOrder[]> {
  const orders: SeedOrder[] = [];

  // Always read local orders
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          orders.push(...parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to read local orders:', e);
    }
  }

  if (!isFirebaseConfigured || !db || !isUserAdmin()) {
    return orders;
  }

  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    const snap = await getDocs(ordersRef);

    const map = new Map<string, SeedOrder>();
    orders.forEach(o => map.set(o.id, o));

    snap.forEach(docSnap => {
      const d = docSnap.data();
      map.set(docSnap.id, {
        id: docSnap.id,
        orderNumber: d.orderNumber || docSnap.id,
        seedId: d.seedId,
        seedName: d.seedName,
        cropType: d.cropType || 'other',
        quantityKg: Number(d.quantityKg) || 0,
        pricePerKg: Number(d.pricePerKg) || 0,
        totalPrice: Number(d.totalPrice) || 0,
        currency: d.currency || 'NGN',
        farmerName: d.farmerName,
        farmerPhone: d.farmerPhone,
        farmerEmail: d.farmerEmail,
        state: d.state || '',
        lga: d.lga || '',
        farmLocationOrAddress: d.farmLocationOrAddress || '',
        deliveryMethod: d.deliveryMethod || 'pickup_depot',
        deliveryNotes: d.deliveryNotes,
        status: (d.status as SeedOrderStatus) || 'pending',
        paymentStatus: d.paymentStatus || (d.status === 'confirmed' ? 'paid' : 'unpaid'),
        paymentMethod: d.paymentMethod || 'paystack',
        paystackReference: d.paystackReference,
        paidAt: d.paidAt,
        amountPaidKobo: d.amountPaidKobo,
        userId: d.userId,
        createdAt: d.createdAt ? (typeof d.createdAt === 'string' ? d.createdAt : new Date(d.createdAt.seconds * 1000).toISOString()) : new Date().toISOString(),
        updatedAt: d.updatedAt ? (typeof d.updatedAt === 'string' ? d.updatedAt : new Date(d.updatedAt.seconds * 1000).toISOString()) : new Date().toISOString(),
      });
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Failed to fetch all orders for admin:', err);
    return orders;
  }
}

/**
 * Update an order's status (Admin only).
 */
export async function updateSeedOrderStatus(orderId: string, status: SeedOrderStatus): Promise<void> {
  const nowIso = new Date().toISOString();

  // Local storage update
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
      if (raw) {
        const list: SeedOrder[] = JSON.parse(raw);
        const idx = list.findIndex(o => o.id === orderId);
        if (idx >= 0) {
          list[idx].status = status;
          list[idx].updatedAt = nowIso;
          localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(list));
        }
      }
    } catch (e) {
      console.warn('Failed to update local order status:', e);
    }
  }

  if (isFirebaseConfigured && db && isUserAdmin()) {
    try {
      const orderRef = doc(db, ORDERS_COLLECTION, orderId);
      await updateDoc(orderRef, {
        status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(`Failed to update order status in Firestore for ${orderId}:`, err);
      throw err;
    }
  }
}
