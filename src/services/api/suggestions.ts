/**
 * Suggestions functionality for form fields
 */
import { Model } from '../../types';
import { getApiConfig, handleApiResponse } from './utils';

/**
 * Get AI-generated suggestions for a specific field
 * @param text - The context text (business description or original copy)
 * @param fieldType - The type of field to generate suggestions for
 * @param model - The AI model to use
 * @param language - The language to generate suggestions in
 * @param progressCallback - Optional callback for reporting progress
 * @returns An array of suggestions
 */
export async function getSuggestions(
  text: string,
  fieldType: string,
  model: Model,
  language: string = 'English',
  progressCallback?: (message: string) => void
): Promise<string[]> {
  if (!text || !fieldType) {
    throw new Error('Text and field type are required');
  }
  
  // Get API configuration
  const { apiKey, baseUrl, headers, maxTokens } = getApiConfig(model);
  
  // Progress reporting if callback provided
  if (progressCallback) {
    progressCallback(`Generating suggestions for ${fieldType}...`);
  }
  
  // Define field-specific instructions
  let fieldInstructions = '';
  
  switch (fieldType) {
    case 'keyMessage':
      fieldInstructions = `key messages that summarize the main point or value proposition`;
      break;
    case 'targetAudience':
      fieldInstructions = `target audience descriptions focusing on demographics, interests, and needs`;
      break;
    case 'callToAction':
      fieldInstructions = `effective calls to action that would motivate the user's target audience to take the next step`;
      break;
    case 'desiredEmotion':
      fieldInstructions = `emotional responses that the content should evoke in the audience`;
      break;
    case 'brandValues':
      fieldInstructions = `brand values that would align with this business`;
      break;
    case 'keywords':
      fieldInstructions = `SEO keywords and key phrases that would be relevant`;
      break;
    case 'context':
      fieldInstructions = `contextual information that would help create more effective copy`;
      break;
    case 'industryNiche':
      fieldInstructions = `specific industry niches that best match this business`;
      break;
    case 'readerFunnelStage':
      fieldInstructions = `appropriate marketing funnel stages for this content (awareness, consideration, decision, etc.)`;
      break;
    case 'preferredWritingStyle':
      fieldInstructions = `writing styles that would be most effective for this content`;
      break;
    case 'targetAudiencePainPoints':
      fieldInstructions = `specific pain points or challenges that the target audience likely faces`;
      break;
    case 'competitorCopyText':
      fieldInstructions = `suggestions for competitor copy examples that would be relevant to analyze`;
      break;
    default:
      fieldInstructions = `suggestions for the ${fieldType} field`;
  }
  
  // Build the system prompt
  const systemPrompt = `You are an expert marketing advisor helping to generate suggestions for a marketing copy project. 
  Provide practical, high-quality suggestions based on the context provided.`;
  
  // Build the user prompt
  const userPrompt = `Based on the following information, suggest 6-8 relevant ${fieldInstructions}. 
  The suggestions should be in ${language} language.
  
  Context:
  """
  ${text}
  """
  
  Format your response as a JSON array of strings like this:
  [
    "Suggestion 1",
    "Suggestion 2",
    "Suggestion 3"
  ]
  
  Keep each suggestion concise and focused. No need for explanations or additional commentary.`;
  
  // Prepare the API request
  const requestBody = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8,
    max_tokens: maxTokens / 4, // Use a quarter of the dynamic token limit - suggestions don't need many tokens
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
      usage?: { total_tokens: number }
    }>(response);
    
    // Extract the content from the response
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in response');
    }
    
    // Parse the JSON content
    const parsedResponse = JSON.parse(content);
    
    // Handle different response formats
    let suggestions: string[];
    
    if (Array.isArray(parsedResponse)) {
      // Direct array format
      suggestions = parsedResponse;
    } else if (parsedResponse && typeof parsedResponse === 'object') {
      // Object format - check for various response keys
      if (Array.isArray(parsedResponse.suggestions)) {
        suggestions = parsedResponse.suggestions;
      } else if (fieldType === 'readerFunnelStage' && Array.isArray(parsedResponse.marketing_funnel_stages)) {
        // Handle specific response format for reader funnel stage
        suggestions = parsedResponse.marketing_funnel_stages;
      } else {
        // Try to find any array in the response object
        const arrayValues = Object.values(parsedResponse).filter(value => Array.isArray(value));
        if (arrayValues.length > 0) {
          suggestions = arrayValues[0] as string[];
        } else {
          console.error('Unexpected response format:', content);
          return [];
        }
      }
    } else {
      console.error('Unexpected response format:', content);
      return [];
    }
    
    // Ensure all items are strings
    const validSuggestions = suggestions.filter(item => typeof item === 'string' && item.trim().length > 0);
    
    if (progressCallback) {
      progressCallback(`Generated ${validSuggestions.length} suggestions for ${fieldType}`);
    }
    
    return validSuggestions;
  } catch (error) {
    console.error('Error getting suggestions:', error);
    if (progressCallback) {
      progressCallback(`Error generating suggestions: ${error.message}`);
    }
    throw error;
  }
}