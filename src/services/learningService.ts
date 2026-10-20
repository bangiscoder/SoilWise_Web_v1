import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { Lesson, UserLearningProgress, LessonTopic } from '../types/learning';
import { INITIAL_LESSONS, TOPIC_CATEGORIES } from '../data/learningCurriculum';
import { FarmAnalysisResult } from '../types/soilwise';
import { extractYouTubeVideoId } from '../utils/youtubeUtils';
import { enqueueSyncItem } from './backgroundSyncService';

const LOCAL_STORAGE_KEY = 'soilwise_learning_progress_v1';

const DEFAULT_PROGRESS: UserLearningProgress = {
  completedLessonIds: [],
  activeLessonId: 'soil-basics-1',
  savedLessonIds: [],
  lastAccessedDate: new Date().toISOString(),
  quizScores: {},
};

/**
 * Loads learning progress from local storage, with fallback to default
 */
export function getLocalLearningProgress(): UserLearningProgress {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    return {
      completedLessonIds: Array.isArray(parsed.completedLessonIds) ? parsed.completedLessonIds : [],
      activeLessonId: typeof parsed.activeLessonId === 'string' ? parsed.activeLessonId : 'soil-basics-1',
      savedLessonIds: Array.isArray(parsed.savedLessonIds) ? parsed.savedLessonIds : [],
      lastAccessedDate: parsed.lastAccessedDate || new Date().toISOString(),
      quizScores: typeof parsed.quizScores === 'object' && parsed.quizScores !== null ? parsed.quizScores : {},
    };
  } catch (e) {
    console.warn('Failed to parse local learning progress:', e);
    return { ...DEFAULT_PROGRESS };
  }
}

/**
 * Saves learning progress to local storage
 */
export function saveLocalLearningProgress(progress: UserLearningProgress): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn('Failed to save local learning progress:', e);
  }
}

/**
 * Synchronizes learning progress with Firestore if authenticated
 */
export async function fetchUserLearningProgress(userId?: string): Promise<UserLearningProgress> {
  const local = getLocalLearningProgress();

  if (!userId || !db || !isFirebaseConfigured) {
    return local;
  }

  try {
    const docRef = doc(db, 'users', userId, 'learning', 'progress');
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const remoteData = snap.data() as Partial<UserLearningProgress>;
      
      // Merge remote and local (union of completed and saved lessons)
      const mergedCompleted = Array.from(new Set([
        ...(local.completedLessonIds || []),
        ...(remoteData.completedLessonIds || []),
      ]));

      const mergedSaved = Array.from(new Set([
        ...(local.savedLessonIds || []),
        ...(remoteData.savedLessonIds || []),
      ]));

      const mergedQuiz = {
        ...(local.quizScores || {}),
        ...(remoteData.quizScores || {}),
      };

      const merged: UserLearningProgress = {
        completedLessonIds: mergedCompleted,
        activeLessonId: remoteData.activeLessonId || local.activeLessonId || 'soil-basics-1',
        savedLessonIds: mergedSaved,
        lastAccessedDate: new Date().toISOString(),
        quizScores: mergedQuiz,
      };

      saveLocalLearningProgress(merged);
      return merged;
    } else {
      // First time user: initialize remote with local progress
      await setDoc(docRef, local, { merge: true });
      return local;
    }
  } catch (err) {
    console.warn('Failed to fetch remote learning progress from Firestore, falling back to local storage:', err);
    return local;
  }
}

/**
 * Persists progress locally and syncs to Firestore if user is logged in
 */
export async function persistLearningProgress(progress: UserLearningProgress, userId?: string): Promise<void> {
  saveLocalLearningProgress(progress);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (userId) {
    if (isOnline && db && isFirebaseConfigured) {
      try {
        const docRef = doc(db, 'users', userId, 'learning', 'progress');
        await setDoc(docRef, progress, { merge: true });
      } catch (err) {
        console.warn('Failed to sync progress to Firestore, queueing for background sync:', err);
        enqueueSyncItem('learning_progress', progress, userId);
      }
    } else {
      console.log('[LearningHub] Offline progress recorded. Queuing for background sync.');
      enqueueSyncItem('learning_progress', progress, userId);
    }
  }
}

/**
 * Marks a lesson as completed
 */
export async function markLessonComplete(
  lessonId: string, 
  userId?: string
): Promise<UserLearningProgress> {
  const current = getLocalLearningProgress();
  if (!current.completedLessonIds.includes(lessonId)) {
    current.completedLessonIds.push(lessonId);
  }

  // Find next logical lesson if activeLessonId was just completed
  if (current.activeLessonId === lessonId) {
    const currentIndex = INITIAL_LESSONS.findIndex(l => l.id === lessonId);
    if (currentIndex >= 0 && currentIndex < INITIAL_LESSONS.length - 1) {
      current.activeLessonId = INITIAL_LESSONS[currentIndex + 1].id;
    }
  }

  current.lastAccessedDate = new Date().toISOString();
  await persistLearningProgress(current, userId);
  return current;
}

/**
 * Sets the active lesson (Continue Learning)
 */
export async function setActiveLesson(
  lessonId: string, 
  userId?: string
): Promise<UserLearningProgress> {
  const current = getLocalLearningProgress();
  current.activeLessonId = lessonId;
  current.lastAccessedDate = new Date().toISOString();
  await persistLearningProgress(current, userId);
  return current;
}

/**
 * Toggles bookmarking/saving a lesson
 */
export async function toggleSaveLesson(
  lessonId: string, 
  userId?: string
): Promise<UserLearningProgress> {
  const current = getLocalLearningProgress();
  if (current.savedLessonIds.includes(lessonId)) {
    current.savedLessonIds = current.savedLessonIds.filter(id => id !== lessonId);
  } else {
    current.savedLessonIds.push(lessonId);
  }
  await persistLearningProgress(current, userId);
  return current;
}

/**
 * Records quiz answer
 */
export async function recordQuizScore(
  lessonId: string, 
  passed: boolean, 
  userId?: string
): Promise<UserLearningProgress> {
  const current = getLocalLearningProgress();
  current.quizScores[lessonId] = passed;
  await persistLearningProgress(current, userId);
  return current;
}

/**
 * Personalization & Recommendation Engine
 * Matches lessons to the farmer's soil analysis, climate risks, and current progress.
 */
export function getRecommendedLessons(
  farmAnalysis?: FarmAnalysisResult | null,
  progress?: UserLearningProgress,
  availableLessons?: Lesson[]
): {
  recommendedLessons: Lesson[];
  primaryRecommendationReason: string;
} {
  const completedSet = new Set(progress?.completedLessonIds || []);
  const allLessons = availableLessons && availableLessons.length > 0 ? availableLessons : [...INITIAL_LESSONS];

  // If no farm analysis is provided, return foundational introductory path
  if (!farmAnalysis) {
    const uncompleted = allLessons.filter(l => !completedSet.has(l.id));
    return {
      recommendedLessons: uncompleted.slice(0, 4).length > 0 ? uncompleted.slice(0, 4) : allLessons.slice(0, 4),
      primaryRecommendationReason: 'Foundational agricultural lessons recommended for all farmers starting their learning journey.',
    };
  }

  // Scored candidate ranking
  const scored = allLessons.map(lesson => {
    let score = 0;
    const reasons: string[] = [];

    // Prioritize uncompleted lessons
    if (!completedSet.has(lesson.id)) {
      score += 15;
    } else {
      score -= 20; // lower priority for already completed
    }

    // 1. Soil pH relevance
    const ph = farmAnalysis.soilData?.ph;
    if (ph != null) {
      if (ph < 5.5 && (lesson.id === 'soil-basics-3' || lesson.id === 'sustainable-management-2')) {
        score += 35;
        reasons.push('Relevant to your acidic soil condition (pH ' + ph.toFixed(1) + ')');
      } else if (ph > 7.5 && lesson.id === 'soil-basics-3') {
        score += 20;
        reasons.push('Relevant to your alkaline soil condition');
      }
    }

    // 2. Texture relevance
    const texture = (farmAnalysis.soilTexture?.texturalClass || '').toLowerCase();
    if (texture.includes('sand') && (lesson.id === 'soil-basics-2' || lesson.id === 'weather-climate-3')) {
      score += 30;
      reasons.push('Tailored to sandy soil moisture retention and split fertilizer timing');
    } else if (texture.includes('clay') && (lesson.id === 'soil-basics-2' || lesson.id === 'soil-health-2')) {
      score += 25;
      reasons.push('Tailored to clay soil aeration and drainage management');
    }

    // 3. Provenance relevance (Estimated vs Measured)
    const isEstimated = farmAnalysis.soilDataProvenance === 'location_estimated' || !farmAnalysis.hasSoilTest;
    if (isEstimated && lesson.id === 'soil-basics-4') {
      score += 25;
      reasons.push('Explains how location-based estimates compare with physical lab tests');
    }

    // 4. Rainfall and climate relevance
    const seasonDuration = farmAnalysis.rainfallOutlook?.estimatedSeasonDurationDays;
    if (seasonDuration && seasonDuration < 110 && lesson.id === 'crop-suitability-2') {
      score += 30;
      reasons.push('Critical for matching crop maturity with your short rainy season (' + seasonDuration + ' days)');
    }

    // 5. Nitrogen & organic matter relevance
    const nitrogen = farmAnalysis.soilData?.nitrogen;
    if (nitrogen != null && nitrogen < 20 && (lesson.id === 'sustainable-management-1' || lesson.id === 'sustainable-management-3')) {
      score += 25;
      reasons.push('Addresses low soil nitrogen through organic amendments and legume rotation');
    }

    // Foundational bonus
    if (lesson.difficulty === 'foundational') {
      score += 5;
    }

    return {
      lesson,
      score,
      reason: reasons[0] || 'Recommended based on your farm profile and agricultural context',
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const topRecommendations = scored.map(s => s.lesson).slice(0, 4);
  const primaryReason = scored[0]?.reason || 'Recommended based on your current farm profile.';

  return {
    recommendedLessons: topRecommendations,
    primaryRecommendationReason: primaryReason,
  };
}

/**
 * Filter lessons by topic or search query
 */
export function filterLessons(
  lessons: Lesson[],
  selectedTopic: LessonTopic | 'all',
  searchQuery: string
): Lesson[] {
  let list = lessons;

  if (selectedTopic !== 'all') {
    list = list.filter(l => l.topic === selectedTopic);
  }

  const query = searchQuery.trim().toLowerCase();
  if (query) {
    list = list.filter(l => 
      l.title.toLowerCase().includes(query) ||
      l.subtitle.toLowerCase().includes(query) ||
      l.summary.toLowerCase().includes(query) ||
      l.keyTakeaways.some(t => t.toLowerCase().includes(query)) ||
      l.practicalAction.toLowerCase().includes(query)
    );
  }

  return list;
}

const CUSTOM_LESSONS_LOCAL_STORAGE_KEY = 'soilwise_custom_lessons_v1';

/**
 * Loads custom admin lessons from local storage
 */
export function getLocalCustomLessons(): Lesson[] {
  try {
    const raw = localStorage.getItem(CUSTOM_LESSONS_LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse local custom lessons:', e);
    return [];
  }
}

/**
 * Saves custom admin lessons to local storage
 */
export function saveLocalCustomLessons(lessons: Lesson[]): void {
  try {
    localStorage.setItem(CUSTOM_LESSONS_LOCAL_STORAGE_KEY, JSON.stringify(lessons));
  } catch (e) {
    console.warn('Failed to save local custom lessons:', e);
  }
}

/**
 * Fetches all curriculum lessons: merges initial built-in lessons with admin-created lessons
 * from Firestore and local cache.
 */
export async function fetchAllCurriculumLessons(): Promise<Lesson[]> {
  const localCustom = getLocalCustomLessons();
  let remoteCustom: Lesson[] = [];

  if (db && isFirebaseConfigured) {
    try {
      const colRef = collection(db, 'learning_lessons');
      const snap = await getDocs(colRef);
      remoteCustom = snap.docs.map(d => ({ ...(d.data() as Lesson), id: d.id }));
      saveLocalCustomLessons(remoteCustom);
    } catch (err) {
      console.warn('Failed to fetch remote lessons from Firestore:', err);
    }
  }

  const customToUse = remoteCustom.length > 0 ? remoteCustom : localCustom;
  const mergedMap = new Map<string, Lesson>();

  for (const l of INITIAL_LESSONS) {
    mergedMap.set(l.id, l);
  }
  for (const c of customToUse) {
    mergedMap.set(c.id, c);
  }

  return Array.from(mergedMap.values()).sort((a, b) => (a.order || 99) - (b.order || 99));
}

/**
 * Creates and publishes a new lesson as an administrator
 */
export async function createAdminLesson(
  lessonData: Omit<Lesson, 'id'>
): Promise<Lesson> {
  const slug = lessonData.slug?.trim() || lessonData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const lessonId = `custom-lesson-${Date.now()}`;

  const videoId = extractYouTubeVideoId(lessonData.youtubeVideoId || lessonData.youtubeVideoUrl);

  const fullLesson: Lesson = {
    ...lessonData,
    id: lessonId,
    slug,
    youtubeVideoId: videoId || undefined,
    youtubeVideoUrl: lessonData.youtubeVideoUrl || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined),
    isCustomAdminLesson: true,
    createdAt: new Date().toISOString(),
  };

  // 1. Update local cache
  const localList = getLocalCustomLessons();
  localList.unshift(fullLesson);
  saveLocalCustomLessons(localList);

  // 2. Persist to Firestore
  if (db && isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'learning_lessons', lessonId);
      await setDoc(docRef, fullLesson);
    } catch (err) {
      console.error('Failed to save custom lesson to Firestore:', err);
    }
  }

  return fullLesson;
}

/**
 * Deletes a custom lesson from Firestore and local cache
 */
export async function deleteAdminLesson(lessonId: string): Promise<boolean> {
  // 1. Update local cache
  const localList = getLocalCustomLessons().filter(l => l.id !== lessonId);
  saveLocalCustomLessons(localList);

  // 2. Delete from Firestore
  if (db && isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'learning_lessons', lessonId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Failed to delete custom lesson from Firestore:', err);
    }
  }

  return true;
}
