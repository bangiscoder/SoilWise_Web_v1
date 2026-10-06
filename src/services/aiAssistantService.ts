/**
 * SoilWise AI Client Assistant Service (Stage 4)
 * 
 * Secure client-side bridge to the server-side Gemini endpoint (/api/ai/chat).
 * Ensures zero client-side credentials or secrets.
 * Provides fallback handling without fabricating fake data.
 */

import { SoilWiseGeminiContext } from './geminiContextService';

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface SendAiMessageResult {
  success: boolean;
  reply: string;
  modelUsed?: string;
  debugContext?: Record<string, any>;
  error?: string;
}

/**
 * Sends a user query to the server-side Gemini endpoint with grounded context.
 */
export async function sendChatMessageToGemini(
  userQuery: string,
  context: SoilWiseGeminiContext,
  history: AssistantChatMessage[] = [],
  authToken?: string
): Promise<SendAiMessageResult> {
  try {
    const formattedHistory = history.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userQuery,
        context,
        history: formattedHistory,
        userId: (context as any)?.userProfile?.uid || (context as any)?.user?.uid,
      }),
    });

    if (!response.ok) {
      console.warn(`[AI Assistant] Server returned HTTP ${response.status}`);
      if (response.status === 401) {
        return {
          success: false,
          reply: 'Authentication required. Please sign in to consult the SoilWise AI Assistant.',
          error: 'Authentication required',
        };
      }
      return {
        success: false,
        reply:
          'The SoilWise assistant is temporarily unavailable. Your farm analysis and recommendation are still available.',
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: data.success ?? true,
      reply:
        data.reply ||
        'The SoilWise assistant is temporarily unavailable. Your farm analysis and recommendation are still available.',
      modelUsed: data.modelUsed,
      debugContext: data.debugContext,
      error: data.error,
    };
  } catch (err: any) {
    console.warn('[AI Assistant] Network error calling Gemini endpoint:', err);
    return {
      success: false,
      reply:
        'The SoilWise assistant is temporarily unavailable. Your farm analysis and recommendation are still available.',
      error: err?.message || 'Network error',
    };
  }
}
