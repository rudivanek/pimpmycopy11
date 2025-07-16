import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import {
  FormState,
  CopyResult,
  PromptEvaluation,
  User,
  GeneratedContentItem,
  GeneratedContentItemType,
  StructuredCopyOutput
} from '../types';
import {
  generateCopy,
  generateAlternativeCopy,
  generateHeadlines,
  evaluatePrompt,
  getLastPrompts,
  saveCopySession,
  getCopySession,
  updateCopySessionField,
  getTemplate,
  saveTemplate,
  getSavedOutput,
  saveSavedOutput,
} from '../services/apiService';
import { DEFAULT_FORM_STATE } from '../constants';
import Header from './Header';
import CopyForm from './CopyForm';
import ResultsSection from './results/ResultsSection';
import AppSpinner from './ui/AppSpinner';
import PromptDisplay from './PromptDisplay';
import { useAuth } from '../hooks/useAuth';
import { useFormState } from '../hooks/useFormState';
import { useMode } from '../context/ModeContext';
import { calculateTargetWordCount } from '../services/api/utils';

const App: React.FC = () => {
  const { currentUser, isInitialized, initError, fallbackToDemoMode } = useAuth();
  const { formState, setFormState, loadFormStateFromTemplate, loadFormStateFromSession, loadFormStateFromSavedOutput } = useFormState();
  const { isSmartMode } = useMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null);
  const [loadedTemplateName, setLoadedTemplateName] = useState<string>('');
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const addProgressMessage = useCallback((message: string) => {
    setFormState(prevState => ({
      ...prevState,
      generationProgress: [...prevState.generationProgress, message]
    }));
  }, [setFormState]);

  // Load session or template from URL params
  useEffect(() => {
    const sessionId = searchParams.get('sessionId');
    const templateId = searchParams.get('templateId');
    const savedOutputId = searchParams.get('savedOutputId');

    const loadData = async () => {
      if (!currentUser || !currentUser.id) return;

      if (sessionId) {
        addProgressMessage('Loading session...');
        setFormState(prev => ({ ...prev, isLoading: true }));
        try {
          const { data, error } = await getCopySession(sessionId);
          if (error) throw error;
          if (data) {
            loadFormStateFromSession(data, setFormState, formState);
            toast.success('Session loaded successfully!');
          }
        } catch (error: any) {
          console.error('Error loading session:', error);
          toast.error(`Failed to load session: ${error.message}`);
        } finally {
          setFormState(prev => ({ ...prev, isLoading: false }));
          addProgressMessage('Session loading complete.');
          setSearchParams({}); // Clear param after loading
        }
      } else if (templateId) {
        addProgressMessage('Loading template...');
        setFormState(prev => ({ ...prev, isLoading: true }));
        try {
          const { data, error } = await getTemplate(templateId);
          if (error) throw error;
          if (data) {
            loadFormStateFromTemplate(data, setFormState);
            setLoadedTemplateId(data.id || null);
            setLoadedTemplateName(data.template_name || '');
            toast.success('Template loaded successfully!');
          }
        } catch (error: any) {
          console.error('Error loading template:', error);
          toast.error(`Failed to load template: ${error.message}`);
        } finally {
          setFormState(prev => ({ ...prev, isLoading: false }));
          addProgressMessage('Template loading complete.');
          setSearchParams({}); // Clear param after loading
        }
      } else if (savedOutputId) {
        addProgressMessage('Loading saved output...');
        setFormState(prev => ({ ...prev, isLoading: true }));
        try {
          const { data, error } = await getSavedOutput(savedOutputId);
          if (error) throw error;
          if (data) {
            loadFormStateFromSavedOutput(data, setFormState, formState);
            toast.success('Saved output loaded successfully!');
          }
        } catch (error: any) {
          console.error('Error loading saved output:', error);
          toast.error(`Failed to load saved output: ${error.message}`);
        } finally {
          setFormState(prev => ({ ...prev, isLoading: false }));
          addProgressMessage('Saved output loading complete.');
          setSearchParams({}); // Clear param after loading
        }
      }
    };

    if (isInitialized && currentUser) {
      loadData();
    }
  }, [searchParams, currentUser, isInitialized, setFormState, loadFormStateFromTemplate, loadFormStateFromSession, loadFormStateFromSavedOutput, addProgressMessage, setSearchParams, formState]);

  // Handle initial copy generation
  const handleGenerate = async () => {
    if (!currentUser) {
      toast.error('Please log in to generate copy.');
      return;
    }

    setFormState(prev => ({
      ...prev,
      isLoading: true, 
      generationProgress: [],
      copyResult: {
        ...prev.copyResult,
        generatedVersions: [] // Clear previous results
      }
    }));
    addProgressMessage('Starting copy generation...');

    try {
      // Generate initial improved copy with worker or direct API
      const result = await generateCopy(formState, currentUser, formState.sessionId, addProgressMessage);
      const improvedCopyItem: GeneratedContentItem = {
        id: uuidv4(),
        type: GeneratedContentItemType.Improved,
        content: result.improvedCopy,
        generatedAt: new Date().toISOString(),
        sourceDisplayName: 'Initial Generation'
      };

      setFormState(prev => ({
        ...prev,
        copyResult: {
          ...prev.copyResult,
          improvedCopy: result.improvedCopy, // Keep for backward compatibility
          generatedVersions: [...prev.copyResult.generatedVersions, improvedCopyItem]
        }
      }));
      addProgressMessage('Improved copy generated.');

      if (formState.generateAlternative && formState.numberOfAlternativeVersions && formState.numberOfAlternativeVersions > 0) {
        for (let i = 0; i < formState.numberOfAlternativeVersions; i++) {
          addProgressMessage(`Generating alternative version ${i + 1}...`);
          const alternativeContent = await generateAlternativeCopy(formState, result.improvedCopy, formState.sessionId, addProgressMessage);
          const alternativeItem: GeneratedContentItem = {
            id: uuidv4(),
            type: GeneratedContentItemType.Alternative,
            content: alternativeContent,
            generatedAt: new Date().toISOString(),
            sourceId: improvedCopyItem.id,
            sourceType: GeneratedContentItemType.Improved,
            sourceIndex: i, // Use index for alternative versions
            sourceDisplayName: `Alternative Version ${i + 1} from Standard Version`
          };

          setFormState(prev => ({
            ...prev,
            copyResult: {
              ...prev.copyResult,
              generatedVersions: [...prev.copyResult.generatedVersions, alternativeItem]
            }
          }));
          addProgressMessage(`Alternative version ${i + 1} generated.`);
        }
      }

      // Generate headlines if enabled
      if (formState.generateHeadlines === true && formState.numberOfHeadlines && formState.numberOfHeadlines > 0) {
        addProgressMessage(`Generating ${formState.numberOfHeadlines} headlines...`);
        const headlines = await generateHeadlines(result.improvedCopy, formState, formState.numberOfHeadlines, addProgressMessage);
        const headlinesItem: GeneratedContentItem = {
          id: uuidv4(),
          type: GeneratedContentItemType.Headlines,
          content: headlines,
          generatedAt: new Date().toISOString(),
          sourceId: improvedCopyItem.id,
          sourceType: GeneratedContentItemType.Improved,
          sourceDisplayName: 'Headlines from Standard Version'
        };

        setFormState(prev => ({
          ...prev,
          copyResult: {
            ...prev.copyResult,
            generatedVersions: [...prev.copyResult.generatedVersions, headlinesItem]
          }
        }));
        addProgressMessage('Headlines generated.');
      }

      toast.success('Copy generated successfully!');
    } catch (error: any) {
      console.error('Error generating copy:', error);
      toast.error(`Failed to generate copy: ${error.message}`);
    } 
    finally {
      // Always reset loading state
      setFormState(prev => ({ ...prev, isLoading: false }));
      addProgressMessage('Copy generation complete.');
    }
  };

  // Handle generating restyled content
  const handleGenerateRestyled = async (
    contentType: 'improved' | 'alternative' | 'humanized',
    sourceItem: GeneratedContentItem,
    selectedPersona: string
  ) => {
    if (!formState.copyResult) return;

    const persona = selectedPersona || formState.selectedPersona || '';

    if (!persona) {
      toast.error('Please select a voice style');
      return;
    }

    setFormState(prev => ({ ...prev, isGeneratingRestyledImproved: true })); // Generic loading for now

    try {      
      const contentToRestyle = sourceItem.content;
      const targetWordCount = calculateTargetWordCount(formState);

      const { content: restyledContent, personaUsed } = await restyleCopyWithPersona(
        contentToRestyle,
        persona,
        formState.model,
        formState.language,
        formState,
        targetWordCount,
        addProgressMessage
      );
      
      const restyledItem: GeneratedContentItem = {
        id: uuidv4(),
        type: GeneratedContentItemType.RestyledImproved, // Default, will be updated
        content: restyledContent,
        persona: personaUsed,
        generatedAt: new Date().toISOString(),
        sourceId: sourceItem.id,
        sourceType: sourceItem.type,
        sourceDisplayName: `${personaUsed}'s Voice from ${sourceItem.sourceDisplayName || sourceItem.type}`
      };

      // Determine the correct type for the restyled item
      if (sourceItem.type === GeneratedContentItemType.Improved) {
        restyledItem.type = GeneratedContentItemType.RestyledImproved;
      } else if (sourceItem.type === GeneratedContentItemType.Alternative) {
        restyledItem.type = GeneratedContentItemType.RestyledAlternative;
      } else if (sourceItem.type === GeneratedContentItemType.Humanized) {
        restyledItem.type = GeneratedContentItemType.RestyledHumanized;
      }

      setFormState(prev => ({
        ...prev,
        copyResult: {
          ...prev.copyResult,
          generatedVersions: [...prev.copyResult.generatedVersions, restyledItem]
        }
      }));

      addProgressMessage(`Applied ${personaUsed}'s voice style to ${sourceItem.sourceDisplayName || sourceItem.type}`);
      toast.success(`Applied ${personaUsed}'s voice style`);
    } catch (error) {
      console.error('Error generating restyled content:', error);
      toast.error('Failed to apply voice style. Please try again.');
    } finally {
      setFormState(prev => ({ ...prev, isGeneratingRestyledImproved: false })); // Generic loading for now
    }
  };

  // Handle generating restyled headlines
  const handleGenerateRestyledHeadlines = async (sourceItem: GeneratedContentItem, persona: string) => {
    if (!formState.copyResult || !Array.isArray(sourceItem.content) || sourceItem.content.length === 0) {
      toast.error('Please generate headlines first');
      return;
    }

    setFormState(prev => ({ ...prev, isGeneratingRestyledHeadlines: true }));

    try {
      const { content: restyledHeadlines, personaUsed } = await restyleCopyWithPersona(
        sourceItem.content,
        persona,
        formState.model,
        formState.language,
        formState,
        undefined,
        addProgressMessage,
        sourceItem.content.length // Pass original number of headlines
      );

      const restyledHeadlinesItem: GeneratedContentItem = {
        id: uuidv4(),
        type: GeneratedContentItemType.RestyledHeadlines,
        content: restyledHeadlines as string[],
        persona: personaUsed,
        generatedAt: new Date().toISOString(),
        sourceId: sourceItem.id,
        sourceType: GeneratedContentItemType.Headlines,
        sourceDisplayName: `${personaUsed}'s Voice from Headlines`
      };

      setFormState(prev => ({
        ...prev,
        copyResult: {
          ...prev.copyResult,
          generatedVersions: [...prev.copyResult.generatedVersions, restyledHeadlinesItem]
        }
      }));

      addProgressMessage(`Applied ${personaUsed}'s voice style to headlines`);
      toast.success(`Applied ${personaUsed}'s voice style to headlines`);
    } catch (error) {
      console.error('Error generating restyled headlines:', error);
      toast.error('Failed to apply voice style to headlines. Please try again.');
    } finally {
      setFormState(prev => ({ ...prev, isGeneratingRestyledHeadlines: false }));
    }
  };

  // New function to handle on-demand generation for any content item
  const handleOnDemandGeneration = async (
    actionType: 'alternative' | 'restyle',
    sourceItem: GeneratedContentItem,
    selectedPersona?: string // Only for restyle action
  ) => {
    if (!currentUser) {
      toast.error('Please log in to generate copy.');
      return;
    }

    setFormState(prev => ({ ...prev, isLoading: true, generationProgress: [] }));
    addProgressMessage(`Initiating on-demand generation for ${actionType} from ${sourceItem.sourceDisplayName || sourceItem.type}...`);

    try {
      let newItem: GeneratedContentItem | null = null;
      const targetWordCount = calculateTargetWordCount(formState);

      if (actionType === 'alternative') {
        addProgressMessage(`Generating alternative version from ${sourceItem.sourceDisplayName || sourceItem.type}...`);
        const alternativeContent = await generateAlternativeCopy(formState, sourceItem.content, formState.sessionId, addProgressMessage);
        newItem = {
          id: uuidv4(),
          type: GeneratedContentItemType.Alternative,
          content: alternativeContent,
          generatedAt: new Date().toISOString(),
          sourceId: sourceItem.id,
          sourceType: sourceItem.type,
          sourceDisplayName: `Alternative Version from ${sourceItem.sourceDisplayName || sourceItem.type}`
        };
        addProgressMessage('Alternative version generated.');
      } else if (actionType === 'restyle' && selectedPersona) {
       // Special handling for "Humanize" option
       if (selectedPersona === 'Humanize') {
         addProgressMessage(`Humanizing ${sourceItem.sourceDisplayName || sourceItem.type}...`);
         const humanizedContent = await generateHumanizedCopy(
           sourceItem.content,
           formState,
           addProgressMessage
         );
         
         newItem = {
           id: uuidv4(),
           type: GeneratedContentItemType.RestyledImproved, // Using the same type for UI consistency
           content: humanizedContent,
           persona: 'Humanize',
           generatedAt: new Date().toISOString(),
           sourceId: sourceItem.id,
           sourceType: sourceItem.type,
           sourceDisplayName: `Humanized Version of ${sourceItem.sourceDisplayName || sourceItem.type}`
         };
         
         // Determine the correct type for the humanized item
         if (sourceItem.type === GeneratedContentItemType.Improved) {
           newItem.type = GeneratedContentItemType.RestyledImproved;
         } else if (sourceItem.type === GeneratedContentItemType.Alternative) {
           newItem.type = GeneratedContentItemType.RestyledAlternative;
         } else if (sourceItem.type === GeneratedContentItemType.Headlines) {
           newItem.type = GeneratedContentItemType.RestyledHeadlines;
         }
         
         addProgressMessage('Humanization complete.');
       } else {
        addProgressMessage(`Applying ${selectedPersona}'s voice to ${sourceItem.sourceDisplayName || sourceItem.type}...`);
        const { content: restyledContent, personaUsed } = await restyleCopyWithPersona(
          sourceItem.content,
          selectedPersona,
          formState.model,
          formState.language,
          formState,
          targetWordCount,
          addProgressMessage,
          sourceItem.type === GeneratedContentItemType.Headlines ? (sourceItem.content as string[]).length : undefined
        );

        newItem = {
          id: uuidv4(),
          type: GeneratedContentItemType.RestyledImproved, // Default, will be updated
          content: restyledContent,
          persona: personaUsed,
          generatedAt: new Date().toISOString(),
          sourceId: sourceItem.id,
          sourceType: sourceItem.type,
          sourceDisplayName: `${personaUsed}'s Voice from ${sourceItem.sourceDisplayName || sourceItem.type}`
        };

        // Determine the correct type for the restyled item
        if (sourceItem.type === GeneratedContentItemType.Improved) {
          newItem.type = GeneratedContentItemType.RestyledImproved;
        } else if (sourceItem.type === GeneratedContentItemType.Alternative) {
          newItem.type = GeneratedContentItemType.RestyledAlternative;
        } else if (sourceItem.type === GeneratedContentItemType.Headlines) {
          newItem.type = GeneratedContentItemType.RestyledHeadlines;
        }
        addProgressMessage(`${personaUsed}'s voice applied.`);
       }
      }

      if (newItem) {
        setFormState(prev => ({
          ...prev,
          copyResult: {
            ...prev.copyResult,
            generatedVersions: [...prev.copyResult.generatedVersions, newItem]
          }
        }));
        toast.success(`${actionType} version generated successfully!`);
      }
    } catch (error: any) {
      console.error(`Error during on-demand ${actionType} generation:`, error);
      toast.error(`Failed to generate ${actionType} version: ${error.message}`);
    } finally {
      setFormState(prev => ({ ...prev, isLoading: false }));
      addProgressMessage('On-demand generation complete.');
    }
  };

  const handleClearAll = useCallback(() => {
    setFormState(DEFAULT_FORM_STATE);
    setLoadedTemplateId(null);
    setLoadedTemplateName('');
    toast.success('Form cleared!');
  }, [setFormState]);

  const handleEvaluateInputs = async () => {
    if (!currentUser) {
      toast.error('Please log in to evaluate inputs.');
      return;
    }
    setFormState(prev => ({ ...prev, isEvaluating: true, generationProgress: [] }));
    addProgressMessage('Evaluating inputs...');
    try {
      const evaluation = await evaluatePrompt(formState, currentUser, addProgressMessage);
      setFormState(prev => ({ ...prev, promptEvaluation: evaluation }));
      toast.success('Inputs evaluated successfully!');
    } catch (error: any) {
      console.error('Error evaluating inputs:', error);
      toast.error(`Failed to evaluate inputs: ${error.message}`);
    } finally {
      setFormState(prev => ({ ...prev, isEvaluating: false }));
      addProgressMessage('Input evaluation complete.');
    }
  };

  const handleSaveOutput = async () => {
    if (!currentUser || !currentUser.id) {
      toast.error('You must be logged in to save outputs.');
      return;
    }
    if (!formState.copyResult || formState.copyResult.generatedVersions.length === 0) {
      toast.error('No content to save.');
      return;
    }

    setFormState(prev => ({ ...prev, isLoading: true }));
    addProgressMessage('Saving output...');

    try {
      const savedOutput = {
        user_id: currentUser.id,
        customer_id: formState.customerId || null,
        brief_description: formState.briefDescription || 'Untitled Output',
        language: formState.language,
        tone: formState.tone,
        model: formState.model,
        selected_persona: formState.selectedPersona || null,
        input_snapshot: formState, // Save the entire form state as a snapshot
        output_content: formState.copyResult, // Save the entire copyResult
        saved_at: new Date().toISOString(),
      };

      const { data, error } = await saveSavedOutput(savedOutput);

      if (error) throw error;

      toast.success('Output saved successfully!');
      addProgressMessage('Output saved to dashboard.');
    } catch (error: any) {
      console.error('Error saving output:', error);
      toast.error(`Failed to save output: ${error.message}`);
    } finally {
      setFormState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSaveTemplate = async (templateName: string, description: string, formStateToSave: FormState) => {
    if (!currentUser || !currentUser.id) {
      toast.error('You must be logged in to save templates.');
      return;
    }

    setFormState(prev => ({ ...prev, isLoading: true }));
    addProgressMessage('Saving template...');

    try {
      const templateData = {
        user_id: currentUser.id,
        template_name: templateName,
        description: description,
        language: formStateToSave.language,
        tone: formStateToSave.tone,
        word_count: formStateToSave.wordCount,
        custom_word_count: formStateToSave.customWordCount,
        target_audience: formStateToSave.targetAudience,
        key_message: formStateToSave.keyMessage,
        desired_emotion: formStateToSave.desiredEmotion,
        call_to_action: formStateToSave.callToAction,
        brand_values: formStateToSave.brandValues,
        keywords: formStateToSave.keywords,
        context: formStateToSave.context,
        brief_description: formStateToSave.briefDescription,
        page_type: formStateToSave.pageType,
        section: formStateToSave.section,
        business_description: formStateToSave.businessDescription,
        original_copy: formStateToSave.originalCopy,
        template_type: formStateToSave.tab,
        competitor_urls: formStateToSave.competitorUrls,
        output_structure: formStateToSave.outputStructure?.map(item => item.value), // Save only values
        product_service_name: formStateToSave.productServiceName,
        industry_niche: formStateToSave.industryNiche,
        tone_level: formStateToSave.toneLevel,
        reader_funnel_stage: formStateToSave.readerFunnelStage,
        competitor_copy_text: formStateToSave.competitorCopyText,
        target_audience_pain_points: formStateToSave.targetAudiencePainPoints,
        preferred_writing_style: formStateToSave.preferredWritingStyle,
        language_style_constraints: formStateToSave.languageStyleConstraints,
        generateHeadlines: formStateToSave.generateHeadlines,
        generateScores: formStateToSave.generateScores,
        selectedPersona: formStateToSave.selectedPersona,
        numberOfHeadlines: formStateToSave.numberOfHeadlines,
        forceElaborationsExamples: formStateToSave.forceElaborationsExamples,
        forceKeywordIntegration: formStateToSave.forceKeywordIntegration,
        prioritizeWordCount: formStateToSave.prioritizeWordCount,
      };

      const { error, updated, id } = await saveTemplate(templateData, loadedTemplateId || undefined);

      if (error) throw error;

      if (updated) {
        toast.success('Template updated successfully!');
        addProgressMessage('Template updated.');
      } else {
        toast.success('Template saved successfully!');
        addProgressMessage('Template saved.');
        setLoadedTemplateId(id || null); // Set the ID for the newly saved template
        setLoadedTemplateName(templateName);
      }
      setIsSaveTemplateModalOpen(false);
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(`Failed to save template: ${error.message}`);
    } finally {
      setFormState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleViewPrompts = () => {
    const { systemPrompt, userPrompt } = getLastPrompts();
    setSystemPrompt(systemPrompt);
    setUserPrompt(userPrompt);
    setShowPromptModal(true);
  };

  if (!isInitialized) {
    return (
      <AppSpinner
        isLoading={true}
        message={initError || "Initializing application..."}
        progressMessages={formState.generationProgress}
        onCancel={initError ? fallbackToDemoMode : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col">
      <Header
        activeTab={formState.tab}
        setActiveTab={(tab) => setFormState(prev => ({ ...prev, tab }))}
      />
      <main className="flex-grow container mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-1">
          <CopyForm
            currentUser={currentUser || undefined}
            formState={formState}
            setFormState={setFormState}
            onGenerate={handleGenerate}
            onClearAll={handleClearAll}
            loadedTemplateId={loadedTemplateId}
            setLoadedTemplateId={setLoadedTemplateId}
            loadedTemplateName={loadedTemplateName}
            setLoadedTemplateName={setLoadedTemplateName}
            isSmartMode={isSmartMode}
            onEvaluateInputs={handleEvaluateInputs}
            onSaveTemplate={() => setIsSaveTemplateModalOpen(true)}
          />
        </div>
        <div className="lg:col-span-1">
          <ResultsSection
            copyResult={formState.copyResult}
            promptEvaluation={formState.promptEvaluation}
            isLoading={formState.isLoading}
            isEvaluating={formState.isEvaluating}
            generationProgress={formState.generationProgress}
            onViewPrompts={handleViewPrompts}
            onSaveOutput={handleSaveOutput}
            onGenerateAlternative={handleOnDemandGeneration}
            onGenerateRestyled={handleOnDemandGeneration}
            selectedPersona={formState.selectedPersona}
          />
        </div>
      </main>

      <AppSpinner
        isLoading={formState.isLoading || formState.isEvaluating}
        message={formState.isLoading ? "Generating copy..." : "Evaluating inputs..."}
        progressMessages={formState.generationProgress}
      />

      {showPromptModal && (
        <PromptDisplay
          systemPrompt={systemPrompt}
          userPrompt={userPrompt}
          onClose={() => setShowPromptModal(false)}
        />
      )}

      {isSaveTemplateModalOpen && (
        <SaveTemplateModal
          isOpen={isSaveTemplateModalOpen}
          onClose={() => setIsSaveTemplateModalOpen(false)}
          onSave={handleSaveTemplate}
          initialTemplateName={loadedTemplateName || formState.briefDescription || ''}
          initialDescription={formState.briefDescription || ''}
          formStateToSave={formState}
        />
      )}
    </div>
  );
};

export default App;