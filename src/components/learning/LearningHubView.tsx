import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Compass,
  Sprout,
  Droplets,
  CloudSun,
  ShieldCheck,
  RotateCcw,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Lesson, LessonTopic, UserLearningProgress } from '../../types/learning';
import { TOPIC_CATEGORIES, INITIAL_LESSONS } from '../../data/learningCurriculum';
import {
  fetchUserLearningProgress,
  markLessonComplete,
  setActiveLesson,
  toggleSaveLesson,
  getRecommendedLessons,
  filterLessons,
  fetchAllCurriculumLessons,
} from '../../services/learningService';
import { LessonDetailModal } from './LessonDetailModal';
import { FarmAnalysisResult } from '../../types/soilwise';
import { useAuth } from '../../context/AuthContext';
import { SoilwiseAiAssistant } from '../SoilwiseAiAssistant';

interface LearningHubViewProps {
  currentAnalysis?: FarmAnalysisResult | null;
  onNavigateToAnalysis?: () => void;
  onNavigateToFarms?: () => void;
}

export const LearningHubView: React.FC<LearningHubViewProps> = ({
  currentAnalysis,
  onNavigateToAnalysis,
  onNavigateToFarms,
}) => {
  const { currentUser, userProfile } = useAuth();

  // Progress state
  const [progress, setProgress] = useState<UserLearningProgress>({
    completedLessonIds: [],
    activeLessonId: 'soil-basics-1',
    savedLessonIds: [],
    lastAccessedDate: new Date().toISOString(),
    quizScores: {},
  });
  const [isLoadingProgress, setIsLoadingProgress] = useState<boolean>(true);

  // Active filter state
  const [selectedTopic, setSelectedTopic] = useState<LessonTopic | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'saved' | 'completed'>('all');

  // Curriculum state (merges initial and admin custom lessons)
  const [curriculumLessons, setCurriculumLessons] = useState<Lesson[]>(INITIAL_LESSONS);

  // Modal lesson reading state
  const [activeModalLesson, setActiveModalLesson] = useState<Lesson | null>(null);

  // AI Assistant state
  const [isAiOpen, setIsAiOpen] = useState<boolean>(false);
  const [aiInitialQuery, setAiInitialQuery] = useState<string>('');

  // Fetch learning progress and curriculum on mount or auth change
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoadingProgress(true);
      try {
        const [userProgress, allLessons] = await Promise.all([
          fetchUserLearningProgress(currentUser?.uid),
          fetchAllCurriculumLessons(),
        ]);
        if (isMounted) {
          setProgress(userProgress);
          if (allLessons && allLessons.length > 0) {
            setCurriculumLessons(allLessons);
          }
        }
      } catch (err) {
        console.warn('Failed to load user learning data:', err);
      } finally {
        if (isMounted) {
          setIsLoadingProgress(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid]);

  // Derived greeting
  const displayName = userProfile?.displayName || currentUser?.displayName || 'Farmer';

  // Overall statistics
  const totalLessonsCount = curriculumLessons.length;
  const completedCount = progress.completedLessonIds.length;
  const completionPercent = Math.round((completedCount / totalLessonsCount) * 100);

  // Active lesson for "Continue Learning"
  const continueLesson: Lesson = useMemo(() => {
    if (progress.activeLessonId) {
      const found = curriculumLessons.find(l => l.id === progress.activeLessonId);
      if (found) return found;
    }
    // Fallback: first uncompleted lesson
    const uncompleted = curriculumLessons.find(l => !progress.completedLessonIds.includes(l.id));
    return uncompleted || curriculumLessons[0] || INITIAL_LESSONS[0];
  }, [progress.activeLessonId, progress.completedLessonIds, curriculumLessons]);

  // Recommendations
  const { recommendedLessons, primaryRecommendationReason } = useMemo(() => {
    return getRecommendedLessons(currentAnalysis, progress, curriculumLessons);
  }, [currentAnalysis, progress, curriculumLessons]);

  // Filtered lessons
  const displayedLessons = useMemo(() => {
    let list = curriculumLessons;

    if (activeFilterTab === 'saved') {
      list = list.filter(l => progress.savedLessonIds.includes(l.id));
    } else if (activeFilterTab === 'completed') {
      list = list.filter(l => progress.completedLessonIds.includes(l.id));
    }

    return filterLessons(list, selectedTopic, searchQuery);
  }, [selectedTopic, searchQuery, activeFilterTab, progress.savedLessonIds, progress.completedLessonIds, curriculumLessons]);

  // Context summary from farm analysis if present
  const farmContextSummary = useMemo(() => {
    if (!currentAnalysis) return null;
    const parts: string[] = [];
    if (currentAnalysis.location?.state) parts.push(currentAnalysis.location.state);
    if (currentAnalysis.soilData?.ph != null) parts.push(`pH ${currentAnalysis.soilData.ph.toFixed(1)}`);
    if (currentAnalysis.soilTexture?.texturalClass) parts.push(currentAnalysis.soilTexture.texturalClass);
    return parts.length > 0 ? parts.join(', ') : null;
  }, [currentAnalysis]);

  // Actions
  const handleOpenLesson = async (lesson: Lesson) => {
    setActiveModalLesson(lesson);
    const updated = await setActiveLesson(lesson.id, currentUser?.uid);
    setProgress(updated);
  };

  const handleToggleComplete = async (lessonId: string) => {
    const updated = await markLessonComplete(lessonId, currentUser?.uid);
    setProgress(updated);
  };

  const handleToggleSave = async (lessonId: string) => {
    const updated = await toggleSaveLesson(lessonId, currentUser?.uid);
    setProgress(updated);
  };

  const handleAskAiAboutLesson = (lesson: Lesson) => {
    const query = `I am reading the lesson "${lesson.title}". Can you explain in simple terms what practical steps I should take on my farm regarding ${lesson.summary}?`;
    setAiInitialQuery(query);
    setActiveModalLesson(null);
    setIsAiOpen(true);
  };

  const getTopicIcon = (topicId: LessonTopic) => {
    switch (topicId) {
      case 'soil-basics':
        return <Layers className="w-4 h-4 text-emerald-700" />;
      case 'soil-health':
        return <Sprout className="w-4 h-4 text-amber-700" />;
      case 'weather-climate':
        return <CloudSun className="w-4 h-4 text-sky-700" />;
      case 'crop-suitability':
        return <Compass className="w-4 h-4 text-teal-700" />;
      case 'sustainable-management':
        return <ShieldCheck className="w-4 h-4 text-stone-700" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  // Find next lesson for modal
  const nextLessonForModal = useMemo(() => {
    if (!activeModalLesson) return null;
    const currentIndex = curriculumLessons.findIndex(l => l.id === activeModalLesson.id);
    if (currentIndex >= 0 && currentIndex < curriculumLessons.length - 1) {
      return curriculumLessons[currentIndex + 1];
    }
    return null;
  }, [activeModalLesson, curriculumLessons]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 sm:space-y-10">
      {/* 1. WELCOME HEADER & VALUE PROPOSITION */}
      <section className="bg-gradient-to-br from-[#1b4332] to-[#143225] text-white rounded-3xl p-6 sm:p-9 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden md:block">
          <Sprout className="w-full h-full object-cover translate-x-8 -translate-y-8" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 text-emerald-300 text-xs sm:text-sm font-semibold tracking-wide uppercase">
            <GraduationCap className="w-4 h-4" />
            <span>SoilWise Learning Hub</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
            Welcome back, {displayName}.
          </h1>

          <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed font-normal">
            Understand your soil. Learn from your farm. Make informed decisions. Practical, actionable agricultural knowledge designed for smallholder farmers.
          </p>

          {/* Quick Stats Banner */}
          <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-emerald-100">
            <div>
              <span className="font-extrabold text-white text-base sm:text-lg mr-1">{completedCount}</span>
              <span>of {totalLessonsCount} lessons completed</span>
            </div>
            <span className="text-emerald-400/60 hidden xs:inline">·</span>
            <div>
              <span className="font-extrabold text-white text-base sm:text-lg mr-1">{completionPercent}%</span>
              <span>journey progress</span>
            </div>
            {currentAnalysis && (
              <>
                <span className="text-emerald-400/60 hidden sm:inline">·</span>
                <span className="text-emerald-200 text-xs hidden sm:inline">
                  Personalized to {currentAnalysis.location?.state || 'your farm'}
                </span>
              </>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden mt-3 max-w-md">
            <div 
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(completionPercent, 4)}%` }}
            />
          </div>
        </div>
      </section>

      {/* 2. CONTINUE LEARNING & MY LEARNING JOURNEY HIGHLIGHT */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Continue Learning Active Lesson (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="uppercase font-bold tracking-wider text-[#1b4332] flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                Continue Learning
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {continueLesson.estimatedMinutes} min read
              </span>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 group-hover:text-[#1b4332] transition-colors">
                {continueLesson.title}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-stone-600 leading-relaxed">
                {continueLesson.subtitle}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-stone-700 line-clamp-2 pt-1">
              {continueLesson.summary}
            </p>
          </div>

          <div className="pt-5 mt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <span className="capitalize">{continueLesson.difficulty}</span>
              <span>·</span>
              <span className="capitalize">{continueLesson.format}</span>
              {progress.completedLessonIds.includes(continueLesson.id) && (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  · <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                </span>
              )}
            </div>

            <button
              onClick={() => handleOpenLesson(continueLesson)}
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs active:scale-[0.98] flex items-center gap-2 cursor-pointer"
            >
              <span>{progress.completedLessonIds.includes(continueLesson.id) ? 'Review Lesson' : 'Resume Lesson'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Companion Quick Launcher (1 col) */}
        <div className="bg-[#f5f8f4] rounded-3xl p-6 sm:p-7 border border-[#1b4332]/15 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-9 h-9 rounded-xl bg-[#1b4332] text-emerald-300 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900">
                Ask SoilWise AI
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-stone-600 leading-relaxed">
                Have a specific question about your soil pH, crops, or recent rainfall forecast? Talk with your certified agronomist companion.
              </p>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#1b4332]/10">
            <button
              onClick={() => {
                setAiInitialQuery('Hello SoilWise AI! Can you help me understand how my soil properties affect my crop choices?');
                setIsAiOpen(true);
              }}
              className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 text-[#1b4332] border border-[#1b4332]/30 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Ask a Question</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. RECOMMENDED LESSONS BASED ON FARM PROFILE */}
      {recommendedLessons.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#1b4332]" />
                Recommended for Your Farm
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
                {primaryRecommendationReason}
              </p>
            </div>
            {currentAnalysis && onNavigateToAnalysis && (
              <button
                onClick={onNavigateToAnalysis}
                className="text-xs font-semibold text-[#1b4332] hover:underline cursor-pointer self-start sm:self-auto"
              >
                View Farm Analysis →
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendedLessons.map(lesson => {
              const isCompleted = progress.completedLessonIds.includes(lesson.id);
              const isSaved = progress.savedLessonIds.includes(lesson.id);
              return (
                <div
                  key={lesson.id}
                  onClick={() => handleOpenLesson(lesson)}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 hover:border-[#1b4332]/40 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span className="flex items-center gap-1 text-[#1b4332] font-semibold">
                        {getTopicIcon(lesson.topic)}
                        <span className="capitalize">{lesson.topic.replace('-', ' ')}</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSave(lesson.id);
                        }}
                        className="text-stone-400 hover:text-stone-700 cursor-pointer p-1"
                      >
                        {isSaved ? (
                          <BookmarkCheck className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <Bookmark className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-stone-900 group-hover:text-[#1b4332] transition-colors leading-snug">
                      {lesson.title}
                    </h3>

                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                      {lesson.subtitle}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {lesson.estimatedMinutes} min
                    </span>

                    {isCompleted ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </span>
                    ) : (
                      <span className="text-[#1b4332] font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        Read <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. EXPLORE TOPICS & LESSON CATALOG */}
      <section className="space-y-6 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
              Curriculum & Lesson Catalog
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Explore self-paced agricultural modules from foundational soil science to sustainable field management.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics, pH, fertilizer..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#1b4332] focus:ring-1 focus:ring-[#1b4332] shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Topic Category Navigation Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 border-b border-stone-200 scrollbar-none">
          <button
            onClick={() => {
              setSelectedTopic('all');
              setActiveFilterTab('all');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedTopic === 'all' && activeFilterTab === 'all'
                ? 'bg-[#1b4332] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            All Topics ({totalLessonsCount})
          </button>

          {TOPIC_CATEGORIES.map(cat => {
            const count = INITIAL_LESSONS.filter(l => l.topic === cat.id).length;
            const isSelected = selectedTopic === cat.id && activeFilterTab === 'all';
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedTopic(cat.id);
                  setActiveFilterTab('all');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#1b4332] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {getTopicIcon(cat.id)}
                <span>{cat.title} ({count})</span>
              </button>
            );
          })}

          <div className="h-4 w-px bg-stone-300 mx-1 shrink-0" />

          {/* Quick Filter: Saved / Completed */}
          <button
            onClick={() => setActiveFilterTab('saved')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              activeFilterTab === 'saved'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved ({progress.savedLessonIds.length})</span>
          </button>

          <button
            onClick={() => setActiveFilterTab('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer ${
              activeFilterTab === 'completed'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed ({completedCount})</span>
          </button>
        </div>

        {/* Lessons List Grid */}
        {displayedLessons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedLessons.map(lesson => {
              const isCompleted = progress.completedLessonIds.includes(lesson.id);
              const isSaved = progress.savedLessonIds.includes(lesson.id);
              const topicCat = TOPIC_CATEGORIES.find(c => c.id === lesson.topic);

              return (
                <div
                  key={lesson.id}
                  onClick={() => handleOpenLesson(lesson)}
                  className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-[#1b4332]/50 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="text-[#1b4332] font-semibold flex items-center gap-1.5">
                        {getTopicIcon(lesson.topic)}
                        <span>{topicCat?.title}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-stone-400">
                          <Clock className="w-3 h-3" />
                          {lesson.estimatedMinutes} min
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSave(lesson.id);
                          }}
                          className="text-stone-400 hover:text-stone-800 cursor-pointer p-0.5"
                          title={isSaved ? 'Saved' : 'Save'}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-stone-900 group-hover:text-[#1b4332] transition-colors leading-snug">
                        {lesson.title}
                      </h3>
                      <p className="mt-1 text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {lesson.subtitle}
                      </p>
                    </div>

                    <p className="text-xs text-stone-700 line-clamp-3 leading-relaxed">
                      {lesson.summary}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-stone-500">
                      <span className="capitalize text-[11px] font-medium bg-stone-100 px-2 py-0.5 rounded-md">
                        {lesson.difficulty}
                      </span>
                    </div>

                    {isCompleted ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1 text-xs">
                        <CheckCircle2 className="w-4 h-4" />
                        Completed
                      </span>
                    ) : (
                      <span className="text-[#1b4332] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Start Lesson <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 bg-white border border-stone-200 rounded-3xl text-center space-y-3">
            <BookOpen className="w-8 h-8 text-stone-400 mx-auto" />
            <h3 className="text-base font-bold text-stone-800">No lessons found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No agricultural lessons match your current search query or filter. Try clearing the filter or searching for another keyword.
            </p>
            <button
              onClick={() => {
                setSelectedTopic('all');
                setActiveFilterTab('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* 5. PRACTICAL FIELD CALLOUT */}
      <section className="bg-stone-50 border border-stone-200 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2 text-[#1b4332]">
            <Sprout className="w-5 h-5" />
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              Have Soil Test Data Ready?
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Run a full farm analysis with your coordinates and soil values. SoilWise AI will customize lesson recommendations and fertilizer advice directly to your field.
          </p>
        </div>

        <button
          onClick={onNavigateToAnalysis}
          className="px-5 py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs active:scale-[0.98] whitespace-nowrap self-start md:self-auto cursor-pointer"
        >
          Run Farm Analysis
        </button>
      </section>

      {/* Lesson Reader Modal */}
      <LessonDetailModal
        lesson={activeModalLesson}
        isOpen={activeModalLesson !== null}
        onClose={() => setActiveModalLesson(null)}
        isCompleted={activeModalLesson ? progress.completedLessonIds.includes(activeModalLesson.id) : false}
        isSaved={activeModalLesson ? progress.savedLessonIds.includes(activeModalLesson.id) : false}
        onToggleComplete={handleToggleComplete}
        onToggleSave={handleToggleSave}
        onAskAi={handleAskAiAboutLesson}
        onSelectLesson={handleOpenLesson}
        nextLesson={nextLessonForModal}
        userFarmContextSummary={farmContextSummary}
      />

      {/* SoilWise AI Companion Assistant Drawer/Modal */}
      <SoilwiseAiAssistant
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        initialQuery={aiInitialQuery}
        analysis={currentAnalysis}
      />
    </div>
  );
};
