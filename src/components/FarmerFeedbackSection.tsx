import React, { useState } from 'react';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  ArrowLeft,
  User,
  Sprout,
  CloudSun,
  MessageSquareHeart,
  Check
} from 'lucide-react';
import { FarmLocation } from '../types/soilwise';
import { submitFarmerFeedback, isFirebaseConfigured } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

interface FarmerFeedbackSectionProps {
  location?: FarmLocation;
}

const USER_ROLES = [
  'Farmer',
  'Agronomist',
  'Agricultural Extension Officer',
  'Researcher',
  'Agribusiness / Input Supplier',
  'Student',
  'Other',
];

const CROPS_LIST = [
  'Maize',
  'Rice',
  'Sorghum',
  'Millet',
  'Cowpea/Beans',
  'Groundnut',
  'Soybean',
  'Cassava',
  'Yam',
  'Vegetables',
  'Other',
];

const SOIL_TESTED_OPTIONS = [
  'Yes',
  'No',
  'I am not sure',
];

const SOIL_TEST_METHODS = [
  'Agricultural research institute',
  'Government agricultural/laboratory service',
  'University laboratory',
  'Private laboratory',
  'Extension/agricultural officer',
  'Cooperative/organisation programme',
  'Soil testing service/company',
  'Through a farm input/agro-dealer service',
  'Other',
];

const WEATHER_SOURCE_OPTIONS = [
  'Radio',
  'Television',
  'Weather app',
  'Phone/internet',
  'Social media',
  'Extension/agricultural officer',
  'Other farmers/community members',
  'I do not usually check weather information',
  'Other',
];

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

export const FarmerFeedbackSection: React.FC<FarmerFeedbackSectionProps> = ({ location }) => {
  // Current active section step: 1, 2, 3, or 4
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Section 1: About You
  const [userType, setUserType] = useState<string>('');
  const [name, setName] = useState<string>(''); // Always optional
  const [farmLocationText, setFarmLocationText] = useState<string>(
    location?.address?.fullAddress || ''
  );

  // Section 2: Your Farming Experience (Only if userType === 'Farmer')
  const [cropsGrown, setCropsGrown] = useState<string[]>([]);
  const [otherCrop, setOtherCrop] = useState<string>('');
  const [soilTested, setSoilTested] = useState<string>('');
  const [soilTestMethod, setSoilTestMethod] = useState<string>('');
  const [otherSoilTestMethod, setOtherSoilTestMethod] = useState<string>('');

  // Section 3: Weather & Farm Decisions
  const [weatherInformationSource, setWeatherInformationSource] = useState<string>('');
  const [otherWeatherInformationSource, setOtherWeatherInformationSource] = useState<string>('');
  const [farmDecisionChallenge, setFarmDecisionChallenge] = useState<string>(''); // Required open-ended

  // Section 4: Feedback & Future Engagement
  const [likesSoilwise, setLikesSoilwise] = useState<string>('');
  const [wouldUse, setWouldUse] = useState<string>('');
  const [willingnessToPay, setWillingnessToPay] = useState<string>('');
  const [mostValuableFeature, setMostValuableFeature] = useState<string>('');
  const [removeOrModify, setRemoveOrModify] = useState<string>(''); // Required open-ended
  const [desiredFeatures, setDesiredFeatures] = useState<string>(''); // Required open-ended
  
  // THE ONLY PRESELECTED EXCEPTION: Waiting/testing list defaults to true (Yes)
  const [joinWaitingList, setJoinWaitingList] = useState<boolean>(true);
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [consent, setConsent] = useState<boolean>(false);

  // Submission Status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{ id: string; joinedWaitlist: boolean } | null>(null);

  const { currentUser, userProfile, updateUserProfile } = useAuth();

  // Prefill details if user is signed in
  React.useEffect(() => {
    if (userProfile) {
      if (userProfile.displayName && !name) setName(userProfile.displayName);
      if (userProfile.email && !email) setEmail(userProfile.email);
      if (userProfile.phoneNumber && !phone) setPhone(userProfile.phoneNumber);
      if (userProfile.state && !farmLocationText) {
        setFarmLocationText(`${userProfile.state}${userProfile.lga ? `, ${userProfile.lga}` : ''}`);
      }
    } else if (currentUser) {
      if (currentUser.displayName && !name) setName(currentUser.displayName);
      if (currentUser.email && !email) setEmail(currentUser.email);
    }
  }, [userProfile, currentUser]);

  const isFarmer = userType === 'Farmer';

  // Dynamic step list based on respondent role
  const totalSteps = isFarmer ? 4 : 3;

  // Map logical step index to actual section
  // If not a farmer:
  // logical 1 -> Section 1 (About You)
  // logical 2 -> Section 3 (Weather & Farm Decisions)
  // logical 3 -> Section 4 (Feedback & Future Engagement)
  const activeSectionNumber = !isFarmer && currentStep === 2 ? 3 : !isFarmer && currentStep === 3 ? 4 : currentStep;

  // Toggle crop selection
  const handleToggleCrop = (crop: string) => {
    setCropsGrown((prev) => {
      if (prev.includes(crop)) {
        return prev.filter((c) => c !== crop);
      }
      return [...prev, crop];
    });
  };

  // Step validation
  const validateStep = (stepNumber: number): boolean => {
    setStepError(null);

    // Section 1 Validation: About You
    if (stepNumber === 1) {
      if (!userType) {
        setStepError('Please select what best describes you.');
        return false;
      }
      return true;
    }

    // Section 2 Validation: Farming Experience (Farmers only)
    if (stepNumber === 2 && isFarmer) {
      if (cropsGrown.length === 0) {
        setStepError('Please select at least one crop you grow or work with.');
        return false;
      }
      if (cropsGrown.includes('Other') && !otherCrop.trim()) {
        setStepError('Please specify the other crop(s) you grow.');
        return false;
      }
      if (!soilTested) {
        setStepError('Please indicate whether you have ever tested your soil.');
        return false;
      }
      if (soilTested === 'Yes') {
        if (!soilTestMethod) {
          setStepError('Please select how you got your soil tested.');
          return false;
        }
        if (soilTestMethod === 'Other' && !otherSoilTestMethod.trim()) {
          setStepError('Please specify the other soil testing method.');
          return false;
        }
      }
      return true;
    }

    // Section 3 Validation: Weather & Farm Decisions
    if (activeSectionNumber === 3) {
      if (!weatherInformationSource) {
        setStepError('Please select how you usually get rainfall or weather information.');
        return false;
      }
      if (weatherInformationSource === 'Other' && !otherWeatherInformationSource.trim()) {
        setStepError('Please specify your other weather information source.');
        return false;
      }
      if (!farmDecisionChallenge.trim()) {
        setStepError('Please describe your biggest challenge when making farm decisions.');
        return false;
      }
      return true;
    }

    // Section 4 Validation: Feedback & Future Engagement
    if (activeSectionNumber === 4) {
      if (!likesSoilwise) {
        setStepError('Please indicate if you found this farm analysis report clear and useful.');
        return false;
      }
      if (!wouldUse) {
        setStepError('Please indicate whether you would use SoilWise AI.');
        return false;
      }
      if (!willingnessToPay) {
        setStepError('Please select an acceptable pricing model.');
        return false;
      }
      if (!mostValuableFeature) {
        setStepError('Please select the feature that is most valuable to you.');
        return false;
      }
      if (!removeOrModify.trim()) {
        setStepError('Please let us know what we should remove, simplify, or modify.');
        return false;
      }
      if (!desiredFeatures.trim()) {
        setStepError('Please share what critical feature is currently missing.');
        return false;
      }
      if (joinWaitingList) {
        if (!phone.trim()) {
          setStepError('Please provide your phone number to receive early access updates.');
          return false;
        }
        if (!consent) {
          setStepError('Please check the consent box to authorize contact regarding SoilWise AI testing.');
          return false;
        }
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setStepError(null);
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
      const sectionEl = document.getElementById('feedbackQuestionnaire');
      if (sectionEl) {
        sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleBack = () => {
    setStepError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    const sectionEl = document.getElementById('feedbackQuestionnaire');
    if (sectionEl) {
      sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateStep(currentStep)) {
      return;
    }

    if (!isFirebaseConfigured) {
      setStepError('Feedback service is temporarily unavailable. Please try again later.');
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionPayload: Record<string, any> = {
        userType: userType || 'Unspecified',
        respondentRole: userType || 'Unspecified',
        isFarmer,
        farmDecisionChallenge: farmDecisionChallenge.trim(),
        likesSoilwise,
        wouldUse,
        willingnessToPay,
        mostValuableFeature: mostValuableFeature || 'Unspecified',
        removeOrModify: removeOrModify.trim(),
        desiredFeatures: desiredFeatures.trim(),
        joinWaitingList: Boolean(joinWaitingList),
        consent: Boolean(consent),
      };

      if (name.trim()) submissionPayload.name = name.trim();
      if (phone.trim()) submissionPayload.phone = phone.trim();
      if (email.trim()) submissionPayload.email = email.trim();
      if (farmLocationText.trim()) submissionPayload.location = farmLocationText.trim();
      if (weatherInformationSource) submissionPayload.weatherInformationSource = weatherInformationSource;
      if (weatherInformationSource === 'Other' && otherWeatherInformationSource.trim()) {
        submissionPayload.otherWeatherInformationSource = otherWeatherInformationSource.trim();
      }

      if (isFarmer) {
        submissionPayload.cropsGrown = cropsGrown;
        if (cropsGrown.includes('Other') && otherCrop.trim()) {
          submissionPayload.otherCrop = otherCrop.trim();
        }
        if (soilTested) {
          submissionPayload.soilTested = soilTested;
        }
        if (soilTested === 'Yes' && soilTestMethod) {
          submissionPayload.soilTestMethod = soilTestMethod;
          if (soilTestMethod === 'Other' && otherSoilTestMethod.trim()) {
            submissionPayload.otherSoilTestMethod = otherSoilTestMethod.trim();
          }
        }
      }

      const result = await submitFarmerFeedback(submissionPayload as any);

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit feedback.');
      }

      // Record feedback survey completion permanently
      try {
        localStorage.setItem('soilwise_feedback_submitted', 'true');
        window.dispatchEvent(new CustomEvent('soilwise_feedback_submitted'));
      } catch {
        // Ignore storage errors
      }

      // Update user profile in Firestore if signed in
      if (currentUser && updateUserProfile) {
        updateUserProfile({ feedbackSurveyCompleted: true }).catch((err) => {
          console.warn('Could not record survey completion in profile:', err);
        });
      }

      setSubmittedData({
        id: result.id || 'SUBMITTED',
        joinedWaitlist: joinWaitingList,
      });
    } catch (err: any) {
      console.error('Feedback submit error:', err);
      setStepError(err.message || 'Feedback service is temporarily unavailable. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setUserType('');
    setName('');
    setCropsGrown([]);
    setOtherCrop('');
    setSoilTested('');
    setSoilTestMethod('');
    setOtherSoilTestMethod('');
    setWeatherInformationSource('');
    setOtherWeatherInformationSource('');
    setFarmDecisionChallenge('');
    setLikesSoilwise('');
    setWouldUse('');
    setWillingnessToPay('');
    setMostValuableFeature('');
    setRemoveOrModify('');
    setDesiredFeatures('');
    setJoinWaitingList(true);
    setPhone('');
    setEmail('');
    setConsent(false);
    setSubmittedData(null);
    setStepError(null);
  };

  return (
    <div id="feedbackQuestionnaire" className="bg-white rounded-3xl p-6 sm:p-9 border border-stone-200/90 shadow-sm space-y-7">
      {/* Header */}
      <div className="space-y-2 border-b border-stone-100 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1b4332]">
            Product Validation &bull; MVP Research
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Help Us Build SoilWise AI
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 max-w-2xl leading-relaxed">
          Your feedback directly informs our agricultural recommendation roadmap, localized weather integration, and agronomic advisory tools.
        </p>
      </div>

      {submittedData ? (
        <div className="p-8 bg-[#f4f7f2] rounded-2xl border border-[#1b4332]/25 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1b4332] text-white flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-300" />
          </div>
          <h3 className="text-xl font-bold text-stone-900">
            Thank You for Your Feedback!
          </h3>
          <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
            Your responses have been recorded in the SoilWise AI research database.
            {submittedData.joinedWaitlist && (
              <span className="block mt-1 font-semibold text-[#1b4332]">
                You have been registered for our early access and testing list.
              </span>
            )}
          </p>
          <button
            onClick={resetForm}
            className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Submit Another Response
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-7">
          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-600 font-semibold">
              <span>
                Section {currentStep} of {totalSteps}: {
                  activeSectionNumber === 1
                    ? 'About You'
                    : activeSectionNumber === 2
                    ? 'Your Farming Experience'
                    : activeSectionNumber === 3
                    ? 'Weather & Farm Decisions'
                    : 'Feedback & Future Engagement'
                }
              </span>
              <span className="text-[#1b4332] font-mono">
                {Math.round((currentStep / totalSteps) * 100)}% Complete
              </span>
            </div>
            <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#1b4332] transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Error Message Banner */}
          {stepError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{stepError}</span>
            </div>
          )}

          {/* SECTION 1: ABOUT YOU */}
          {activeSectionNumber === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-2 text-sm font-bold text-stone-900 border-b border-stone-100 pb-2">
                <User className="w-4 h-4 text-[#1b4332]" />
                <span>Section 1 &mdash; About You</span>
              </div>

              {/* Respondent Role */}
              <div className="space-y-2.5">
                <label className="block text-xs sm:text-sm font-bold text-stone-800">
                  What best describes you? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {USER_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setUserType(role)}
                      className={`p-3 rounded-xl text-xs font-semibold border text-left transition-all cursor-pointer flex items-center justify-between ${
                        userType === role
                          ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      <span>{role}</span>
                      {userType === role && <Check className="w-4 h-4 text-emerald-300 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-700">
                    Your Name <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Amina Musa"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-stone-700">
                    Farm Location or Area <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={farmLocationText}
                    onChange={(e) => setFarmLocationText(e.target.value)}
                    placeholder="e.g. Zaria, Kaduna State"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: YOUR FARMING EXPERIENCE (Farmers only) */}
          {activeSectionNumber === 2 && isFarmer && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-2 text-sm font-bold text-stone-900 border-b border-stone-100 pb-2">
                <Sprout className="w-4 h-4 text-[#1b4332]" />
                <span>Section 2 &mdash; Your Farming Experience</span>
              </div>

              {/* Crops Grown */}
              <div className="space-y-2.5">
                <label className="block text-xs sm:text-sm font-bold text-stone-800">
                  What crops do you grow or work with? <span className="text-red-500">*</span>
                  <span className="block text-xs font-normal text-stone-500 mt-0.5">
                    Select all that apply to your farming operations.
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {CROPS_LIST.map((crop) => {
                    const isSelected = cropsGrown.includes(crop);
                    return (
                      <button
                        key={crop}
                        type="button"
                        onClick={() => handleToggleCrop(crop)}
                        className={`p-2.5 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        <span className="truncate">{crop}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>

                {cropsGrown.includes('Other') && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Specify other crop(s) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={otherCrop}
                      onChange={(e) => setOtherCrop(e.target.value)}
                      placeholder="e.g. Sesame, Ginger, Cocoa..."
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Soil Testing Experience */}
              <div className="space-y-2.5 pt-2 border-t border-stone-100">
                <label className="block text-xs sm:text-sm font-bold text-stone-800">
                  Have you ever tested your soil? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5 sm:max-w-md">
                  {SOIL_TESTED_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSoilTested(opt)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                        soilTested === opt
                          ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional: How did you get your soil tested? */}
              {soilTested === 'Yes' && (
                <div className="space-y-2.5 pt-2 border-t border-stone-100">
                  <label className="block text-xs sm:text-sm font-bold text-stone-800">
                    How did you get your soil tested? <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SOIL_TEST_METHODS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setSoilTestMethod(method)}
                        className={`p-2.5 px-3 rounded-xl text-xs font-medium border text-left transition-all cursor-pointer flex items-center justify-between ${
                          soilTestMethod === method
                            ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                            : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                        }`}
                      >
                        <span className="truncate">{method}</span>
                        {soilTestMethod === method && <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0 ml-1" />}
                      </button>
                    ))}
                  </div>

                  {soilTestMethod === 'Other' && (
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Specify testing service/method <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={otherSoilTestMethod}
                        onChange={(e) => setOtherSoilTestMethod(e.target.value)}
                        placeholder="e.g. Field test kit, NGO agricultural project..."
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: WEATHER & FARM DECISIONS */}
          {activeSectionNumber === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-2 text-sm font-bold text-stone-900 border-b border-stone-100 pb-2">
                <CloudSun className="w-4 h-4 text-[#1b4332]" />
                <span>Section {isFarmer ? '3' : '2'} &mdash; Weather &amp; Farm Decisions</span>
              </div>

              {/* Weather Information Source */}
              <div className="space-y-2.5">
                <label className="block text-xs sm:text-sm font-bold text-stone-800">
                  How do you usually get rainfall or weather information for your farming decisions? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {WEATHER_SOURCE_OPTIONS.map((source) => (
                    <button
                      key={source}
                      type="button"
                      onClick={() => setWeatherInformationSource(source)}
                      className={`p-2.5 px-3 rounded-xl text-xs font-medium border text-left transition-all cursor-pointer flex items-center justify-between ${
                        weatherInformationSource === source
                          ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      <span className="truncate">{source}</span>
                      {weatherInformationSource === source && <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0 ml-1" />}
                    </button>
                  ))}
                </div>

                {weatherInformationSource === 'Other' && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Specify other weather source <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={otherWeatherInformationSource}
                      onChange={(e) => setOtherWeatherInformationSource(e.target.value)}
                      placeholder="e.g. Village head announcement, SMS alert service..."
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Biggest Farm Decision Challenge (Required Open-Ended) */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <label className="block text-xs sm:text-sm font-bold text-stone-800">
                  What is your biggest challenge when making farm decisions? <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-stone-500">
                  Describe in your own words (e.g., unpredictable rains, uncertainty in selecting seed varieties, input costs, lack of soil tests).
                </p>
                <textarea
                  rows={3}
                  required
                  value={farmDecisionChallenge}
                  onChange={(e) => setFarmDecisionChallenge(e.target.value)}
                  placeholder="Share your personal experience and decision challenge..."
                  className="w-full p-3.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-[#1b4332] focus:outline-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* SECTION 4: FEEDBACK & FUTURE ENGAGEMENT */}
          {activeSectionNumber === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-2 text-sm font-bold text-stone-900 border-b border-stone-100 pb-2">
                <MessageSquareHeart className="w-4 h-4 text-[#1b4332]" />
                <span>Section {isFarmer ? '4' : '3'} &mdash; Feedback &amp; Future Engagement</span>
              </div>

              {/* Likes SoilWise */}
              <div className="space-y-2.5">
                <label className="block text-xs sm:text-sm font-bold text-stone-800">
                  Did you find this farm analysis report clear and useful? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5 sm:max-w-md">
                  {LIKES_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setLikesSoilwise(opt)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                        likesSoilwise === opt
                          ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Usage intent */}
              <div className="space-y-2.5">
                <label className="block text-xs sm:text-sm font-bold text-stone-800">
                  Would you use SoilWise AI for your farm or advisory work? <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {WOULD_USE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setWouldUse(opt)}
                      className={`py-2 px-3.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        wouldUse === opt
                          ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Willingness to Pay */}
              <div className="space-y-2.5">
                <label className="block text-xs sm:text-sm font-bold text-stone-800">
                  What pricing model would be acceptable for your farm operations? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {WILLINGNESS_TO_PAY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setWillingnessToPay(opt)}
                      className={`py-2 px-3.5 rounded-xl text-xs font-medium border text-left transition-all cursor-pointer ${
                        willingnessToPay === opt
                          ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Most Valuable Feature */}
              <div className="space-y-2.5">
                <label className="block text-xs sm:text-sm font-bold text-stone-800">
                  Which feature in this report is most valuable to you? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MOST_VALUABLE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setMostValuableFeature(opt)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                        mostValuableFeature === opt
                          ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Open-Ended Feedback Questions (Required) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-800">
                    What should we remove, simplify, or modify? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={removeOrModify}
                    onChange={(e) => setRemoveOrModify(e.target.value)}
                    placeholder="Share anything that felt unclear, redundant, or confusing..."
                    className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-800">
                    What critical feature is currently missing? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={desiredFeatures}
                    onChange={(e) => setDesiredFeatures(e.target.value)}
                    placeholder="e.g. Pest alerts, specific crop guides, fertiliser calculations..."
                    className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                  />
                </div>
              </div>

              {/* Waiting List Callout (Defaults to Yes) */}
              <div className="p-5 sm:p-6 bg-[#f4f7f2] rounded-2xl border border-[#1b4332]/20 space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs sm:text-sm font-bold text-stone-900">
                    Would you like to join our waiting and testing list?
                  </label>
                  <p className="text-xs text-stone-600">
                    Be the first to test upcoming SoilWise AI features, seed insights, and agricultural tools.
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-stone-800">
                    <input
                      type="radio"
                      name="waitlistChoice"
                      checked={joinWaitingList === true}
                      onChange={() => setJoinWaitingList(true)}
                      className="w-4 h-4 text-[#1b4332] focus:ring-[#1b4332]"
                    />
                    <span>Yes, sign me up</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-stone-800">
                    <input
                      type="radio"
                      name="waitlistChoice"
                      checked={joinWaitingList === false}
                      onChange={() => setJoinWaitingList(false)}
                      className="w-4 h-4 text-[#1b4332] focus:ring-[#1b4332]"
                    />
                    <span>No, thanks</span>
                  </label>
                </div>

                {joinWaitingList && (
                  <div className="pt-3 border-t border-[#1b4332]/10 space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Phone Number (WhatsApp preferred) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 0803 123 4567"
                          className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Email Address <span className="text-stone-400 font-normal">(Optional)</span>
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. farmer@example.com"
                          className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:ring-2 focus:ring-[#1b4332] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-start gap-2 text-xs text-stone-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-[#1b4332] focus:ring-[#1b4332] border-stone-300"
                        />
                        <span>
                          I consent to being contacted by SoilWise AI regarding early access, testing updates, and agricultural research.
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-200">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : <div />}

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#1b4332] hover:bg-[#143225] rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-7 py-3 text-xs sm:text-sm font-bold text-white bg-[#1b4332] hover:bg-[#143225] rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Feedback...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Feedback &amp; Validation</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
