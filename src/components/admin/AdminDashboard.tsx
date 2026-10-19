import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  Sparkles, 
  CheckCircle2, 
  Download, 
  Search, 
  Filter, 
  LogOut, 
  ArrowLeft, 
  X, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  RefreshCw,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Compass,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Terminal,
  Cloud,
  Lock,
  Key,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Info,
  GraduationCap,
  Plus,
  Play,
  Video,
  Trash2,
  Eye,
  Scale,
  Sprout,
  Package,
  Edit
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  Timestamp 
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth, AUTHORIZED_ADMIN_EMAIL, FeedbackSubmission } from '../../lib/firebase';
import { fetchCredentialsStatus } from '../../services/soilDataValidationService';
import { TokenCacheMetadata } from '../../types/soilDataValidation';
import { Lesson, LessonTopic } from '../../types/learning';
import { TOPIC_CATEGORIES, INITIAL_LESSONS } from '../../data/learningCurriculum';
import { fetchAllCurriculumLessons, deleteAdminLesson } from '../../services/learningService';
import { AdminLessonCreateModal } from './AdminLessonCreateModal';
import { LessonDetailModal } from '../learning/LessonDetailModal';
import { getYouTubeThumbnailUrl, extractYouTubeVideoId } from '../../utils/youtubeUtils';
import { CropSeed, CropCategory, SeedOrder, SeedOrderStatus } from '../../types/marketplace';
import { 
  fetchAllMarketplaceSeeds, 
  updateSeedStock, 
  deleteCropSeed, 
  fetchAllSeedOrders, 
  updateSeedOrderStatus 
} from '../../services/marketplaceService';
import { AdminAddSeedModal } from './AdminSeedInventoryModal';

interface AdminDashboardProps {
  onLogout: () => void;
  onBackToApp: () => void;
  onOpenSoilDataTest?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onBackToApp, onOpenSoilDataTest }) => {
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isdaStatus, setIsdaStatus] = useState<TokenCacheMetadata | null>(null);
  const [showCloudRunGuide, setShowCloudRunGuide] = useState<boolean>(true);
  const [isCheckingCredentials, setIsCheckingCredentials] = useState<boolean>(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [guideActiveTab, setGuideActiveTab] = useState<'console' | 'cli' | 'secrets'>('console');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2500);
  };

  const handleRefreshDiagnostics = async () => {
    setIsCheckingCredentials(true);
    try {
      const data = await fetchCredentialsStatus();
      setIsdaStatus(data);
    } catch (err: any) {
      console.warn('Could not refresh credentials:', err.message);
    } finally {
      setIsCheckingCredentials(false);
    }
  };

  // Main Admin Section Tabs
  const [activeAdminTab, setActiveAdminTab] = useState<'curriculum' | 'seeds-inventory' | 'feedback' | 'diagnostics'>('curriculum');

  // Curriculum & Lesson Management State
  const [curriculumLessons, setCurriculumLessons] = useState<Lesson[]>(INITIAL_LESSONS);
  const [isLoadingLessons, setIsLoadingLessons] = useState<boolean>(true);
  const [isCreateLessonModalOpen, setIsCreateLessonModalOpen] = useState<boolean>(false);
  const [previewLessonModal, setPreviewLessonModal] = useState<Lesson | null>(null);
  const [curriculumSearchQuery, setCurriculumSearchQuery] = useState<string>('');
  const [curriculumTopicFilter, setCurriculumTopicFilter] = useState<LessonTopic | 'all'>('all');
  const [adminSuccessToast, setAdminSuccessToast] = useState<string | null>(null);

  // Marketplace Seed Inventory & Orders State
  const [adminSeeds, setAdminSeeds] = useState<CropSeed[]>([]);
  const [isLoadingSeeds, setIsLoadingSeeds] = useState<boolean>(true);
  const [isAddSeedModalOpen, setIsAddSeedModalOpen] = useState<boolean>(false);
  const [seedToEdit, setSeedToEdit] = useState<CropSeed | null>(null);
  const [seedSearchQuery, setSeedSearchQuery] = useState<string>('');
  const [seedCategoryFilter, setSeedCategoryFilter] = useState<CropCategory | 'all'>('all');
  const [adminOrders, setAdminOrders] = useState<SeedOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);

  const loadLessons = async () => {
    setIsLoadingLessons(true);
    try {
      const all = await fetchAllCurriculumLessons();
      if (all && all.length > 0) {
        setCurriculumLessons(all);
      }
    } catch (err) {
      console.warn('Failed to load lessons in admin:', err);
    } finally {
      setIsLoadingLessons(false);
    }
  };

  const loadMarketplaceData = async () => {
    setIsLoadingSeeds(true);
    setIsLoadingOrders(true);
    try {
      const [seedsData, ordersData] = await Promise.all([
        fetchAllMarketplaceSeeds(),
        fetchAllSeedOrders(),
      ]);
      setAdminSeeds(seedsData);
      setAdminOrders(ordersData);
    } catch (err) {
      console.warn('Failed to load seeds and orders in admin:', err);
    } finally {
      setIsLoadingSeeds(false);
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadLessons();
    loadMarketplaceData();
  }, []);

  const handleLessonCreated = (created: Lesson) => {
    setCurriculumLessons(prev => [created, ...prev.filter(l => l.id !== created.id)]);
    setAdminSuccessToast(`Lesson "${created.title}" successfully published to the Learning Hub!`);
    setTimeout(() => setAdminSuccessToast(null), 5000);
  };

  const handleSeedSaved = (savedSeed: CropSeed) => {
    setAdminSeeds(prev => {
      const exists = prev.some(s => s.id === savedSeed.id);
      if (exists) {
        return prev.map(s => s.id === savedSeed.id ? savedSeed : s);
      }
      return [savedSeed, ...prev];
    });
    setAdminSuccessToast(`Crop seed "${savedSeed.varietyName}" saved with ${savedSeed.stockKg} kg stock!`);
    setTimeout(() => setAdminSuccessToast(null), 5000);
  };

  const handleQuickAddStock = async (seedId: string, seedName: string, addKg: number) => {
    const found = adminSeeds.find(s => s.id === seedId);
    if (!found) return;
    const newStock = found.stockKg + addKg;
    try {
      await updateSeedStock(seedId, newStock);
      setAdminSeeds(prev => prev.map(s => s.id === seedId ? { ...s, stockKg: newStock, inStock: true } : s));
      setAdminSuccessToast(`Added ${addKg} kg to ${seedName}. New stock: ${newStock} kg.`);
      setTimeout(() => setAdminSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to update stock:', err);
      alert('Failed to update seed stock.');
    }
  };

  const handleDeleteSeed = async (seedId: string, seedName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${seedName}" from the seed library?`)) {
      return;
    }
    try {
      await deleteCropSeed(seedId);
      setAdminSeeds(prev => prev.filter(s => s.id !== seedId));
      setAdminSuccessToast(`Seed "${seedName}" deleted from library.`);
      setTimeout(() => setAdminSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to delete seed:', err);
      alert('Failed to delete seed.');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: SeedOrderStatus) => {
    try {
      await updateSeedOrderStatus(orderId, newStatus);
      setAdminOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      setAdminSuccessToast(`Order updated to "${newStatus.replace('_', ' ')}".`);
      setTimeout(() => setAdminSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert('Failed to update order status.');
    }
  };

  const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete lesson "${lessonTitle}"? This will remove it from the Learning Hub.`)) {
      return;
    }
    try {
      await deleteAdminLesson(lessonId);
      setCurriculumLessons(prev => prev.filter(l => l.id !== lessonId));
      setAdminSuccessToast(`Lesson "${lessonTitle}" removed.`);
      setTimeout(() => setAdminSuccessToast(null), 4000);
    } catch (err) {
      console.error('Failed to delete custom lesson:', err);
      alert('Failed to delete lesson.');
    }
  };

  // Filters & Search for Feedback
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserType, setSelectedUserType] = useState('All');
  const [selectedWtp, setSelectedWtp] = useState('All');
  const [selectedWaitlist, setSelectedWaitlist] = useState('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Modal Detail
  const [selectedRecord, setSelectedRecord] = useState<FeedbackSubmission | null>(null);

  // Check iSDAsoil server credentials on mount
  useEffect(() => {
    fetchCredentialsStatus()
      .then((data) => setIsdaStatus(data))
      .catch((err) => console.warn('Could not load iSDA credentials status:', err.message));
  }, []);

  // Listen to Firestore real-time updates
  useEffect(() => {
    if (!db) {
      setErrorMessage('Firestore connection is not available.');
      setIsLoading(false);
      return;
    }

    try {
      const q = query(collection(db, 'soilwise_feedback'), orderBy('submittedAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs: FeedbackSubmission[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            docs.push({
              id: docSnap.id,
              ...data,
              submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : (data.submittedAt ? new Date(data.submittedAt) : new Date()),
            } as FeedbackSubmission);
          });
          setSubmissions(docs);
          setIsLoading(false);
        },
        (error) => {
          console.error('Firestore subscription error:', error);
          setErrorMessage('Unable to retrieve feedback submissions. Verify administrative permissions.');
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error subscribing to feedback.');
      setIsLoading(false);
    }
  }, []);

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
    onLogout();
  };

  // Calculations for Summary Cards (from real data)
  const totalCount = submissions.length;
  const wouldUsePositive = submissions.filter((s) => s.wouldUse === 'Definitely' || s.wouldUse === 'Probably').length;
  const wouldUsePercent = totalCount > 0 ? Math.round((wouldUsePositive / totalCount) * 100) : 0;
  const waitlistCount = submissions.filter((s) => s.joinWaitingList).length;
  const paidCount = submissions.filter((s) => s.willingnessToPay && !s.willingnessToPay.includes('free') && !s.willingnessToPay.includes('not pay')).length;
  const paidPercent = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const farmerCount = submissions.filter((s) => s.userType === 'Farmer').length;

  // Breakdown distributions
  const sentimentCounts: Record<string, number> = { Yes: 0, Somewhat: 0, 'Not yet': 0 };
  const usageCounts: Record<string, number> = {};
  const wtpCounts: Record<string, number> = {};
  const featureCounts: Record<string, number> = {};

  submissions.forEach((s) => {
    if (s.likesSoilwise) sentimentCounts[s.likesSoilwise] = (sentimentCounts[s.likesSoilwise] || 0) + 1;
    if (s.wouldUse) usageCounts[s.wouldUse] = (usageCounts[s.wouldUse] || 0) + 1;
    if (s.willingnessToPay) wtpCounts[s.willingnessToPay] = (wtpCounts[s.willingnessToPay] || 0) + 1;
    if (s.mostValuableFeature) featureCounts[s.mostValuableFeature] = (featureCounts[s.mostValuableFeature] || 0) + 1;
  });

  // Filtered List
  const filteredSubmissions = submissions
    .filter((s) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.location && s.location.toLowerCase().includes(q)) ||
          (s.userType && s.userType.toLowerCase().includes(q)) ||
          (s.removeOrModify && s.removeOrModify.toLowerCase().includes(q)) ||
          (s.desiredFeatures && s.desiredFeatures.toLowerCase().includes(q));
        if (!matches) return false;
      }
      // User type filter
      if (selectedUserType !== 'All' && s.userType !== selectedUserType) return false;
      // WTP filter
      if (selectedWtp !== 'All' && s.willingnessToPay !== selectedWtp) return false;
      // Waitlist filter
      if (selectedWaitlist === 'Yes' && !s.joinWaitingList) return false;
      if (selectedWaitlist === 'No' && s.joinWaitingList) return false;
      return true;
    })
    .sort((a, b) => {
      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

  // CSV Export Handler
  const handleExportCsv = () => {
    if (submissions.length === 0) return;

    const headers = [
      'Submission ID',
      'Submitted At',
      'Name',
      'Phone',
      'Email',
      'User Type',
      'Location',
      'Likes SoilWise',
      'Would Use',
      'Willingness to Pay',
      'Most Valuable Feature',
      'Remove or Modify',
      'Desired Features',
      'Joined Waiting List',
      'Marketing Consent',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = submissions.map((s) => [
      escapeCsv(s.id),
      escapeCsv(s.submittedAt ? new Date(s.submittedAt).toISOString() : ''),
      escapeCsv(s.name),
      escapeCsv(s.phone),
      escapeCsv(s.email),
      escapeCsv(s.userType),
      escapeCsv(s.location),
      escapeCsv(s.likesSoilwise),
      escapeCsv(s.wouldUse),
      escapeCsv(s.willingnessToPay),
      escapeCsv(s.mostValuableFeature),
      escapeCsv(s.removeOrModify),
      escapeCsv(s.desiredFeatures),
      escapeCsv(s.joinWaitingList ? 'Yes' : 'No'),
      escapeCsv(s.consent ? 'Yes' : 'No'),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `soilwise_feedback_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayedAdminLessons = curriculumLessons.filter(lesson => {
    if (curriculumTopicFilter !== 'all' && lesson.topic !== curriculumTopicFilter) {
      return false;
    }
    const q = curriculumSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      lesson.title.toLowerCase().includes(q) ||
      lesson.subtitle.toLowerCase().includes(q) ||
      lesson.summary.toLowerCase().includes(q) ||
      lesson.topic.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1b4332]">
              SoilWise AI
            </span>
            <span className="text-stone-300">&bull;</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              Cloud Firestore Admin
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
            Feedback & Validation Dashboard
          </h1>

          <p className="text-xs text-stone-500 mt-1">
            Authenticated administrator: <strong className="text-stone-800 font-mono">{AUTHORIZED_ADMIN_EMAIL}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenSoilDataTest && (
            <button
              onClick={onOpenSoilDataTest}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors border border-emerald-300 flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-700" />
              <span>Soil Data &amp; GPS Test</span>
            </button>
          )}

          <button
            onClick={onBackToApp}
            className="px-3.5 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors border border-stone-200 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Farm Analysis View</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={submissions.length === 0}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1b4332] hover:bg-[#143225] rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Feedback CSV</span>
          </button>

          <button
            onClick={handleSignOut}
            className="px-3.5 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200 flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Admin Section Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveAdminTab('curriculum')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'curriculum'
              ? 'bg-[#1b4332] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Learning Hub Curriculum ({curriculumLessons.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('seeds-inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'seeds-inventory'
              ? 'bg-[#1b4332] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Seed Library &amp; Stock ({adminSeeds.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('feedback')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'feedback'
              ? 'bg-[#1b4332] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Farmer Feedback &amp; Validation ({submissions.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('diagnostics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'diagnostics'
              ? 'bg-[#1b4332] text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Server &amp; iSDA Diagnostics</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {adminSuccessToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs sm:text-sm text-emerald-900 font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{adminSuccessToast}</span>
          </div>
          <button
            onClick={() => setAdminSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. CURRICULUM & LESSON MANAGEMENT SUITE */}
      {activeAdminTab === 'curriculum' && (
        <div className="space-y-6">
          {/* Action Header Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1b4332] text-emerald-300 flex items-center justify-center shadow-xs">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
                  Curriculum &amp; Educational Lessons
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
                Create, publish, and manage structured agricultural lessons for smallholder farmers. Every lesson includes embedded YouTube video guidance, practical field exercises, and knowledge checks.
              </p>
            </div>

            <button
              onClick={() => setIsCreateLessonModalOpen(true)}
              className="px-5 py-3 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Lesson</span>
            </button>
          </div>

          {/* Curriculum Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Total Published Lessons
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-mono">
                {curriculumLessons.length}
              </p>
              <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">Active in Learning Hub</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Video Lessons Embedded
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-red-600 mt-1 font-mono">
                {curriculumLessons.filter(l => l.youtubeVideoId || l.youtubeVideoUrl).length}
              </p>
              <span className="text-[10px] text-stone-400 mt-0.5 block">YouTube video enabled</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Admin Created Lessons
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#1b4332] mt-1 font-mono">
                {curriculumLessons.filter(l => l.isCustomAdminLesson).length}
              </p>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Custom curriculum modules</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Curriculum Modules
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-mono">
                {TOPIC_CATEGORIES.length}
              </p>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Categories covered</span>
            </div>
          </div>

          {/* Filters & Search Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setCurriculumTopicFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  curriculumTopicFilter === 'all'
                    ? 'bg-[#1b4332] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                All Topics ({curriculumLessons.length})
              </button>

              {TOPIC_CATEGORIES.map(cat => {
                const count = curriculumLessons.filter(l => l.topic === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCurriculumTopicFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      curriculumTopicFilter === cat.id
                        ? 'bg-[#1b4332] text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    {cat.title} ({count})
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={curriculumSearchQuery}
                onChange={(e) => setCurriculumSearchQuery(e.target.value)}
                placeholder="Search lessons..."
                className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#1b4332]"
              />
              {curriculumSearchQuery && (
                <button
                  onClick={() => setCurriculumSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Lessons List Grid */}
          {displayedAdminLessons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedAdminLessons.map(lesson => {
                const topicCat = TOPIC_CATEGORIES.find(c => c.id === lesson.topic);
                const videoId = extractYouTubeVideoId(lesson.youtubeVideoId || lesson.youtubeVideoUrl);
                const thumbUrl = videoId ? getYouTubeThumbnailUrl(videoId) : null;

                return (
                  <div
                    key={lesson.id}
                    className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    {/* Video Thumbnail Header */}
                    <div className="relative aspect-video w-full bg-stone-900 overflow-hidden group">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={lesson.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-stone-800 text-stone-500">
                          <BookOpen className="w-8 h-8" />
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setPreviewLessonModal(lesson)}
                          className="px-3.5 py-1.5 rounded-xl bg-white text-stone-900 text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 text-red-600 fill-red-600" />
                          <span>Watch Video</span>
                        </button>
                      </div>

                      {videoId && (
                        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-bold text-white flex items-center gap-1">
                          <Video className="w-3 h-3 text-red-400" />
                          YouTube Embed
                        </span>
                      )}

                      <span className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[11px] font-semibold text-emerald-300">
                        {topicCat?.title || lesson.topic}
                      </span>
                    </div>

                    {/* Lesson Content Summary */}
                    <div className="p-4 sm:p-5 space-y-2.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-stone-500">
                          <span className="flex items-center gap-1 text-stone-400">
                            <Clock className="w-3 h-3" />
                            {lesson.estimatedMinutes} min read
                          </span>
                          <span className="capitalize text-stone-500 font-medium">
                            {lesson.difficulty}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-stone-900 leading-snug">
                          {lesson.title}
                        </h3>

                        <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                          {lesson.subtitle}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                        {lesson.isCustomAdminLesson ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Custom Published
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-stone-400">
                            Standard Curriculum
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          {lesson.isCustomAdminLesson && (
                            <button
                              onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                              title="Delete custom lesson"
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setPreviewLessonModal(lesson)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#1b4332] hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </div>
                      </div>
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
                No lessons match your current topic filter or search keyword.
              </p>
              <button
                onClick={() => {
                  setCurriculumTopicFilter('all');
                  setCurriculumSearchQuery('');
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. SEED LIBRARY & STOCK INVENTORY TAB */}
      {activeAdminTab === 'seeds-inventory' && (
        <div className="space-y-7">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1b4332] text-emerald-300 flex items-center justify-center shadow-xs">
                  <Scale className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
                  Crop Seed Library &amp; Stock Inventory
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
                Manage certified crop seeds, add new varieties to the library, adjust available stock in kilograms, update prices, and fulfill farmer seed reservations.
              </p>
            </div>

            <button
              onClick={() => {
                setSeedToEdit(null);
                setIsAddSeedModalOpen(true);
              }}
              className="px-5 py-3 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Crop Seed to Library</span>
            </button>
          </div>

          {/* Seed Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Total Seed Varieties
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-mono">
                {adminSeeds.length}
              </p>
              <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">Active in marketplace</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Total Available Stock
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#1b4332] mt-1 font-mono">
                {adminSeeds.reduce((acc, s) => acc + (s.stockKg || 0), 0).toLocaleString()} <span className="text-sm font-bold text-stone-500">kg</span>
              </p>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Across all certified crop lines</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Low Stock Alerts (&lt; 50kg)
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1 font-mono">
                {adminSeeds.filter(s => (s.stockKg || 0) < 50).length}
              </p>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Requires replenishment</span>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Farmer Seed Orders
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-mono">
                {adminOrders.length}
              </p>
              <span className="text-[10px] text-emerald-800 font-semibold mt-0.5 block">
                ₦{adminOrders.reduce((acc, o) => acc + (o.totalPrice || 0), 0).toLocaleString()} total value
              </span>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-stone-200/90">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(['all', 'cereals', 'legumes', 'roots-tubers', 'vegetables'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSeedCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer capitalize ${
                    seedCategoryFilter === cat
                      ? 'bg-[#1b4332] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  {cat === 'all' ? `All Crops (${adminSeeds.length})` : cat.replace('-', ' ')}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={seedSearchQuery}
                onChange={(e) => setSeedSearchQuery(e.target.value)}
                placeholder="Search seed varieties..."
                className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#1b4332]"
              />
              {seedSearchQuery && (
                <button
                  onClick={() => setSeedSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Seeds Library Cards / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {adminSeeds
              .filter(seed => {
                if (seedCategoryFilter !== 'all' && seed.category !== seedCategoryFilter) return false;
                if (seedSearchQuery.trim()) {
                  const q = seedSearchQuery.toLowerCase().trim();
                  return (
                    seed.varietyName.toLowerCase().includes(q) ||
                    seed.cropType.toLowerCase().includes(q) ||
                    seed.breederOrg.toLowerCase().includes(q)
                  );
                }
                return true;
              })
              .map(seed => {
                const isOutOfStock = seed.stockKg <= 0;
                const isLowStock = seed.stockKg > 0 && seed.stockKg < 50;

                return (
                  <div
                    key={seed.id}
                    className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="p-5 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                          {seed.cropType}
                        </span>
                        {isOutOfStock ? (
                          <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Low: {seed.stockKg} kg
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            In Stock
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-stone-900 leading-snug">
                          {seed.varietyName}
                        </h3>
                        <p className="text-xs text-stone-500 truncate mt-0.5" title={seed.breederOrg}>
                          {seed.breederOrg}
                        </p>
                      </div>

                      {/* Stock in Kilograms Highlight Box */}
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-stone-600">Library Stock:</span>
                          <span className="font-mono font-black text-sm text-[#1b4332]">
                            {seed.stockKg} kg
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isLowStock ? 'bg-amber-500' : 'bg-emerald-600'}`}
                            style={{ width: `${Math.min(100, (seed.stockKg / 500) * 100)}%` }}
                          />
                        </div>

                        {/* Quick Add Stock Buttons */}
                        <div className="pt-1.5 flex items-center justify-between gap-1 text-[11px]">
                          <span className="text-stone-400 font-medium text-[10px]">Add stock:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleQuickAddStock(seed.id, seed.varietyName, 25)}
                              className="px-2 py-0.5 bg-white border border-stone-300 hover:border-emerald-600 hover:text-emerald-800 rounded font-bold transition-colors cursor-pointer"
                            >
                              +25kg
                            </button>
                            <button
                              onClick={() => handleQuickAddStock(seed.id, seed.varietyName, 50)}
                              className="px-2 py-0.5 bg-white border border-stone-300 hover:border-emerald-600 hover:text-emerald-800 rounded font-bold transition-colors cursor-pointer"
                            >
                              +50kg
                            </button>
                            <button
                              onClick={() => handleQuickAddStock(seed.id, seed.varietyName, 100)}
                              className="px-2 py-0.5 bg-white border border-stone-300 hover:border-emerald-600 hover:text-emerald-800 rounded font-bold transition-colors cursor-pointer"
                            >
                              +100kg
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-stone-600 pt-1">
                        <span>Price: <strong className="font-mono text-stone-900">₦{seed.pricePerKg.toLocaleString()}/kg</strong></span>
                        <span>Rate: <strong className="font-mono text-stone-900">{seed.recommendedRateKgPerHa} kg/ha</strong></span>
                      </div>
                    </div>

                    <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
                      {seed.isCustomAdminSeed ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Admin Custom
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-stone-400">
                          Standard Catalogue
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        {seed.isCustomAdminSeed && (
                          <button
                            onClick={() => handleDeleteSeed(seed.id, seed.varietyName)}
                            title="Delete seed"
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSeedToEdit(seed);
                            setIsAddSeedModalOpen(true);
                          }}
                          className="px-3 py-1 bg-white border border-stone-300 hover:border-stone-400 text-stone-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Edit className="w-3 h-3 text-stone-500" />
                          <span>Edit Stock &amp; Price</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Farmer Orders Management Section */}
          <div className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-800" />
                  <span>Incoming Farmer Seed Orders ({adminOrders.length})</span>
                </h3>
                <p className="text-xs text-stone-500">Review seed requests and update pickup/dispatch status.</p>
              </div>
            </div>

            {adminOrders.length > 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3 font-bold">Order Ref</th>
                        <th className="px-4 py-3 font-bold">Farmer / Recipient</th>
                        <th className="px-4 py-3 font-bold">Crop &amp; Quantity (kg)</th>
                        <th className="px-4 py-3 font-bold">Total (₦)</th>
                        <th className="px-4 py-3 font-bold">Location</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-4 py-3 font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {adminOrders.map(order => (
                        <tr key={order.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-[#1b4332]">
                            {order.orderNumber}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-stone-900 block">{order.farmerName}</span>
                            <span className="text-[11px] text-stone-500 font-mono">{order.farmerPhone}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-stone-900">{order.quantityKg} kg</span>
                            <span className="text-stone-500 block text-[11px] truncate max-w-xs">{order.seedName}</span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-stone-900">
                            ₦{order.totalPrice.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-stone-700">
                            <span>{order.lga}, {order.state}</span>
                            <span className="text-[10px] text-stone-400 block capitalize">{order.deliveryMethod.replace('_', ' ')}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              order.status === 'confirmed' || order.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'ready_for_pickup'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {order.status === 'pending' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold cursor-pointer"
                                >
                                  Confirm
                                </button>
                              )}
                              {order.status === 'confirmed' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')}
                                  className="px-2 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded text-[11px] font-bold cursor-pointer"
                                >
                                  Ready
                                </button>
                              )}
                              {order.status === 'ready_for_pickup' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                                  className="px-2 py-1 bg-stone-800 hover:bg-black text-white rounded text-[11px] font-bold cursor-pointer"
                                >
                                  Delivered
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-white rounded-2xl border border-stone-200 text-center space-y-2">
                <Package className="w-8 h-8 text-stone-400 mx-auto" />
                <p className="text-xs text-stone-500">No farmer seed orders recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SERVER & CREDENTIALS DIAGNOSTICS TAB */}
      {activeAdminTab === 'diagnostics' && (
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-2xs space-y-6">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              isdaStatus?.credentialsConfigured
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  Cloud Run Environment &amp; iSDAsoil Credentials Diagnostic
                </h2>
                {isdaStatus?.credentialsConfigured ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified: All Variables Present
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Action Required: Variables Missing
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Real-time check verifying the existence of required server-side variables without revealing confidential values.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <button
              onClick={() => setShowCloudRunGuide(!showCloudRunGuide)}
              className="px-3.5 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors border border-stone-200 flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-600" />
              <span>{showCloudRunGuide ? 'Hide Cloud Run Guide' : 'Cloud Run Setup Guide'}</span>
              {showCloudRunGuide ? (
                <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
              )}
            </button>

            {onOpenSoilDataTest && (
              <button
                onClick={onOpenSoilDataTest}
                className="px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-700" />
                <span>Soil Data &amp; GPS Test</span>
              </button>
            )}

            <button
              onClick={handleRefreshDiagnostics}
              disabled={isCheckingCredentials}
              className="px-3.5 py-2 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors border border-stone-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Query server for variable existence"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-stone-600 ${isCheckingCredentials ? 'animate-spin' : ''}`} />
              <span>{isCheckingCredentials ? 'Checking...' : 'Re-check Environment'}</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Check Grid: Verifying Existence Without Revealing Values */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              Server-Side Variable Existence Audit
            </span>
            <span className="text-[11px] text-stone-400">
              Values strictly obscured for security &bull; Runtime inspect only
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Variable 1: ISDA_USERNAME */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isdaStatus?.usernameStatus === 'loaded'
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/50 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-stone-500" />
                  <span className="text-xs font-mono font-bold">ISDA_USERNAME</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyToClipboard('ISDA_USERNAME', 'ISDA_USERNAME')}
                    className="p-1 hover:bg-black/5 rounded text-stone-500 hover:text-stone-800 cursor-pointer"
                    title="Copy variable name"
                  >
                    {copiedLabel === 'ISDA_USERNAME' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  {isdaStatus?.usernameStatus === 'loaded' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      EXISTS
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200 text-amber-800 border border-amber-300 flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      NOT FOUND
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 mt-2">
                <div className="text-[11px] text-stone-500 flex items-center justify-between">
                  <span>Variable Value:</span>
                  <span className="font-mono text-[10px] text-stone-400 font-medium">Confidential</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-stone-200 font-mono text-xs flex items-center justify-between">
                  {isdaStatus?.usernameStatus === 'loaded' ? (
                    <>
                      <span className="text-emerald-700 tracking-wider font-bold">
                        &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;
                      </span>
                      <span className="text-[10px] text-emerald-600 font-sans font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                        Loaded in process.env
                      </span>
                    </>
                  ) : (
                    <span className="text-amber-700 text-[11px] font-sans">
                      Missing from Cloud Run environment
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-stone-500 mt-2.5">
                Identifies registered account for iSDAsoil token generation.
              </p>
            </div>

            {/* Variable 2: ISDA_PASSWORD */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isdaStatus?.passwordStatus === 'loaded'
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/50 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-stone-500" />
                  <span className="text-xs font-mono font-bold">ISDA_PASSWORD</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyToClipboard('ISDA_PASSWORD', 'ISDA_PASSWORD')}
                    className="p-1 hover:bg-black/5 rounded text-stone-500 hover:text-stone-800 cursor-pointer"
                    title="Copy variable name"
                  >
                    {copiedLabel === 'ISDA_PASSWORD' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  {isdaStatus?.passwordStatus === 'loaded' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      EXISTS
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200 text-amber-800 border border-amber-300 flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      NOT FOUND
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 mt-2">
                <div className="text-[11px] text-stone-500 flex items-center justify-between">
                  <span>Variable Value:</span>
                  <span className="font-mono text-[10px] text-stone-400 font-medium">Confidential</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-stone-200 font-mono text-xs flex items-center justify-between">
                  {isdaStatus?.passwordStatus === 'loaded' ? (
                    <>
                      <span className="text-emerald-700 tracking-wider font-bold">
                        &bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;
                      </span>
                      <span className="text-[10px] text-emerald-600 font-sans font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                        Loaded in process.env
                      </span>
                    </>
                  ) : (
                    <span className="text-amber-700 text-[11px] font-sans">
                      Missing from Cloud Run environment
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-stone-500 mt-2.5">
                Authenticates against iSDAsoil OAuth2 login endpoint.
              </p>
            </div>

            {/* Target Endpoint & Architecture Verification */}
            <div className="p-4 rounded-2xl border bg-stone-50 border-stone-200 text-stone-900">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-stone-500" />
                  <span className="text-xs font-mono font-bold">LOGIN ENDPOINT</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                  HTTP POST
                </span>
              </div>

              <div className="space-y-1 mt-2">
                <div className="text-[11px] text-stone-500 flex items-center justify-between">
                  <span>Auth Endpoint:</span>
                  <span className="text-[10px] text-stone-400">form-urlencoded</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-stone-200 font-mono text-xs text-stone-800 truncate">
                  https://api.isda-africa.com/login
                </div>
              </div>

              <p className="text-[10px] text-stone-500 mt-2.5">
                {isdaStatus?.hasCachedToken
                  ? `JWT Active in Memory (${isdaStatus.expiresInSeconds}s left, ${isdaStatus.cacheHitsCount} hits)`
                  : 'Tokens cached in server memory on first request'}
              </p>
            </div>
          </div>
        </div>

        {/* Clear, Step-by-Step Cloud Run Configuration Guide */}
        {showCloudRunGuide && (
          <div className="bg-stone-50/90 rounded-2xl p-5 sm:p-6 border border-stone-200/90 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-700" />
                  Cloud Run Configuration Guide: Adding ISDA_USERNAME &amp; ISDA_PASSWORD
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Follow these step-by-step instructions to securely supply credentials in Google Cloud Run.
                </p>
              </div>

              {/* Guide Mode Tabs */}
              <div className="flex items-center bg-stone-200/70 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setGuideActiveTab('console')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    guideActiveTab === 'console'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Cloud Console (Web)
                </button>
                <button
                  onClick={() => setGuideActiveTab('cli')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    guideActiveTab === 'cli'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  gcloud CLI (Terminal)
                </button>
                <button
                  onClick={() => setGuideActiveTab('secrets')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    guideActiveTab === 'secrets'
                      ? 'bg-white text-stone-900 shadow-2xs font-bold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Secret Manager (Best Practice)
                </button>
              </div>
            </div>

            {/* TAB 1: CLOUD CONSOLE WEB UI INSTRUCTIONS */}
            {guideActiveTab === 'console' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                      1
                    </div>
                    <h4 className="font-bold text-stone-900">Open Cloud Run</h4>
                    <p className="text-stone-500 text-[11px] leading-relaxed">
                      Go to the{' '}
                      <a
                        href="https://console.cloud.google.com/run"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 underline font-semibold inline-flex items-center gap-0.5"
                      >
                        Google Cloud Run Console <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      , select project, and click the <strong className="text-stone-800">soilwise-ai-web</strong> service.
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                      2
                    </div>
                    <h4 className="font-bold text-stone-900">Edit &amp; Deploy</h4>
                    <p className="text-stone-500 text-[11px] leading-relaxed">
                      In the top action bar of the service details page, click the button labeled{' '}
                      <strong className="text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                        Edit &amp; Deploy New Revision
                      </strong>.
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                      3
                    </div>
                    <h4 className="font-bold text-stone-900">Add Variables</h4>
                    <p className="text-stone-500 text-[11px] leading-relaxed">
                      Navigate to the <strong className="text-stone-800">Variables &amp; Secrets</strong> tab under Container settings. Click <strong className="text-stone-800">Add Variable</strong> twice to configure both entries.
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                      4
                    </div>
                    <h4 className="font-bold text-stone-900">Deploy &amp; Verify</h4>
                    <p className="text-stone-500 text-[11px] leading-relaxed">
                      Click <strong className="text-stone-800">Deploy</strong> at the bottom. Once deployment finishes, return here and click <strong className="text-stone-800">Re-check Environment</strong>.
                    </p>
                  </div>
                </div>

                {/* Variable Specifications Table */}
                <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 bg-stone-100/70 border-b border-stone-200 text-xs font-bold text-stone-700 flex items-center justify-between">
                    <span>Required Cloud Run Environment Variables</span>
                    <span className="text-[11px] text-stone-500 font-normal">Click to copy variable names</span>
                  </div>
                  <div className="divide-y divide-stone-200 text-xs font-mono">
                    <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-stone-400 font-sans font-medium text-[11px]">1.</span>
                        <span className="font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          ISDA_USERNAME
                        </span>
                        <span className="text-stone-500 font-sans text-[11px]">
                          &rarr; Set value to your registered iSDA account email
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard('ISDA_USERNAME', 'ISDA_USERNAME')}
                        className="px-2.5 py-1 text-[11px] text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors border border-stone-200 flex items-center gap-1 font-sans cursor-pointer self-start sm:self-center"
                      >
                        {copiedLabel === 'ISDA_USERNAME' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Name</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-stone-400 font-sans font-medium text-[11px]">2.</span>
                        <span className="font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          ISDA_PASSWORD
                        </span>
                        <span className="text-stone-500 font-sans text-[11px]">
                          &rarr; Set value to your iSDA API account password
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard('ISDA_PASSWORD', 'ISDA_PASSWORD')}
                        className="px-2.5 py-1 text-[11px] text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors border border-stone-200 flex items-center gap-1 font-sans cursor-pointer self-start sm:self-center"
                      >
                        {copiedLabel === 'ISDA_PASSWORD' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Name</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: GCLOUD CLI INSTRUCTIONS */}
            {guideActiveTab === 'cli' && (
              <div className="space-y-3">
                <p className="text-xs text-stone-600">
                  Execute this command from your terminal or Google Cloud Shell to update the Cloud Run service in a single step:
                </p>

                <div className="relative bg-stone-900 rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-x-auto shadow-inner">
                  <div className="flex items-center justify-between text-[11px] text-stone-400 pb-2 mb-2 border-b border-stone-800 font-sans">
                    <span className="flex items-center gap-1.5 text-stone-300">
                      <Terminal className="w-3.5 h-3.5" />
                      Google Cloud SDK Command
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          'gcloud run services update soilwise-ai-web \\\n  --region=europe-west1 \\\n  --set-env-vars="ISDA_USERNAME=your_username@example.com,ISDA_PASSWORD=your_api_password"',
                          'gcloud-cmd'
                        )
                      }
                      className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLabel === 'gcloud-cmd' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied Command</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Command</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-stone-100 whitespace-pre-wrap leading-relaxed">
{`gcloud run services update soilwise-ai-web \\
  --region=europe-west1 \\
  --set-env-vars="ISDA_USERNAME=your_username@example.com,ISDA_PASSWORD=your_api_password"`}
                  </pre>
                </div>
                <p className="text-[11px] text-stone-500">
                  Replace <code className="font-mono text-stone-700 font-semibold">your_username@example.com</code> and <code className="font-mono text-stone-700 font-semibold">your_api_password</code> with your actual credentials before running.
                </p>
              </div>
            )}

            {/* TAB 3: SECRET MANAGER BEST PRACTICE */}
            {guideActiveTab === 'secrets' && (
              <div className="space-y-3">
                <p className="text-xs text-stone-600">
                  For maximum security, avoid storing passwords in plain environment variables. Store <code className="font-mono font-bold">ISDA_PASSWORD</code> in Google Cloud Secret Manager and reference it in Cloud Run:
                </p>

                <div className="relative bg-stone-900 rounded-xl p-4 text-xs font-mono text-stone-200 overflow-x-auto shadow-inner">
                  <div className="flex items-center justify-between text-[11px] text-stone-400 pb-2 mb-2 border-b border-stone-800 font-sans">
                    <span className="flex items-center gap-1.5 text-stone-300">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      Secret Manager Setup Commands
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          '# 1. Create the secret in Secret Manager\necho -n "your_password" | gcloud secrets create isda-password --data-file=-\n\n# 2. Grant Cloud Run service account access\ngcloud secrets add-iam-policy-binding isda-password \\\n  --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \\\n  --role="roles/secretmanager.secretAccessor"\n\n# 3. Mount secret as ISDA_PASSWORD in Cloud Run\ngcloud run services update soilwise-ai-web \\\n  --region=europe-west1 \\\n  --set-secrets="ISDA_PASSWORD=isda-password:latest" \\\n  --set-env-vars="ISDA_USERNAME=your_username@example.com"',
                          'secrets-cmd'
                        )
                      }
                      className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {copiedLabel === 'secrets-cmd' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Commands</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">
{`# 1. Store password in Secret Manager
echo -n "your_password" | gcloud secrets create isda-password --data-file=-

# 2. Mount secret as ISDA_PASSWORD in Cloud Run
gcloud run services update soilwise-ai-web \\
  --region=europe-west1 \\
  --set-secrets="ISDA_PASSWORD=isda-password:latest" \\
  --set-env-vars="ISDA_USERNAME=your_username@example.com"`}
                  </pre>
                </div>
              </div>
            )}

            {/* Crucial Security Rules Callout */}
            <div className="p-3.5 bg-stone-100 rounded-xl border border-stone-200 text-xs text-stone-700 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-stone-900">
                  Security Principles Enforced:
                </p>
                <ul className="list-disc list-inside text-[11px] text-stone-600 space-y-0.5">
                  <li>
                    <strong className="text-stone-800">Never prefix with VITE_:</strong> Environment variables prefixed with <code className="font-mono bg-white px-1 rounded">VITE_</code> are embedded into public JavaScript bundles during build time. Always use <code className="font-mono bg-white px-1 rounded">ISDA_USERNAME</code> and <code className="font-mono bg-white px-1 rounded">ISDA_PASSWORD</code>.
                  </li>
                  <li>
                    <strong className="text-stone-800">Zero Startup Crashes:</strong> SoilWise AI uses lazy on-demand authentication. If credentials are missing or incorrect, Cloud Run will still start and listen on port 3000 normally.
                  </li>
                  <li>
                    <strong className="text-stone-800">No Secrets in Browser:</strong> Diagnostics only verify boolean presence in server environment. Plaintext values are never returned over HTTP or logged.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* 3. FARMER FEEDBACK & VALIDATION TAB */}
      {activeAdminTab === 'feedback' && (
      <>
      {/* Section 9: Dashboard Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Responses */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Total Responses
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-mono">
            {totalCount}
          </p>
          <span className="text-[10px] text-stone-400 mt-0.5 block">Cloud Firestore records</span>
        </div>

        {/* Would Use */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Would Use
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-800 mt-1 font-mono">
            {wouldUsePercent}%
          </p>
          <span className="text-[10px] text-stone-500 mt-0.5 block">{wouldUsePositive} of {totalCount} respondents</span>
        </div>

        {/* Waiting List */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Waiting List
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#1b4332] mt-1 font-mono">
            {waitlistCount}
          </p>
          <span className="text-[10px] text-stone-500 mt-0.5 block">Joined early access</span>
        </div>

        {/* Willing to Pay */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Willing to Pay
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-800 mt-1 font-mono">
            {paidPercent}%
          </p>
          <span className="text-[10px] text-stone-500 mt-0.5 block">{paidCount} chose paid tier</span>
        </div>

        {/* Farmers */}
        <div className="p-5 bg-white rounded-2xl border border-stone-200/90 shadow-2xs col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
            Farmers
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 font-mono">
            {farmerCount}
          </p>
          <span className="text-[10px] text-stone-500 mt-0.5 block">Primary farming user type</span>
        </div>
      </div>

      {totalCount === 0 && !isLoading && (
        <div className="p-8 bg-white rounded-3xl border border-stone-200 text-center space-y-2">
          <p className="text-base font-semibold text-stone-700">No feedback responses yet.</p>
          <p className="text-xs text-stone-400">
            When farmers submit the validation form on the result page, their responses will appear here in real-time.
          </p>
        </div>
      )}

      {/* Section 10: Validation Insights */}
      {totalCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sentiment */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs space-y-3">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wide block">
              Product Sentiment
            </span>
            <div className="space-y-2 text-xs">
              {['Yes', 'Somewhat', 'Not yet'].map((key) => {
                const count = sentimentCounts[key] || 0;
                const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-stone-600 mb-1">
                      <span>{key}</span>
                      <span className="font-mono font-semibold">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1b4332] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] text-stone-400 block pt-1">Responses received</span>
          </div>

          {/* Would Use Distribution */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs space-y-3">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wide block">
              Would Users Use It?
            </span>
            <div className="space-y-2 text-xs">
              {['Definitely', 'Probably', 'Not sure', 'No'].map((key) => {
                const count = usageCounts[key] || 0;
                const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-stone-600 mb-1">
                      <span>{key}</span>
                      <span className="font-mono font-semibold">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-700 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] text-stone-400 block pt-1">Responses received</span>
          </div>

          {/* Willingness to Pay */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs space-y-3">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wide block">
              Willingness to Pay
            </span>
            <div className="space-y-1.5 text-xs max-h-44 overflow-y-auto">
              {Object.entries(wtpCounts).map(([tier, count]) => (
                <div key={tier} className="flex justify-between text-stone-600 border-b border-stone-100 pb-1">
                  <span className="truncate pr-2">{tier}</span>
                  <span className="font-mono font-semibold shrink-0">{count}</span>
                </div>
              ))}
            </div>
            <span className="text-[10px] text-stone-400 block pt-1">Responses received</span>
          </div>

          {/* Most Valuable Feature */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-2xs space-y-3">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wide block">
              Most Valuable Feature
            </span>
            <div className="space-y-1.5 text-xs max-h-44 overflow-y-auto">
              {Object.entries(featureCounts).map(([feat, count]) => (
                <div key={feat} className="flex justify-between text-stone-600 border-b border-stone-100 pb-1">
                  <span className="truncate pr-2">{feat}</span>
                  <span className="font-mono font-semibold shrink-0">{count}</span>
                </div>
              ))}
            </div>
            <span className="text-[10px] text-stone-400 block pt-1">Responses received</span>
          </div>
        </div>
      )}

      {/* Section 11: Feedback Response Table */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden">
        {/* Table Filters Bar */}
        <div className="p-5 border-b border-stone-200/80 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, location, user type..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* User Type Filter */}
            <select
              value={selectedUserType}
              onChange={(e) => setSelectedUserType(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-stone-300 rounded-xl text-stone-700"
            >
              <option value="All">All User Types</option>
              <option value="Farmer">Farmer</option>
              <option value="Agronomist">Agronomist</option>
              <option value="Researcher">Researcher</option>
              <option value="Agribusiness / Input Supplier">Agribusiness</option>
            </select>

            {/* Waiting List Filter */}
            <select
              value={selectedWaitlist}
              onChange={(e) => setSelectedWaitlist(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-stone-300 rounded-xl text-stone-700"
            >
              <option value="All">All Waitlist</option>
              <option value="Yes">Waitlist: Yes</option>
              <option value="No">Waitlist: No</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-50 cursor-pointer"
            >
              Sort: {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100/75 text-stone-600 font-semibold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">User Type</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Likes</th>
                <th className="py-3 px-4">Would Use</th>
                <th className="py-3 px-4">Willingness to Pay</th>
                <th className="py-3 px-4">Most Valuable</th>
                <th className="py-3 px-4 text-center">Waitlist</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-400">
                    No submissions matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((s) => {
                  const dateStr = s.submittedAt
                    ? new Date(s.submittedAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A';
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedRecord(s)}
                      className="hover:bg-[#f8faf6] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap font-mono">{dateStr}</td>
                      <td className="py-3 px-4 font-semibold text-stone-900">{s.name || 'Anonymous'}</td>
                      <td className="py-3 px-4 text-stone-600">{s.userType || 'Farmer'}</td>
                      <td className="py-3 px-4 text-stone-600 truncate max-w-[150px]">{s.location || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.likesSoilwise === 'Yes'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.likesSoilwise === 'Somewhat'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-200 text-stone-700'
                        }`}>
                          {s.likesSoilwise}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-700">{s.wouldUse}</td>
                      <td className="py-3 px-4 text-stone-700 truncate max-w-[140px]">{s.willingnessToPay}</td>
                      <td className="py-3 px-4 text-stone-600 truncate max-w-[140px]">{s.mostValuableFeature}</td>
                      <td className="py-3 px-4 text-center">
                        {s.joinWaitingList ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1b4332] text-white">
                            Yes
                          </span>
                        ) : (
                          <span className="text-stone-300 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full my-8 shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-stone-900">
                  Feedback Submission Detail
                </h3>
                <p className="text-xs text-stone-400 font-mono">
                  ID: #{selectedRecord.id} &bull; {selectedRecord.submittedAt ? new Date(selectedRecord.submittedAt).toLocaleString() : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-lg hover:bg-stone-200 flex items-center justify-center text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Respondent info */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <span className="font-bold text-stone-800 uppercase tracking-wide text-[10px] block">
                  Respondent Information
                </span>
                <div className="grid grid-cols-2 gap-2 text-stone-700">
                  <p><strong className="text-stone-900">Name:</strong> {selectedRecord.name || 'Not provided'}</p>
                  <p><strong className="text-stone-900">User Type:</strong> {selectedRecord.userType || 'Farmer'}</p>
                  <p><strong className="text-stone-900">Phone:</strong> {selectedRecord.phone || '—'}</p>
                  <p><strong className="text-stone-900">Email:</strong> {selectedRecord.email || '—'}</p>
                  <p className="col-span-2"><strong className="text-stone-900">Location:</strong> {selectedRecord.location || '—'}</p>
                  <p><strong className="text-stone-900">Waiting List:</strong> {selectedRecord.joinWaitingList ? 'Yes' : 'No'}</p>
                  <p><strong className="text-stone-900">Marketing Consent:</strong> {selectedRecord.consent ? 'Granted' : 'No'}</p>
                </div>
              </div>

              {/* Answers */}
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="font-semibold text-stone-500 block text-[11px]">1. Do you like the SoilWise AI experience?</span>
                  <p className="text-sm font-bold text-stone-900 mt-0.5">{selectedRecord.likesSoilwise}</p>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="font-semibold text-stone-500 block text-[11px]">2. Would you use SoilWise AI if it were available?</span>
                  <p className="text-sm font-bold text-stone-900 mt-0.5">{selectedRecord.wouldUse}</p>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="font-semibold text-stone-500 block text-[11px]">3. Willingness to Pay</span>
                  <p className="text-sm font-bold text-stone-900 mt-0.5">{selectedRecord.willingnessToPay}</p>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="font-semibold text-stone-500 block text-[11px]">4. What to remove, change or simplify?</span>
                  <p className="text-xs sm:text-sm text-stone-800 mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.removeOrModify || 'No specific modifications suggested.'}
                  </p>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="font-semibold text-stone-500 block text-[11px]">5. Desired features to add?</span>
                  <p className="text-xs sm:text-sm text-stone-800 mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.desiredFeatures || 'No specific additions requested.'}
                  </p>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="font-semibold text-stone-500 block text-[11px]">6. Most valuable feature</span>
                  <p className="text-sm font-bold text-stone-900 mt-0.5">{selectedRecord.mostValuableFeature}</p>
                </div>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Create Lesson Modal */}
      <AdminLessonCreateModal
        isOpen={isCreateLessonModalOpen}
        onClose={() => setIsCreateLessonModalOpen(false)}
        onLessonCreated={handleLessonCreated}
        adminEmail={auth?.currentUser?.email || AUTHORIZED_ADMIN_EMAIL}
      />

      {/* Admin Lesson Preview Modal */}
      {previewLessonModal && (
        <LessonDetailModal
          lesson={previewLessonModal}
          isOpen={!!previewLessonModal}
          onClose={() => setPreviewLessonModal(null)}
          isCompleted={false}
          isSaved={false}
          onToggleComplete={() => {}}
          onToggleSave={() => {}}
          onAskAi={() => {}}
          onSelectLesson={(l) => setPreviewLessonModal(l)}
        />
      )}

      {/* Admin Add / Edit Crop Seed Modal */}
      <AdminAddSeedModal
        isOpen={isAddSeedModalOpen}
        onClose={() => {
          setIsAddSeedModalOpen(false);
          setSeedToEdit(null);
        }}
        onSeedCreated={handleSeedSaved}
        existingSeedToEdit={seedToEdit}
      />
    </div>
  );
};
