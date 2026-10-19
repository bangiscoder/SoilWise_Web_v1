import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Sparkles,
  Clock,
  ArrowRight,
  AlertTriangle,
  Info,
  Lightbulb,
  Check,
  Compass,
  Play,
} from 'lucide-react';
import { Lesson } from '../../types/learning';
import { TOPIC_CATEGORIES } from '../../data/learningCurriculum';
import { getYouTubeEmbedUrl } from '../../utils/youtubeUtils';

interface LessonDetailModalProps {
  lesson: Lesson | null;
  isOpen: boolean;
  onClose: () => void;
  isCompleted: boolean;
  isSaved: boolean;
  onToggleComplete: (lessonId: string) => void;
  onToggleSave: (lessonId: string) => void;
  onAskAi: (lesson: Lesson) => void;
  onSelectLesson: (lesson: Lesson) => void;
  nextLesson?: Lesson | null;
  userFarmContextSummary?: string | null;
}

export const LessonDetailModal: React.FC<LessonDetailModalProps> = ({
  lesson,
  isOpen,
  onClose,
  isCompleted,
  isSaved,
  onToggleComplete,
  onToggleSave,
  onAskAi,
  onSelectLesson,
  nextLesson,
  userFarmContextSummary,
}) => {
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Reset quiz state when changing lesson
  React.useEffect(() => {
    setSelectedQuizOption(null);
    setQuizSubmitted(false);
  }, [lesson?.id]);

  if (!isOpen || !lesson) return null;

  const topicCategory = TOPIC_CATEGORIES.find(c => c.id === lesson.topic);
  const isQuizCorrect = selectedQuizOption === lesson.knowledgeCheck.correctIndex;
  const embedUrl = lesson ? getYouTubeEmbedUrl(lesson.youtubeVideoId || lesson.youtubeVideoUrl) : null;

  const handleQuizSubmit = () => {
    if (selectedQuizOption === null) return;
    setQuizSubmitted(true);
    if (selectedQuizOption === lesson.knowledgeCheck.correctIndex && !isCompleted) {
      onToggleComplete(lesson.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-modal-title"
      >
        {/* Top Header Bar */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-stone-200 flex items-center justify-between bg-[#fbfbf9] shrink-0">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-600 font-medium">
            <span className="text-[#1b4332] font-bold">{topicCategory?.title || 'Learning Hub'}</span>
            <span className="text-stone-300">·</span>
            <span className="flex items-center gap-1 text-stone-500">
              <Clock className="w-3.5 h-3.5" />
              {lesson.estimatedMinutes} min read
            </span>
            <span className="text-stone-300">·</span>
            <span className="capitalize text-stone-500">{lesson.difficulty}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSave(lesson.id)}
              title={isSaved ? 'Remove from saved lessons' : 'Save lesson for later'}
              className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              {isSaved ? (
                <BookmarkCheck className="w-5 h-5 text-emerald-700" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={onClose}
              title="Close lesson"
              className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Lesson Body */}
        <div className="overflow-y-auto px-5 sm:px-8 py-6 sm:py-8 space-y-7">
          {/* Title & Subtitle */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isCompleted && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  Completed
                </span>
              )}
            </div>
            <h2 id="lesson-modal-title" className="text-xl sm:text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight leading-snug">
              {lesson.title}
            </h2>
            <p className="mt-2 text-sm sm:text-base text-stone-600 leading-relaxed font-medium">
              {lesson.subtitle}
            </p>
          </div>

          {/* Contextual Farm Guidance Callout */}
          <div className="p-4 sm:p-5 bg-[#f4f7f2] border border-[#1b4332]/15 rounded-2xl">
            <div className="flex items-start gap-3">
              <Compass className="w-5 h-5 text-[#1b4332] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs sm:text-sm font-bold text-[#1b4332] uppercase tracking-wider">
                  What this means for your farm
                </h4>
                <p className="text-xs sm:text-sm text-stone-800 leading-relaxed">
                  {lesson.whatThisMeansForYourFarm}
                </p>
                {userFarmContextSummary && (
                  <p className="text-xs text-stone-600 mt-1 italic">
                    Current farm context: {userFarmContextSummary}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* YouTube Video Lesson Embed */}
          {embedUrl && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <Play className="w-4 h-4 text-red-600 fill-red-600" />
                  <span>Video Lesson</span>
                </h4>
                {lesson.videoTitle && (
                  <span className="text-xs text-stone-500 truncate max-w-sm hidden sm:inline" title={lesson.videoTitle}>
                    {lesson.videoTitle}
                  </span>
                )}
              </div>

              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-md border border-stone-200">
                <iframe
                  src={embedUrl}
                  title={lesson.videoTitle || lesson.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* Key Takeaways */}
          <div className="space-y-2.5 bg-stone-50 border border-stone-200 p-4 sm:p-5 rounded-2xl">
            <h4 className="text-xs sm:text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              Key Agricultural Takeaways
            </h4>
            <ul className="space-y-2 mt-2">
              {lesson.keyTakeaways.map((takeaway, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-700 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1b4332] shrink-0 mt-2" />
                  <span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Lesson Main Content Sections */}
          <div className="space-y-6 pt-2">
            {lesson.contentSections.map((sec, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  {sec.title}
                </h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
                  {sec.body}
                </p>

                {sec.bulletPoints && sec.bulletPoints.length > 0 && (
                  <ul className="space-y-1.5 pl-2">
                    {sec.bulletPoints.map((pt, pIdx) => (
                      <li key={pIdx} className="text-xs sm:text-sm text-stone-700 leading-relaxed flex items-start gap-2">
                        <span className="text-[#1b4332] font-bold">›</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {sec.callout && (
                  <div className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed flex items-start gap-3 ${
                    sec.callout.type === 'warning' 
                      ? 'bg-amber-50 border-amber-200 text-amber-900' 
                      : sec.callout.type === 'tip'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}>
                    {sec.callout.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />}
                    {sec.callout.type === 'tip' && <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />}
                    {sec.callout.type === 'info' && <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />}
                    <p>{sec.callout.text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Practical Field Action */}
          <div className="p-4 sm:p-5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2">
            <h4 className="text-xs sm:text-sm font-bold text-amber-950 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-700" />
              Practical Action on Your Farm
            </h4>
            <p className="text-xs sm:text-sm text-stone-800 leading-relaxed">
              {lesson.practicalAction}
            </p>
          </div>

          {/* Interactive Knowledge Check */}
          <div className="p-5 sm:p-6 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                Quick Knowledge Check
              </h4>
              <span className="text-xs text-stone-500">Test your understanding</span>
            </div>

            <p className="text-xs sm:text-sm font-medium text-stone-800">
              {lesson.knowledgeCheck.question}
            </p>

            <div className="space-y-2">
              {lesson.knowledgeCheck.options.map((opt, optIdx) => {
                const isSelected = selectedQuizOption === optIdx;
                let optionStyle = 'bg-white border-stone-200 text-stone-700 hover:border-stone-300';
                
                if (quizSubmitted) {
                  if (optIdx === lesson.knowledgeCheck.correctIndex) {
                    optionStyle = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-medium';
                  } else if (isSelected) {
                    optionStyle = 'bg-red-50 border-red-300 text-red-900';
                  } else {
                    optionStyle = 'bg-white border-stone-200 text-stone-400 opacity-60';
                  }
                } else if (isSelected) {
                  optionStyle = 'bg-[#1b4332]/5 border-[#1b4332] text-[#1b4332] font-semibold';
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => {
                      if (!quizSubmitted) {
                        setSelectedQuizOption(optIdx);
                      }
                    }}
                    disabled={quizSubmitted}
                    className={`w-full text-left p-3 sm:p-3.5 rounded-xl border text-xs sm:text-sm transition-all flex items-start gap-3 cursor-pointer disabled:cursor-default ${optionStyle}`}
                  >
                    <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center shrink-0 text-xs mt-0.5">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {quizSubmitted && optIdx === lesson.knowledgeCheck.correctIndex && (
                      <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {!quizSubmitted ? (
              <button
                onClick={handleQuizSubmit}
                disabled={selectedQuizOption === null}
                className="px-4 py-2 bg-[#1b4332] text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-[#143225] transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Submit Answer
              </button>
            ) : (
              <div className={`p-3.5 rounded-xl text-xs sm:text-sm space-y-1 ${
                isQuizCorrect ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-stone-100 text-stone-800 border border-stone-200'
              }`}>
                <p className="font-bold">
                  {isQuizCorrect ? 'Correct! Well done.' : 'Good try! Here is the explanation:'}
                </p>
                <p>{lesson.knowledgeCheck.explanation}</p>
              </div>
            )}
          </div>

          {/* Content Source & Review Metadata */}
          <div className="pt-2 border-t border-stone-200 text-[11px] text-stone-500 space-y-0.5">
            <p>
              <span className="font-semibold text-stone-600">Educational Review:</span> {lesson.authorOrg}
            </p>
            <p>
              <span className="font-semibold text-stone-600">Last Reviewed:</span> {new Date(lesson.reviewDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Bottom Actions Footer */}
        <div className="px-5 sm:px-8 py-4 border-t border-stone-200 bg-[#fbfbf9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => onAskAi(lesson)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <span>Ask AI Companion About This</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleComplete(lesson.id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98] ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                  : 'bg-[#1b4332] text-white hover:bg-[#143225]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isCompleted ? 'Marked as Completed' : 'Mark as Completed'}</span>
            </button>

            {nextLesson && (
              <button
                onClick={() => onSelectLesson(nextLesson)}
                title={`Next: ${nextLesson.title}`}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
