/**
 * API utility functions for PimpMyCopy
 */
import { Model, FormState } from '../../types';
import { countWords } from '../../utils/markdownUtils';
import { MAX_TOKENS_PER_MODEL } from '../../constants';

// Store the last prompts for display in the prompt modal
let lastSystemPrompt = '';
let lastUserPrompt = '';

/**
 * Helper function to clean JSON responses that might be wrapped in markdown code blocks
 * This fixes issues with responses that come back as ```json { ... } ```
 */
export function cleanJsonResponse(text: string): string {
  // If the text is already valid JSON, return it as is
  try {
    JSON.parse(text);
    return text;
  } catch (e) {
    // If it's not valid JSON, try to extract JSON from markdown
  }

  // Check if response is wrapped in markdown code blocks
  const jsonCodeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
  const match = text.match(jsonCodeBlockRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Remove any trailing or leading backticks that might be present
  let cleanedText = text.replace(/^```|```$/g, '').trim();
  
  // If it starts with 'json', remove it
  if (cleanedText.startsWith('json')) {
    cleanedText = cleanedText.slice(4).trim();
  }
  
  return cleanedText;
}

/**
 * Handle API response and extract JSON data
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }
  
  const text = await response.text();
  const cleanedJson = cleanJsonResponse(text);
  
  try {
    return JSON.parse(cleanedJson);
  } catch (e) {
    console.error('Error parsing JSON response:', e);
    console.error('Response text:', text);
    console.error('Cleaned JSON:', cleanedJson);
    throw new Error(`Error parsing copy response: ${e}`);
  }
}

/**
 * Store system and user prompts for later display
 */
export function storePrompts(systemPrompt: string, userPrompt: string): void {
  lastSystemPrompt = systemPrompt;
  lastUserPrompt = userPrompt;
}

/**
 * Get the last prompts that were used
 */
export function getLastPrompts(): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: lastSystemPrompt,
    userPrompt: lastUserPrompt
  };
}

/**
 * Determine the API key and base URL based on the selected model
 */
export function getApiConfig(model: Model): { apiKey: string; baseUrl: string; headers: HeadersInit; maxTokens: number } {
  // Get API keys from environment variables
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  
  if (!openaiKey && !deepseekKey) {
    throw new Error('No API keys available. Please check your environment variables.');
  }
  
  // Get the max tokens for the selected model, defaulting to 4000 if not specified
  const maxTokens = MAX_TOKENS_PER_MODEL[model] || 4000;
  
  // Determine which API to use based on the model
  if (model === 'deepseek-chat') {
    if (!deepseekKey) {
      throw new Error('DeepSeek API key not available. Please check your environment variables.');
    }
    
    return {
      apiKey: deepseekKey,
      baseUrl: 'https://api.deepseek.com/v1',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekKey}`
      },
      maxTokens
    };
  } else {
    if (!openaiKey) {
      throw new Error('OpenAI API key not available. Please check your environment variables.');
    }
    
    return {
      apiKey: openaiKey,
      baseUrl: 'https://api.openai.com/v1',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      maxTokens
    };
  }
}

/**
 * Calculate token cost based on model
 */
export function calculateTokenCost(tokenCount: number, model: Model): number {
  // Updated pricing as of 2023 Q4
  switch (model) {
    case 'gpt-4o':
      return tokenCount * 0.000005; // $0.005 per 1K tokens (estimated)
    case 'gpt-4-turbo':
      return tokenCount * 0.000003; // $0.003 per 1K tokens
    case 'gpt-3.5-turbo':
      return tokenCount * 0.0000015; // $0.0015 per 1K tokens
    case 'deepseek-chat':
      return tokenCount * 0.0000025; // $0.0025 per 1K tokens (estimated)
    default:
      return tokenCount * 0.000003; // Default to gpt-4-turbo pricing
  }
}

/**
 * Calculate target word count based on form state
 */
export function calculateTargetWordCount(formState: FormState): number {
  // Calculate custom word count if selected
  let customWordCount = 0;
  let structureWordCount = 0;
  let presetWordCount = 150; // Default to medium length
  
  // Calculate custom word count if selected
  if (formState.wordCount === 'Custom' && formState.customWordCount) {
    customWordCount = formState.customWordCount;
  }
  
  // Calculate word count from preset ranges
  if (formState.wordCount.includes('Short')) {
    presetWordCount = 75; // Mid-point of 50-100
  } else if (formState.wordCount.includes('Medium')) {
    presetWordCount = 150; // Mid-point of 100-200
  } else if (formState.wordCount.includes('Long')) {
    presetWordCount = 300; // Mid-point of 200-400
  }
  
  // Calculate total from structure elements if they exist
  if (formState.outputStructure && formState.outputStructure.length > 0) {
    structureWordCount = formState.outputStructure.reduce((sum, element) => {
      return sum + (element.wordCount || 0);
    }, 0);
  }
  
  // Priority logic for determining target word count
  let targetWordCount = presetWordCount; // Start with preset as default
  
  // If we have both custom and structure counts
  if (customWordCount > 0 && structureWordCount > 0) {
    // Use the larger value when both are present
    targetWordCount = Math.max(customWordCount, structureWordCount);
  } 
  // If only custom count exists
  else if (customWordCount > 0) {
    targetWordCount = customWordCount;
  } 
  // If only structure counts exist
  else if (structureWordCount > 0) {
    targetWordCount = structureWordCount;
  }
  
  return targetWordCount;
}

/**
 * Extract the actual word count from content (string or structured)
 */
export function extractWordCount(content: any): number {
  // Handle empty content
  if (!content) return 0;
  
  // Extract text from structured content
  const textContent = typeof content === 'string' 
    ? content 
    : content.headline 
      ? `${content.headline}\n\n${content.sections.map((s: any) => 
          `${s.title}\n${s.content || (s.listItems || []).join('\n')}`
        ).join('\n\n')}`
      : JSON.stringify(content);
  
  // Count words
  return countWords(textContent);
}

/**
 * Generate error message with suggested fixes
 */
export function generateErrorMessage(error: any): string {
  let message = 'An error occurred while processing your request.';
  
  if (error instanceof Error) {
    message = error.message;
    
    // Handle specific error cases
    if (message.includes('429')) {
      message = 'Rate limit exceeded. Please try again in a moment.';
    } else if (message.includes('401') || message.includes('403')) {
      message = 'Authentication error. Please check your API keys in the .env file.';
    } else if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      message = 'The AI service is currently experiencing issues. Please try again later.';
    } else if (message.includes('timeout')) {
      message = 'The request timed out. Please try again or use a different model.';
    }
  }
  
  return message;
}