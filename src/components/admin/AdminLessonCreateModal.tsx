import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Play,
  Sparkles,
  BookOpen,
  Lightbulb,
  Check,
  Video,
} from 'lucide-react';
import { Lesson, LessonTopic, LessonDifficulty, LessonFormat, LessonContentSection } from '../../types/learning';
import { TOPIC_CATEGORIES } from '../../data/learningCurriculum';
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '../../utils/youtubeUtils';
import { createAdminLesson } from '../../services/learningService';

interface AdminLessonCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLessonCreated: (lesson: Lesson) => void;
  adminEmail: string;
}

export const AdminLessonCreateModal: React.FC<AdminLessonCreateModalProps> = ({
  isOpen,
  onClose,
  onLessonCreated,
  adminEmail,
}) => {
  // Form State
  const [topic, setTopic] = useState<LessonTopic>('soil-basics');
  const [title, setTitle] = useState<string>('');
  const [subtitle, setSubtitle] = useState<string>('');
  const [difficulty, setDifficulty] = useState<LessonDifficulty>('foundational');
  const [format, setFormat] = useState<LessonFormat>('guide');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(5);
  const [summary, setSummary] = useState<string>('');
  const [whatThisMeansForYourFarm, setWhatThisMeansForYourFarm] = useState<string>('');
  const [practicalAction, setPracticalAction] = useState<string>('');
  const [authorOrg, setAuthorOrg] = useState<string>(
    'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks'
  );

  // YouTube Video Fields
  const [youtubeInput, setYoutubeInput] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');

  // Key Takeaways list
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>([
    '',
    '',
  ]);

  // Content Sections list
  const [contentSections, setContentSections] = useState<LessonContentSection[]>([
    {
      title: 'Core Agricultural Concept',
      body: '',
      bulletPoints: [],
      callout: {
        type: 'tip',
        text: '',
      },
    },
  ]);

  // Knowledge Check
  const [quizQuestion, setQuizQuestion] = useState<string>('');
  const [quizOptions, setQuizOptions] = useState<string[]>([
    '',
    '',
    '',
    '',
  ]);
  const [quizCorrectIndex, setQuizCorrectIndex] = useState<number>(0);
  const [quizExplanation, setQuizExplanation] = useState<string>('');

  // Status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Extracted Video ID preview
  const extractedVideoId = extractYouTubeVideoId(youtubeInput);
  const previewEmbedUrl = extractedVideoId ? getYouTubeEmbedUrl(extractedVideoId) : null;

  // Handlers for Takeaways
  const handleAddTakeaway = () => {
    if (keyTakeaways.length < 5) {
      setKeyTakeaways([...keyTakeaways, '']);
    }
  };

  const handleUpdateTakeaway = (index: number, value: string) => {
    const updated = [...keyTakeaways];
    updated[index] = value;
    setKeyTakeaways(updated);
  };

  const handleRemoveTakeaway = (index: number) => {
    if (keyTakeaways.length > 1) {
      setKeyTakeaways(keyTakeaways.filter((_, i) => i !== index));
    }
  };

  // Handlers for Content Sections
  const handleAddSection = () => {
    setContentSections([
      ...contentSections,
      {
        title: '',
        body: '',
        bulletPoints: [],
      },
    ]);
  };

  const handleUpdateSection = (index: number, updated: LessonContentSection) => {
    const list = [...contentSections];
    list[index] = updated;
    setContentSections(list);
  };

  const handleRemoveSection = (index: number) => {
    if (contentSections.length > 1) {
      setContentSections(contentSections.filter((_, i) => i !== index));
    }
  };

  // Handlers for Quiz Options
  const handleUpdateQuizOption = (index: number, value: string) => {
    const updated = [...quizOptions];
    updated[index] = value;
    setQuizOptions(updated);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!title.trim()) {
      setFormError('Please enter a lesson title.');
      return;
    }
    if (!subtitle.trim()) {
      setFormError('Please enter a short subtitle.');
      return;
    }
    if (!summary.trim()) {
      setFormError('Please enter a summary of the lesson.');
      return;
    }
    if (!whatThisMeansForYourFarm.trim()) {
      setFormError('Please enter what this lesson means for the farmer’s plot.');
      return;
    }
    if (!practicalAction.trim()) {
      setFormError('Please enter a practical field action.');
      return;
    }

    const filteredTakeaways = keyTakeaways.map(t => t.trim()).filter(Boolean);
    if (filteredTakeaways.length === 0) {
      setFormError('Please add at least one key takeaway.');
      return;
    }

    const validSections = contentSections.filter(s => s.title.trim() && s.body.trim());
    if (validSections.length === 0) {
      setFormError('Please provide at least one complete content section with a title and body.');
      return;
    }

    if (!quizQuestion.trim()) {
      setFormError('Please provide a knowledge check question.');
      return;
    }

    const validOptions = quizOptions.map(o => o.trim());
    if (validOptions.some(o => !o)) {
      setFormError('Please fill in all 4 quiz answer options.');
      return;
    }

    if (!quizExplanation.trim()) {
      setFormError('Please provide an explanation for the quiz answer.');
      return;
    }

    setIsSubmitting(true);

    try {
      const lessonPayload: Omit<Lesson, 'id'> = {
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        title: title.trim(),
        subtitle: subtitle.trim(),
        topic,
        difficulty,
        format,
        estimatedMinutes: Math.max(1, Number(estimatedMinutes) || 5),
        order: 99,
        summary: summary.trim(),
        youtubeVideoId: extractedVideoId || undefined,
        youtubeVideoUrl: youtubeInput.trim() || undefined,
        videoTitle: videoTitle.trim() || undefined,
        keyTakeaways: filteredTakeaways,
        whatThisMeansForYourFarm: whatThisMeansForYourFarm.trim(),
        practicalAction: practicalAction.trim(),
        contentSections: validSections.map(s => ({
          title: s.title.trim(),
          body: s.body.trim(),
          bulletPoints: s.bulletPoints?.map(b => b.trim()).filter(Boolean),
          callout: s.callout?.text?.trim() ? s.callout : undefined,
        })),
        knowledgeCheck: {
          question: quizQuestion.trim(),
          options: validOptions,
          correctIndex: quizCorrectIndex,
          explanation: quizExplanation.trim(),
        },
        authorOrg: authorOrg.trim() || 'SoilWise Agronomy Team in collaboration with IAR Zaria & NiMet advisory benchmarks',
        reviewDate: new Date().toISOString().split('T')[0],
      };

      const created = await createAdminLesson(lessonPayload);
      onLessonCreated(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to create lesson:', err);
      setFormError(err?.message || 'Failed to publish lesson. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-create-lesson-title"
      >
        {/* Header */}
        <div className="px-6 py-4 sm:py-5 border-b border-stone-200 flex items-center justify-between bg-[#fbfbf9] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Admin Curriculum Suite
              </span>
            </div>
            <h2 id="admin-create-lesson-title" className="text-lg sm:text-xl font-bold text-stone-900 mt-0.5">
              Create &amp; Publish New Agricultural Lesson
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-6 space-y-6">
          {formError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Basic Classification */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1b4332] border-b border-stone-200 pb-1.5 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              1. Lesson Basics &amp; Category
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Topic Category *
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value as LessonTopic)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
                >
                  {TOPIC_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as LessonDifficulty)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
                >
                  <option value="foundational">Foundational</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Estimated Read Time (mins)
                </label>
                <input
                  type="number"
                  min="1"
                  max="45"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Managing Zinc Deficiencies in Savanna Soils"
                  className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Subtitle / Hook *
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. How to recognize white bud symptoms in young maize and apply foliar zinc sulphate."
                  className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Summary for Smallholder Farmers *
                </label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Concise overview explaining the problem and solution in simple terms."
                  className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: YouTube Video Embedding */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1b4332] border-b border-stone-200 pb-1.5 flex items-center gap-2">
              <Video className="w-4 h-4 text-red-600" />
              2. Embedded YouTube Video Lesson
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  YouTube Video URL or Video ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={youtubeInput}
                    onChange={(e) => setYoutubeInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or 11-char ID"
                    className="w-full pl-3 pr-8 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
                  />
                  {extractedVideoId && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-600" title="Valid YouTube Video Detected">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Supports standard watch links, youtu.be links, or raw 11-character video IDs.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Video Title (Optional)
                </label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="e.g. Field demonstration of foliar zinc application"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
                />
              </div>
            </div>

            {/* Video Live Preview */}
            {previewEmbedUrl && (
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                  Live Video Embed Preview (ID: {extractedVideoId})
                </span>
                <div className="aspect-video w-full max-w-sm rounded-xl overflow-hidden bg-black shadow-xs">
                  <iframe
                    src={previewEmbedUrl}
                    title="Live Preview"
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Practical & Farm Context */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1b4332] border-b border-stone-200 pb-1.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              3. Farm Applicability &amp; Hands-on Action
            </h3>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                "What this means for your farm" Guidance *
              </label>
              <textarea
                rows={2}
                value={whatThisMeansForYourFarm}
                onChange={(e) => setWhatThisMeansForYourFarm(e.target.value)}
                placeholder="Explain how this applies directly to the user's soil, location, or crop recommendations."
                className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Practical Action on the Farm *
              </label>
              <textarea
                rows={2}
                value={practicalAction}
                onChange={(e) => setPracticalAction(e.target.value)}
                placeholder="Step-by-step physical action the farmer can perform in their field today."
                className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            {/* Key Takeaways */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  Key Agricultural Takeaways *
                </label>
                {keyTakeaways.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddTakeaway}
                    className="text-xs font-bold text-[#1b4332] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Takeaway
                  </button>
                )}
              </div>

              {keyTakeaways.map((takeaway, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs font-bold text-stone-400">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={takeaway}
                    onChange={(e) => handleUpdateTakeaway(idx, e.target.value)}
                    placeholder={`Takeaway bullet ${idx + 1}`}
                    className="flex-1 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
                  />
                  {keyTakeaways.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTakeaway(idx)}
                      className="p-1.5 text-stone-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Content Sections */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-stone-200 pb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1b4332] flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                4. In-Depth Content Sections
              </h3>
              <button
                type="button"
                onClick={handleAddSection}
                className="text-xs font-bold text-[#1b4332] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Section
              </button>
            </div>

            {contentSections.map((sec, idx) => (
              <div key={idx} className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700">
                    Section {idx + 1}
                  </span>
                  {contentSections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(idx)}
                      className="text-xs text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Section Heading *
                  </label>
                  <input
                    type="text"
                    value={sec.title}
                    onChange={(e) => handleUpdateSection(idx, { ...sec, title: e.target.value })}
                    placeholder="e.g. Recognizing Symptoms in the Field"
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Section Text Body *
                  </label>
                  <textarea
                    rows={3}
                    value={sec.body}
                    onChange={(e) => handleUpdateSection(idx, { ...sec, body: e.target.value })}
                    placeholder="Detailed explanation written in clear, accessible language."
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                    Callout Tip / Warning (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={sec.callout?.type || 'tip'}
                      onChange={(e) => handleUpdateSection(idx, {
                        ...sec,
                        callout: {
                          type: e.target.value as any,
                          text: sec.callout?.text || '',
                        }
                      })}
                      className="px-2 py-1.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900"
                    >
                      <option value="tip">Tip</option>
                      <option value="warning">Warning</option>
                      <option value="info">Info</option>
                    </select>

                    <input
                      type="text"
                      value={sec.callout?.text || ''}
                      onChange={(e) => handleUpdateSection(idx, {
                        ...sec,
                        callout: {
                          type: sec.callout?.type || 'tip',
                          text: e.target.value,
                        }
                      })}
                      placeholder="Callout highlight text"
                      className="flex-1 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section 5: Knowledge Check Quiz */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1b4332] border-b border-stone-200 pb-1.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              5. Interactive Knowledge Check (Quiz)
            </h3>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Quiz Question *
              </label>
              <input
                type="text"
                value={quizQuestion}
                onChange={(e) => setQuizQuestion(e.target.value)}
                placeholder="e.g. Which leaf symptom indicates acute zinc deficiency in maize seedlings?"
                className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700">
                Answer Options (select the radio button of the correct answer) *
              </label>
              {quizOptions.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="correct-quiz-choice"
                    checked={quizCorrectIndex === optIdx}
                    onChange={() => setQuizCorrectIndex(optIdx)}
                    className="w-4 h-4 text-[#1b4332] accent-[#1b4332] cursor-pointer"
                    id={`opt-radio-${optIdx}`}
                  />
                  <label htmlFor={`opt-radio-${optIdx}`} className="text-xs font-bold text-stone-500 w-4">
                    {String.fromCharCode(65 + optIdx)}.
                  </label>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleUpdateQuizOption(optIdx, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                    className="flex-1 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Answer Explanation *
              </label>
              <textarea
                rows={2}
                value={quizExplanation}
                onChange={(e) => setQuizExplanation(e.target.value)}
                placeholder="Provide a farmer-friendly explanation of why the correct option is right."
                className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
              />
            </div>
          </div>

          {/* Section 6: Educational Metadata */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Authoring / Reviewing Organization
              </label>
              <input
                type="text"
                value={authorOrg}
                onChange={(e) => setAuthorOrg(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-[#1b4332]"
              />
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Publishing Lesson...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Publish Lesson to Learning Hub</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
