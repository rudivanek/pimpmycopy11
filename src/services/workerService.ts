/**
 * Service for managing Web Workers for background processing
 */
import { v4 as uuidv4 } from 'uuid';
import { FormState, CopyResult, PromptEvaluation, Model, User } from '../types';
import { trackTokenUsage } from './api/tokenTracking';
import { storePrompts } from './api/utils';
import { saveCopySession } from './supabaseClient';

// Create a map to store task callbacks
const taskCallbacks = new Map<string, {
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  progressCallback?: (message: string) => void;
}>();

// Create a worker instance
let worker: Worker | null = null;
let isWorkerReady = false;
let isWorkerInitializing = false;

// Initialize worker
function initWorker() {
  // Return early if worker already exists or is being initialized
  if (worker !== null || isWorkerInitializing) return;
  
  isWorkerInitializing = true;

  try {
    // Create a new worker
    worker = new Worker(new URL('../workers/generationWorker.ts', import.meta.url), {
      type: 'module'
    });

    // Immediately pass environment variables to the worker
    worker.postMessage({
      type: 'SET_ENV',
      openaiKey: import.meta.env.VITE_OPENAI_API_KEY,
      deepseekKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
    });

    // Listen for messages from worker
    worker.onmessage = (event) => {
      const { type, taskId, message, result, error, tokenUsage } = event.data;

      // Worker is ready
      if (type === 'WORKER_READY') {
        isWorkerReady = true;
        console.log('Web worker is ready for AI generation tasks');
        return;
      }

      // Progress update
      if (type === 'PROGRESS') {
        const callbacks = taskCallbacks.get(taskId);
        if (callbacks?.progressCallback) {
          callbacks.progressCallback(message);
        }
        return;
      }

      // Success response
      if (type === 'SUCCESS') {
        const callbacks = taskCallbacks.get(taskId);
        if (callbacks) {
          // Track token usage if provided
          if (tokenUsage) {
            trackTokenUsage(
              undefined,
              tokenUsage.tokenUsage,
              tokenUsage.model,
              tokenUsage.controlExecuted,
              tokenUsage.briefDescription
            ).catch(err => console.error('Error tracking token usage:', err));
          }

          callbacks.resolve(result);
          taskCallbacks.delete(taskId);
        }
        return;
      }

      // Error response
      if (type === 'ERROR') {
        const callbacks = taskCallbacks.get(taskId);
        if (callbacks) {
          callbacks.reject(new Error(error));
          taskCallbacks.delete(taskId);
        }
        return;
      }
    };

    // Handle worker errors
    worker.onerror = (error) => {
      console.error('Web worker error:', error);
      
      // Reject all pending tasks
      for (const [taskId, callbacks] of taskCallbacks.entries()) {
        callbacks.reject(new Error('Worker error: ' + error.message));
        taskCallbacks.delete(taskId);
      }
      
      // Reset worker
      worker = null;
      isWorkerInitializing = false;
      isWorkerReady = false;
    };

  } catch (error) {
    console.error('Failed to initialize web worker:', error);
    isWorkerInitializing = false;
    throw new Error('Failed to initialize web worker. This browser may not support Web Workers.');
  }
}

// ========================
// Worker-based API Functions
// ========================

/**
 * Generate copy using a web worker
 */
export async function workerGenerateCopy(
  formState: FormState,
  currentUser?: User,
  sessionId?: string,
  progressCallback?: (message: string) => void
): Promise<CopyResult> {
  // Ensure worker is initialized
  initWorker();
  
  if (!worker || !isWorkerReady) {
    throw new Error('Web worker is not available. Your browser may not support this feature.');
  }
  
  // Create a unique ID for this task
  const taskId = uuidv4();
  
  // Create a promise that will be resolved when the worker completes
  const taskPromise = new Promise<CopyResult>((resolve, reject) => {
    // Store callbacks for this task
    taskCallbacks.set(taskId, {
      resolve,
      reject,
      progressCallback
    });
    
    // Send message to worker
    worker?.postMessage({
      type: 'GENERATE_COPY',
      taskId,
      payload: {
        formState,
        sessionId
      }
    });
  });
  
  // Wait for worker to complete
  const result = await taskPromise;
  
  // Handle session saving (needs to be done on main thread)
  if (sessionId) {
    try {
      await saveCopySession(formState, result.improvedCopy, undefined, sessionId);
    } catch (err) {
      console.error('Error updating copy session:', err);
      // Continue even if save fails
    }
  } else if (currentUser) {
    // Create a new session if user is logged in
    try {
      const { data: sessionData, error: sessionError } = await saveCopySession(
        formState,
        result.improvedCopy
      );
      
      if (sessionError) {
        console.error('Error saving new copy session:', sessionError);
      } else {
        console.log('New copy session created:', sessionData?.id);
        result.sessionId = sessionData?.id;
      }
    } catch (err) {
      console.error('Error creating new copy session:', err);
      // Continue even if save fails
    }
  }
  
  return result;
}

/**
 * Evaluate prompt using a web worker
 */
export async function workerEvaluatePrompt(
  formState: FormState,
  currentUser?: User,
  progressCallback?: (message: string) => void
): Promise<PromptEvaluation> {
  // Ensure worker is initialized
  initWorker();
  
  if (!worker || !isWorkerReady) {
    throw new Error('Web worker is not available. Your browser may not support this feature.');
  }
  
  // Create a unique ID for this task
  const taskId = uuidv4();
  
  // Create a promise that will be resolved when the worker completes
  const taskPromise = new Promise<PromptEvaluation>((resolve, reject) => {
    // Store callbacks for this task
    taskCallbacks.set(taskId, {
      resolve,
      reject,
      progressCallback
    });
    
    // Send message to worker
    worker?.postMessage({
      type: 'EVALUATE_PROMPT',
      taskId,
      payload: {
        formState
      }
    });
  });
  
  return taskPromise;
}

/**
 * Generate alternative copy using a web worker
 */
export async function workerGenerateAlternativeCopy(
  formState: FormState,
  improvedCopy: any,
  sessionId?: string,
  progressCallback?: (message: string) => void
): Promise<any> {
  // Ensure worker is initialized
  initWorker();
  
  if (!worker || !isWorkerReady) {
    throw new Error('Web worker is not available. Your browser may not support this feature.');
  }
  
  // Create a unique ID for this task
  const taskId = uuidv4();
  
  // Create a promise that will be resolved when the worker completes
  const taskPromise = new Promise<any>((resolve, reject) => {
    // Store callbacks for this task
    taskCallbacks.set(taskId, {
      resolve,
      reject,
      progressCallback
    });
    
    // Send message to worker
    worker?.postMessage({
      type: 'GENERATE_ALTERNATIVE',
      taskId,
      payload: {
        formState,
        improvedCopy,
        sessionId
      }
    });
  });
  
  const result = await taskPromise;
  
  // Handle session saving (needs to be done on main thread)
  if (sessionId) {
    try {
      await saveCopySession(formState, improvedCopy, result, sessionId);
    } catch (err) {
      console.error('Error saving copy session:', err);
      // Continue even if save fails
    }
  }
  
  return result;
}

/**
 * Generate headlines using a web worker
 */
export async function workerGenerateHeadlines(
  content: any,
  formState: FormState,
  numHeadlines: number = 3,
  progressCallback?: (message: string) => void
): Promise<string[]> {
  // Ensure worker is initialized
  initWorker();
  
  if (!worker || !isWorkerReady) {
    throw new Error('Web worker is not available. Your browser may not support this feature.');
  }
  
  // Create a unique ID for this task
  const taskId = uuidv4();
  
  // Create a promise that will be resolved when the worker completes
  const taskPromise = new Promise<string[]>((resolve, reject) => {
    // Store callbacks for this task
    taskCallbacks.set(taskId, {
      resolve,
      reject,
      progressCallback
    });
    
    // Send message to worker
    worker?.postMessage({
      type: 'GENERATE_HEADLINES',
      taskId,
      payload: {
        content,
        formState,
        numHeadlines
      }
    });
  });
  
  return taskPromise;
}

/**
 * Restyle content with persona using a web worker
 */
export async function workerRestyleCopyWithPersona(
  content: any,
  persona: string,
  model: Model,
  language: string = 'English',
  formState?: FormState,
  targetWordCount?: number,
  progressCallback?: (message: string) => void,
  numHeadlines?: number
): Promise<{ content: any; personaUsed: string }> {
  // Ensure worker is initialized
  initWorker();
  
  if (!worker || !isWorkerReady) {
    throw new Error('Web worker is not available. Your browser may not support this feature.');
  }
  
  // Create a unique ID for this task
  const taskId = uuidv4();
  
  // Create a promise that will be resolved when the worker completes
  const taskPromise = new Promise<{ content: any; personaUsed: string }>((resolve, reject) => {
    // Store callbacks for this task
    taskCallbacks.set(taskId, {
      resolve,
      reject,
      progressCallback
    });
    
    // Send message to worker
    worker?.postMessage({
      type: 'RESTYLE_COPY',
      taskId,
      payload: {
        content,
        persona,
        model,
        language,
        formState,
        targetWordCount,
        numHeadlines
      }
    });
  });
  
  return taskPromise;
}

/**
 * Generate humanized copy using a web worker
 */
export async function workerGenerateHumanizedCopy(
  content: any,
  formState: FormState,
  progressCallback?: (message: string) => void
): Promise<any> {
  // Ensure worker is initialized
  initWorker();
  
  if (!worker || !isWorkerReady) {
    throw new Error('Web worker is not available. Your browser may not support this feature.');
  }
  
  // Create a unique ID for this task
  const taskId = uuidv4();
  
  // Create a promise that will be resolved when the worker completes
  const taskPromise = new Promise<any>((resolve, reject) => {
    // Store callbacks for this task
    taskCallbacks.set(taskId, {
      resolve,
      reject,
      progressCallback
    });
    
    // Send message to worker
    worker?.postMessage({
      type: 'HUMANIZE_COPY',
      taskId,
      payload: {
        content,
        formState
      }
    });
  });
  
  return taskPromise;
}

/**
 * Terminate the worker
 * This can be called when the component unmounts
 */
export function terminateWorker() {
  if (worker) {
    worker.terminate();
    console.log('Web worker terminated');
    worker = null;
    isWorkerInitializing = false;
    isWorkerReady = false;
  }
}

/**
 * Check if the worker is available
 */
export function isWorkerAvailable(): boolean {
  return !!worker && isWorkerReady;
}

// Handle any worker initialization errors by providing a fallback
export function handleWorkerError(error: any) {
  console.error('Worker error detected, terminating worker:', error);
  terminateWorker();
  return false;
}