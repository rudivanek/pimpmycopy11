// Web Worker for handling AI generation tasks
// This worker runs in a separate thread to prevent browser throttling when tab is inactive

// Import necessary types and API functions
import { getApiConfig, calculateTargetWordCount } from '../services/api/utils';
import { 
  generateCopy,
  evaluatePrompt,
  generateAlternativeCopy,
  generateHeadlines,
  restyleCopyWithPersona,
  generateHumanizedCopy
} from '../services/api';

// Environment variables will be set by the main thread
let OPENAI_API_KEY: string | null = null;
let DEEPSEEK_API_KEY: string | null = null;
let SUPABASE_URL: string | null = null;
let SUPABASE_ANON_KEY: string | null = null;

// Utility functions
function reportProgress(taskId: string, message: string) {
  self.postMessage({ type: 'PROGRESS', taskId, message });
}

// Helper function to calculate target word count based on form state
function calculateTargetWordCount(formState: FormState): number {
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

// Handle messages from the main thread
self.onmessage = async (event) => {
  const { type, taskId, payload } = event.data;
  
  // Verify that we have the environment variables before proceeding
  if (type !== 'SET_ENV' && (!OPENAI_API_KEY && !DEEPSEEK_API_KEY)) {
    self.postMessage({
      type: 'ERROR',
      taskId,
      error: 'API keys are not configured. Please set up your environment variables.'
    });
    return;
  }

  // Set environment variables
  if (type === 'SET_ENV') {
    console.log('Setting environment variables in worker');
    OPENAI_API_KEY = event.data.openaiKey;
    DEEPSEEK_API_KEY = event.data.deepseekKey;
    SUPABASE_URL = event.data.supabaseUrl;
    SUPABASE_ANON_KEY = event.data.supabaseAnonKey;
    
    // Now that environment variables are set, signal that the worker is ready
    self.postMessage({ type: 'WORKER_READY' });
    return;
  }

  // Generate copy
  if (type === 'GENERATE_COPY') {
    try {
      reportProgress(taskId, 'Worker initialized, starting copy generation...');
      const { formState, sessionId } = payload;
      
      // Use the real API functions from the imported modules
      const result = await generateCopy(formState, undefined, sessionId, 
        (message) => reportProgress(taskId, message)
      );

      // Send result back to main thread
      self.postMessage({
        type: 'SUCCESS',
        taskId,
        result
      });
    } catch (error: any) {
      self.postMessage({
        type: 'ERROR',
        taskId,
        error: error.message
      });
    }
  }

  // Evaluate prompt
  if (type === 'EVALUATE_PROMPT') {
    try {
      const { formState } = payload;
      reportProgress(taskId, 'Worker initialized, starting prompt evaluation...');

      // Use the real API function
      const result = await evaluatePrompt(formState, undefined, 
        (message) => reportProgress(taskId, message)
      );

      // Send result back to main thread
      self.postMessage({
        type: 'SUCCESS',
        taskId,
        result
      });
    } catch (error: any) {
      self.postMessage({
        type: 'ERROR',
        taskId,
        error: error.message
      });
    }
  }

  // Generate alternative copy
  if (type === 'GENERATE_ALTERNATIVE') {
    try {
      reportProgress(taskId, 'Worker initialized, starting alternative copy generation...');
      const { formState, improvedCopy, sessionId } = payload;

      // Use the real API function
      const result = await generateAlternativeCopy(formState, improvedCopy, sessionId, 
        (message) => reportProgress(taskId, message)
      );

      // Send result back to main thread
      self.postMessage({
        type: 'SUCCESS',
        taskId,
        result
      });
    } catch (error: any) {
      self.postMessage({
        type: 'ERROR',
        taskId,
        error: error.message
      });
    }
  }

  // Generate headlines
  if (type === 'GENERATE_HEADLINES') {
    try {
      const { content, formState, numHeadlines } = payload;
      reportProgress(taskId, 'Worker initialized, starting headline generation...');

      // Use the real API function
      const result = await generateHeadlines(content, formState, numHeadlines, 
        (message) => reportProgress(taskId, message)
      );

      // Send result back to main thread
      self.postMessage({
        type: 'SUCCESS',
        taskId,
        result
      });
    } catch (error: any) {
      self.postMessage({
        type: 'ERROR',
        taskId,
        error: error.message
      });
    }
  }

  // Restyle copy with persona
  if (type === 'RESTYLE_COPY') {
    try {
      const { content, persona, model, language, formState, targetWordCount, numHeadlines } = payload;
      reportProgress(taskId, `Worker initialized, starting restyling with ${persona}'s voice...`);

      // Use the real API function
      const result = await restyleCopyWithPersona(
        content, 
        persona, 
        model, 
        language, 
        formState, 
        targetWordCount, 
        (message) => reportProgress(taskId, message),
        numHeadlines
      );

      // Send result back to main thread
      self.postMessage({
        type: 'SUCCESS',
        taskId,
        result
      });
    } catch (error: any) {
      self.postMessage({
        type: 'ERROR',
        taskId,
        error: error.message
      });
    }
  }

  // Humanize copy
  if (type === 'HUMANIZE_COPY') {
    try {
      const { content, formState } = payload;
      reportProgress(taskId, 'Worker initialized, starting humanization process...');

      // Use the real API function
      const result = await generateHumanizedCopy(content, formState, 
        (message) => reportProgress(taskId, message)
      );

      // Send result back to main thread
      self.postMessage({
        type: 'SUCCESS',
        taskId,
        result
      });
    } catch (error: any) {
      self.postMessage({
        type: 'ERROR',
        taskId,
        error: error.message
      });
    }
  }
};