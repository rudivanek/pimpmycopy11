/**
 * Voice styling functionality
 */
import { FormState, Model } from '../../types';
import { getApiConfig, handleApiResponse, extractWordCount, generateErrorMessage } from './utils';
import { trackTokenUsage } from './tokenTracking';
import { reviseContentForWordCount } from './contentRefinement';
/**
 * Restyle content with a specific persona's voice
 * @param content - The content to restyle (can be string, object, or array for headlines)
 * @param persona - The persona to emulate
 * @param model - The AI model to use
 * @param language - The language to generate content in
 * @param formState - The form state with generation settings
 * @param targetWordCount - The target word count for the content
 * @param progressCallback - Optional callback for reporting progress
 * @param numHeadlines - Optional parameter specifying how many headlines to generate (when content is an array)
 * @returns The restyled content
 */
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
  // Check if content is an array (headlines)
  const isHeadlineArray = Array.isArray(content);
  
  // Get API configuration
  const { apiKey, baseUrl, headers, maxTokens } = getApiConfig(model);
  
  // Progress reporting if callback provided
  if (progressCallback) {
    if (isHeadlineArray) {
      progressCallback(`Generating ${persona}-styled headlines...`);
    } else {
      progressCallback(`Applying ${persona}'s voice style${targetWordCount ? ` with target of ${targetWordCount} words` : ''}...`);
    }
  }
  
  // Build the system prompt with persona characteristics
  let systemPrompt = `You are an expert copywriter who can perfectly mimic the voice, style, and mannerisms of ${persona}.
  Your task is to restyle the provided copy to sound exactly as if ${persona} wrote it.
  Maintain all the key information and meaning, but transform the style to match ${persona}'s distinctive way of communicating.
  The copy should be in ${language} language.`;
  
  // Add specific guidance for well-known personas
  if (persona === 'Steve Jobs') {
    systemPrompt += `\n\nSteve Jobs' voice is characterized by:
    - Simple, direct, and clear language
    - Short, impactful sentences
    - Focus on product benefits and "why it matters"
    - Use of contrasts ("X is good, but Y is revolutionary")
    - Powerful adjectives like "incredible," "amazing," and "revolutionary"
    - A sense of creating history and changing the world`;
  } else if (persona === 'Seth Godin') {
    systemPrompt += `\n\nSeth Godin's voice is characterized by:
    - Short, punchy paragraphs, often just one or two sentences
    - Thought-provoking questions
    - Metaphors and unexpected comparisons
    - Conversational yet profound observations
    - Challenges conventional thinking
    - Often starts with a simple observation and builds to a deeper insight`;
  } else if (persona === 'Marie Forleo') {
    systemPrompt += `\n\nMarie Forleo's voice is characterized by:
    - Warm, conversational and friendly tone
    - Upbeat, positive, and encouraging language
    - Empowering calls to action
    - Personal anecdotes and relatable examples
    - Use of questions to engage the reader
    - Occasional playful humor and slang`;
  } else if (persona === 'Simon Sinek') {
    systemPrompt += `\n\nSimon Sinek's voice is characterized by:
    - Clear, focused on "why" over "what" or "how"
    - Inspirational and purpose-driven
    - Rhetorical questions that make the reader reflect
    - Repetition of key concepts for emphasis
    - Simple language to explain profound concepts
    - Stories that illustrate principles in action
    - Calm, measured pace with strategic pauses`;
  } else if (persona === 'Gary Halbert') {
    systemPrompt += `\n\nGary Halbert's voice is characterized by:
    - Direct, conversational, often addressing the reader as "you"
    - Strong, bold claims backed by reasoning
    - Authentic, sometimes rough-around-the-edges tone
    - Storytelling that draws the reader in
    - Strategic use of capitalization, italics, and emphasis
    - Explicit promises and benefits to the reader
    - Colorful expressions and memorable phrases`;
  } else if (persona === 'David Ogilvy') {
    systemPrompt += `\n\nDavid Ogilvy's voice is characterized by:
    - Clear, elegant, and fact-driven language
    - Sophisticated but never pretentious vocabulary
    - Long-form copy with logical progression of ideas
    - Emphasis on research and credibility
    - Well-crafted, memorable phrases
    - Respectful of the reader's intelligence
    - Professional but with occasional witty observations`;
  }

  // Add word count guidance if target is specified
  if (targetWordCount) {
    // Enhanced word count instructions for strict adherence
    if (formState?.prioritizeWordCount) {
      systemPrompt += `\n\nCRITICAL WORD COUNT REQUIREMENT: The final content MUST be EXACTLY ${targetWordCount} words. This is a non-negotiable requirement.
      
      You MUST count your words meticulously. If your first draft is shorter than ${targetWordCount} words, you MUST expand the content by adding more:
      1. Detailed examples and case studies
      2. Substantive explanations that deepen understanding
      3. Additional context and background information
      4. Supporting evidence, quotes, or statistics
      5. Practical applications or implications
      
      Do NOT use filler text or repetitive content. Every added word must provide substantive value while maintaining ${persona}'s distinctive voice.
      
      DO NOT conclude the content until you've reached ${targetWordCount} words. This word count is an absolute requirement.
      
      IMPORTANT WARNING: Many copywriters fail to meet the word count when applying voice styling. DO NOT make this mistake. Count your words carefully, and if you're even 10 words short, add more valuable content until you reach EXACTLY ${targetWordCount} words.`;
    } else {
      systemPrompt += `\n\nIMPORTANT: The final content should be approximately ${targetWordCount} words.
      If the content falls short of this target, add more examples, elaboration, or supporting details while maintaining ${persona}'s voice.`;
    }
  }
  
  // Build the user prompt
  let userPrompt = '';
  
  // Handle headline array differently
  if (isHeadlineArray) {
    // Special handling for headline arrays
    const headlineCount = numHeadlines || content.length;
    
    systemPrompt += `\n\nYour task is to transform the provided headline options into exactly ${headlineCount} headlines that sound like they were written by ${persona}.`;
    
    userPrompt = `Restyle the following ${content.length} headline options to sound exactly like ${persona} would write them. Return exactly ${headlineCount} headlines:

Original headlines:
${content.map((headline, i) => `${i+1}. ${headline}`).join('\n')}

Please return your response as a JSON array containing exactly ${headlineCount} headline strings. For example:
["First headline in ${persona}'s style", "Second headline in ${persona}'s style", ...]

The response must:
1. Maintain the core message of each headline
2. Capture ${persona}'s distinctive voice and style
3. Contain exactly ${headlineCount} headlines
4. Be returned as a valid JSON array of strings`;
  } else {
    // Standard content restyling
    // Extract text content if needed
    const textContent = typeof content === 'string' 
      ? content 
      : content.headline 
        ? `${content.headline}\n\n${content.sections.map((s: any) => 
            `${s.title}\n${s.content || (s.listItems || []).join('\n')}`
          ).join('\n\n')}`
        : JSON.stringify(content);
        
    userPrompt = `Restyle the following copy to sound exactly like ${persona}. Keep all the key information intact but transform the voice:

"""
${textContent}
"""

Maintain all the key points and factual information, but apply ${persona}'s distinctive voice, vocabulary, cadence, and stylistic approach. The response should sound authentically like ${persona} wrote it.`;

    // Add target word count guidance with enhanced emphasis
    if (targetWordCount) {
      if (formState?.prioritizeWordCount) {
        // Calculate current word count for comparison
        const currentWordCount = textContent.trim().split(/\s+/).length;
        const difference = targetWordCount - currentWordCount;
        const action = difference > 0 ? "expand" : "condense";
        
        // Enhanced word count instructions for strict adherence
        userPrompt += `\n\nABSOLUTELY CRITICAL: Your output MUST be EXACTLY ${targetWordCount} words in length.
        
Current word count of source text: ${currentWordCount} words
Target word count: ${targetWordCount} words
Difference: ${difference > 0 ? `You need to ADD ${difference} words` : `You need to REMOVE ${Math.abs(difference)} words`}

You MUST count your words carefully before submitting your response. You MUST ${action} the content to match the target of ${targetWordCount} words.

I'll emphasize again: WORD COUNT IS THE PRIMARY SUCCESS METRIC. ${persona}'s voice is important, but achieving ${targetWordCount} words EXACTLY is essential. If your first draft is too short, you must add valuable content that sounds like ${persona}.

Do not conclude your response until you have verified it contains EXACTLY ${targetWordCount} words.`;
      } else {
        userPrompt += `\n\nThe final content should be approximately ${targetWordCount} words. Please aim to match this target as closely as possible while maintaining ${persona}'s voice.`;
      }
    }

    // Add special handling for structured content
    if (typeof content === 'object' && content.headline) {
      userPrompt += `\n\nSince this is structured content with sections, you MUST return your response as a JSON object with this exact structure:
{
  "headline": "Your restyled headline here",
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

Make sure to keep the same section titles and organization, just transform the writing style to match ${persona}.`;
    } else if (typeof content === 'object') {
      // For non-standard object formats, request a structured response anyway
      userPrompt += `\n\nReturn your response as a JSON object with this exact structure:
{
  "headline": "Your restyled headline here",
  "sections": [
    {
      "title": "Content",
      "content": "Your restyled content here"
    }
  ],
  "wordCountAccuracy": 95
}`;
    }
  }
  
  // Prepare the API request
  const requestBody = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7, // Lower temperature for more reliable word count adherence
    max_tokens: maxTokens,
    response_format: (isHeadlineArray || typeof content === 'object') ? { type: "json_object" } : undefined
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
    
    // Track token usage without waiting for the result
    trackTokenUsage(
      undefined,
      tokenUsage,
      model,
      'restyle_with_persona',
      `Apply ${persona}'s voice to content`
    ).catch(err => console.error('Error tracking token usage:', err));
    
    // Extract the content from the response
    let responseContent = data.choices[0]?.message?.content;
    
    if (!responseContent) {
      throw new Error('No content in response');
    }
    
    // Handle special case for headline arrays
    if (isHeadlineArray) {
      try {
        // Parse JSON response
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(responseContent);
        } catch (err) {
          // If parsing fails, try to extract JSON from the response
          const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            parsedResponse = JSON.parse(jsonMatch[0]);
          } else {
            throw err;
          }
        }
        
        // Ensure it's an array
        if (!Array.isArray(parsedResponse)) {
          // If it's an object with an array property, try to use that
          if (parsedResponse && typeof parsedResponse === 'object') {
            const arrayKeys = Object.keys(parsedResponse).filter(key => 
              Array.isArray(parsedResponse[key]) && 
              parsedResponse[key].length > 0 &&
              typeof parsedResponse[key][0] === 'string'
            );
            
            if (arrayKeys.length > 0) {
              parsedResponse = parsedResponse[arrayKeys[0]];
            } else {
              // Create a new array from object values if possible
              const values = Object.values(parsedResponse).filter(v => typeof v === 'string');
              if (values.length > 0) {
                parsedResponse = values;
              } else {
                // Fallback to simple string split
                parsedResponse = responseContent.split('\n').filter(line => 
                  line.trim().length > 0 && !line.startsWith('[') && !line.startsWith(']')
                );
              }
            }
          } else {
            // Simple fallback - split by line breaks
            parsedResponse = responseContent.split('\n').filter(line => 
              line.trim().length > 0 && !line.startsWith('[') && !line.startsWith(']')
            );
          }
        }
        
        // Ensure we have exactly numHeadlines headlines
        if (numHeadlines) {
          if (parsedResponse.length > numHeadlines) {
            // Truncate if we have too many
            parsedResponse = parsedResponse.slice(0, numHeadlines);
          } else if (parsedResponse.length < numHeadlines) {
            // Pad with original headlines if we have too few
            const originalCount = content.length;
            while (parsedResponse.length < numHeadlines) {
              const index = parsedResponse.length % originalCount;
              parsedResponse.push(`${persona}'s style: ${content[index]}`);
            }
          }
        }
        
        if (progressCallback) {
          progressCallback(`Generated ${parsedResponse.length} headlines in ${persona}'s voice`);
        }
        
        return { content: parsedResponse, personaUsed: persona };
      } catch (err) {
        console.error('Error parsing headline response:', err);
        if (progressCallback) {
          progressCallback(`Error processing headline response: ${err.message}`);
        }
        // Return the original headlines if parsing fails
        return { content, personaUsed: persona };
      }
    }
    
    // If we expected structured content
    if (typeof content === 'object') {
      try {
        // Parse JSON response
        const parsedResponse = JSON.parse(responseContent);
        
        // Check if it has the expected structure
        if (parsedResponse.headline && Array.isArray(parsedResponse.sections)) {
          // Get the current word count
          const contentWordCount = extractWordCount(parsedResponse);
          
          if (progressCallback) {
            progressCallback(`Generated content in ${persona}'s voice: ${contentWordCount} words (${Math.round(contentWordCount/targetWordCount*100)}% of target)`);
          }
          
          // Check if word count revision is needed
          if (targetWordCount && formState?.prioritizeWordCount) {
            // Stricter threshold - now using 98% of target as minimum acceptable
            // Use the user-defined tolerance instead of hardcoded 0.98
            const tolerancePercentage = formState.wordCountTolerance !== undefined ? formState.wordCountTolerance / 100 : 0.02;
            const minimumAcceptable = Math.floor(targetWordCount * (1 - tolerancePercentage));
            
            // If the content is significantly shorter than requested, try to revise it
            if (contentWordCount < minimumAcceptable) {
              if (progressCallback) {
                progressCallback(`${persona}-styled content too short (${contentWordCount}/${targetWordCount} words, ${Math.round(contentWordCount/targetWordCount*100)}%). Revising...`);
              }
              
              console.warn(`${persona}-styled content too short: ${contentWordCount} words vs target of ${targetWordCount} words`);
              
              try {
                // FIRST REVISION ATTEMPT - WITH ENHANCED PARAMETERS
                const revisedContent = await reviseContentForWordCount(
                  parsedResponse,
                  targetWordCount,
                  // Pass enhanced form state with additional flags to ensure word count is met
                  {
                    ...formState,
                    prioritizeWordCount: true, // Force prioritizeWordCount to true
                    forceElaborationsExamples: true // Add examples to help reach word count
                  },
                  progressCallback,
                  persona // Pass the persona to maintain voice style during revision
                );
                
                // Get revised word count
                const revisedWordCount = extractWordCount(revisedContent);
                
                if (progressCallback) {
                  progressCallback(`Revised ${persona}-styled content: ${revisedWordCount} words (${Math.round(revisedWordCount/targetWordCount*100)}% of target)`);
                }
                
                // SECOND REVISION ATTEMPT IF STILL TOO SHORT
                if (revisedWordCount < minimumAcceptable) {
                  if (progressCallback) {
                    progressCallback(`${persona}-styled content still below target (${revisedWordCount}/${targetWordCount}, ${Math.round(revisedWordCount/targetWordCount*100)}%). Making second attempt...`);
                  }
                  
                  try {
                    // Make a more aggressive second attempt with maximum elaboration settings
                    const secondRevision = await reviseContentForWordCount(
                      revisedContent,
                      targetWordCount,
                      {
                        ...formState,
                        prioritizeWordCount: true,
                        forceElaborationsExamples: true,
                        forceKeywordIntegration: true // Add this to encourage more content
                      },
                      progressCallback,
                      persona // Pass the persona to maintain voice style during revision
                    );
                    
                    const finalWordCount = extractWordCount(secondRevision);
                    
                    if (progressCallback) {
                      progressCallback(`Second revision complete: ${finalWordCount} words (${Math.round(finalWordCount/targetWordCount*100)}% of target)`);
                    }
                    
                    // THIRD EMERGENCY REVISION ATTEMPT IF STILL SHORT
                    if (finalWordCount < minimumAcceptable) {
                      if (progressCallback) {
                        progressCallback(`Content still below target. Making final emergency revision...`);
                      }
                      
                      // Construct a special system prompt focused only on expansion
                      const expansionSystemPrompt = `You are ${persona}. Your only task is to expand this content to EXACTLY ${targetWordCount} words without changing its meaning or style. Add substantive, valuable content - detailed examples, case studies, elaborations, and supporting evidence. Never use filler or fluff.`;
                      
                      const expansionUserPrompt = `This content needs to be expanded to EXACTLY ${targetWordCount} words while maintaining my (${persona}'s) distinctive voice and style:
                      
                      """
                      ${typeof secondRevision === 'string' ? secondRevision : JSON.stringify(secondRevision, null, 2)}
                      """
                      
                      Current length: ${finalWordCount} words
                      Target length: ${targetWordCount} words
                      
                      Expand this content by adding more depth, examples, and elaboration - never filler text. Return the complete expanded content that is EXACTLY ${targetWordCount} words long.
                      
                      I'll ONLY accept content that is ${targetWordCount} words or longer. DO NOT conclude until you've reached this word count.
                      
                      CRITICAL: Count your words meticulously before submitting your response. The word count must be exact.`;
                      
                      // Make a desperate final attempt with special prompt
                      const emergencyRequestBody = {
                        model,
                        messages: [
                          { role: 'system', content: expansionSystemPrompt },
                          { role: 'user', content: expansionUserPrompt }
                        ],
                        temperature: 1.0, // Higher temperature for more creativity
                        max_tokens: maxTokens,
                        response_format: { type: "json_object" }
                      };
                      
                      try {
                        const emergencyResponse = await fetch(`${baseUrl}/chat/completions`, {
                          method: 'POST',
                          headers,
                          body: JSON.stringify(emergencyRequestBody)
                        });
                        
                        const emergencyData = await handleApiResponse<{
                          choices: { message: { content: string } }[];
                        }>(emergencyResponse);
                        
                        const emergencyContent = emergencyData.choices[0]?.message?.content;
                        
                        if (emergencyContent) {
                          try {
                            const finalContent = JSON.parse(emergencyContent);
                            const finalFinalWordCount = extractWordCount(finalContent);
                            
                            if (progressCallback) {
                              progressCallback(`Final emergency revision: ${finalFinalWordCount} words (${Math.round(finalFinalWordCount/targetWordCount*100)}% of target)`);
                            }
                            
                            return { content: finalContent, personaUsed: persona };
                          } catch (parseError) {
                            // If parsing fails, return the second revision
                            return { content: secondRevision, personaUsed: persona };
                          }
                        }
                      } catch (emergencyError) {
                        console.error('Emergency revision failed:', emergencyError);
                        // Return the second revision if emergency attempt fails
                        return { content: secondRevision, personaUsed: persona };
                      }
                    }
                    
                    return { content: secondRevision, personaUsed: persona };
                  } catch (secondRevisionError) {
                    console.error(`Error in second revision of ${persona}-styled content:`, secondRevisionError);
                    // Keep first revision if second fails
                    return { content: revisedContent, personaUsed: persona };
                  }
                }
                
                return { content: revisedContent, personaUsed: persona };
              } catch (revisionError) {
                console.error(`Error revising ${persona}-styled content:`, revisionError);
                if (progressCallback) {
                  progressCallback(`Error revising ${persona}-styled content: ${revisionError.message}`);
                }
                // Continue with original content if revision fails
                return { content: parsedResponse, personaUsed: persona };
              }
            }
          }
          
          return { content: parsedResponse, personaUsed: persona };
        }
        
        // Check if word count revision is needed for converted response
        if (targetWordCount && formState?.prioritizeWordCount) {
          const contentWordCount = extractWordCount(convertedResponse);
          const minimumAcceptable = Math.floor(targetWordCount * 0.98);
          
          // If the content is significantly shorter than requested, try to revise it
          if (contentWordCount < minimumAcceptable) {
            if (progressCallback) {
              progressCallback(`${persona}-styled content too short (${contentWordCount}/${targetWordCount} words). Revising...`);
            }
            
            try {
              const revisedContent = await reviseContentForWordCount(
                convertedResponse,
                targetWordCount,
                {
                  ...formState,
                  prioritizeWordCount: true,
                  forceElaborationsExamples: true
                },
                progressCallback,
                persona
              );
              return { content: revisedContent, personaUsed: persona };
            } catch (revisionError) {
              console.error(`Error revising ${persona}-styled content:`, revisionError);
              // Continue with converted content if revision fails
            }
          }
        }
        
 return { content: parsedResponse, personaUsed: persona };
      } catch (err) {
        console.warn('Error parsing structured content response:', err);
        
        // If parsing fails, create a structured object
        const structuredFallback = {
          headline: persona + "'s Version",
          sections: [
            {
              title: "Restyled Content",
              content: responseContent
            }
          ]
        };
        
        // Check if word count revision is needed for fallback
        if (targetWordCount && formState?.prioritizeWordCount) {
          const contentWordCount = extractWordCount(structuredFallback);
          const minimumAcceptable = Math.floor(targetWordCount * 0.98);
          
          if (contentWordCount < minimumAcceptable) {
            try {
              const revisedContent = await reviseContentForWordCount(
                structuredFallback,
                targetWordCount,
                {
                  ...formState,
                  prioritizeWordCount: true,
                  forceElaborationsExamples: true
                },
                progressCallback,
                persona
              );
              return { content: revisedContent, personaUsed: persona };
            } catch (revisionError) {
              console.error(`Error revising fallback ${persona}-styled content:`, revisionError);
              // Continue with fallback if revision fails
            }
          }
        }
        
        return { content: structuredFallback, personaUsed: persona };
      }
    }
    
    // For plain text content
    if (targetWordCount && formState?.prioritizeWordCount) {
      // Get current word count
      const contentWords = responseContent.trim().split(/\s+/).length;
      const minimumAcceptable = Math.floor(targetWordCount * 0.98); // Stricter threshold
      
      if (progressCallback) {
        progressCallback(`Generated content in ${persona}'s voice: ${contentWords} words (${Math.round(contentWords/targetWordCount*100)}% of target)`);
      }
      
      // If the content is significantly shorter than requested, try to revise it
      if (contentWords < minimumAcceptable) {
        if (progressCallback) {
          progressCallback(`${persona}-styled content too short (${contentWords}/${targetWordCount} words). Revising...`);
        }
        
        try {
          // FIRST REVISION ATTEMPT - Enhanced parameters for better word count adherence
          const revisedContent = await reviseContentForWordCount(
            responseContent,
            targetWordCount,
            {
              ...formState,
              prioritizeWordCount: true,
              forceElaborationsExamples: true
            },
            progressCallback,
            persona
          );
          
          // Get revised word count
          const revisedWords = typeof revisedContent === 'string' 
            ? revisedContent.trim().split(/\s+/).length
            : extractWordCount(revisedContent);
          
          if (progressCallback) {
            progressCallback(`Revised ${persona}-styled content: ${revisedWords} words (${Math.round(revisedWords/targetWordCount*100)}% of target)`);
          }
          
          // SECOND REVISION ATTEMPT IF STILL TOO SHORT
          if (revisedWords < minimumAcceptable) {
            if (progressCallback) {
              progressCallback(`${persona}-styled content still below target. Making second attempt...`);
            }
            
            try {
              // Make a more aggressive second attempt with maximum elaboration settings
              const secondRevision = await reviseContentForWordCount(
                revisedContent,
                targetWordCount,
                {
                  ...formState,
                  prioritizeWordCount: true,
                  forceElaborationsExamples: true,
                  forceKeywordIntegration: true // Add keyword integration to encourage more content
                },
                progressCallback,
                persona
              );
              
              const secondRevisedWords = typeof secondRevision === 'string'
                ? secondRevision.trim().split(/\s+/).length
                : extractWordCount(secondRevision);
                
              if (progressCallback) {
                progressCallback(`Second revision: ${secondRevisedWords} words (${Math.round(secondRevisedWords/targetWordCount*100)}% of target)`);
              }
              
              // THIRD EMERGENCY REVISION IF STILL SHORT
              if (secondRevisedWords < minimumAcceptable) {
                if (progressCallback) {
                  progressCallback(`Content still below target. Making final emergency revision...`);
                }
                
                try {
                  // Direct approach with highest temperature and focus solely on expansion
                  const expansionSystemPrompt = `You are ${persona}. Your ONLY task is to expand this content to EXACTLY ${targetWordCount} words while maintaining my distinctive voice. Add valuable content with detailed examples, stories, and elaborations. NEVER use filler or fluff.`;
                  
                  const expansionUserPrompt = `This content needs to be expanded to EXACTLY ${targetWordCount} words:
                  
                  """
                  ${typeof secondRevision === 'string' ? secondRevision : JSON.stringify(secondRevision, null, 2)}
                  """
                  
                  Current word count: ${secondRevisedWords} words
                  Target: ${targetWordCount} words (currently at ${Math.round(secondRevisedWords/targetWordCount*100)}%)
                  
                  Add more substantive content - examples, analogies, elaborations, details - while keeping my (${persona}'s) distinctive voice and style.
                  
                  CRITICAL: The content MUST be EXACTLY ${targetWordCount} words. Count your words meticulously before submitting. This is a non-negotiable requirement.`;
                  
                  const emergencyRequestBody = {
                    model,
                    messages: [
                      { role: 'system', content: expansionSystemPrompt },
                      { role: 'user', content: expansionUserPrompt }
                    ],
                    temperature: 1.0,
                    max_tokens: maxTokens
                  };
                  
                  const emergencyResponse = await fetch(`${baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(emergencyRequestBody)
                  });
                  
                  const emergencyData = await handleApiResponse<{
                    choices: { message: { content: string } }[];
                  }>(emergencyResponse);
                  
                  const emergencyContent = emergencyData.choices[0]?.message?.content;
                  
                  if (emergencyContent) {
                    const finalWordCount = emergencyContent.trim().split(/\s+/).length;
                    
                    if (progressCallback) {
                      progressCallback(`Final emergency revision: ${finalWordCount} words (${Math.round(finalWordCount/targetWordCount*100)}% of target)`);
                    }
                    
                    return { content: emergencyContent, personaUsed: persona };
                  }
                } catch (emergencyError) {
                  console.error(`Error in emergency revision of ${persona}-styled content:`, emergencyError);
                  // Fall back to second revision if emergency attempt fails
                  return { content: secondRevision, personaUsed: persona };
                }
              }
              
              return { content: secondRevision, personaUsed: persona };
            } catch (secondRevisionError) {
              console.error(`Error in second revision of ${persona}-styled text content:`, secondRevisionError);
              // Return the first revision if second fails
              return { content: revisedContent, personaUsed: persona };
            }
          }
          
          return { content: revisedContent, personaUsed: persona };
        } catch (revisionError) {
          console.error(`Error revising ${persona}-styled text content:`, revisionError);
          if (progressCallback) {
            progressCallback(`Error revising content: ${revisionError.message}`);
          }
          // Return the original response content if revision fails
        }
      }
    }
    
    // Return text content for plain text inputs
    return { content: responseContent, personaUsed: persona };
  } catch (error) {
    console.error(`Error applying ${persona}'s voice:`, error);
    
    // Generate a more specific error message
    const errorMessage = generateErrorMessage(error);
    
    if (progressCallback) {
      progressCallback(`Error applying ${persona}'s voice: ${errorMessage}`);
    }
    
    // Return the original content in case of error
    return { content, personaUsed: persona };
  }
}