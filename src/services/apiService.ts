/**
 * API service main entry point
 * Re-exports all functionality from the api/ directory
 */

export * from './api/copyGeneration';
export * from './api/alternativeCopy';
export * from './api/humanizedCopy';
export * from './api/headlineGeneration';
export * from './api/promptEvaluation';
export * from './api/suggestions';
export * from './api/voiceStyles';
export * from './api/contentRefinement';

import { FormState, CopyResult, PromptEvaluation, Model, User } from '../types';
import { generateCopy as directGenerateCopy } from './api/copyGeneration';
import { evaluatePrompt as directEvaluatePrompt } from './api/promptEvaluation';
import { generateAlternativeCopy as directGenerateAlternativeCopy } from './api/alternativeCopy';
import { generateHeadlines as directGenerateHeadlines } from './api/headlineGeneration';
import { restyleCopyWithPersona as directRestyleCopyWithPersona } from './api/voiceStyles';
import { generateHumanizedCopy as directGenerateHumanizedCopy } from './api/humanizedCopy';

/**
 * Direct implementation functions without worker fallbacks
 */

export async function generateCopy(
  formState: FormState,
  currentUser?: User,
  sessionId?: string,
  progressCallback?: (message: string) => void
): Promise<CopyResult> {
  return directGenerateCopy(formState, currentUser, sessionId, progressCallback);
}

export async function evaluatePrompt(
  formState: FormState,
  currentUser?: User,
  progressCallback?: (message: string) => void
): Promise<PromptEvaluation> {
  return directEvaluatePrompt(formState, currentUser, progressCallback);
}

export async function generateAlternativeCopy(
  formState: FormState,
  improvedCopy: any,
  sessionId?: string,
  progressCallback?: (message: string) => void
): Promise<any> {
  return directGenerateAlternativeCopy(formState, improvedCopy, sessionId, progressCallback);
}

export async function generateHeadlines(
  content: any,
  formState: FormState,
  numHeadlines: number = 3,
  progressCallback?: (message: string) => void
): Promise<string[]> {
  return directGenerateHeadlines(content, formState, numHeadlines, progressCallback);
}

export async function restyleCopyWithPersona(
  content: any,
  persona: string,
  model: Model,
  language: string = 'English',
  formState?: FormState,
  targetWordCount?: number,
  progressCallback?: (message: string) => void,
  numHeadlines?: number
): Promise<{ content: any; personaUsed: string }> {
  return directRestyleCopyWithPersona(
    content, 
    persona, 
    model, 
    language, 
    formState, 
    targetWordCount, 
    progressCallback,
    numHeadlines
  );
}

export async function generateHumanizedCopy(
  content: any,
  formState: FormState,
  progressCallback?: (message: string) => void
): Promise<any> {
  return directGenerateHumanizedCopy(content, formState, progressCallback);
}

export * from './api/utils';
export * from './api/contentScoring';