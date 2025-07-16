/**
 * Prompt evaluation functionality
 */
import { FormState, PromptEvaluation, User, Model } from '../../types'; // Removed ContentQualityScore
import { calculateTargetWordCount, getApiConfig, storePrompts, handleApiResponse } from './utils';
import { trackTokenUsage } from './tokenTracking';

/**
 * Evaluate the quality of a prompt
 * @param formData - The form data to evaluate
 * @param currentUser - The current user (for token tracking)
 * @param progressCallback - Optional callback for reporting progress
 * @returns A PromptEvaluation object with score and improvement tips
 */
export async function evaluatePrompt(
  formData: FormState,
  currentUser?: User,
  progressCallback?: (message: string) => void
): Promise<PromptEvaluation> {
  // Determine which text to evaluate based on the active tab
  const textToEvaluate = formData.tab === 'create' 
    ? formData.businessDescription 
    : formData.originalCopy;
  
  if (!textToEvaluate) {
    throw new Error('No text provided for evaluation');
  }
  
  // Get API configuration for the selected model
  const { apiKey, baseUrl, headers, maxTokens } = getApiConfig(formData.model);
  
  // Calculate target word count for the copy
  const targetWordCount = calculateTargetWordCount(formData);
  
  // Progress reporting if callback provided
  if (progressCallback) {
    progressCallback(`Evaluating input quality...`);
  }
  
  // Build the system prompt
  const systemPrompt = `You are an expert content evaluator who provides actionable feedback on text quality. 
  Analyze the provided content based on clarity, completeness, and relevance. 
  Focus specifically on helping improve the quality of the inputs for generating marketing copy.
  
  For ${formData.tab === 'create' ? 'business descriptions' : 'original copy'}, evaluate whether it provides enough context and detail
  to generate high-quality marketing copy with a target length of about ${targetWordCount} words.
  
  Provide a numerical score from 0-100 and specific tips for improvement.`;
  
  // Build the user prompt
  const userPrompt = `Please evaluate this ${formData.tab === 'create' ? 'business description' : 'original copy'} which will be used to generate ${formData.tab === 'create' ? 'new marketing copy' : 'improved marketing copy'}.

Content to evaluate:
"${textToEvaluate}"

Additional context:
- Tab: ${formData.tab}
- Target audience: ${formData.targetAudience || 'Not specified'}
- Key message: ${formData.keyMessage || 'Not specified'}
- Call to action: ${formData.callToAction || 'Not specified'}
- Language: ${formData.language}
- Tone: ${formData.tone}
- Word count target: ${targetWordCount} words

Respond with a JSON object containing:
1. score: A numerical assessment from 0-100
2. tips: An array of specific improvement suggestions (3-5 items)

The JSON should follow this structure:
{
  "score": 85,
  "tips": [
    "Add more details about X",
    "Clarify the target audience",
    "Include specific examples"
  ]
}`;

  // Store the prompts for display in the UI
  storePrompts(systemPrompt, userPrompt);
  
  // Prepare the API request
  const requestBody = {
    model: formData.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: maxTokens / 4, // Use a quarter of the dynamic token limit - evaluations don't need many tokens
    response_format: { type: "json_object" }
  };
  
  try {
    // Make the API request
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });
    
    // Parse the response
    const data = await handleApiResponse<{ 
      choices: { message: { content: string } }[]; 
      usage: { total_tokens: number }
    }>(response);
    
    // Extract the content from the response
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in response');
    }

    // Extract token usage from the response for tracking
    const tokenUsage = data.usage?.total_tokens || 0;
    
    // Track token usage
    await trackTokenUsage(
      currentUser,
      tokenUsage,
      formData.model,
      'evaluate_prompt',
      formData.briefDescription || 'Evaluate input quality'
    );
    
    // Parse the JSON content
    const parsedContent = JSON.parse(content);
    
    if (progressCallback) {
      progressCallback(`Input evaluation complete: ${parsedContent.score}/100`);
    }
    
    // Return the evaluation result
    return {
      score: parsedContent.score,
      tips: parsedContent.tips || []
    };
  } catch (error) {
    console.error('Error evaluating prompt:', error);
    
    if (progressCallback) {
      progressCallback(`Error evaluating input: ${error.message}`);
    }
    
    // Return a default error evaluation
    return {
      score: 0,
      tips: [
        'There was an error evaluating your input.',
        'Please check your API keys and internet connection.',
        'Try again or proceed with generating content.'
      ]
    }
  }
}