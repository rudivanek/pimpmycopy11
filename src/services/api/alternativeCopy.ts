/**
 * Alternative copy generation functionality
 */
import { FormState } from '../../types';
import { getApiConfig, handleApiResponse, storePrompts, calculateTargetWordCount, extractWordCount } from './utils';
import { trackTokenUsage } from './tokenTracking';
import { saveCopySession } from '../supabaseClient';
import { reviseContentForWordCount } from './contentRefinement';

/**
 * Generate an alternative version of the copy
 * @param formState - The form state with generation settings
 * @param improvedCopy - The primary copy to create an alternative for
 * @param sessionId - Optional session ID for saving to the database
 * @param progressCallback - Optional callback for reporting progress
 * @returns Alternative copy content
 */
export async function generateAlternativeCopy(
  formState: FormState,
  improvedCopy: any,
  sessionId?: string,
  progressCallback?: (message: string) => void
): Promise<any> {
  // Extract text content from structured content if needed
  const improvedCopyText = typeof improvedCopy === 'string' 
    ? improvedCopy 
    : improvedCopy.headline 
      ? `${improvedCopy.headline}\n\n${improvedCopy.sections.map((s: any) => 
          `${s.title}\n${s.content || (s.listItems || []).join('\n')}`
        ).join('\n\n')}`
      : JSON.stringify(improvedCopy);
  
  // Get API configuration
  const { apiKey, baseUrl, headers, maxTokens } = getApiConfig(formState.model);
  
  // Calculate target word count
  const targetWordCount = calculateTargetWordCount(formState);
  
  // Progress reporting if callback provided
  if (progressCallback) {
    progressCallback(`Generating alternative version with target of ${targetWordCount} words...`);
  }
  
  // Build the system prompt
  const systemPrompt = `You are an expert copywriter who excels at creating alternative versions of marketing content.
  Your task is to create a compelling alternative version of the marketing copy provided, with a different approach or angle.
  The alternative version should maintain the key message and purpose, but present it in a fresh way.
  Maintain the ${formState.tone} tone and stay within the approximate target of ${targetWordCount} words.
  
  IMPORTANT: The copy must be ${targetWordCount} words or longer. Do not conclude early.
  If you need more content to reach the word count, add depth through examples, explanations, and elaboration.`;
  
  // Build the user prompt
  let userPrompt = `Generate an alternative version of this marketing copy with a different approach or angle.

Original copy:
"""
${improvedCopyText}
"""

Key information to maintain:
- Target audience: ${formState.targetAudience || 'Not specified'}
- Key message: ${formState.keyMessage || 'Not specified'}
- Call to action: ${formState.callToAction || 'Not specified'}
- Tone: ${formState.tone}
- Language: ${formState.language}
- Target word count: ${targetWordCount} words

${formState.keywords ? `Keywords to include: ${formState.keywords}` : ''}
${formState.brandValues ? `Brand values: ${formState.brandValues}` : ''}
${formState.desiredEmotion ? `Desired emotion: ${formState.desiredEmotion}` : ''}`;

  // Add section-specific guidelines based on formState.section
  if (formState.section) {
    userPrompt += `\n\nThis is for the "${formState.section}" section.`;
  }
  
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
    userPrompt += `\n\nIMPORTANT: Include detailed explanations, specific examples, and where appropriate, brief case studies or scenarios to fully elaborate on your points. Make sure to substantiate claims with evidence or reasoning.`;
  }
  
  // Remind about word count target
  userPrompt += `\n\nREMINDER: The content must be ${targetWordCount} words or longer. If needed, add depth through examples, explanations, and elaboration.`;
  
  // Store the prompts for display in the UI
  storePrompts(systemPrompt, userPrompt);
  
  // Prepare the API request
  const requestBody = {
    model: formState.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8, // Higher temperature for more creativity in alternatives
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
      'generate_alternative_copy',
      formState.briefDescription || 'Generate alternative copy'
    );
    
    // Extract the content from the response
    let alternativeCopy = data.choices[0]?.message?.content;
    
    if (!alternativeCopy) {
      throw new Error('No content in response');
    }
    
    // Parse structured content if needed
    if (useStructuredFormat) {
      try {
        const parsedContent = JSON.parse(alternativeCopy);
        alternativeCopy = parsedContent;
      } catch (err) {
        console.warn('Error parsing structured content, returning as plain text:', err);
        // Keep as plain text if parsing fails
      }
    }
    
    // Check word count if strict adherence is required
    if (formState.prioritizeWordCount) {
      const currentWordCount = extractWordCount(alternativeCopy);
      // Use the user-defined tolerance instead of hardcoded 0.98
      const tolerancePercentage = formState.wordCountTolerance !== undefined ? formState.wordCountTolerance / 100 : 0.02;
      const minimumAcceptable = Math.floor(targetWordCount * (1 - tolerancePercentage));
      
      // If the content is significantly shorter than requested, try to revise it
      if (currentWordCount < minimumAcceptable) {
        if (progressCallback) {
          progressCallback(`Generated alternative content too short (${currentWordCount}/${targetWordCount} words). Revising...`);
        }
        
        console.warn(`Generated alternative content too short: ${currentWordCount} words vs target of ${targetWordCount} words`);
        console.log("Attempting to revise alternative content to meet target word count...");
        
        try {
          // Use the content refinement service to expand the content
          const revisedContent = await reviseContentForWordCount(
            alternativeCopy,
            targetWordCount,
            formState,
            progressCallback
          );
          
          // Update with the revised content
          alternativeCopy = revisedContent;
          
          // Log the updated word count
          const revisedWordCount = extractWordCount(revisedContent);
          console.log(`Revised alternative content word count: ${revisedWordCount} words`);
          
          // If still too short after first revision, try once more
          if (revisedWordCount < minimumAcceptable && formState.prioritizeWordCount) {
            if (progressCallback) {
              progressCallback(`Alternative content still below target after revision. Making second attempt...`);
            }
            
            try {
              // Make a more aggressive second attempt
              const secondRevision = await reviseContentForWordCount(
                revisedContent,
                targetWordCount,
                {...formState, forceElaborationsExamples: true}, // Force elaborations for second attempt
                progressCallback
              );
              
              alternativeCopy = secondRevision;
              const finalWordCount = extractWordCount(secondRevision);
              
              if (progressCallback) {
                progressCallback(`Final alternative content word count: ${finalWordCount} words`);
              }
            } catch (secondRevisionError) {
              console.error('Error in second revision of alternative content:', secondRevisionError);
              // Keep first revision if second fails
            }
          }
          
        } catch (revisionError) {
          console.error('Error revising alternative content for word count:', revisionError);
          if (progressCallback) {
            progressCallback(`Error revising alternative content: ${revisionError.message}`);
          }
          // Continue with original content if revision fails
        }
      } else if (progressCallback) {
        progressCallback(`Alternative content generated with ${currentWordCount} words`);
      }
    } else if (progressCallback) {
      const wordCount = extractWordCount(alternativeCopy);
      progressCallback(`Alternative content generated with ${wordCount} words`);
    }
    
    // Save to database if session ID is provided
    if (sessionId) {
      try {
        await saveCopySession(formState, improvedCopy, alternativeCopy, sessionId);
      } catch (err) {
        console.error('Error saving copy session:', err);
        // Continue even if save fails
      }
    }
    
    return alternativeCopy;
  } catch (error) {
    console.error('Error generating alternative copy:', error);
    if (progressCallback) {
      progressCallback(`Error generating alternative copy: ${error.message}`);
    }
    throw error;
  }
}