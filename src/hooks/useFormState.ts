import { useState, useCallback } from 'react';
import { FormState, Template, CopySession, SavedOutput, GeneratedContentItem, GeneratedContentItemType } from '../types';
import { DEFAULT_FORM_STATE } from '../constants';
import { v4 as uuidv4 } from 'uuid';

export function useFormState() {
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE);

  /**
   * Load form state from a template
   */
  const loadFormStateFromTemplate = useCallback((template: Template, setFormState: (state: FormState) => void) => {
    setFormState(prevState => {
      // Create a new state object with the template data
      const newState: FormState = {
        ...DEFAULT_FORM_STATE,
        tab: template.template_type as 'create' | 'improve',
        language: template.language,
        tone: template.tone,
        wordCount: template.word_count,
        customWordCount: template.custom_word_count || undefined,
        targetAudience: template.target_audience || undefined,
        keyMessage: template.key_message || undefined,
        desiredEmotion: template.desired_emotion || undefined,
        callToAction: template.call_to_action || undefined,
        brandValues: template.brand_values || undefined,
        keywords: template.keywords || undefined,
        context: template.context || undefined,
        briefDescription: template.brief_description || undefined,
        pageType: template.page_type || undefined,
        businessDescription: template.business_description || undefined,
        originalCopy: template.original_copy || undefined,
        competitorUrls: template.competitor_urls || ['', '', ''],
        section: template.section || undefined,
        outputStructure: template.output_structure 
          ? typeof template.output_structure === 'string'
            ? JSON.parse(template.output_structure)
            : template.output_structure
          : [],
        
        // New fields
        productServiceName: template.product_service_name || undefined,
        industryNiche: template.industry_niche || undefined,
        toneLevel: template.tone_level || 50,
        readerFunnelStage: template.reader_funnel_stage || undefined,
        competitorCopyText: template.competitor_copy_text || undefined,
        targetAudiencePainPoints: template.target_audience_pain_points || undefined,
        preferredWritingStyle: template.preferred_writing_style || undefined,
        languageStyleConstraints: template.language_style_constraints || [],
        
        // Generation options - try different field names since there are camelCase and snake_case versions
        generateHeadlines: template.generateHeadlines || template.generateheadlines || false,
        generateScores: template.generateScores || template.generatescores || false,
        // Counts
        numberOfHeadlines: 
          template.numberOfHeadlines || 
          template.numberofheadlines || 
          3,
        // New word count control features
        sectionBreakdown: template.sectionBreakdown || template.section_breakdown,
        forceElaborationsExamples: template.forceElaborationsExamples || template.force_elaborations_examples || false,
        forceKeywordIntegration: template.forceKeywordIntegration || template.force_keyword_integration || false,
        // Add mapping for prioritizeWordCount
        prioritizeWordCount: template.prioritizeWordCount || template.prioritize_word_count || false,
        
        // Keep model and other fields from previous state
        model: prevState.model,
        
        // Reset loading states
        isLoading: false,
        isEvaluating: false,
        generationProgress: []
      };
      
      return newState;
    });
  }, []);

  /**
   * Load form state from a copy session
   */
  const loadFormStateFromSession = useCallback((session: CopySession, setFormState: (state: FormState) => void, currentFormState: FormState) => {
    if (!session || !session.input_data) {
      return;
    }
    
    setFormState((prevState: FormState) => {
      // Extract input data from the session
      const inputData = session.input_data;
      
      // Create a new state object with the session data
      const newState: FormState = {
        ...DEFAULT_FORM_STATE,
        ...inputData,
        sessionId: session.id,
        customerId: session.customer_id || undefined,
        customerName: session.customer?.name || undefined,
        
        // Keep model and other fields from previous state
        model: inputData.model || prevState.model,
        
        // Initialize loading states
        isLoading: false,
        isEvaluating: false,
        generationProgress: []
      };
      
      // Handle the improved copy and alternative copy (which might be strings or objects)
      if (session.improved_copy) {
        // Create generatedVersions array to hold all content items
        const generatedVersions: GeneratedContentItem[] = [];
        
        // Add improved copy to generatedVersions
        generatedVersions.push({
          id: uuidv4(),
          type: GeneratedContentItemType.Improved,
          content: session.improved_copy,
          generatedAt: session.created_at || new Date().toISOString()
        });
        
        // Add alternative copy to generatedVersions if it exists
        if (session.alternative_copy) {
          generatedVersions.push({
            id: uuidv4(),
            type: GeneratedContentItemType.Alternative,
            content: session.alternative_copy,
            generatedAt: session.created_at || new Date().toISOString()
          });
        }
        
        if (!newState.copyResult) {
          newState.copyResult = { 
            improvedCopy: session.improved_copy,
            sessionId: session.id,
            generatedVersions: generatedVersions
          };
        } else {
          newState.copyResult.improvedCopy = session.improved_copy;
          newState.copyResult.sessionId = session.id;
          newState.copyResult.generatedVersions = generatedVersions;
        }
        
        if (session.alternative_copy) {
          newState.copyResult.alternativeCopy = session.alternative_copy;
        }
      }
      
      return newState;
    });
  }, []);

  /**
   * Load form state from a saved output
   */
  const loadFormStateFromSavedOutput = useCallback((savedOutput: SavedOutput, setFormState: (state: FormState) => void, currentFormState: FormState) => {
    if (!savedOutput || !savedOutput.input_snapshot || !savedOutput.output_content) {
      return;
    }
    
    setFormState((prevState: FormState) => {
      // Extract input data and output content from the saved output
      const inputSnapshot = savedOutput.input_snapshot;
      
      // Create a new state object with the saved output data
      const newState: FormState = {
        ...DEFAULT_FORM_STATE,
        ...inputSnapshot,
        customerId: savedOutput.customer_id || undefined,
        customerName: savedOutput.customer?.name || undefined,
        
        // Keep model and other fields from previous state if not in snapshot
        model: inputSnapshot.model || prevState.model,
        
        // Set the copyResult directly from the saved output's output_content
        copyResult: savedOutput.output_content,
        
        // Initialize loading states
        isLoading: false,
        isEvaluating: false,
        generationProgress: []
      };
      
      // If the saved output has a session ID, set it
      if (savedOutput.input_snapshot.sessionId) {
        newState.sessionId = savedOutput.input_snapshot.sessionId;
      }
      
      return newState;
    });
  }, []);

  return {
    formState,
    setFormState,
    loadFormStateFromTemplate,
    loadFormStateFromSession,
    loadFormStateFromSavedOutput,
  };
}