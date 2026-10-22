import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquareHeart, X, ArrowRight, Sparkles, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

interface SurveyPromptBannerProps {
  onOpenSurvey: () => void;
}

// Frequency interval: prompt reappears every 8 minutes if user hasn't submitted yet
const SNOOZE_DURATION_MS = 8 * 60 * 1000; 
const SNOOZE_STORAGE_KEY = 'soilwise_survey_snoozed_at';
const COMPLETED_STORAGE_KEY = 'soilwise_feedback_submitted';

export const SurveyPromptBanner: React.FC<SurveyPromptBannerProps> = ({ onOpenSurvey }) => {
  const { userProfile } = useAuth();
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const checkEligibility = useCallback((): boolean => {
    // 1. If user already submitted, never show
    if (userProfile?.feedbackSurveyCompleted) return false;
    try {
      if (localStorage.getItem(COMPLETED_STORAGE_KEY) === 'true') {
        return false;
      }
    } catch {
      // Storage unavailable, proceed cautiously
    }

    // 2. Check snooze timestamp
    try {
      const snoozedAtStr = localStorage.getItem(SNOOZE_STORAGE_KEY);
      if (snoozedAtStr) {
        const snoozedAt = parseInt(snoozedAtStr, 10);
        if (!isNaN(snoozedAt) && Date.now() - snoozedAt < SNOOZE_DURATION_MS) {
          return false;
        }
      }
    } catch {
      // Storage unavailable
    }

    return true;
  }, [userProfile?.feedbackSurveyCompleted]);

  useEffect(() => {
    // Initial delay before first appearance (12 seconds)
    const initialTimer = setTimeout(() => {
      if (checkEligibility()) {
        setIsVisible(true);
      }
    }, 12000);

    // Periodic check every 30 seconds to show frequently if snooze elapsed
    const intervalTimer = setInterval(() => {
      if (!isVisible && checkEligibility()) {
        setIsVisible(true);
      }
    }, 30000);

    // Listen for custom event when feedback is submitted anywhere in the app
    const handleSurveySubmitted = () => {
      setIsVisible(false);
    };
    window.addEventListener('soilwise_feedback_submitted', handleSurveySubmitted);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      window.removeEventListener('soilwise_feedback_submitted', handleSurveySubmitted);
    };
  }, [checkEligibility, isVisible]);

  const handleSnooze = () => {
    try {
      localStorage.setItem(SNOOZE_STORAGE_KEY, Date.now().toString());
    } catch {
      // Ignore
    }
    setIsVisible(false);
  };

  const handleStartSurvey = () => {
    setIsVisible(false);
    onOpenSurvey();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Product feedback invitation"
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed bottom-4 right-4 z-40 max-w-sm sm:max-w-md w-[calc(100%-2rem)] bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-2xl border border-stone-200/90 hover:border-emerald-600/30 transition-all text-stone-900"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1b4332] to-[#2d6a4f] text-white flex items-center justify-center shrink-0 shadow-md">
            <MessageSquareHeart className="w-5 h-5 text-emerald-300" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-[#1b4332]">
                <Sparkles className="w-2.5 h-2.5" /> 2-Min Feedback
              </span>
            </div>

            <h4 className="text-sm font-bold text-stone-900 leading-snug">
              Help Us Build SoilWise AI
            </h4>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              We value your voice! Share your farming challenges and desired tools so our AI and agronomy recommendations match your exact needs.
            </p>

            <div className="flex items-center gap-2 mt-3.5 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={handleStartSurvey}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <span>Take Survey</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleSnooze}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                title="Ask again in 8 minutes"
              >
                <Clock className="w-3 h-3 text-stone-400" />
                <span>Later</span>
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={handleSnooze}
            className="absolute top-3 right-3 p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Dismiss survey prompt for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
