import React, { useState, useEffect, useRef } from 'react';
import { Bot, ArrowRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface FloatingAiAssistantBarProps {
  onOpen: (initialQuery?: string) => void;
  isAuthenticated?: boolean;
  onSignInClick?: () => void;
}

const ROTATING_MESSAGES = [
  'Ask me anything about your farm...',
  'Want to understand your soil results?',
  'Ask about your crops, soil or rainfall...',
  'Need help understanding your farm analysis?',
  'What would you like to know about your farm?',
];

export const FloatingAiAssistantBar: React.FC<FloatingAiAssistantBarProps> = ({
  onOpen,
  isAuthenticated = false,
  onSignInClick,
}) => {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Typewriter animation effect
  useEffect(() => {
    if (!isAuthenticated) return;

    // If the user has typed or the input is focused, pause the typewriter animation
    if (isFocused || inputValue.length > 0) {
      return;
    }

    const currentFullMessage = ROTATING_MESSAGES[currentMessageIndex];
    let timer: NodeJS.Timeout;

    if (!isDeleting) {
      if (displayedText.length < currentFullMessage.length) {
        // Typing forward
        timer = setTimeout(() => {
          setDisplayedText(currentFullMessage.slice(0, displayedText.length + 1));
        }, 40);
      } else {
        // Pause at full sentence before deleting
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2200);
      }
    } else {
      if (displayedText.length > 0) {
        // Backspacing
        timer = setTimeout(() => {
          setDisplayedText(currentFullMessage.slice(0, displayedText.length - 1));
        }, 20);
      } else {
        // Switch to next sentence
        setIsDeleting(false);
        setCurrentMessageIndex((prev) => (prev + 1) % ROTATING_MESSAGES.length);
      }
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, currentMessageIndex, isFocused, inputValue, isAuthenticated]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAuthenticated) {
      onSignInClick?.();
      return;
    }
    const query = inputValue.trim();
    setInputValue('');
    onOpen(query || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Unauthenticated user: Replace with clear, friendly prompt to sign in (Section 1)
  if (!isAuthenticated) {
    return (
      <div
        className="fixed bottom-4 sm:bottom-6 left-0 right-0 z-30 px-3 sm:px-4 pointer-events-none transition-all duration-300"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="pointer-events-auto max-w-xl mx-auto">
          <div
            onClick={() => onSignInClick?.()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSignInClick?.();
              }
            }}
            className="bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/90 shadow-xl hover:shadow-2xl transition-all duration-200 p-2 sm:p-2.5 flex items-center justify-between gap-3 group ring-1 ring-stone-900/5 cursor-pointer hover:border-[#1b4332]/50"
            title="Sign in to consult the SoilWise AI Assistant"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1b4332] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Bot className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="truncate text-left">
                <div className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-[#1b4332] transition-colors truncate">
                  Sign in to consult the SoilWise AI Assistant
                </div>
                <div className="hidden sm:block text-[11px] text-stone-500 truncate">
                  Ask agronomic questions tailored to your farm analysis
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSignInClick?.();
              }}
              className="px-3 py-1.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-300" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user: Full floating interaction bar
  return (
    <div
      className="fixed bottom-4 sm:bottom-6 left-0 right-0 z-30 px-3 sm:px-4 pointer-events-none transition-all duration-300"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="pointer-events-auto max-w-xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/90 shadow-xl hover:shadow-2xl transition-all duration-200 p-1.5 sm:p-2 flex items-center gap-2 group ring-1 ring-stone-900/5 focus-within:ring-2 focus-within:ring-[#1b4332] focus-within:border-transparent"
        >
          {/* AI Icon with active pulse indicator */}
          <div
            onClick={() => onOpen(inputValue.trim() || undefined)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1b4332] text-white flex items-center justify-center shrink-0 shadow-xs cursor-pointer group-hover:scale-105 transition-transform"
            title="SoilWise AI Assistant"
          >
            <Bot className="w-4 h-4 text-emerald-300" />
          </div>

          {/* Accessible Screen Reader Label */}
          <label htmlFor="floating-ai-assistant-input" className="sr-only">
            Ask SoilWise AI a question about your farm
          </label>

          {/* Input field with rotating animated placeholder */}
          <div className="relative flex-1 min-w-0">
            <input
              id="floating-ai-assistant-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              aria-label="Ask SoilWise AI a question about your farm"
              placeholder={isFocused ? 'Ask SoilWise AI a question about your farm...' : displayedText || ROTATING_MESSAGES[0]}
              className="w-full bg-transparent text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none truncate py-1 pr-1"
            />
          </div>

          {/* Assistant Badge on tablet/desktop */}
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-[#1b4332] bg-[#f0f5ee] px-2 py-0.5 rounded-md border border-[#1b4332]/15 shrink-0 select-none">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            AI Assistant
          </span>

          {/* Send / Open Action Button */}
          <button
            type="submit"
            aria-label="Ask SoilWise AI"
            title="Ask SoilWise AI"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1b4332] hover:bg-[#143225] text-white flex items-center justify-center shrink-0 transition-all shadow-xs cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b4332]"
          >
            <ArrowRight className="w-4 h-4 text-emerald-300" />
          </button>
        </form>
      </div>
    </div>
  );
};
