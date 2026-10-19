export type LessonTopic = 
  | 'soil-basics'
  | 'soil-health'
  | 'weather-climate'
  | 'crop-suitability'
  | 'sustainable-management';

export type LessonDifficulty = 'foundational' | 'intermediate' | 'advanced';

export type LessonFormat = 'guide' | 'practical' | 'interactive';

export interface LessonContentSection {
  title: string;
  body: string;
  bulletPoints?: string[];
  callout?: {
    type: 'tip' | 'warning' | 'info';
    text: string;
  };
}

export interface LessonKnowledgeCheck {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  topic: LessonTopic;
  difficulty: LessonDifficulty;
  estimatedMinutes: number;
  format: LessonFormat;
  order: number;
  summary: string;
  youtubeVideoId?: string;
  youtubeVideoUrl?: string;
  videoTitle?: string;
  keyTakeaways: string[];
  practicalAction: string;
  whatThisMeansForYourFarm: string;
  contentSections: LessonContentSection[];
  knowledgeCheck: LessonKnowledgeCheck;
  relevantSoilProperties?: ('ph' | 'nitrogen' | 'phosphorus' | 'potassium' | 'organic_carbon' | 'texture' | 'ec')[];
  relevantWeatherAspects?: ('rainfall' | 'dry_spells' | 'evapotranspiration' | 'temperature')[];
  relevantCrops?: string[];
  authorOrg: string;
  reviewDate: string;
  isCustomAdminLesson?: boolean;
  createdAt?: string;
}

export interface UserLearningProgress {
  completedLessonIds: string[];
  activeLessonId: string | null;
  savedLessonIds: string[];
  lastAccessedDate: string;
  quizScores: Record<string, boolean>; // lessonId -> passed
}

export interface TopicCategoryInfo {
  id: LessonTopic;
  title: string;
  tagline: string;
  description: string;
  lessonCount?: number;
  color: string;
}
