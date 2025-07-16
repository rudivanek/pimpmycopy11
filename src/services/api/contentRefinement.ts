/**
 * Content refinement functionality for word count adherence
 */
import { FormState, Model } from '../../types';
import { getApiConfig, handleApiResponse, storePrompts, calculateTargetWordCount, extractWordCount, generateErrorMessage } from './utils';
import { trackTokenUsage } from './tokenTracking';

/**
 * Revise content to more closely match a target word count
 * @param content - The content to revise
 * @param targetWordCount - The target word count
 * @param formState - The form state with generation settings
 * @param progressCallback - Optional callback to report progress
 * @param persona - Optional persona to maintain voice style during revision
 * @returns The revised content with better word count adherence
 */
export async function reviseContentForWordCount(
  content: any,
  targetWordCount: number,
  formState: FormState,
  progressCallback?: (message: string) => void,
  persona?: string
): Promise<any> {
  // Extract text content if needed
  const textContent = typeof content === 'string' 
    ? content 
    : content.headline 
      ? `${content.headline}\n\n${content.sections.map((s: any) => 
          `${s.title}\n${s.content || (s.listItems || []).join('\n')}`
        ).join('\n\n')}`
      : JSON.stringify(content);
  
  // Count the actual words in the content
  const contentWords = textContent.trim().split(/\s+/).length;
  
  // Calculate the difference
  const wordDifference = contentWords - targetWordCount;
  const percentageDifference = Math.abs(wordDifference) / targetWordCount * 100;
  
  // If the difference is within acceptable range (±5%), return the original content
  // Use the user-defined tolerance or fall back to 5% if not set
  const tolerancePercentage = formState.wordCountTolerance !== undefined ? formState.wordCountTolerance : 5;
  if (Math.abs(percentageDifference) <= tolerancePercentage) {
    if (progressCallback) {
      progressCallback(`Content already within acceptable word count range (${contentWords} words)`);
    }
    return content;
  }
  
  try {
    // Get API configuration and validate it
    const { apiKey, baseUrl, headers, maxTokens } = getApiConfig(formState.model);
    
    // Validate API configuration before proceeding
    if (!apiKey) {
      throw new Error(`API key not available for model ${formState.model}`);
    }
    
    // Report progress if callback provided
    if (progressCallback) {
      progressCallback(`Revising content to match target word count of ${targetWordCount} words (currently ${contentWords} words)`);
    }
    
    // Determine if we should return structured format
    const useStructuredFormat = formState.outputStructure && formState.outputStructure.length > 0;
    const isStructuredContent = typeof content === 'object' && content.headline && Array.isArray(content.sections);
    
    // Build the system prompt
    let systemPrompt = `You are an expert copywriter who excels at precise word count management.
    Your task is to revise the provided content to match the target word count of ${targetWordCount} words EXACTLY.
    Maintain the tone, style, and key messaging while adjusting the length.
    
    ${wordDifference > 0 
      ? `The content is currently ${wordDifference} words (${percentageDifference.toFixed(1)}%) TOO LONG. Trim unnecessary details while preserving all key points.` 
      : `The content is currently ${Math.abs(wordDifference)} words (${percentageDifference.toFixed(1)}%) TOO SHORT. Add appropriate details, examples, or elaborations to reach the target length.`}
    
    The final word count must be ${targetWordCount} words (±2%).`;

    // Add JSON format requirement if structured output is expected
    if (useStructuredFormat || isStructuredContent) {
      systemPrompt += `\n\nYour response MUST be a valid JSON object.`;
    }

    // Add persona-specific instructions if a persona is provided
    if (persona) {
      systemPrompt += `\n\nIMPORTANT: This content is written in the voice style of ${persona}. 
      You MUST maintain ${persona}'s distinctive voice, tone, and writing style while adjusting the word count.
      ${persona}'s voice is a critical aspect that must be preserved throughout the revision.
      
      CRITICAL REMINDER: Many revision attempts fail to maintain both the target word count AND ${persona}'s voice.
      Your task is to achieve BOTH objectives. This means:
      1. Reaching EXACTLY ${targetWordCount} words
      2. Maintaining ${persona}'s distinctive voice and style
      
      If expanding, add content that sounds authentically like ${persona} would write it.`;
    }
    
    systemPrompt += `\n\nIMPORTANT: If expanding the content, do NOT add filler or repetitive content. Instead:
    1. Add specific examples or case studies
    2. Expand on benefits with more detail
    3. Add supporting evidence or statistics
    4. Elaborate on how the product/service solves specific problems
    5. Include additional relevant context that enhances understanding
    
    ABSOLUTELY CRITICAL: Count your words meticulously before submitting your response. The word count must be EXACTLY ${targetWordCount} words (±2%).`;
    
    // Build the user prompt
    let userPrompt = `Please revise this content to match EXACTLY ${targetWordCount} words:

"""
${textContent}
"""

Current word count: ${contentWords} words
Target word count: ${targetWordCount} words
Difference: ${wordDifference > 0 ? `${wordDifference} words too many` : `${Math.abs(wordDifference)} words too few`}

Guidelines:
- Maintain the ${formState.tone} tone
- Keep the same key messages and information
- ${wordDifference > 0 ? 'Remove unnecessary details or repetition without losing key points' : 'Add relevant details, examples, or elaborations that enhance the copy'}
- Ensure the content remains in ${formState.language} language
- Preserve the overall structure and flow`;

    // Add persona-specific instructions to user prompt if provided
    if (persona) {
      userPrompt += `\n- Maintain ${persona}'s distinctive voice and writing style throughout
- Ensure any added content sounds authentically like ${persona} would write it`;
    }

    userPrompt += `\n- Count your words meticulously to ensure you hit the target word count of EXACTLY ${targetWordCount} words`;
    
    if (useStructuredFormat || isStructuredContent) {
      userPrompt += `\n\nPlease structure your response in this JSON format:
{
  "headline": "Main headline goes here",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content paragraph(s)"
    },
    {
      "title": "Another section title",
      "listItems": ["First bullet point", "Second bullet point"]
    }
  ],
  "wordCountAccuracy": 95
}

Make sure to include a headline and appropriate sections with either paragraph content or list items.`;

      // If the original content was structured, try to preserve its structure
      if (isStructuredContent) {
        userPrompt += `\n\nPreserve the original structure which has these sections:\n`;
        content.sections.forEach((section: any, index: number) => {
          userPrompt += `${index + 1}. ${section.title}\n`;
        });
        
        // If we need to add words and have section word counts, suggest where to expand
        if (wordDifference < 0 && formState.outputStructure && formState.outputStructure.length > 0) {
          // Find sections with explicit word counts
          const sectionsWithWordCounts = formState.outputStructure
            .filter(section => section.wordCount && section.wordCount > 0)
            .map(section => section.label || section.value);
          
          if (sectionsWithWordCounts.length > 0) {
            userPrompt += `\n\nFocus on expanding these sections to meet their word count targets:\n`;
            sectionsWithWordCounts.forEach(sectionName => {
              userPrompt += `- ${sectionName}\n`;
            });
          }
        }
      }
    } else {
      userPrompt += `\n\nProvide your response as plain text with appropriate paragraphs and formatting.`;
    }

    if (formState.forceKeywordIntegration && formState.keywords) {
      userPrompt += `\n\nIMPORTANT: Make sure to naturally integrate all of these keywords throughout the copy: ${formState.keywords}`;
    }
    
    // Add specific emphasis on word count for personas
    if (persona) {
      userPrompt += `\n\nVERY IMPORTANT REMINDER: Your task has TWO equally critical requirements:
1. Match the target word count of EXACTLY ${targetWordCount} words
2. Maintain ${persona}'s distinctive voice and style

Many revision attempts fail on one of these requirements. You must succeed on BOTH.

DO NOT SUBMIT your response until you've verified:
- The word count is EXACTLY ${targetWordCount} words
- The content authentically sounds like ${persona}'s writing`;
    }
    
    // Store the prompts for display in the UI
    storePrompts(systemPrompt, userPrompt);
    
    // Prepare the API request
    const requestBody = {
      model: formState.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5, // Lower temperature for more precise word count adherence
      max_tokens: maxTokens, // Use dynamic token limit from API config
      response_format: useStructuredFormat || isStructuredContent ? { type: "json_object" } : undefined
    };
    
    // Make the API request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Parse the response
      const data = await handleApiResponse<{ 
        choices: { message: { content: string } }[];
        usage?: { total_tokens: number }
      }>(response);
      
      // Extract token usage
      const tokenUsage = data.usage?.total_tokens || 0;
      
      // Track token usage
      await trackTokenUsage(
        undefined, // Skip user tracking for refinement
        tokenUsage,
        formState.model,
        'revise_word_count',
        `Refine word count (target: ${targetWordCount})`
      );
      
      // Extract the content from the response
      let revisedContent = data.choices[0]?.message?.content;
      
      if (!revisedContent) {
        throw new Error('No content in response');
      }
      
      // Parse structured content if needed
      if (useStructuredFormat || isStructuredContent) {
        try {
          const parsedContent = JSON.parse(revisedContent);
          revisedContent = parsedContent;
        } catch (err) {
          console.warn('Error parsing structured content, returning as plain text:', err);
          // Keep as plain text if parsing fails
        }
      }
      
      // Verify the word count of the revised content
      const revisedWordCount = extractWordCount(revisedContent);
      const wordCountDifference = Math.abs(revisedWordCount - targetWordCount);
      const percentDifference = (wordCountDifference / targetWordCount) * 100;
      
      console.log(`Revised content word count: ${revisedWordCount} words (target: ${targetWordCount}, difference: ${wordCountDifference} words, ${percentDifference.toFixed(1)}%)`);
      
      if (progressCallback) {
        progressCallback(`Content revised to ${revisedWordCount} words (${Math.round(revisedWordCount/targetWordCount*100)}% of target)`);
      }
      
      // If still too short and strict adherence is required, try again with an even stronger directive
      if (formState.prioritizeWordCount && revisedWordCount < targetWordCount * 0.95) {
        if (progressCallback) {
          progressCallback(`Content still below target. Making second revision attempt...`);
        }
        
        // Try a second revision with an even stronger directive
        const secondRevisionContent = await performSecondRevision(
          revisedContent,
          targetWordCount,
          formState,
          progressCallback,
          persona
        );
        
        return secondRevisionContent;
      }
      
      return revisedContent;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error('Error revising content for word count:', error);
    
    // Generate a more specific error message
    const errorMessage = generateErrorMessage(error);
    
    if (progressCallback) {
      progressCallback(`Error revising content: ${errorMessage}. Using original content.`);
    }
    
    // If revision fails, return the original content
    return content;
  }
}

/**
 * Perform a second, more aggressive revision attempt when the first one fails to meet the word count
 */
async function performSecondRevision(
  content: any,
  targetWordCount: number,
  formState: FormState,
  progressCallback?: (message: string) => void,
  persona?: string
): Promise<any> {
  try {
    // Get API configuration and validate it
    const { apiKey, baseUrl, headers, maxTokens } = getApiConfig(formState.model);
    
    // Validate API configuration
    if (!apiKey) {
      throw new Error(`API key not available for model ${formState.model}`);
    }
    
    // Extract text content if needed
    const textContent = typeof content === 'string' 
      ? content 
      : content.headline 
        ? `${content.headline}\n\n${content.sections.map((s: any) => 
            `${s.title}\n${s.content || (s.listItems || []).join('\n')}`
          ).join('\n\n')}`
        : JSON.stringify(content);
    
    // Count the actual words in the content
    const contentWords = textContent.trim().split(/\s+/).length;
    const wordsMissing = targetWordCount - contentWords;
    const percentMissing = Math.round((wordsMissing / targetWordCount) * 100);
    
    // Determine if we should return structured format
    const isStructuredContent = typeof content === 'object' && content.headline && Array.isArray(content.sections);
    
    // Build an even stronger system prompt for the second attempt
    let systemPrompt = `You are an expert copywriter with a critical task to fix content that is too short.
    
    The content provided is ${wordsMissing} words (${percentMissing}%) short of the required ${targetWordCount} word target.
    
    Your ONLY task is to expand this content to EXACTLY ${targetWordCount} words by adding substantive, valuable content:
    
    1. Add specific examples, case studies, or scenarios that illustrate key points
    2. Expand explanations with more detail and depth
    3. Add supporting evidence, statistics, or expert opinions
    4. Elaborate on benefits with concrete applications
    5. Add contextual information that enhances understanding
    
    DO NOT use filler text, repetition, or fluff. Every added word must add genuine value.
    
    The final content MUST be exactly ${targetWordCount} words. This is a non-negotiable requirement.`;
    
    // Add JSON format requirement if structured output is expected
    if (isStructuredContent) {
      systemPrompt += `\n\nYour response MUST be a valid JSON object.`;
    }
    
    // Add persona-specific instructions if a persona is provided
    if (persona) {
      systemPrompt += `\n\nCRITICAL: This content must sound like it was written by ${persona}.
      You MUST maintain ${persona}'s distinctive voice, vocabulary, sentence structure, and overall style.
      Any content you add should seamlessly blend with ${persona}'s writing style.
      
      YOUR SUCCESS DEPENDS ON TWO EQUALLY IMPORTANT CRITERIA:
      1. Reaching EXACTLY ${targetWordCount} words
      2. Making the entire content sound authentically like ${persona}'s writing
      
      Many attempts fail on one of these criteria. You must succeed on BOTH.`;
    }
    
    // Build the user prompt
    let userPrompt = `This content is ${wordsMissing} words short of the required ${targetWordCount} word target.
    
Content to expand:
"""
${textContent}
"""

Current word count: ${contentWords} words
Required word count: ${targetWordCount} words
Words missing: ${wordsMissing} words (${percentMissing}%)

Expand this content to EXACTLY ${targetWordCount} words by adding high-quality, substantive content that enhances its value.
Add depth, examples, and elaboration - never filler text.

Your expanded version must:
- Maintain the ${formState.tone} tone and ${formState.language} language
- Preserve all existing content (don't remove anything)
- Add only valuable, relevant information
- Reach exactly ${targetWordCount} words`;

    // Add persona-specific instructions to the user prompt if provided
    if (persona) {
      userPrompt += `\n- Sound authentically like ${persona}'s writing style
- Maintain ${persona}'s distinctive voice, vocabulary, and sentence patterns
- Ensure any added content blends seamlessly with ${persona}'s style`;
    }

    userPrompt += `\n- Be formatted according to the original structure`;

    // Add JSON format instructions if structured content is expected
    if (isStructuredContent) {
      userPrompt += `\n\nPlease format your response as JSON with the following structure:
{
  "headline": "Main headline goes here",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content paragraph(s)"
    },
    {
      "title": "Another section title", 
      "listItems": ["First bullet point", "Second bullet point"]
    }
  ],
  "wordCountAccuracy": 95
}

Return your response in valid JSON format.`;
    }

    if (formState.forceKeywordIntegration && formState.keywords) {
      userPrompt += `\n\nMake sure to naturally integrate these keywords in the expanded sections: ${formState.keywords}`;
    }
    
    // Add final reminder about word count, with extra emphasis for persona styling
    if (persona) {
      userPrompt += `\n\nFINAL REMINDER: The content MUST be EXACTLY ${targetWordCount} words AND sound like ${persona}'s authentic writing style. 
      I will check both requirements carefully. Do not submit your response until you have verified both criteria are met.`;
    } else {
      userPrompt += `\n\nFINAL REMINDER: The content MUST be EXACTLY ${targetWordCount} words. Do not submit your response until you've verified the word count.`;
    }
    
    // Prepare the API request
    const requestBody = {
      model: formState.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6, // Slightly higher temperature for second attempt to encourage more creativity
      max_tokens: maxTokens, // Use dynamic token limit from API config
      response_format: isStructuredContent ? { type: "json_object" } : undefined
    };
    
    if (progressCallback) {
      progressCallback(`Making second attempt to match target word count...`);
    }
    
    // Make the API request with timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout for second attempt
    
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Parse the response
      const data = await handleApiResponse<{ 
        choices: { message: { content: string } }[];
        usage?: { total_tokens: number }
      }>(response);
      
      // Extract token usage
      const tokenUsage = data.usage?.total_tokens || 0;
      
      // Track token usage
      await trackTokenUsage(
        undefined, // Skip user tracking for refinement
        tokenUsage,
        formState.model,
        'revise_word_count_second_attempt',
        `Second word count revision (target: ${targetWordCount})`
      );
      
      // Extract the content from the response
      let revisedContent = data.choices[0]?.message?.content;
      
      if (!revisedContent) {
        throw new Error('No content in second revision response');
      }
      
      // Parse structured content if needed
      if (isStructuredContent) {
        try {
          const parsedContent = JSON.parse(revisedContent);
          revisedContent = parsedContent;
        } catch (err) {
          console.warn('Error parsing structured content in second revision, returning as plain text:', err);
          // Keep as plain text if parsing fails
        }
      }
      
      // Verify the word count of the second revision
      const secondRevisedWordCount = extractWordCount(revisedContent);
      const percentOfTarget = Math.round((secondRevisedWordCount / targetWordCount) * 100);
      
      if (progressCallback) {
        progressCallback(`Second revision complete: ${secondRevisedWordCount} words (${percentOfTarget}% of target)`);
      }
      
      // If still significantly short, try a third emergency revision
      // Use the user-defined tolerance instead of hardcoded 0.95
      const tolerancePercentage = formState.wordCountTolerance !== undefined ? formState.wordCountTolerance / 100 : 0.05;
      if (formState.prioritizeWordCount && secondRevisedWordCount < targetWordCount * (1 - tolerancePercentage)) {
        if (progressCallback) {
          progressCallback(`Content still below target. Making final emergency revision...`);
        }
        
        try {
          // Set up a very targeted, emergency prompt for one final attempt
          const emergencySystemPrompt = persona 
            ? `You are ${persona}. Your ONLY task is to expand this content to EXACTLY ${targetWordCount} words while maintaining my distinctive voice. Add substantive, valuable content - detailed examples, case studies, elaborations, and supporting evidence. Never use filler or fluff. Your response MUST be a valid JSON object.`
            : `You are an expert copywriter with a critical emergency task. Your ONLY job is to expand this content to EXACTLY ${targetWordCount} words. Add substantive, valuable content only. Never use filler or fluff. Your response MUST be a valid JSON object.`;
          
          const emergencyUserPrompt = `This content needs to be expanded to EXACTLY ${targetWordCount} words:
          
"""
${typeof revisedContent === 'string' ? revisedContent : JSON.stringify(revisedContent, null, 2)}
"""

Current length: ${secondRevisedWordCount} words
Target length: ${targetWordCount} words (currently at ${percentOfTarget}%)

${persona 
  ? `Add more substantive content - examples, analogies, elaborations, details - while keeping my (${persona}'s) distinctive voice and style.` 
  : `Add more substantive content - examples, analogies, elaborations, details - to reach the target word count.`}

CRITICAL: The content MUST be EXACTLY ${targetWordCount} words. Count your words meticulously before submitting. This is a non-negotiable requirement.

Please format your response as a valid JSON object with the following structure:
{
  "headline": "Main headline goes here",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content paragraph(s)"
    }
  ],
  "wordCountAccuracy": 95
}`;
          
          // Make one final desperate attempt with higher temperature
          const emergencyRequestBody = {
            model: formState.model,
            messages: [
              { role: 'system', content: emergencySystemPrompt },
              { role: 'user', content: emergencyUserPrompt }
            ],
            temperature: 0.9, // Higher temperature for more creative expansion
            max_tokens: maxTokens,
            response_format: isStructuredContent ? { type: "json_object" } : undefined
          };
          
          const emergencyController = new AbortController();
          const emergencyTimeoutId = setTimeout(() => emergencyController.abort(), 90000); // 90 second timeout
          
          try {
            const emergencyResponse = await fetch(`${baseUrl}/chat/completions`, {
              method: 'POST',
              headers,
              body: JSON.stringify(emergencyRequestBody),
              signal: emergencyController.signal
            });
            
            clearTimeout(emergencyTimeoutId);
            
            const emergencyData = await handleApiResponse<{
              choices: { message: { content: string } }[];
            }>(emergencyResponse);
            
            const emergencyContent = emergencyData.choices[0]?.message?.content;
            
            if (emergencyContent) {
              try {
                // Try to parse if structured content is expected
                const finalContent = isStructuredContent 
                  ? JSON.parse(emergencyContent) 
                  : emergencyContent;
                
                const finalWordCount = extractWordCount(finalContent);
                const finalPercentOfTarget = Math.round((finalWordCount / targetWordCount) * 100);
                
                if (progressCallback) {
                  progressCallback(`Final emergency revision: ${finalWordCount} words (${finalPercentOfTarget}% of target)`);
                }
                
                return finalContent;
              } catch (parseError) {
                console.warn('Error parsing emergency revision response:', parseError);
                // If parsing fails, return the content as plain text
                const finalWordCount = extractWordCount(emergencyContent);
                
                if (progressCallback) {
                  progressCallback(`Final emergency revision (plain text): ${finalWordCount} words`);
                }
                
                return emergencyContent;
              }
            }
          } catch (emergencyError) {
            clearTimeout(emergencyTimeoutId);
            console.error('Emergency revision failed:', emergencyError);
          }
        } catch (emergencySetupError) {
          console.error('Error setting up emergency revision:', emergencySetupError);
        }
      }
      
      // Return the second revision content (or the original second revision if the emergency attempt failed)
      return revisedContent;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Handle specific fetch errors
      if (fetchError.name === 'AbortError') {
        throw new Error('Second revision request timed out. Please try again or use a different model.');
      }
      
      // Re-throw with more context
      throw new Error(`Second revision API request failed: ${fetchError.message}`);
    }
  } catch (error) {
    console.error('Error in second content revision:', error);
    
    // Generate a more specific error message
    const errorMessage = generateErrorMessage(error);
    
    if (progressCallback) {
      progressCallback(`Error in second revision: ${errorMessage}. Using first revision.`);
    }
    
    // If second revision fails, return the content from the first revision
    return content;
  }
}