/**
 * Headline generation functionality
 */
import { FormState, Model } from '../../types';
import { getApiConfig, handleApiResponse, storePrompts } from './utils';
import { trackTokenUsage } from './tokenTracking';

/**
 * Generate headline options for the content
 * @param content - The content to generate headlines for
 * @param formState - The form state with generation settings
 * @param numHeadlines - The number of headlines to generate
 * @param progressCallback - Optional callback for reporting progress
 * @returns An array of headline strings
 */
export async function generateHeadlines(
  content: any,
  formState: FormState,
  numHeadlines: number = 3,
  progressCallback?: (message: string) => void
): Promise<string[]> {
  // Extract text from structured content if needed
  const contentText = typeof content === 'string' 
    ? content 
    : content.headline 
      ? `${content.headline}\n\n${content.sections.map((s: any) => 
          `${s.title}\n${s.content || (s.listItems || []).join('\n')}`
        ).join('\n\n')}`
      : JSON.stringify(content);
  
  // Get API configuration
  const { apiKey, baseUrl, headers, maxTokens } = getApiConfig(formState.model);
  
  // Progress reporting if callback provided
  if (progressCallback) {
    progressCallback(`Generating ${numHeadlines} headline options...`);
  }
  
  // Build the system prompt
  const systemPrompt = `You are an expert copywriter who specializes in creating compelling headlines.
  Create ${numHeadlines} different headline options for the content provided.
  Each headline should be unique in approach and appeal to the specified target audience.
  Focus on being attention-grabbing, clear, and aligned with the tone and key message.
  
  Your headlines should be:
  - Compelling and engaging
  - Aligned with the ${formState.tone} tone
  - Clear and concise
  - Focused on benefits or addressing pain points
  - Between 5-12 words each (ideal length)`;
  
  // Build the user prompt
  const userPrompt = `Create ${numHeadlines} different headline options for this content:

"""
${contentText}
"""

Additional context:
- Target audience: ${formState.targetAudience || 'Not specified'}
- Key message: ${formState.keyMessage || 'Not specified'}
- Tone: ${formState.tone}
- Language: ${formState.language}
${formState.keywords ? `- Keywords to consider: ${formState.keywords}` : ''}
${formState.brandValues ? `- Brand values: ${formState.brandValues}` : ''}

Respond with a JSON array of ${numHeadlines} headline strings:
[
  "Headline 1",
  "Headline 2",
  "Headline 3"
]

Make each headline distinct in approach and style. Focus on being attention-grabbing while maintaining clarity.`;

  // Store the prompts for display in the UI
  storePrompts(systemPrompt, userPrompt);
  
  // Prepare the API request
  const requestBody = {
    model: formState.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 1.0, // Higher temperature for more creative variation
    max_tokens: maxTokens / 4, // Use a quarter of the dynamic token limit - headlines don't need many tokens
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
    
    // Extract token usage
    const tokenUsage = data.usage?.total_tokens || 0;
    
    // Track token usage
    await trackTokenUsage(
      undefined, // Skip user tracking for headline generation
      tokenUsage,
      formState.model,
      'generate_headlines',
      formState.briefDescription || 'Generate headline options'
    );
    
    // Extract the content from the response
    const responseContent = data.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No content in response');
    }
    
    // Parse the JSON content
    const parsedResponse = JSON.parse(responseContent);
    
    // Handle different response formats
    let headlines: string[];
    
    if (Array.isArray(parsedResponse)) {
      // Direct array format
      headlines = parsedResponse;
    } else if (parsedResponse && typeof parsedResponse === 'object' && Array.isArray(parsedResponse.headlines)) {
      // Object format with headlines property
      headlines = parsedResponse.headlines;
    } else {
      // Unexpected format
      console.error('Unexpected response format:', responseContent);
      return Array(numHeadlines).fill(0).map((_, i) => `Headline Option ${i + 1}`);
    }
    
    // Ensure all items are strings
    headlines = headlines.filter(h => typeof h === 'string' && h.trim().length > 0);
    
    // Make sure we have the requested number of headlines
    while (headlines.length < numHeadlines) {
      headlines.push(`Additional Headline Option ${headlines.length + 1}`);
    }
    
    // Truncate if we got more than requested
    if (headlines.length > numHeadlines) {
      headlines.length = numHeadlines;
    }
    
    if (progressCallback) {
      progressCallback(`Generated ${headlines.length} headline options`);
    }
    
    return headlines;
  } catch (error) {
    console.error('Error generating headlines:', error);
    if (progressCallback) {
      progressCallback(`Error generating headlines: ${error.message}`);
    }
    
    // Return fallback headlines in case of error
    return Array(numHeadlines).fill(0).map((_, i) => `Headline Option ${i + 1}`);
  }
}