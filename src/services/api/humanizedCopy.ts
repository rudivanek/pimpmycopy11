/**
 * Humanized copy generation functionality
 */
import { FormState } from '../../types';
import { getApiConfig, handleApiResponse, storePrompts, calculateTargetWordCount, extractWordCount } from './utils';
import { trackTokenUsage } from './tokenTracking';
import { reviseContentForWordCount } from './contentRefinement';

/**
 * Generate a humanized version of the copy
 * @param content - The content to humanize
 * @param formState - The form state with generation settings
 * @param progressCallback - Optional callback for reporting progress
 * @returns Humanized copy content
 */
export async function generateHumanizedCopy(
  content: any,
  formState: FormState,
  progressCallback?: (message: string) => void
): Promise<any> {
  // Extract text content if needed
  const textContent = typeof content === 'string' 
    ? content 
    : content.headline 
      ? `${content.headline}\n\n${content.sections.map((s: any) => 
          `${s.title}\n${s.content || (s.listItems || []).join('\n')}`
        ).join('\n\n')}`
      : JSON.stringify(content);
  
  // Get API configuration
  const { apiKey, baseUrl, headers, maxTokens } = getApiConfig(formState.model);
  
  // Calculate target word count
  const targetWordCount = calculateTargetWordCount(formState);
  
  // Progress reporting if callback provided
  if (progressCallback) {
    progressCallback(`Humanizing content with target of ${targetWordCount} words...`);
  }
  
  // Build the system prompt
  const systemPrompt = `You are a top-tier copywriter who transforms text into a warm, conversational, relatable voice while preserving meaning and structure.

  Your humanization approach must follow these strict guidelines:
  - Rewrite the text in a warm, conversational voice
  - Preserve meaning, structure and length
  - Avoid hyperbole and generic metaphors; prefer concrete, everyday examples
  - Limit the entire piece to:
      - 1 emoji/symbol (✔, ★, 😀, etc.) - consider check marks, stars and similar symbols as emojis
      - 2 exclamation marks
      - 1 parenthetical phrase in the entire piece
  - Keep humor subtle and professional
  
  - Aim for the target length of approximately ${targetWordCount} words
  
  IMPORTANT: Exceeding these limits is a failure.
  
  IMPORTANT: The humanized content must still be high-quality, persuasive, and effective - just more authentically human.
  The goal is content that feels like it was written by a skilled human, not an AI.
  
  NEVER start your response with a heading!`;
  
  // Build the user prompt
  let userPrompt = `Rewrite the following text in a warm, conversational voice:

"""
${textContent}
"""

• Preserve meaning, structure and length
• Avoid hyperbole and generic metaphors; prefer concrete, everyday examples
• Use contractions, first-person pronouns, and friendly phrasing where appropriate
• Remove jargon, add light empathy
• Maintain the ${formState.tone} tone and ${formState.language} language
• Target approximately ${targetWordCount} words

STRICT LIMITS:
• Maximum 1 emoji/symbol (✔, ★, 😀, etc.) in the entire text
• Maximum 2 exclamation marks
• Maximum 1 parenthetical phrase in the entire piece
• Keep humor subtle and professional

Exceeding these limits is a failure.

${formState.keywords ? `Keywords to maintain: ${formState.keywords}` : ''}`;

  // Determine if we should return structured format
  const useStructuredFormat = formState.outputStructure && formState.outputStructure.length > 0;
  
  if (useStructuredFormat) {
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
  "wordCountAccuracy": 85 // Score 0-100 of how well you matched the target word count
}

Make sure to include a headline and appropriate sections with either paragraph content or list items.`;

    // Add specific structure guidance if output structure is specified
    if (formState.outputStructure && formState.outputStructure.length > 0) {
      userPrompt += `\n\nInclude these specific sections in the exact order:`;
      formState.outputStructure.forEach((element, index) => {
        userPrompt += `\n${index + 1}. ${element.label || element.value}${element.wordCount ? ` (target: ${element.wordCount} words)` : ''}`;
      });
      
      userPrompt += `\n\nEnsure each section meets its target word count. If a section is underdeveloped, expand it with more examples, details, or elaboration.`;
    }
  } else {
    userPrompt += `\n\nProvide your response as plain text with appropriate paragraphs and formatting.`;
  }

  if (formState.forceKeywordIntegration && formState.keywords) {
    userPrompt += `\n\nIMPORTANT: Make sure to naturally integrate all of these keywords throughout the copy: ${formState.keywords}`;
  }

  // Add specific instructions for forced elaboration
  if (formState.forceElaborationsExamples) {
    userPrompt += `\n\nIMPORTANT: Include detailed explanations, specific examples, and where appropriate, brief case studies or scenarios to fully elaborate on your points. Make sure to substantiate claims with evidence or reasoning. Remember to maintain the conversational style while doing this.`;
  }

  // Remind about word count target
  userPrompt += `\n\nREMINDER: The content should be ${targetWordCount} words or longer. If needed, add depth through examples, explanations, and elaboration while maintaining the warm, conversational voice.`;

  // Store the prompts for display in the UI
  storePrompts(systemPrompt, userPrompt);
  
  // Prepare the API request
  const requestBody = {
    model: formState.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.85, // Higher temperature for more natural, varied humanization
    max_tokens: maxTokens, // Use dynamic token limit from API config
    response_format: useStructuredFormat ? { type: "json_object" } : undefined
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
      undefined, // Skip user tracking to avoid auth issues
      tokenUsage,
      formState.model,
      'generate_humanized_copy',
      formState.briefDescription || 'Generate humanized copy'
    );
    
    // Extract the content from the response
    let humanizedCopy = data.choices[0]?.message?.content;
    
    if (!humanizedCopy) {
      throw new Error('No content in response');
    }
    
    // Parse structured content if needed
    if (useStructuredFormat) {
      try {
        const parsedContent = JSON.parse(humanizedCopy);
        humanizedCopy = parsedContent;
      } catch (err) {
        console.warn('Error parsing structured content, returning as plain text:', err);
        // Keep as plain text if parsing fails
      }
    }
    
    // Check word count if strict adherence is required
    if (formState.prioritizeWordCount) {
      const currentWordCount = extractWordCount(humanizedCopy);
      // Use the user-defined tolerance instead of hardcoded 0.98
      const tolerancePercentage = formState.wordCountTolerance !== undefined ? formState.wordCountTolerance / 100 : 0.02;
      const minimumAcceptable = Math.floor(targetWordCount * (1 - tolerancePercentage));
      
      // If the content is significantly shorter than requested, try to revise it
      if (currentWordCount < minimumAcceptable) {
        if (progressCallback) {
          progressCallback(`Generated humanized content too short (${currentWordCount}/${targetWordCount} words). Revising...`);
        }
        
        console.warn(`Generated humanized content too short: ${currentWordCount} words vs target of ${targetWordCount} words`);
        console.log("Attempting to revise humanized content to meet target word count...");
        
        try {
          // Use the content refinement service to expand the content
          const revisedContent = await reviseContentForWordCount(
            humanizedCopy,
            targetWordCount,
            formState,
            progressCallback
          );
          
          // Update with the revised content
          humanizedCopy = revisedContent;
          
          // Log the updated word count
          const revisedWordCount = extractWordCount(revisedContent);
          console.log(`Revised humanized content word count: ${revisedWordCount} words`);
          
          // If still too short after first revision, try once more
          if (revisedWordCount < minimumAcceptable && formState.prioritizeWordCount) {
            if (progressCallback) {
              progressCallback(`Humanized content still below target after revision. Making second attempt...`);
            }
            
            try {
              // Make a more aggressive second attempt
              const secondRevision = await reviseContentForWordCount(
                revisedContent,
                targetWordCount,
                {...formState, forceElaborationsExamples: true}, // Force elaborations for second attempt
                progressCallback
              );
              
              humanizedCopy = secondRevision;
              const finalWordCount = extractWordCount(secondRevision);
              
              if (progressCallback) {
                progressCallback(`Final humanized content word count: ${finalWordCount} words`);
              }
            } catch (secondRevisionError) {
              console.error('Error in second revision of humanized content:', secondRevisionError);
              // Keep first revision if second fails
            }
          }
        } catch (revisionError) {
          console.error('Error revising humanized content for word count:', revisionError);
          if (progressCallback) {
            progressCallback(`Error revising humanized content: ${revisionError.message}`);
          }
          // Continue with original content if revision fails
        }
      } else if (progressCallback) {
        progressCallback(`Humanized content generated with ${currentWordCount} words`);
      }
    } else if (progressCallback) {
      const wordCount = extractWordCount(humanizedCopy);
      progressCallback(`Humanized content generated with ${wordCount} words`);
    }
    
    return humanizedCopy;
  } catch (error) {
    console.error('Error generating humanized copy:', error);
    if (progressCallback) {
      progressCallback(`Error generating humanized copy: ${error.message}`);
    }
    throw error;
  }
}