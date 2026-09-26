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
  MessageSquare
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

interface AdminDashboardProps {
  onLogout: () => void;
  onBackToApp: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onBackToApp }) => {
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserType, setSelectedUserType] = useState('All');
  const [selectedWtp, setSelectedWtp] = useState('All');
  const [selectedWaitlist, setSelectedWaitlist] = useState('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Modal Detail
  const [selectedRecord, setSelectedRecord] = useState<FeedbackSubmission | null>(null);

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
    </div>
  );
};
