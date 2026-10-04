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
import { FarmAnalysisResult } from '../types/soilwise';
import { 
  SavedFarmAnalysisDocument, 
  SavedAnalysisSummary, 
  SaveAnalysisResult 
} from '../types/analysisHistory';

// In-memory set of already saved analysis IDs during session to prevent duplicate clicks/renders
const savedAnalysisSessionIds = new Set<string>();

/**
 * Saves a completed Farm Analysis snapshot to the user's account history.
 * Ensures idempotency: will not recreate or overwrite if already saved.
 */
export async function saveAnalysisSnapshot(
  analysis: FarmAnalysisResult,
  userId: string
): Promise<SaveAnalysisResult> {
  if (!userId) {
    return { success: false, error: 'User is not authenticated.' };
  }

  if (!db || !isFirebaseConfigured) {
    return { success: false, error: 'Database service is temporarily unavailable.' };
  }

  const analysisId = analysis.id;
  if (!analysisId) {
    return { success: false, error: 'Analysis has no valid identifier.' };
  }

  // Fast client-side idempotency check
  if (savedAnalysisSessionIds.has(`${userId}_${analysisId}`)) {
    return { success: true, analysisId };
  }

  try {
    const docRef = doc(db, 'users', userId, 'analyses', analysisId);

    // Check if record already exists in Firestore (idempotent protection)
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      savedAnalysisSessionIds.add(`${userId}_${analysisId}`);
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

      farm: {
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

      // Complete analysis object to guarantee 100% faithful historical reopening
      fullAnalysis: cleanAnalysis,
    };

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

    await setDoc(docRef, sanitized);

    savedAnalysisSessionIds.add(`${userId}_${analysisId}`);
    return { success: true, analysisId };
  } catch (error: any) {
    console.error('Failed to save analysis snapshot to Firestore:', error);
    const code = error?.code || '';
    let userMsg = 'We could not save this analysis to your account history.';
    if (code === 'permission-denied') {
      userMsg = 'You do not have permission to save this analysis.';
    } else if (code === 'unavailable' || code === 'deadline-exceeded') {
      userMsg = 'Network connection timed out. Please check your internet connection.';
    }
    return { success: false, error: userMsg };
  }
}

/**
 * Retrieves the reverse-chronological list of saved analyses for the authenticated user.
 */
export async function getUserAnalysisHistory(userId: string): Promise<SavedAnalysisSummary[]> {
  if (!userId || !db || !isFirebaseConfigured) return [];

  try {
    const analysesCol = collection(db, 'users', userId, 'analyses');
    const q = query(analysesCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const summaries: SavedAnalysisSummary[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as SavedFarmAnalysisDocument;
      summaries.push({
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
      });
    });

    return summaries;
  } catch (error) {
    console.warn('Could not load user analysis history:', error);
    return [];
  }
}

/**
 * Loads a full historical analysis snapshot by ID for reopening.
 */
export async function getAnalysisSnapshot(
  userId: string,
  analysisId: string
): Promise<SavedFarmAnalysisDocument | null> {
  if (!userId || !analysisId || !db || !isFirebaseConfigured) return null;

  try {
    const docRef = doc(db, 'users', userId, 'analyses', analysisId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SavedFarmAnalysisDocument;
    }
    return null;
  } catch (error) {
    console.error('Error fetching historical analysis snapshot:', error);
    return null;
  }
}

/**
 * Deletes an analysis snapshot from the user's history.
 */
export async function deleteAnalysisSnapshot(
  userId: string,
  analysisId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || !analysisId || !db || !isFirebaseConfigured) {
    return { success: false, error: 'Database service unavailable.' };
  }

  try {
    const docRef = doc(db, 'users', userId, 'analyses', analysisId);
    await deleteDoc(docRef);
    savedAnalysisSessionIds.delete(`${userId}_${analysisId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting analysis snapshot:', error);
    return { success: false, error: error?.message || 'Could not delete analysis.' };
  }
}
