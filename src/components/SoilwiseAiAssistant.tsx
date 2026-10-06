import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  X, 
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { FarmAnalysisResult } from '../types/soilwise';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { 
  buildGeminiContext, 
} from '../services/geminiContextService';
import { 
  sendChatMessageToGemini, 
  AssistantChatMessage 
} from '../services/aiAssistantService';
import { getUserAnalysisHistory } from '../services/analysisHistoryService';
import { getUserFarms } from '../services/farmService';
import { SavedAnalysisSummary } from '../types/analysisHistory';
import { FarmProfileDocument } from '../types/farm';

interface SoilwiseAiAssistantProps {
  analysis?: FarmAnalysisResult | null;
  isOpen?: boolean;
  onClose?: () => void;
  onRequestConsultation?: () => void;
  onSignInClick?: () => void;
  initialQuery?: string;
  isHistorical?: boolean;
}

export const AI_ASSISTANT_MODE: 'mock' | 'gemini' = 'gemini';

/**
 * Formats simple markdown (*, -, numbered bullets, and **bold**) into clean JSX elements
 */
function FormattedAssistantText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed text-stone-800">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ');
        const isNumbered = /^\d+\.\s/.test(trimmed);

        const content = isBullet 
          ? trimmed.replace(/^[\*\-•]\s*/, '')
          : isNumbered
          ? trimmed.replace(/^\d+\.\s*/, '')
          : trimmed;

        // Parse **bold** parts
        const parts = content.split(/(\*\*.*?\*\*)/g);
        const renderedContent = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-bold text-stone-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet || isNumbered) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1.5">
              <span className="text-emerald-700 font-bold shrink-0 mt-0.5">
                {isNumbered ? trimmed.match(/^\d+\./)?.[0] : '•'}
              </span>
              <div className="flex-1">{renderedContent}</div>
            </div>
          );
        }

        return <p key={idx}>{renderedContent}</p>;
      })}
    </div>
  );
}

export const SoilwiseAiAssistant: React.FC<SoilwiseAiAssistantProps> = ({
  analysis,
  isOpen = true,
  onClose,
  onRequestConsultation,
  onSignInClick,
  initialQuery,
  isHistorical = false,
}) => {
  const { t } = useLanguage();
  const { currentUser, userProfile } = useAuth();

  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [historyDocs, setHistoryDocs] = useState<SavedAnalysisSummary[]>([]);
  const [userFarms, setUserFarms] = useState<FarmProfileDocument[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialSentRef = useRef<boolean>(false);
  const activeAnalysisIdRef = useRef<string | null>(null);

  // Load user history and farms in background to feed context builder
  useEffect(() => {
    if (currentUser) {
      getUserAnalysisHistory(currentUser.uid)
        .then((docs) => setHistoryDocs(docs))
        .catch((err) => console.warn('History load notice:', err));

      getUserFarms(currentUser.uid)
        .then((farms) => setUserFarms(farms))
        .catch((err) => console.warn('Farms load notice:', err));
    }
  }, [currentUser]);

  // Context Switching: Initialize greeting message
  useEffect(() => {
    const nextId = analysis?.id || 'no-analysis';
    if (activeAnalysisIdRef.current !== nextId) {
      activeAnalysisIdRef.current = nextId;

      let welcomeText = "Hello! I'm your SoilWise AI Agronomist. How can I help you with your farm today?";

      if (analysis) {
        const topCrop = analysis.cropRecommendationDecision?.top_recommendation?.crop.name;
        const topVar = analysis.cropRecommendationDecision?.top_recommendation?.variety.name;
        const loc = analysis.selectedState || analysis.location?.state || 'your land';

        if (isHistorical) {
          welcomeText = `Welcome! Viewing archived farm assessment for ${loc}. Recommended crop was ${topCrop || 'crop'} (${topVar || 'variety'}). What would you like to review?`;
        } else if (topCrop && topVar) {
          welcomeText = `Hello! Farm assessment for ${loc} loaded. Top recommendation is **${topCrop}** (${topVar}). Ask me about fertilizer rates, planting dates, soil nutrients, or variety management.`;
        } else {
          welcomeText = `Hello! Farm assessment for ${loc} loaded. Ask me about your soil nutrients, rainfall outlook, or recommended varieties.`;
        }
      }

      setMessages([
        {
          id: `init-${Date.now()}`,
          role: 'assistant',
          text: welcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      initialSentRef.current = false;
    }
  }, [analysis?.id, isHistorical]);

  // Active Farm resolution
  const activeFarm = userFarms.find((f) => f.farmId === userProfile?.activeFarmId) || 
    (analysis?.farmId ? userFarms.find((f) => f.farmId === analysis.farmId) : null) || 
    (userFarms.length > 0 ? userFarms[0] : null);

  // Quick-prompt suggestions (Section 2)
  const quickPrompts = (() => {
    const base = [
      'What fertilizer ratio should I use?',
      'When should I plant?',
      'How can I improve soil pH?',
    ];

    if (analysis?.cropRecommendationDecision?.top_recommendation?.crop.name) {
      const topCrop = analysis.cropRecommendationDecision.top_recommendation.crop.name;
      return [`Why was ${topCrop} recommended?`, ...base];
    }

    return base;
  })();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Handle initialQuery if passed (from floating bar)
  useEffect(() => {
    if (isOpen && currentUser && initialQuery && !initialSentRef.current) {
      initialSentRef.current = true;
      handleSendMessage(initialQuery);
    }
  }, [isOpen, currentUser, initialQuery]);

  // Lock body scroll and listen for Escape key when open as modal
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    if (!currentUser) {
      onSignInClick?.();
      return;
    }

    const userMsg: AssistantChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    const contextForTurn = buildGeminiContext({
      analysis: analysis || null,
      userProfile: userProfile || null,
      activeFarm,
      history: historyDocs,
      userQuery: query,
      isHistoricalView: isHistorical,
    });

    try {
      const authToken = await currentUser.getIdToken();
      const response = await sendChatMessageToGemini(
        query,
        contextForTurn,
        [...messages, userMsg],
        authToken
      );

      const botMsg: AssistantChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('[AI Assistant Client Error]:', err);
      const errorMsg: AssistantChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        text: 'The SoilWise assistant is temporarily unavailable. Your farm analysis and recommendation are still available.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Farm Context Indicator string
  const contextIndicator = (() => {
    if (!analysis) return 'Context: General Agricultural Guidance';
    const lga = analysis.selectedLga || analysis.location?.lga;
    const state = analysis.selectedState || analysis.location?.state;
    if (lga && state) return `Context: Farm Analysis for ${lga}, ${state}`;
    if (state) return `Context: Farm Analysis for ${state}`;
    return 'Context: Active Farm Analysis';
  })();

  // 1. Unauthenticated View: Friendly authentication required prompt (Section 1)
  const unauthenticatedContent = (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <div>
          <h2 className="text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#1b4332]" />
            <span>SoilWise AI Agronomist</span>
          </h2>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            {contextIndicator}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Authentication Card */}
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-stone-50 rounded-2xl border border-stone-200/90 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 text-[#1b4332] border border-emerald-200 flex items-center justify-center shadow-xs">
          <Lock className="w-7 h-7 text-emerald-800" />
        </div>

        <div className="space-y-1.5 max-w-md">
          <h3 className="text-lg font-bold text-stone-900">
            Sign in to consult the SoilWise AI Assistant
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            The AI Agronomist provides interactive answers grounded in your specific soil tests, rainfall outlook, and recommended crop varieties. Sign in to your account to start the consultation.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
          <button
            onClick={() => {
              onClose?.();
              onSignInClick?.();
            }}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <span>Sign In to Continue</span>
            <ArrowRight className="w-4 h-4 text-emerald-300" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs text-stone-600 hover:text-stone-900 rounded-xl transition-colors cursor-pointer font-medium"
            >
              Cancel
            </button>
          )}
        </div>

        <p className="text-[11px] text-stone-400 pt-3">
          Your farm recommendations and soil analysis remain accessible without signing in.
        </p>
      </div>
    </div>
  );

  // 2. Authenticated View: Simplified, clean chat modal (Section 2)
  const authenticatedContent = (
    <div className="flex flex-col h-full min-h-[460px] max-h-[82vh] sm:max-h-[80vh]">
      {/* Header (Section 2) */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>SoilWise AI Agronomist</span>
            </h2>
            {isHistorical && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                Archived Record
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            {contextIndicator}
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Conversation Area (Scrollable Message Stream) */}
      <div className="flex-1 overflow-y-auto py-4 px-1 space-y-3.5 overscroll-contain">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
                  isUser
                    ? 'bg-[#1b4332] text-white'
                    : 'bg-[#f0f5ee] text-[#1b4332] border border-[#1b4332]/20'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[82%] rounded-2xl px-4 py-2.5 shadow-2xs ${
                  isUser
                    ? 'bg-[#1b4332] text-white rounded-tr-xs'
                    : 'bg-stone-50/90 text-stone-900 border border-stone-200/90 rounded-tl-xs'
                }`}
              >
                {isUser ? (
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>
                ) : (
                  <FormattedAssistantText text={m.text} />
                )}
                <span
                  className={`block text-[10px] mt-1 text-right font-mono ${
                    isUser ? 'text-emerald-200/80' : 'text-stone-400'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2.5 text-stone-500 text-xs py-1">
            <div className="w-7 h-7 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center border border-[#1b4332]/20 shrink-0">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl px-4 py-2 text-xs text-stone-600 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-[#1b4332] animate-spin" />
              <span>Consulting SoilWise agricultural intelligence...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick-Prompt Suggestions (Section 2) */}
      <div className="py-2 border-t border-stone-100 shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mb-1.5 px-0.5">
          <Sparkles className="w-3 h-3 text-[#1b4332]" />
          <span>Quick questions:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => handleSendMessage(q)}
              disabled={isTyping}
              className="px-2.5 py-1 text-[11px] bg-stone-100 hover:bg-[#f0f5ee] hover:text-[#1b4332] text-stone-700 rounded-lg border border-stone-200/80 transition-colors text-left disabled:opacity-50 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area (Fixed at bottom) */}
      <div className="pt-2 border-t border-stone-200 shrink-0">
        <div className="flex items-center gap-2 bg-stone-50 border border-stone-300 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-[#1b4332] focus-within:border-transparent transition-all">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="Ask about fertilizer ratio, planting dates, soil nutrients..."
            aria-label="Ask SoilWise AI a question about your farm"
            disabled={isTyping}
            className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-transparent focus:outline-none text-stone-900 placeholder:text-stone-400"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isTyping || !inputText.trim()}
            className="p-2.5 bg-[#1b4332] hover:bg-[#143225] text-white rounded-xl transition-all disabled:opacity-40 cursor-pointer active:scale-95 shrink-0"
            title={t('assistant.send')}
            aria-label={t('assistant.send')}
          >
            {isTyping ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Small collapsed footnote disclaimer */}
        <div className="flex items-center justify-between text-[10px] text-stone-400 px-1 pt-2">
          <span>Advisory recommendations are evidence-grounded. Consult certified agronomists for field verification.</span>
          {onRequestConsultation && (
            <button
              onClick={onRequestConsultation}
              className="text-[#1b4332] font-bold hover:underline shrink-0 ml-2 cursor-pointer"
            >
              Field Consultation
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const activeContent = currentUser ? authenticatedContent : unauthenticatedContent;

  // Render modal
  if (onClose) {
    return (
      <div 
        className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="SoilWise AI Agronomist"
          className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-stone-200 my-auto overflow-hidden"
        >
          {activeContent}
        </div>
      </div>
    );
  }

  // Fallback inline container
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200/80 shadow-xs">
      {activeContent}
    </div>
  );
};
