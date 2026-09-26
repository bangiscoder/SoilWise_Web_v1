import React, { useState } from 'react';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { FarmLocation } from '../types/soilwise';
import { submitFarmerFeedback, isFirebaseConfigured } from '../lib/firebase';

interface FarmerFeedbackSectionProps {
  location?: FarmLocation;
}

const LIKES_OPTIONS = ['Yes', 'Somewhat', 'Not yet'];

const WOULD_USE_OPTIONS = ['Definitely', 'Probably', 'Not sure', 'Probably not', 'No'];

const WILLINGNESS_TO_PAY_OPTIONS = [
  'I would prefer a free version',
  'Less than ₦5,000 per year',
  '₦5,000–₦10,000 per year',
  '₦10,000–₦20,000 per year',
  'More than ₦20,000 per year',
  'I would prefer my cooperative/organisation to pay',
  'I would not pay',
];

const MOST_VALUABLE_OPTIONS = [
  'Soil analysis',
  'Weather/rainfall information',
  'Seed recommendations',
  'Crop recommendations',
  'Agronomist consultation',
  'AI Assistant',
  'Agricultural information',
  'Other',
];

const USER_TYPES = [
  'Farmer',
  'Agronomist',
  'Agricultural Extension Officer',
  'Researcher',
  'Agribusiness / Input Supplier',
  'Student',
  'Other',
];

export const FarmerFeedbackSection: React.FC<FarmerFeedbackSectionProps> = ({ location }) => {
  // 1. Overall
  const [likesSoilwise, setLikesSoilwise] = useState('Yes');
  // 2. Usage
  const [wouldUse, setWouldUse] = useState('Definitely');
  // 3. WTP
  const [willingnessToPay, setWillingnessToPay] = useState(WILLINGNESS_TO_PAY_OPTIONS[1]);
  // 4. Improvements
  const [removeOrModify, setRemoveOrModify] = useState('');
  // 5. Missing features
  const [desiredFeatures, setDesiredFeatures] = useState('');
  // 6. Most valuable feature
  const [mostValuableFeature, setMostValuableFeature] = useState(MOST_VALUABLE_OPTIONS[0]);
  // 7. Early Access
  const [joinWaitingList, setJoinWaitingList] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [farmLocationText, setFarmLocationText] = useState(
    location?.address?.fullAddress || ''
  );
  const [userType, setUserType] = useState(USER_TYPES[0]);
  const [consent, setConsent] = useState(true);

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    id: string;
    joinedWaitlist: boolean;
  } | null>(null);

  const resetForm = () => {
    setLikesSoilwise('Yes');
    setWouldUse('Definitely');
    setWillingnessToPay(WILLINGNESS_TO_PAY_OPTIONS[1]);
    setRemoveOrModify('');
    setDesiredFeatures('');
    setMostValuableFeature(MOST_VALUABLE_OPTIONS[0]);
    setJoinWaitingList(true);
    setName('');
    setPhone('');
    setEmail('');
    setConsent(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate clicks
    setErrorMessage(null);

    // Validation
    if (joinWaitingList) {
      if (!name.trim()) {
        setErrorMessage('Please provide your name to join the early access list.');
        return;
      }
      if (!phone.trim()) {
        setErrorMessage('Please provide your phone number so we can contact you with early access updates.');
        return;
      }
      if (!consent) {
        setErrorMessage('Please acknowledge the contact consent to join the early access list.');
        return;
      }
    }

    if (!isFirebaseConfigured) {
      setErrorMessage('Feedback service is temporarily unavailable. Please try again later.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitFarmerFeedback({
        likesSoilwise,
        wouldUse,
        willingnessToPay,
        removeOrModify: removeOrModify.trim(),
        desiredFeatures: desiredFeatures.trim(),
        mostValuableFeature,
        joinWaitingList,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        location: farmLocationText.trim(),
        userType,
        consent,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit feedback.');
      }

      setSubmittedData({
        id: result.id || 'SUBMITTED',
        joinedWaitlist: joinWaitingList,
      });
      resetForm();
    } catch (err: any) {
      console.error('Feedback submit error:', err);
      setErrorMessage(
        err.message || 'Feedback service is temporarily unavailable. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="feedback-section" className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200/80 shadow-xs space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1b4332]">
            Product Validation
          </span>
          <span className="text-stone-300">&bull;</span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            Cloud Firestore
          </span>
        </div>
        <h2 className="text-2xl font-bold text-stone-900 tracking-tight mt-1">
          Help Us Build SoilWise AI
        </h2>
        <p className="text-sm font-semibold text-[#1b4332] mt-0.5">
          Your feedback will help us decide what to build next.
        </p>
        <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
          SoilWise AI is currently being validated with farmers and agricultural stakeholders. Tell us what you think about the experience, what would make it more useful and whether you would use it if it became commercially available.
        </p>
      </div>

      {submittedData ? (
        /* Section 5: Feedback Success Message */
        <div className="p-6 sm:p-8 bg-[#f4f7f2] rounded-2xl border border-[#1b4332]/20 text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-700" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg sm:text-xl font-bold text-stone-900">
              Thank you. Your feedback has been received and will help us improve SoilWise AI.
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Your responses have been recorded in Cloud Firestore to guide our next stage of development.
            </p>
          </div>

          {submittedData.joinedWaitlist && (
            <div className="p-4 bg-white rounded-xl border border-emerald-200 text-xs text-emerald-900 font-semibold max-w-sm mx-auto shadow-2xs">
              <span className="block text-emerald-800 font-bold mb-0.5">
                You&apos;re on the SoilWise AI early-access list.
              </span>
              <span className="font-normal text-stone-600 block text-[11px]">
                We will notify you with pilot testing opportunities and regional feature releases.
              </span>
            </div>
          )}

          <button
            onClick={() => setSubmittedData(null)}
            className="text-xs text-[#1b4332] font-semibold underline hover:text-[#143225] cursor-pointer pt-2"
          >
            Submit Another Feedback Entry
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Overall: Do you like the SoilWise AI experience? */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-800">
              1. Do you like the SoilWise AI experience? *
            </label>
            <div className="flex flex-wrap gap-2">
              {LIKES_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLikesSoilwise(opt)}
                  className={`px-4 py-2 text-xs rounded-xl font-semibold border transition-all cursor-pointer ${
                    likesSoilwise === opt
                      ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Usage: Would you use SoilWise AI if it were available? */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-800">
              2. Would you use SoilWise AI if it were available? *
            </label>
            <div className="flex flex-wrap gap-2">
              {WOULD_USE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setWouldUse(opt)}
                  className={`px-3.5 py-2 text-xs rounded-xl font-semibold border transition-all cursor-pointer ${
                    wouldUse === opt
                      ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Willingness to Pay */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-bold text-stone-800">
                3. How much would you be willing to pay if SoilWise AI were commercially available? *
              </label>
              <p className="text-[11px] text-stone-400 mt-0.5">
                This is a willingness-to-pay validation question, not an established market price.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WILLINGNESS_TO_PAY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setWillingnessToPay(opt)}
                  className={`p-2.5 text-xs rounded-xl font-medium border text-left transition-all cursor-pointer ${
                    willingnessToPay === opt
                      ? 'bg-[#f0f5ee] text-[#1b4332] border-[#1b4332] font-semibold'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Improvements */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-800">
              4. Is there anything you would remove, change or simplify?
            </label>
            <textarea
              rows={2}
              value={removeOrModify}
              onChange={(e) => setRemoveOrModify(e.target.value)}
              placeholder="e.g. Simplify the soil metrics, make the rainfall dates clearer, add Hausa/Yoruba/Igbo translations..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
            />
          </div>

          {/* 5. Missing Features */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-800">
              5. What would you like us to add that would make you more willing to use SoilWise AI?
            </label>
            <textarea
              rows={2}
              value={desiredFeatures}
              onChange={(e) => setDesiredFeatures(e.target.value)}
              placeholder="e.g. Specific seed brand recommendations, SMS rainfall alerts, local market prices, fertilizer calculator..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
            />
          </div>

          {/* 6. Most Valuable Feature */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-800">
              6. Which part of SoilWise AI would be most useful to you? *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MOST_VALUABLE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setMostValuableFeature(opt)}
                  className={`p-2 text-xs rounded-xl font-medium border text-center transition-all cursor-pointer ${
                    mostValuableFeature === opt
                      ? 'bg-[#1b4332] text-white border-[#1b4332]'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Early Access & Waiting List */}
          <div className="p-4 sm:p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-stone-800 uppercase tracking-wide">
                  7. Early Access & Waiting List
                </span>
                <p className="text-xs text-stone-600 mt-0.5">
                  Would you like to join our waiting and testing list?
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => setJoinWaitingList(true)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    joinWaitingList ? 'bg-[#1b4332] text-white' : 'text-stone-600'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setJoinWaitingList(false)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    !joinWaitingList ? 'bg-[#1b4332] text-white' : 'text-stone-600'
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            {joinWaitingList && (
              <div className="pt-3 border-t border-stone-200/80 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-0.5">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Fatima Mohammed"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-0.5">
                      Phone Number (WhatsApp preferred) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +234 812 345 6789"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-0.5">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. fatima@example.com"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-0.5">
                      Farm Location / State
                    </label>
                    <input
                      type="text"
                      value={farmLocationText}
                      onChange={(e) => setFarmLocationText(e.target.value)}
                      placeholder="e.g. Kaduna, Zaria LGA"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-stone-700 mb-0.5">
                      User Type
                    </label>
                    <select
                      value={userType}
                      onChange={(e) => setUserType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
                    >
                      {USER_TYPES.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Consent Checkbox */}
                <div className="pt-1 flex items-start gap-2 text-[11px] text-stone-600">
                  <input
                    id="consent-check"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 rounded text-[#1b4332] focus:ring-[#1b4332]"
                  />
                  <label htmlFor="consent-check" className="cursor-pointer">
                    By joining, you agree that SoilWise AI may contact you with product updates, testing opportunities and relevant newsletters.
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button with Anti-Double-Click & Loading State */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 bg-[#1b4332] hover:bg-[#143225] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting feedback...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Feedback & Join Waitlist</span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-stone-400 mt-2">
              Responses are stored securely in Cloud Firestore and are not accessible to unauthorized users.
            </p>
          </div>
        </form>
      )}
    </div>
  );
};
