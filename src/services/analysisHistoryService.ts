/**
 * SoilWise AI User Analysis History Service (Stage 2)
 * 
 * Manages saving, retrieving, reopening and deleting immutable Farm Analysis snapshots
 * under the user-owned subcollection: users/{uid}/analyses/{analysisId}
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';

import { db, isFirebaseConfigured, sanitizeForFirestore } from '../lib/firebase';
import { enqueueSyncItem } from './backgroundSyncService';
import { FarmAnalysisResult } from '../types/soilwise';
import { 
  SavedFarmAnalysisDocument, 
  SavedAnalysisSummary, 
  SaveAnalysisResult 
} from '../types/analysisHistory';

// In-memory set of already saved analysis IDs during session to prevent duplicate clicks/renders
const savedAnalysisSessionIds = new Set<string>();

const LOCAL_ANALYSES_PREFIX = 'soilwise_local_analyses_';

export function getLocalAnalysisSnapshots(userId: string): SavedFarmAnalysisDocument[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_ANALYSES_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[AnalysisHistory] Error reading local analysis snapshots:', err);
    return [];
  }
}

export function saveLocalAnalysisSnapshot(userId: string, snapshotDoc: SavedFarmAnalysisDocument): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined' || !userId) return;
  try {
    const existing = getLocalAnalysisSnapshots(userId);
    const filtered = existing.filter((item) => item.analysisId !== snapshotDoc.analysisId);
    filtered.unshift(snapshotDoc);
    const trimmed = filtered.slice(0, 50);
    localStorage.setItem(`${LOCAL_ANALYSES_PREFIX}${userId}`, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('[AnalysisHistory] Error caching local analysis snapshot:', err);
  }
}

export function getLocalAnalysisSnapshot(userId: string, analysisId: string): SavedFarmAnalysisDocument | null {
  const localList = getLocalAnalysisSnapshots(userId);
  return localList.find((item) => item.analysisId === analysisId) || null;
}

/**
 * Saves a completed Farm Analysis snapshot to the user's account history.
 * Ensures idempotency: will not recreate or overwrite if already saved.
 * Fully resilient to offline operation with local caching and background queue.
 */
export async function saveAnalysisSnapshot(
  analysis: FarmAnalysisResult,
  userId: string
): Promise<SaveAnalysisResult> {
  if (!userId) {
    return { success: false, error: 'User is not authenticated.' };
  }

  const analysisId = analysis.id;
  if (!analysisId) {
    return { success: false, error: 'Analysis has no valid identifier.' };
  }

  // Fast client-side idempotency check
  if (savedAnalysisSessionIds.has(`${userId}_${analysisId}`)) {
    return { success: true, analysisId };
  }

  const decision = analysis.cropRecommendationDecision;
  const topRec = decision?.top_recommendation;

  const farmEcology = 
    decision?.input_context?.location?.ecology || 
    analysis.environmentalInfo?.climateZone || 
    'Savanna Agro-Ecology';

  const nowIso = new Date().toISOString();

  // Clean clone of analysis for fullAnalysis:
  // Strip bulky internal debug fields (like rawResponse from iSDAsoil) and ensure photo size is safe
  const cleanAnalysis: FarmAnalysisResult = {
    ...analysis,
    soilEvidence: analysis.soilEvidence ? {
      ...analysis.soilEvidence,
      location_estimate: {
        ...analysis.soilEvidence.location_estimate,
        rawResponse: undefined, // Strip raw backend HTTP response to conserve document space
      },
    } : undefined,
    // If photo is excessively long (> 100 KB base64), omit to prevent exceeding document limit
    soilPhoto: (analysis.soilPhoto && analysis.soilPhoto.length > 100_000)
      ? null
      : analysis.soilPhoto,
  };

  const snapshotDoc: SavedFarmAnalysisDocument = {
    analysisId,
    userId,
    createdAt: analysis.createdAt || nowIso,
    updatedAt: nowIso,
    status: analysis.status || 'completed',
    farmId: analysis.farmId || undefined,
    farmName: analysis.farmName || undefined,

    farm: {
      farmId: analysis.farmId || undefined,
      farmName: analysis.farmName || undefined,
      location: analysis.location,
      ecology: farmEcology,
      state: analysis.selectedState || analysis.location?.state,
      lga: analysis.selectedLga || analysis.location?.lga,
    },

    soil: {
      input: analysis.soilData,
      provenance: analysis.soilDataProvenance,
      texture: analysis.soilTexture,
      evidence: cleanAnalysis.soilEvidence,
    },

    climate: {
      rainfallOutlook: analysis.rainfallOutlook,
      environmentalInfo: analysis.environmentalInfo,
    },

    recommendation: {
      topCrop: topRec?.crop?.name || 'Maize',
      topVariety: topRec?.variety?.name || 'SAMMAZ 47',
      score: topRec?.score?.normalised ?? 100,
      potentialYield: topRec?.potential_yield?.iar_potential_yield_tha ?? 0,
      decision: decision!,
    },

    versions: {
      decisionRuleVersion: decision?.decision_rule_version || '1.0.0',
      datasetVersion: decision?.dataset_version || '1.0.0',
      schemaVersion: decision?.schema_version || '1.0.0',
    },

    sources: decision?.sources || [
      {
        name: 'Institute for Agricultural Research (IAR) Crop Variety Descriptors Compendium',
        type: 'reference_dataset',
        description: 'Canonical variety descriptors database',
      },
    ],

    limitations: decision?.limitations || [],
    fullAnalysis: cleanAnalysis,
  };

  // 1. Immediately cache snapshot locally so user data is never lost under offline conditions
  saveLocalAnalysisSnapshot(userId, snapshotDoc);

  if (!db || !isFirebaseConfigured) {
    savedAnalysisSessionIds.add(`${userId}_${analysisId}`);
    return { success: true, analysisId };
  }

  try {
    const docRef = doc(db, 'users', userId, 'analyses', analysisId);

    // 2. Safe idempotency check: only if doc exists in cache or server
    try {
      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        savedAnalysisSessionIds.add(`${userId}_${analysisId}`);
        return { success: true, analysisId };
      }
    } catch (checkErr: any) {
      // If client is offline or document not yet in cache, ignore read error and proceed directly to saving
      console.warn('[AnalysisHistory] Idempotency read check skipped (offline or not cached):', checkErr?.message || checkErr);
    }

    let sanitized = sanitizeForFirestore(snapshotDoc as Record<string, any>);
    let docSize = JSON.stringify(sanitized).length;

    // Hard ceiling: Firestore documents must not exceed 1,048,576 bytes. Keep comfortably under 750,000 bytes.
    if (docSize > 750_000) {
      console.warn(`[AnalysisHistory] Snapshot size (${docSize} bytes) exceeds safety threshold. Trimming heavy arrays.`);
      if (sanitized.recommendation?.decision?.recommendations?.length > 5) {
        sanitized.recommendation.decision.recommendations = sanitized.recommendation.decision.recommendations.slice(0, 5);
      }
      if (sanitized.fullAnalysis?.cropRecommendationDecision?.recommendations?.length > 5) {
        sanitized.fullAnalysis.cropRecommendationDecision.recommendations = sanitized.fullAnalysis.cropRecommendationDecision.recommendations.slice(0, 5);
      }
      if (sanitized.recommendation?.decision?.excluded_candidates) {
        delete sanitized.recommendation.decision.excluded_candidates;
      }
      if (sanitized.fullAnalysis?.cropRecommendationDecision?.excluded_candidates) {
        delete sanitized.fullAnalysis.cropRecommendationDecision.excluded_candidates;
      }
      if (sanitized.fullAnalysis?.soilPhoto) {
        delete sanitized.fullAnalysis.soilPhoto;
      }
      sanitized = sanitizeForFirestore(sanitized);
    }

    try {
      await setDoc(docRef, sanitized);
    } catch (writeErr: any) {
      await enqueueSyncItem('farm_analysis', {
        userId,
        analysisId,
        sanitizedDoc: sanitized
      }, userId);
    }

    savedAnalysisSessionIds.add(`${userId}_${analysisId}`);
    return { success: true, analysisId };
  } catch (error: any) {
    console.warn('[AnalysisHistory] Error during remote Firestore save, snapshot secured locally:', error);
    // Ensure background sync item exists so it can sync when online
    try {
      await enqueueSyncItem('farm_analysis', {
        userId,
        analysisId,
        sanitizedDoc: sanitizeForFirestore(snapshotDoc as Record<string, any>)
      }, userId);
    } catch {}
    savedAnalysisSessionIds.add(`${userId}_${analysisId}`);
    return { success: true, analysisId };
  }
}

/**
 * Retrieves the reverse-chronological list of saved analyses for the authenticated user.
 * Seamlessly merges Firestore remote data with locally cached analysis snapshots.
 */
export async function getUserAnalysisHistory(userId: string): Promise<SavedAnalysisSummary[]> {
  const localDocs = getLocalAnalysisSnapshots(userId);
  const localSummaries: SavedAnalysisSummary[] = localDocs.map((data) => ({
    analysisId: data.analysisId,
    userId: data.userId || userId,
    createdAt: data.createdAt,
    state: data.farm?.state,
    lga: data.farm?.lga,
    ecology: data.farm?.ecology || 'Savanna Ecology',
    topCrop: data.recommendation?.topCrop || 'Crop',
    topVariety: data.recommendation?.topVariety || 'Variety',
    score: data.recommendation?.score ?? 0,
    potentialYield: data.recommendation?.potentialYield ?? 0,
    status: data.status || 'completed',
    farmId: data.farmId || data.farm?.farmId,
    farmName: data.farmName || data.farm?.farmName,
  }));

  if (!userId || !db || !isFirebaseConfigured) return localSummaries;

  try {
    const analysesCol = collection(db, 'users', userId, 'analyses');
    const q = query(analysesCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const remoteSummaries: SavedAnalysisSummary[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as SavedFarmAnalysisDocument;
      remoteSummaries.push({
        analysisId: data.analysisId || d.id,
        userId: data.userId || userId,
        createdAt: data.createdAt,
        state: data.farm?.state,
        lga: data.farm?.lga,
        ecology: data.farm?.ecology || 'Savanna Ecology',
        topCrop: data.recommendation?.topCrop || 'Crop',
        topVariety: data.recommendation?.topVariety || 'Variety',
        score: data.recommendation?.score ?? 0,
        potentialYield: data.recommendation?.potentialYield ?? 0,
        status: data.status || 'completed',
        farmId: data.farmId || data.farm?.farmId,
        farmName: data.farmName || data.farm?.farmName,
      });
    });

    const summaryMap = new Map<string, SavedAnalysisSummary>();
    localSummaries.forEach((s) => summaryMap.set(s.analysisId, s));
    remoteSummaries.forEach((s) => summaryMap.set(s.analysisId, s));

    return Array.from(summaryMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.warn('[AnalysisHistory] Could not load remote user analysis history, using local cache:', error);
    return localSummaries;
  }
}

/**
 * Loads a full historical analysis snapshot by ID for reopening.
 * Checks Firestore with fallback to local cached snapshot if offline.
 */
export async function getAnalysisSnapshot(
  userId: string,
  analysisId: string
): Promise<SavedFarmAnalysisDocument | null> {
  const localDoc = getLocalAnalysisSnapshot(userId, analysisId);

  if (!userId || !analysisId || !db || !isFirebaseConfigured) {
    return localDoc;
  }

  try {
    const docRef = doc(db, 'users', userId, 'analyses', analysisId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SavedFarmAnalysisDocument;
    }
    return localDoc;
  } catch (error) {
    console.warn('[AnalysisHistory] Error fetching remote historical snapshot, falling back to local:', error);
    return localDoc;
  }
}

/**
 * Deletes an analysis snapshot from the user's history locally and remotely.
 */
export async function deleteAnalysisSnapshot(
  userId: string,
  analysisId: string
): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined' && userId) {
    try {
      const existing = getLocalAnalysisSnapshots(userId);
      const filtered = existing.filter((i) => i.analysisId !== analysisId);
      localStorage.setItem(`${LOCAL_ANALYSES_PREFIX}${userId}`, JSON.stringify(filtered));
    } catch (e) {
      console.warn('[AnalysisHistory] Error deleting local snapshot:', e);
    }
  }

  savedAnalysisSessionIds.delete(`${userId}_${analysisId}`);

  if (!userId || !analysisId || !db || !isFirebaseConfigured) {
    return { success: true };
  }

  try {
    const docRef = doc(db, 'users', userId, 'analyses', analysisId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error: any) {
    console.warn('[AnalysisHistory] Error deleting remote analysis snapshot (local already removed):', error);
    return { success: true };
  }
}

