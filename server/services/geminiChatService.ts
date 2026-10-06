/**
 * Server-Side Gemini Chat Service for SoilWise AI (Stage 4)
 * 
 * Invokes Google GenAI with:
 * - Strict server-side API key isolation (no keys exposed to client)
 * - SoilWise agricultural grounding
 * - System instructions enforcing no hallucination and deterministic primacy
 * - Resilient retries and fallback for transient spikes
 */

import { GoogleGenAI } from '@google/genai';
import { SoilWiseGeminiContext, buildSoilWiseSystemInstruction, buildContextDebugSummary } from '../../src/services/geminiContextService.ts';

// Preferred primary model for rapid, structured Q&A
const PRIMARY_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-flash-latest';

let aiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI();
  }
  return aiInstance;
}

export interface ChatHistoryMessage {
  role: 'user' | 'assistant' | 'model';
  text: string;
}

export interface GeminiChatRequest {
  userQuery: string;
  context: SoilWiseGeminiContext;
  history?: ChatHistoryMessage[];
}

export interface GeminiChatResponse {
  success: boolean;
  reply: string;
  modelUsed?: string;
  debugContext?: Record<string, any>;
  error?: string;
}

/**
 * Executes chat inference with Gemini using the supplied context and history.
 */
export async function executeGeminiAgriculturalChat(
  request: GeminiChatRequest
): Promise<GeminiChatResponse> {
  const { userQuery, context, history = [] } = request;

  if (!userQuery || !userQuery.trim()) {
    return {
      success: false,
      reply: 'Please provide a valid question.',
      error: 'Empty query',
    };
  }

  const systemInstruction = buildSoilWiseSystemInstruction(context);
  const debugContext = buildContextDebugSummary(context);

  // Format contents for @google/genai
  // 1. Initial grounding context payload
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  // Grounding context block
  contents.push({
    role: 'user',
    parts: [
      {
        text: `SOILWISE STRUCTURED FARM CONTEXT:\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\nPlease acknowledge receipt of this farm context and be ready to answer farmer questions grounded strictly in these facts.`,
      },
    ],
  });

  contents.push({
    role: 'model',
    parts: [
      {
        text: 'Understood. I have received the SoilWise farm context and will provide practical, evidence-grounded agricultural explanations aligned with the deterministic decision engine without inventing soil, weather, or variety data.',
      },
    ],
  });

  // 2. Append prior conversation turns (limiting to last 8 turns to conserve tokens and prevent drift)
  const recentHistory = history.slice(-8);
  for (const msg of recentHistory) {
    const role = msg.role === 'assistant' ? 'model' : 'user';
    contents.push({
      role,
      parts: [{ text: msg.text }],
    });
  }

  // 3. Append current user query
  contents.push({
    role: 'user',
    parts: [{ text: userQuery }],
  });

  const ai = getGenAI();
  const modelsToTry = [PRIMARY_MODEL, 'gemini-3.1-flash-lite', FALLBACK_MODEL];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.25, // Controlled temperature for strict factual alignment
          maxOutputTokens: 1200,
        },
      });

      const reply = response.text?.trim();
      if (reply) {
        return {
          success: true,
          reply,
          modelUsed: model,
          debugContext,
        };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Assistant] Model ${model} failed (${err?.status || 'error'}):`, err?.message || err);
    }
  }

  console.error('[Gemini Assistant] All Gemini models failed:', lastError?.message || lastError);
  return {
    success: false,
    reply:
      'The SoilWise assistant is temporarily unavailable. Your farm analysis and recommendation are still available.',
    error: lastError?.message || 'Gemini service unavailable',
    debugContext,
  };
}
