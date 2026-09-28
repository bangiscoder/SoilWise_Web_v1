import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  AlertCircle,
  X
} from 'lucide-react';
import { FarmAnalysisResult } from '../types/soilwise';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface SoilwiseAiAssistantProps {
  analysis: FarmAnalysisResult;
  isOpen?: boolean;
  onClose?: () => void;
  onRequestConsultation?: () => void;
}

// Architectural flag ensuring no external model or API is queried during MVP validation
export const AI_ASSISTANT_MODE: 'mock' | 'gemini' = 'mock';

const SUGGESTED_QUESTIONS = [
  'What does my soil pH mean?',
  'What does the rainfall outlook mean?',
  'What should I discuss with an agronomist?',
  'What information should I collect before choosing a seed variety?',
];

export const SoilwiseAiAssistant: React.FC<SoilwiseAiAssistantProps> = ({
  analysis,
  isOpen = true,
  onClose,
  onRequestConsultation,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: "Hello! I'm your SoilWise AI Assistant. Here you can chat with your tailored AI Assistant for more information on any question you may have.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  if (!isOpen) return null;

  /**
   * Prepares the full agricultural analysis context for the assistant architecture.
   * Ready for future live model activation without sending data externally in the MVP.
   */
  const preparedFarmContext = {
    analysisDate: analysis.analysisDate,
    latitude: analysis.location.latitude,
    longitude: analysis.location.longitude,
    address: analysis.location.address?.fullAddress || '',
    nearestLandmark: analysis.location.landmark?.name || '',
    elevation: analysis.location.elevationMeters,
    soilPh: analysis.soilData.ph,
    nitrogen: analysis.soilData.nitrogen,
    phosphorus: analysis.soilData.phosphorus,
    potassium: analysis.soilData.potassium,
    ec: analysis.soilData.ec,
    clayPercent: analysis.soilTexture.clayPercent,
    sandPercent: analysis.soilTexture.sandPercent,
    siltPercent: analysis.soilTexture.siltPercent,
    texturalClass: analysis.soilTexture.texturalClass,
    rainfallOutlook: analysis.rainfallOutlook.seasonalOutlook,
    expectedOnset: analysis.rainfallOutlook.expectedOnset,
    expectedCessation: analysis.rainfallOutlook.expectedCessation,
    seasonDuration: analysis.rainfallOutlook.estimatedSeasonDurationDays,
    remainingDays: analysis.rainfallOutlook.estimatedRemainingDaysText,
    approximatePeakPeriod: analysis.rainfallOutlook.approximatePeakPeriod,
    onsetStatus: analysis.rainfallOutlook.rainfallOnsetStatus,
    meanAnnualTemp: analysis.environmentalInfo.meanAnnualTemperatureC,
    annualRainfall: analysis.environmentalInfo.annualPrecipitationMm,
    climateZone: analysis.environmentalInfo.climateZone,
  };

  const generateMockResponse = (userQuery: string): string => {
    const q = userQuery.toLowerCase();

    if (q.includes('ph')) {
      const ph = preparedFarmContext.soilPh;
      const phClass = ph < 5.5 ? 'strongly acidic' : ph < 6.5 ? 'moderately acidic' : ph <= 7.5 ? 'near-neutral' : 'alkaline';
      return `[Prototype Response] According to your farm data, your soil pH is ${ph.toFixed(1)} (${phClass}). In general agronomy, pH influences how easily plants take up primary nutrients (N, P, K). For specific crop requirements or liming advice, please consult a certified agronomist.`;
    }

    if (q.includes('rainfall') || q.includes('rain') || q.includes('onset') || q.includes('cessation')) {
      return `[Prototype Response] Based on the model-based rainfall outlook for your farm (${preparedFarmContext.latitude.toFixed(4)}°, ${preparedFarmContext.longitude.toFixed(4)}°):\n• Expected Onset: ${preparedFarmContext.expectedOnset || 'Not determined'}\n• Expected Cessation: ${preparedFarmContext.expectedCessation || 'Not determined'}\n• Estimated Season Duration: ${preparedFarmContext.seasonDuration ? `${preparedFarmContext.seasonDuration} days` : 'Not determined'}\n• Remaining Days: ${preparedFarmContext.remainingDays}\n• Peak Period: ${preparedFarmContext.approximatePeakPeriod}`;
    }

    if (q.includes('agronomist') || q.includes('discuss')) {
      return `[Prototype Response] Recommended topics to discuss with a certified agronomist based on your farm profile:\n1. Your soil pH (${preparedFarmContext.soilPh.toFixed(1)}) and nutrient levels (N: ${preparedFarmContext.nitrogen} mg/kg, P: ${preparedFarmContext.phosphorus} mg/kg, K: ${preparedFarmContext.potassium} mg/kg)\n2. Your soil texture (${preparedFarmContext.texturalClass || 'ISRIC model'} - Sand: ${preparedFarmContext.sandPercent ?? 'N/A'}%, Clay: ${preparedFarmContext.clayPercent ?? 'N/A'}%)\n3. Appropriate planting dates aligned with your expected rainfall onset (${preparedFarmContext.expectedOnset || 'onset window'})\n4. Certified drought-tolerant seed varieties suited for your ${preparedFarmContext.seasonDuration ?? '120-150'}-day season.`;
    }

    if (q.includes('seed') || q.includes('variety')) {
      return `[Prototype Response] Before choosing a seed variety, verify:\n• Your estimated rainy season duration (~${preparedFarmContext.seasonDuration ?? '120-150'} days)\n• Soil drainage & texture (${preparedFarmContext.texturalClass || 'soil texture'})\n• Certified seed availability from registered local seed producers\n• Pest and disease pressure history on your land.\n\nNote: SoilWise AI does not generate automated seed prescriptions in this MVP without certified institutional data.`;
    }

    if (q.includes('nimet') || q.includes('climate report')) {
      return `[Prototype Response] Official NiMet seasonal forecasts are published independently by the Nigerian Meteorological Agency. SoilWise AI distinguishes open climate models (Open-Meteo) from official NiMet information and does not invent NiMet predictions.`;
    }

    if (q.includes('fertilizer') || q.includes('fertiliser') || q.includes('crop')) {
      return `[Prototype Response] SoilWise AI does not provide automated fertiliser application rates or commercial crop endorsements in this MVP. Your recorded soil values (N: ${preparedFarmContext.nitrogen}, P: ${preparedFarmContext.phosphorus}, K: ${preparedFarmContext.potassium}, EC: ${preparedFarmContext.ec}) can be reviewed with a qualified agronomist through the consultation option below.`;
    }

    return `[Prototype Response] I can help you explore the data in this farm analysis profile (such as soil pH ${preparedFarmContext.soilPh.toFixed(1)}, rainfall onset/cessation, and soil texture). What specific measurement from your report would you like to review?`;
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate realistic typing delay without calling external API
    setTimeout(() => {
      const replyText = generateMockResponse(query);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 450);
  };

  const content = (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1b4332]">
              SoilWise AI Assistant
            </span>
            <span className="text-stone-300">&bull;</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              AI Assistant Preview &mdash; Prototype
            </span>
          </div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight mt-1">
            SoilWise Assistant
          </h2>
          <p className="text-xs text-stone-600 mt-0.5">
            Here you can chat with your tailored AI Assistant for more information on any question you may have.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Close Assistant"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Chat Container */}
      <div className="border border-stone-200 rounded-2xl overflow-hidden bg-stone-50/50 flex flex-col h-[400px]">
        {/* Messages Stream */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isUser
                      ? 'bg-[#1b4332] text-white'
                      : 'bg-[#f0f5ee] text-[#1b4332] border border-[#1b4332]/20'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`max-w-[84%] sm:max-w-[76%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                    isUser
                      ? 'bg-[#1b4332] text-white rounded-tr-xs'
                      : 'bg-white text-stone-800 border border-stone-200/80 rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <span
                    className={`block text-[10px] mt-1 text-right ${
                      isUser ? 'text-emerald-200' : 'text-stone-400'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-stone-500 text-xs py-1">
              <div className="w-7 h-7 rounded-lg bg-[#f0f5ee] text-[#1b4332] flex items-center justify-center border border-[#1b4332]/20">
                <Bot className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-500">
                Checking farm profile data...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions Pills */}
        <div className="p-3 bg-white border-t border-stone-200/80">
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mb-2">
            <Sparkles className="w-3 h-3 text-[#1b4332]" />
            <span>Suggested questions:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSendMessage(q)}
                disabled={isTyping}
                className="px-2.5 py-1 text-[11px] bg-stone-100 hover:bg-[#f0f5ee] hover:text-[#1b4332] text-stone-700 rounded-lg border border-stone-200 transition-colors text-left disabled:opacity-50 cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input & Send */}
        <div className="p-3 bg-white border-t border-stone-200 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder="Ask a question about your farm data..."
            disabled={isTyping}
            className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent text-stone-900"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isTyping || !inputText.trim()}
            className="p-2.5 bg-[#1b4332] hover:bg-[#143225] text-white rounded-xl transition-all disabled:opacity-40 cursor-pointer active:scale-95"
            title="Send question"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Prototype Disclaimer */}
      <div className="text-[11px] text-stone-500 flex items-start gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-stone-700">Prototype Assistant &mdash; Live AI integration coming in a future version: </strong>
          Information is displayed for interaction preview purposes and does not replace advice from a qualified agricultural professional.
        </p>
      </div>
    </div>
  );

  // If used as modal (when onClose is provided)
  if (onClose) {
    return (
      <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-stone-200 my-8">
          {content}
        </div>
      </div>
    );
  }

  // Fallback inline container
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200/80 shadow-xs">
      {content}
    </div>
  );
};
