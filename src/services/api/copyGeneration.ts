/**
 * Main copy generation functionality
 */
import { FormState, User, CopyResult } from '../../types';
import { getApiConfig, handleApiResponse, storePrompts, calculateTargetWordCount, extractWordCount } from './utils';
import { trackTokenUsage } from './tokenTracking';
import { saveCopySession } from '../supabaseClient';
import { reviseContentForWordCount } from './contentRefinement';

/**
 * Generate copy based on form state
 * @param formState - The form state with generation settings
 * @param currentUser - The current user (for token tracking)
 * @param sessionId - Optional session ID for updating an existing session
 * @param progressCallback - Optional callback for reporting progress
 * @returns A CopyResult object with the generated content
 */
export async function generateCopy(
  formState: FormState,
  currentUser?: User,
  sessionId?: string,
  progressCallback?: (message: string) => void
): Promise<CopyResult> {
  // Get API configuration
  const { apiKey, baseUrl, headers, maxTokens } = getApiConfig(formState.model);
  
  // Calculate target word count
  const targetWordCount = calculateTargetWordCount(formState);
  
  // Progress reporting if callback provided
  if (progressCallback) {
    progressCallback(`Initializing copy generation with ${formState.model}...`);
  }
  
  // Auto-distribute word counts if output structure is provided but counts are missing
  if (formState.outputStructure && formState.outputStructure.length > 0) {
    const missingWordCounts = formState.outputStructure.every(
      section => !section.wordCount || section.wordCount === 0
    );

    if (missingWordCounts) {
      const perSection = Math.floor(targetWordCount / formState.outputStructure.length);
      formState.outputStructure = formState.outputStructure.map(section => ({
        ...section,
        wordCount: perSection
      }));
      
      console.log(`Auto-distributed word count: ${perSection} words per section across ${formState.outputStructure.length} sections`);
      
      if (progressCallback) {
        progressCallback(`Auto-distributed ${targetWordCount} words across ${formState.outputStructure.length} sections`);
      }
    }
  }
  
  // Build the system prompt
  const systemPrompt = buildSystemPrompt(formState, targetWordCount);
  
  // Build the user prompt
  const userPrompt = buildUserPrompt(formState, targetWordCount);
  
  // Store the prompts for display in the UI
  storePrompts(systemPrompt, userPrompt);
  
  if (progressCallback) {
    progressCallback(`Generating ${formState.tab === 'create' ? 'new' : 'improved'} copy with target of ${targetWordCount} words...`);
  }
  
  // Determine if we should use JSON format
  const useJsonFormat = formState.outputStructure && formState.outputStructure.length > 0;
  
  // Prepare the API request
  const requestBody = {
    model: formState.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: maxTokens, // Use dynamic token limit from API config
    response_format: useJsonFormat ? { type: "json_object" } : undefined
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
      currentUser,
      tokenUsage,
      formState.model,
      `generate_${formState.tab}_copy`,
      formState.briefDescription || `Generate ${formState.tab} copy`
    );
    
    // Extract the content from the response
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in response');
    }
    
    // Parse the content as needed
    let improvedCopy = content;
    
    // Handle JSON responses
    if (useJsonFormat) {
      try {
        improvedCopy = JSON.parse(content);
      } catch (err) {
        console.warn('Failed to parse JSON response, using plain text:', err);
      }
    }
    
    // Get the current word count
    const currentWordCount = extractWordCount(improvedCopy);
    
    if (progressCallback) {
      progressCallback(`Initial copy generated with ${currentWordCount} words (target: ${targetWordCount})`);
    }
    
    // Check word count if strict adherence is required
    if (formState.prioritizeWordCount) {
      // Use the user-defined tolerance instead of hardcoded 0.98
      const tolerancePercentage = formState.wordCountTolerance !== undefined ? formState.wordCountTolerance / 100 : 0.02;
      const minimumAcceptable = Math.floor(targetWordCount * (1 - tolerancePercentage));
      
      // If the content is significantly shorter than requested, try to revise it
      if (currentWordCount < minimumAcceptable) {
        console.warn(`Generated content too short: ${currentWordCount} words vs target of ${targetWordCount} words`);
        
        if (progressCallback) {
          progressCallback(`Content below target word count. Revising to meet ${targetWordCount} words...`);
        }
        
        try {
          // First revision attempt
          const revisedContent = await reviseContentForWordCount(
            improvedCopy,
            targetWordCount,
            formState,
            progressCallback
          );
          
          // Update with the revised content
          improvedCopy = revisedContent;
          
          // Log the updated word count
          const revisedWordCount = extractWordCount(revisedContent);
          console.log(`Revised content word count: ${revisedWordCount} words`);
          
          // If still too short after first revision, try a second time with more aggressive expansion
          if (revisedWordCount < minimumAcceptable) {
            if (progressCallback) {
              progressCallback(`Content still below target after revision. Making second attempt...`);
            }
            
            try {
              // Make a more aggressive second attempt
              const secondRevision = await reviseContentForWordCount(
                revisedContent,
                targetWordCount,
                {...formState, forceElaborationsExamples: true}, // Force elaborations for second attempt
                progressCallback
              );
              
              improvedCopy = secondRevision;
              const secondRevisedWordCount = extractWordCount(secondRevision);
              
              if (progressCallback) {
                progressCallback(`Second revision complete: ${secondRevisedWordCount} words`);
              }
              
              // If still too short, try a third and final attempt as a last resort
              if (secondRevisedWordCount < minimumAcceptable) {
                if (progressCallback) {
                  progressCallback(`Content still below target. Making final revision attempt...`);
                }
                
                try {
                  // Final attempt with maximum elaboration
                  const finalRevision = await reviseContentForWordCount(
                    secondRevision,
                    targetWordCount,
                    {
                      ...formState, 
                      forceElaborationsExamples: true,
                      forceKeywordIntegration: true
                    },
                    progressCallback
                  );
                  
                  improvedCopy = finalRevision;
                  const finalWordCount = extractWordCount(finalRevision);
                  
                  if (progressCallback) {
                    progressCallback(`Final content word count: ${finalWordCount} words`);
                  }
                } catch (finalRevisionError) {
                  console.error('Error in final content revision:', finalRevisionError);
                  // Keep second revision if final attempt fails
                }
              }
            } catch (secondRevisionError) {
              console.error('Error in second content revision:', secondRevisionError);
              // Keep first revision if second attempt fails
            }
          }
          
        } catch (revisionError) {
          console.error('Error revising content for word count:', revisionError);
          if (progressCallback) {
            progressCallback(`Error revising content: ${revisionError.message}`);
          }
          // Continue with original content if revision fails
        }
      }
    }
    
    // Create the result object with just the improved copy - no alternative or humanized versions initially
    const result: CopyResult = {
      improvedCopy,
      promptUsed: userPrompt // Store for token calculation
    };
    
    // Save to database if session ID is provided
    if (sessionId) {
      try {
        const { data: sessionData, error: sessionError } = await saveCopySession(
          formState, 
          improvedCopy, 
          undefined, 
          sessionId
        );
        
        if (sessionError) {
          console.error('Error updating copy session:', sessionError);
        } else {
          console.log('Copy session updated:', sessionData?.id);
        }
      } catch (err) {
        console.error('Error saving copy session:', err);
        // Continue even if save fails
      }
    } else if (currentUser) {
      // Create a new session if user is logged in
      try {
        const { data: sessionData, error: sessionError } = await saveCopySession(
          formState,
          improvedCopy
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
  } catch (error) {
    console.error('Error generating copy:', error);
    if (progressCallback) {
      progressCallback(`Error generating copy: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Build the system prompt based on form state
 */
function buildSystemPrompt(formState: FormState, targetWordCount: number): string {
  let systemPrompt = `You are an expert copywriter with years of experience in creating persuasive, engaging, and effective marketing copy.

Your task is to create new marketing copy based on the provided information.

The copy should be in ${formState.language} language with a ${formState.tone} tone.

The copy **must be at least ${targetWordCount} words long** — do not stop early.
You must generate content until this word count is reached or exceeded.
If unsure, add more depth, examples, and elaboration to meet this word count.
Do not summarize or conclude early. Expand all sections fully with rich, detailed, persuasive content.`;

  // Add tab-specific instructions
  if (formState.tab === 'create') {
    systemPrompt += `\n\nYou will create compelling new marketing copy based on the business description provided. Your copy should effectively communicate the unique value proposition and connect with the target audience at an emotional level.`;
  } else {
    systemPrompt += `\n\nYou will improve the existing marketing copy while maintaining its core message. Your improvements should enhance clarity, persuasiveness, engagement, and strategic alignment while preserving the essential brand identity.`;
  }
  
  // Add tone level instructions if specified
  if (formState.toneLevel !== undefined) {
    if (formState.toneLevel < 25) {
      systemPrompt += `\n\nUse a very formal tone that is appropriate for academic or corporate contexts.`;
    } else if (formState.toneLevel < 50) {
      systemPrompt += `\n\nUse a moderately formal tone that is professional but approachable.`;
    } else if (formState.toneLevel < 75) {
      systemPrompt += `\n\nUse a conversational tone that balances professionalism with approachability.`;
    } else {
      systemPrompt += `\n\nUse a casual, friendly tone that feels like a conversation with a trusted friend.`;
    }
  }
  
  // Add writing style instructions if specified
  if (formState.preferredWritingStyle) {
    systemPrompt += `\n\nPreferred writing style: ${formState.preferredWritingStyle}`;
  }
  
  // Add language style constraints if specified
  if (formState.languageStyleConstraints && formState.languageStyleConstraints.length > 0) {
    systemPrompt += `\n\nLanguage style constraints to follow:`;
    formState.languageStyleConstraints.forEach(constraint => {
      systemPrompt += `\n- ${constraint}`;
    });
  }
  
  // Add section-specific instructions
  if (formState.section) {
    systemPrompt += `\n\nThis copy is for the "${formState.section}" section.`;
    
    // Add section-specific guidance
    switch (formState.section) {
      case 'Hero Section':
        systemPrompt += ` Focus on creating an attention-grabbing headline and compelling value proposition that immediately communicates the core benefit and establishes an emotional connection.`;
        break;
      case 'Benefits':
        systemPrompt += ` Focus on clearly articulating the key benefits for the customer, with persuasive language that transforms features into meaningful advantages. Use benefit-driven headlines and supportive evidence.`;
        break;
      case 'Features':
        systemPrompt += ` Describe the key features and how they solve specific problems for the user. Focus on the "so what" of each feature - explaining not just what it does, but why it matters to the user.`;
        break;
      case 'Services':
        systemPrompt += ` Outline the services offered with a focus on value delivered and outcomes achieved. Highlight differentiation factors and expertise.`;
        break;
      case 'About':
        systemPrompt += ` Create an engaging narrative about the business, its mission, values, and unique story. Connect the organization's purpose to customer needs.`;
        break;
      case 'Testimonials':
        systemPrompt += ` Frame testimonials effectively to maximize social proof, highlighting specific results and emotional impact. Create contextual introductions that enhance credibility.`;
        break;
      case 'FAQ':
        systemPrompt += ` Create clear questions and informative answers that address common concerns while subtly reinforcing key selling points and overcoming objections.`;
        break;
      case 'Full Copy':
        systemPrompt += ` Create a comprehensive marketing piece that covers all key aspects: problem identification, solution presentation, benefits explanation, feature details, and a compelling call to action.`;
        break;
    }
  }
  
  // Add instructions for structured output if requested
  if (formState.outputStructure && formState.outputStructure.length > 0) {
    systemPrompt += `\n\nYou must format your response as a JSON object with a headline and sections. This structured format should enhance readability and impact, not constrain your creativity.`;
    
    // Add word count allocations if specified
    const hasWordCountAllocations = formState.outputStructure.some(element => element.wordCount !== null && element.wordCount !== undefined);
    
    if (hasWordCountAllocations) {
      systemPrompt += ` Follow these specific word count allocations for each section:`;
      formState.outputStructure.forEach(element => {
        if (element.wordCount) {
          systemPrompt += `\n- "${element.label || element.value}": ${element.wordCount} words`;
        }
      });
      
      systemPrompt += `\n\nEnsure each section meets its target word count. If one is underdeveloped, expand that section until it reaches the specified length.`;
    }
  }
  
  // Add keyword instructions if needed
  if (formState.forceKeywordIntegration && formState.keywords) {
    systemPrompt += `\n\nIMPORTANT: You MUST naturally integrate all of these keywords throughout the copy: ${formState.keywords}. Keywords should be placed strategically where they enhance meaning and SEO value, not forced in ways that disrupt readability.`;
  }
  
  // Add elaboration instructions if needed
  if (formState.forceElaborationsExamples) {
    systemPrompt += `\n\nIMPORTANT: Include detailed explanations, specific examples, and where appropriate, brief case studies or scenarios to fully elaborate on your points. Make sure to substantiate claims with evidence or reasoning. Your content should feel complete and authoritative, leaving readers with no unanswered questions.`;
  }
  
  // Add priority instructions for strict word count adherence
  if (formState.prioritizeWordCount) {
    systemPrompt += `\n\nCRITICAL: You MUST adhere strictly to the target word count of ${targetWordCount} words. This is a non-negotiable requirement. If your first draft is too short or too long, revise it immediately to match the exact target. The final word count is a critical success metric for this copy.
    
IMPORTANT: If the generated output is shorter than ${targetWordCount} words, you MUST revise and expand until this word count is met. Include more elaboration, examples, case studies, or in-depth explanations—do not conclude early.`;
  }

  // Add guidance for creating a comprehensive marketing piece
  systemPrompt += `\n\nYour copy should:
  1. Be persuasive, clear, and engaging with a logical flow that guides the reader
  2. Use proper grammar and spelling appropriate for the language (${formState.language})
  3. Create fresh, original copy based on the provided information
  4. Highlight unique selling points and benefits effectively
  5. Include a compelling call to action where appropriate
  6. Speak directly to the audience's needs and desires
  7. Be scannable with appropriate headings, subheadings, and paragraph breaks
  8. Convey professionalism and authority in the subject matter
  
The final output must meet or exceed the target word count of ${targetWordCount} words. Do not stop short. Expand all sections with meaningful content to reach this goal.`;
  
  return systemPrompt;
}

/**
 * Build the user prompt based on form state
 */
function buildUserPrompt(formState: FormState, targetWordCount: number): string {
  let userPrompt = '';
  
  // Different prompts based on tab (create/improve)
  if (formState.tab === 'create') {
    userPrompt = `Create compelling marketing copy based on this business description:

"""
${formState.businessDescription}
"""`;
  } else {
    userPrompt = `Improve this existing marketing copy:

"""
${formState.originalCopy}
"""`;
  }
  
  // Add key information
  userPrompt += `\n\nKey information:`;
  if (formState.targetAudience) userPrompt += `\n- Target audience: ${formState.targetAudience}`;
  if (formState.keyMessage) userPrompt += `\n- Key message: ${formState.keyMessage}`;
  if (formState.callToAction) userPrompt += `\n- Call to action: ${formState.callToAction}`;
  if (formState.desiredEmotion) userPrompt += `\n- Desired emotion: ${formState.desiredEmotion}`;
  if (formState.brandValues) userPrompt += `\n- Brand values: ${formState.brandValues}`;
  if (formState.keywords) userPrompt += `\n- Keywords: ${formState.keywords}`;
  if (formState.context) userPrompt += `\n- Context: ${formState.context}`;
  if (formState.industryNiche) userPrompt += `\n- Industry/Niche: ${formState.industryNiche}`;
  if (formState.productServiceName) userPrompt += `\n- Product/Service Name: ${formState.productServiceName}`;
  if (formState.readerFunnelStage) userPrompt += `\n- Reader's Stage in Funnel: ${formState.readerFunnelStage}`;
  
  // Add target length instructions
  userPrompt += `\n\n- Target length: The copy MUST be at least ${targetWordCount} words long.`;
  userPrompt += `\n- Tone: ${formState.tone}`;
  userPrompt += `\n- Language: ${formState.language}`;
  
  // Add competitor information if available
  if (formState.competitorUrls && formState.competitorUrls.some(url => url.trim().length > 0)) {
    userPrompt += `\n\nCompetitor URLs to consider for differentiation:`;
    formState.competitorUrls.forEach(url => {
      if (url.trim()) {
        userPrompt += `\n- ${url.trim()}`;
      }
    });
  }
  
  if (formState.competitorCopyText && formState.competitorCopyText.trim()) {
    userPrompt += `\n\nCompetitor copy to outperform:
"""
${formState.competitorCopyText.trim()}
"""`;
  }
  
  // Add pain points if available
  if (formState.targetAudiencePainPoints && formState.targetAudiencePainPoints.trim()) {
    userPrompt += `\n\nTarget audience pain points to address:
"""
${formState.targetAudiencePainPoints.trim()}
"""`;
  }
  
  // Determine response format based on output structure
  const useJsonFormat = formState.outputStructure && formState.outputStructure.length > 0;
  
  if (useJsonFormat) {
    userPrompt += `\n\nStructure your response in this JSON format:
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
}`;

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
  
  // Add reminder about word count
  userPrompt += `\n\nREMINDER: The entire copy must meet or exceed ${targetWordCount} words. Add depth through examples, explanations, and elaboration rather than filler text. Do not summarize or conclude early.`;
  
  return userPrompt;
}