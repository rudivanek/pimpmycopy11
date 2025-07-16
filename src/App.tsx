import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';

// Components
import MainMenu from './components/MainMenu';
import CopyForm from './components/CopyForm';
import ResultsSection from './components/results/ResultsSection';
import AppSpinner from './components/ui/AppSpinner';
import SaveTemplateModal from './components/SaveTemplateModal';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Features from './components/Features';
import Documentation from './components/Documentation';
import Header from './components/Header';

// Services and utilities
import { evaluatePrompt, generateCopy, generateAlternativeCopy, 
  generateHumanizedCopy, generateHeadlines, generateContentScores, 
  getLastPrompts, restyleCopyWithPersona } from './services/apiService';
import { getCopySession, getTemplate, getSavedOutput, saveSavedOutput } from './services/supabaseClient';

// Types and constants
import { FormState, TabType, User, PromptEvaluation, Template, CopyResult, SavedOutput, StructuredCopyOutput } from './types';
import { DEFAULT_FORM_STATE } from './constants';
import { formatCopyResultAsMarkdown } from './utils/copyFormatter';

// Contexts
import { useAuth } from './hooks/useAuth';
import { useFormState } from './hooks/useFormState';
import { ThemeProvider } from './context/ThemeContext';
import PromptDisplay from './components/PromptDisplay';
import ScoreComparisonModal from './components/results/ScoreComparisonModal';
// Import the necessary icons
import { Zap, Save, FileText, Download, BarChart2, Code, Folder } from 'lucide-react';

function App() {
  // State for session ID from URL params
  const [sessionIdFromUrl, setSessionIdFromUrl] = useState<string | null>(null);
  const [templateIdFromUrl, setTemplateIdFromUrl] = useState<string | null>(null);
  const [savedOutputIdFromUrl, setSavedOutputIdFromUrl] = useState<string | null>(null);
  
  // State for app
  const [isPromptDisplayOpen, setIsPromptDisplayOpen] = useState(false);
  const [isScoreComparisonOpen, setIsScoreComparisonOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [loadedTemplateName, setLoadedTemplateName] = useState('');
  const [loadedTemplateDescription, setLoadedTemplateDescription] = useState('');
  const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null);

  // Get formState and setFormState from the useFormState hook
  const { formState, setFormState, loadFormStateFromTemplate, 
    loadFormStateFromSession, loadFormStateFromSavedOutput } = useFormState();
  
  // Auth state
  const { currentUser, isInitialized, handleLogin, handleLogout, initError, fallbackToDemoMode } = useAuth();
  
  // States for loading
  const [isLoading, setIsLoading] = useState(false);
  const [loadAbortController, setLoadAbortController] = useState<AbortController | null>(null);

  // Progress messages state
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  
  const addProgressMessage = (message: string) => {
    setProgressMessages((prevMessages) => [...prevMessages, message]);
  };

  // Check for session ID, template ID or saved output ID in URL params
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const sessionId = queryParams.get('sessionId');
    const templateId = queryParams.get('templateId');
    const savedOutputId = queryParams.get('savedOutputId');
    
    if (sessionId) {
      setSessionIdFromUrl(sessionId);
    }
    
    if (templateId) {
      setTemplateIdFromUrl(templateId);
    }
    
    if (savedOutputId) {
      setSavedOutputIdFromUrl(savedOutputId);
    }
  }, []);

  // Load session data if sessionId is present in URL
  useEffect(() => {
    if (sessionIdFromUrl && currentUser) {
      // Set loading state immediately when we detect a session ID in URL
      setIsLoading(true);
      setProgressMessages([`Preparing to load session ${sessionIdFromUrl}...`]);
      
      loadSessionFromId(sessionIdFromUrl);
    }
  }, [sessionIdFromUrl, currentUser, isInitialized]);

  // Load template data if templateId is present in URL
  useEffect(() => {
    if (templateIdFromUrl && currentUser) {
      // Set loading state immediately when we detect a template ID in URL
      setIsLoading(true);
      setProgressMessages([`Preparing to load template ${templateIdFromUrl}...`]);
      
      loadTemplateFromId(templateIdFromUrl);
    }
  }, [templateIdFromUrl, currentUser, isInitialized]);
  
  // Load saved output data if savedOutputId is present in URL
  useEffect(() => {
    if (savedOutputIdFromUrl && currentUser) {
      // Set loading state immediately when we detect a saved output ID in URL
      setIsLoading(true);
      setProgressMessages([`Preparing to load saved output ${savedOutputIdFromUrl}...`]);
      
      loadSavedOutputFromId(savedOutputIdFromUrl);
    }
  }, [savedOutputIdFromUrl, currentUser, isInitialized]);

  // Load session data from database
  const loadSessionFromId = async (sessionId: string) => {
    if (!sessionId) return;
    
    // Check if Supabase is enabled
    if (import.meta.env.VITE_SUPABASE_ENABLED !== 'true') {
      addProgressMessage('Supabase is disabled. Cannot load session data.');
      setIsLoading(false);
      return;
    }
    
    // Create an abort controller for cancellation
    const controller = new AbortController();
    setLoadAbortController(controller);
    
    try {
      // Set loading state
      setIsLoading(true);
      setProgressMessages([]);
      addProgressMessage(`Loading session ${sessionId}...`);
      
      // Fetch session data from Supabase
      const { data, error } = await getCopySession(sessionId, controller.signal);
      
      if (error) {
        console.error('Error loading session:', error);
        addProgressMessage(`Error loading session: ${error.message}`);
        throw error;
      }
      
      if (data) {
        addProgressMessage(`Session loaded successfully.`);
        // Load session data into form state
        loadFormStateFromSession(data, setFormState, formState);
        addProgressMessage(`Form data applied.`);
      }
    } catch (err: any) {
      console.error('Error in loadSessionFromId:', err);
      
      if (err.name === 'AbortError') {
        addProgressMessage('Loading cancelled by user.');
      } else if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        addProgressMessage('Network error: Unable to connect to Supabase. Please check your internet connection and try again.');
        console.error('Network connectivity issue with Supabase:', err);
      } else {
        addProgressMessage(`Error loading session: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
      setLoadAbortController(null);
    }
  };

  // Load template data from database
  const loadTemplateFromId = async (templateId: string) => {
    if (!templateId) return;
    
    // Check if Supabase is enabled
    if (import.meta.env.VITE_SUPABASE_ENABLED !== 'true') {
      addProgressMessage('Supabase is disabled. Cannot load template data.');
      setIsLoading(false);
      return;
    }
    
    // Create an abort controller for cancellation
    const controller = new AbortController();
    setLoadAbortController(controller);
    
    try {
      // Set loading state
      setIsLoading(true);
      setProgressMessages([]);
      addProgressMessage(`Loading template ${templateId}...`);
      
      // Fetch template data from Supabase
      const { data, error } = await getTemplate(templateId, controller.signal);
      
      if (error) {
        console.error('Error loading template:', error);
        addProgressMessage(`Error loading template: ${error.message}`);
        throw error;
      }
      
      if (data) {
        addProgressMessage(`Template loaded successfully.`);
        setLoadedTemplateId(templateId);
        setLoadedTemplateName(data.template_name);
        setLoadedTemplateDescription(data.description || '');
        
        // Load template data into form state
        loadFormStateFromTemplate(data as Template, setFormState);
        addProgressMessage(`Template data applied.`);
      }
    } catch (err: any) {
      console.error('Error in loadTemplateFromId:', err);
      
      if (err.name === 'AbortError') {
        addProgressMessage('Loading cancelled by user.');
      } else if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        addProgressMessage('Network error: Unable to connect to Supabase. Please check your internet connection and try again.');
        console.error('Network connectivity issue with Supabase:', err);
      } else {
        addProgressMessage(`Error loading template: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
      setLoadAbortController(null);
    }
  };
  
  // Load saved output data from database
  const loadSavedOutputFromId = async (savedOutputId: string) => {
    if (!savedOutputId) return;
    
    // Check if Supabase is enabled
    if (import.meta.env.VITE_SUPABASE_ENABLED !== 'true') {
      addProgressMessage('Supabase is disabled. Cannot load saved output data.');
      setIsLoading(false);
      return;
    }
    
    // Create an abort controller for cancellation
    const controller = new AbortController();
    setLoadAbortController(controller);
    
    try {
      // Set loading state
      setIsLoading(true);
      setProgressMessages([]);
      addProgressMessage(`Loading saved output ${savedOutputId}...`);
      
      // Fetch saved output data from Supabase
      const { data, error } = await getSavedOutput(savedOutputId, controller.signal);
      
      if (error) {
        console.error('Error loading saved output:', error);
        addProgressMessage(`Error loading saved output: ${error.message}`);
        throw error;
      }
      
      if (data) {
        addProgressMessage(`Saved output loaded successfully.`);
        
        // Load saved output data into form state
        loadFormStateFromSavedOutput(data as SavedOutput, setFormState, formState);
        addProgressMessage(`Saved output data applied.`);
      }
    } catch (err: any) {
      console.error('Error in loadSavedOutputFromId:', err);
      
      if (err.name === 'AbortError') {
        addProgressMessage('Loading cancelled by user.');
      } else if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        addProgressMessage('Network error: Unable to connect to Supabase. Please check your internet connection and try again.');
        console.error('Network connectivity issue with Supabase:', err);
      } else {
        addProgressMessage(`Error loading saved output: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
      setLoadAbortController(null);
    }
  };

  // Set active tab state
  const handleSetActiveTab = (tab: TabType) => {
    setFormState({
      ...formState,
      tab,
    });
  };

  // Helper function to calculate target word count
  const calculateTargetWordCount = (formState: FormState) => {
    if (formState.wordCount === 'Custom' && formState.customWordCount) {
      return formState.customWordCount;
    } else if (formState.wordCount.includes('Short')) {
      return 75; // Mid-range of Short (50-100)
    } else if (formState.wordCount.includes('Medium')) {
      return 150; // Mid-range of Medium (100-200)
    } else if (formState.wordCount.includes('Long')) {
      return 300; // Mid-range of Long (200-400)
    }
    return undefined;
  };

  // Handle generating copy
  const handleGenerateCopy = async () => {
    try {
      // Reset progress messages
      setProgressMessages([]);
      
      // Update form state to indicate loading
      setFormState({
        ...formState,
        isLoading: true,
        copyResult: undefined,
        promptEvaluation: undefined,
      });
      
      // Add initial progress message
      addProgressMessage('Starting copy generation...');
      
      // Generate copy
      const result = await generateCopy(formState, currentUser, formState.sessionId, addProgressMessage);
      
      // Automatically generate scores for improved copy if enabled
      let improvedCopyScore;
      if (formState.generateScores && result.improvedCopy) {
        setFormState(prevState => ({
          ...prevState,
          isGeneratingScores: true
        }));
        
        try {
          improvedCopyScore = await generateContentScores(
            result.improvedCopy,
            "improved",
            formState.model,
            formState.tab === 'improve' ? formState.originalCopy : undefined,
            calculateTargetWordCount(formState),
            addProgressMessage
          );
        } catch (scoreError) {
          console.error("Error generating scores for improved copy:", scoreError);
          // Continue execution even if score generation fails
        }
      }

      // Automatically generate scores for alternative copy if it exists
      let alternativeCopyScore;
      if (formState.generateScores && result.alternativeCopy) {
        try {
          alternativeCopyScore = await generateContentScores(
            result.alternativeCopy,
            "alternative",
            formState.model,
            undefined,
            calculateTargetWordCount(formState),
            addProgressMessage
          );
        } catch (scoreError) {
          console.error("Error generating scores for alternative copy:", scoreError);
          // Continue execution even if score generation fails
        }
      }

      // Automatically generate scores for alternative versions if they exist
      let alternativeVersionScores = [];
      if (formState.generateScores && result.alternativeVersions && result.alternativeVersions.length > 0) {
        try {
          for (let i = 0; i < result.alternativeVersions.length; i++) {
            const altScore = await generateContentScores(
              result.alternativeVersions[i],
              "alternative",
              formState.model,
              undefined,
              calculateTargetWordCount(formState),
              addProgressMessage
            );
            alternativeVersionScores.push(altScore);
          }
        } catch (scoreError) {
          console.error("Error generating scores for alternative versions:", scoreError);
          // Continue execution even if score generation fails
        }
      }

      // Include the generated scores in the result
      if (formState.generateScores) {
        if (improvedCopyScore) {
          result.improvedCopyScore = improvedCopyScore;
        }
        if (alternativeCopyScore) {
          result.alternativeCopyScore = alternativeCopyScore;
        }
        if (alternativeVersionScores.length > 0) {
          result.alternativeVersionScores = alternativeVersionScores;
        }
      }
      
      // Update form state with the result
      setFormState({
        ...formState,
        isLoading: false,
        isGeneratingScores: false,
        copyResult: result,
        sessionId: result.sessionId, // Update session ID if a new one was created
      });
      
      // Add final progress message
      addProgressMessage('Copy generation completed successfully!');
      
      // Scroll to results section
      setTimeout(() => {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error: any) {
      console.error('Error generating copy:', error);
      
      // Update form state to indicate error
      setFormState({
        ...formState,
        isLoading: false,
      });
      
      // Add error message
      addProgressMessage(`Error generating copy: ${error.message}`);
    }
  };

  // Handle evaluating inputs
  const handleEvaluateInputs = async () => {
    try {
      // Update form state to indicate loading
      setFormState({
        ...formState,
        isEvaluating: true,
        promptEvaluation: undefined,
      });
      
      // Evaluate input quality
      const evaluation = await evaluatePrompt(formState, currentUser, addProgressMessage);
      
      // Update form state with the evaluation
      setFormState({
        ...formState,
        isEvaluating: false,
        promptEvaluation: evaluation,
      });
      
      // Scroll to results section
      setTimeout(() => {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
          resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } catch (error: any) {
      console.error('Error evaluating prompt:', error);
      
      // Update form state to indicate error
      setFormState({
        ...formState,
        isEvaluating: false,
      });
      
      // Add error message to UI
      addProgressMessage(`Error evaluating inputs: ${error.message}`);
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    // Reset form state to defaults but keep current tab and model
    const currentTab = formState.tab;
    const currentModel = formState.model;
    const currentCustomerId = formState.customerId;
    const currentCustomerName = formState.customerName;
    
    setFormState({
      ...DEFAULT_FORM_STATE,
      tab: currentTab,
      model: currentModel,
      customerId: currentCustomerId,
      customerName: currentCustomerName,
    });
    
    // Reset template name
    setLoadedTemplateId(null);
    setLoadedTemplateName('');
    setLoadedTemplateDescription('');
    
    // Clear progress messages
    setProgressMessages([]);
  };

  // Handle alternative copy generation
  const handleGenerateAlternative = async (index?: number) => {
    try {
      // Check if we're already generating - prevent multiple simultaneous generations
      if (formState.isGeneratingAlternative || formState.alternativeGenerationIndex !== undefined) {
        return;
      }
      
      if (!formState.copyResult || !formState.copyResult.improvedCopy) {
        toast.error('Please generate improved copy first.');
        return;
      }
      
      console.log('Generating alternative version', { index });
      
      // Don't start another generation if already generating
      if (formState.isGeneratingAlternative) return;
      
      // Set loading state
      setFormState(prev => ({
        ...prev,
        isGeneratingAlternative: true,
        alternativeGenerationIndex: index
      }));
      
      try {
        // Generate alternative copy
        const newAlternativeContent = await generateAlternativeCopy(
          formState,
          formState.copyResult.improvedCopy,
          formState.sessionId,
          addProgressMessage
        );
        
        // Update the form state with the new alternative copy
        setFormState(prev => {
          // First, get a copy of the current copyResult or initialize it
          const copyResult = prev.copyResult ? { ...prev.copyResult } : {};
          
          // Check if we're updating an existing alternative version
          if (index !== undefined && copyResult.alternativeVersions) {
            // Update a specific version in the array
            const updatedVersions = [...copyResult.alternativeVersions];
            updatedVersions[index] = newAlternativeContent;
            copyResult.alternativeVersions = updatedVersions;
          } else {
            // We're creating a new alternative version
            // Initialize or update alternativeVersions array
            const currentVersions = copyResult.alternativeVersions || [];
            copyResult.alternativeVersions = [...currentVersions, newAlternativeContent];
            
            // Keep the legacy alternativeCopy field in sync for backward compatibility
            copyResult.alternativeCopy = newAlternativeContent;
            
            console.log('Updated alternativeVersions:', copyResult.alternativeVersions.length);
          }
          
          return {
            ...prev,
            copyResult,
            isGeneratingAlternative: false,
            alternativeGenerationIndex: undefined
          };
        });
        
        // Generate scores for the alternative version if scoring is enabled
        if (formState.generateScores) {
          const targetIndex = index !== undefined ? index : (formState.copyResult.alternativeVersions?.length || 1) - 1;
          handleGenerateScores('alternative', targetIndex);
        }
        
        addProgressMessage('Alternative version created successfully.');
        toast.success('New alternative version generated!');
      } 
      catch (error) {
        console.error('Error generating alternative copy:', error);
        toast.error('Failed to generate alternative copy');
        
        // Handle error and update state
        setFormState(prev => ({
          ...prev,
          isGeneratingAlternative: false,
          alternativeGenerationIndex: undefined
        }));
        
        console.error('Error generating alternative copy:', error);
        toast.error('Failed to generate alternative copy');
      }
    } catch (error: any) {
      console.error('Error in handleGenerateAlternative:', error);
      toast.error('Error generating alternative copy: ' + error.message);
    }
  };

  // Handle humanized copy generation
  const handleGenerateHumanized = async (contentType: 'improved' | 'alternative', alternativeIndex?: number) => {
    try {
      // Determine which content to humanize
      let contentToHumanize;
      if (contentType === 'improved') {
        contentToHumanize = formState.copyResult?.improvedCopy;
      } else if (contentType === 'alternative') {
        if (alternativeIndex !== undefined && formState.copyResult?.alternativeVersions) {
          contentToHumanize = formState.copyResult.alternativeVersions[alternativeIndex];
        } else {
          contentToHumanize = formState.copyResult?.alternativeCopy;
        }
      }
      
      if (!contentToHumanize) {
        console.error(`No ${contentType} copy to generate humanized version for`);
        return;
      }
      
      setFormState({ ...formState, isGeneratingHumanized: true });
      
      addProgressMessage(`Generating humanized version for ${contentType}...`);
      
      let humanizedContent;
      if (contentType === 'improved') {
        humanizedContent = await generateHumanizedCopy(
          contentToHumanize,
          formState,
          addProgressMessage
        );
      } else if (contentType === 'alternative') {
        humanizedContent = await generateHumanizedCopy(
          contentToHumanize,
          formState,
          addProgressMessage
        );
      }
      
      if (!humanizedContent) {
        throw new Error('Failed to generate humanized content');
      }
      
      // Automatically generate scores for humanized content if enabled
      let humanizedCopyScore;
      if (formState.generateScores) {
        try {
          setFormState(prevState => ({
            ...prevState,
            isGeneratingScores: true
          }));
          
          // Generate score for the appropriate humanized content
          if (contentType === 'improved') {
            humanizedCopyScore = await generateContentScores(
              humanizedContent,
              "humanized",
              formState.model,
              undefined,
              calculateTargetWordCount(formState),
              addProgressMessage
            );
          } else if (contentType === 'alternative') {
            humanizedCopyScore = await generateContentScores(
              humanizedContent,
              "humanized",
              formState.model,
              undefined,
              calculateTargetWordCount(formState),
              addProgressMessage
            );
          }
        } catch (scoreError) {
          console.error(`Error generating scores for ${contentType} humanized copy:`, scoreError);
          // Continue execution even if score generation fails
        }
      }
      
      // Update the state based on the content type and available data
      setFormState((prevState) => {
        const updatedState = { ...prevState };
        
        if (contentType === 'improved') {
          // Check if we're using the new humanizedVersions array
          if (prevState.copyResult?.humanizedVersions) {
            updatedState.copyResult = {
              ...prevState.copyResult,
              humanizedVersions: [...prevState.copyResult.humanizedVersions, humanizedContent],
            };
            
            // Add score if generated
            if (humanizedCopyScore) {
              const humanizedVersionScores = [...(prevState.copyResult.humanizedVersionScores || [])];
              humanizedVersionScores.push(humanizedCopyScore);
              updatedState.copyResult.humanizedVersionScores = humanizedVersionScores;
            }
          } else {
            updatedState.copyResult = {
              ...prevState.copyResult,
              humanizedCopy: humanizedContent,
              humanizedCopyScore: humanizedCopyScore // Add score if generated
            };
          }
        } else if (contentType === 'alternative') {
          // For alternative content, we need to handle the humanized alternative copy
          if (alternativeIndex !== undefined && prevState.copyResult?.alternativeVersions) {
            // We're humanizing a specific version from the alternativeVersions array
            if (!updatedState.copyResult.alternativeHumanizedVersions) {
              updatedState.copyResult.alternativeHumanizedVersions = [];
            }
            
            // Ensure the array has an entry for this alternative index
            while (updatedState.copyResult.alternativeHumanizedVersions.length <= alternativeIndex) {
              updatedState.copyResult.alternativeHumanizedVersions.push([]);
            }
            
            // Add the humanized version to the appropriate array
            updatedState.copyResult.alternativeHumanizedVersions[alternativeIndex].push(humanizedContent);
          } else {
            // Legacy single alternative humanized property
            updatedState.copyResult = {
              ...prevState.copyResult,
              alternativeHumanizedCopy: humanizedContent
            };
          }
        }
        
        // Reset loading states
        updatedState.isGeneratingHumanized = false;
        updatedState.isGeneratingScores = false;
        
        return updatedState;
      });
      
      // Add final progress message
      addProgressMessage('Humanized version generated successfully!');
    } catch (error: any) {
      console.error('Error generating humanized copy:', error);
      
      // Update form state to indicate error
      setFormState({
        ...formState,
        isGeneratingHumanized: false,
      });
      
      // Add error message
      addProgressMessage(`Error generating humanized version: ${error.message}`);
    }
  };

  // Handle headline generation
  const handleGenerateHeadlines = async () => {
    try {
      if (!formState.copyResult?.improvedCopy) {
        console.error('No improved copy to generate headlines for');
        return;
      }
      
      // Update form state to indicate loading
      setFormState({
        ...formState,
        isGeneratingHeadlines: true,
      });
      
      // Add progress message
      addProgressMessage('Generating headline options...');
      
      // Generate headlines
      const headlines = await generateHeadlines(
        formState.copyResult.improvedCopy,
        formState,
        formState.numberOfHeadlines || 3,
        addProgressMessage
      );
      
      // Update form state with the result
      const updatedCopyResult = { 
        ...formState.copyResult,
        headlines
      };
      
      setFormState({
        ...formState,
        isGeneratingHeadlines: false,
        copyResult: updatedCopyResult,
      });
      
      // Add final progress message
      addProgressMessage(`${headlines.length} headline options generated successfully!`);
    } catch (error: any) {
      console.error('Error generating headlines:', error);
      
      // Update form state to indicate error
      setFormState({
        ...formState,
        isGeneratingHeadlines: false,
      });
      
      // Add error message
      addProgressMessage(`Error generating headlines: ${error.message}`);
    }
  };

  // Handle scoring content
  const handleGenerateScores = async (
    contentType: 'improved' | 'alternative' | 'humanized' | 'restyledImproved' | 'restyledAlternative' | 'restyledHumanized',
    alternativeIndex?: number,
    humanizedIndex?: number,
    retryCount: number = 0
  ) => {
    if (!formState.copyResult) return;
    
    // Update form state to indicate loading
    setFormState({
      ...formState,
      isGeneratingScores: true,
    });
    
    // For alternative content scoring
    if (contentType === 'alternative') {
      // Get the alternative content to score (either from versions array or legacy field)
      let alternativeContent;
      if (alternativeIndex !== undefined && formState.copyResult.alternativeVersions && 
          formState.copyResult.alternativeVersions[alternativeIndex]) {
        alternativeContent = formState.copyResult.alternativeVersions[alternativeIndex];
      } else {
        alternativeContent = formState.copyResult.alternativeCopy;
      }
      
      if (!alternativeContent) {
        console.error('No alternative content found to score', { alternativeIndex, retryCount });
        
        // If this is the first attempt and no explicit index was provided, try again with index 0
        if (retryCount === 0 && alternativeIndex === undefined && 
            formState.copyResult.alternativeVersions && 
            formState.copyResult.alternativeVersions.length > 0) {
          console.log('Retrying with first alternative version');
          return handleGenerateScores(contentType, 0, humanizedIndex, retryCount + 1);
        }
        
        toast.error('No alternative content found to score');
        return;
      }
    }
    
    try {
      // Determine which content to score
      let contentToScore;
      let originalContent;
      
      if (contentType === 'improved') {
        contentToScore = formState.copyResult.improvedCopy;
        originalContent = formState.tab === 'create' ? formState.businessDescription : formState.originalCopy;
      } else if (contentType === 'alternative') {
        if (alternativeIndex !== undefined && formState.copyResult.alternativeVersions) {
          contentToScore = formState.copyResult.alternativeVersions[alternativeIndex];
        } else {
          contentToScore = formState.copyResult.alternativeCopy;
        }
        originalContent = formState.copyResult.improvedCopy;
      } else if (contentType === 'humanized') {
        if (humanizedIndex !== undefined && formState.copyResult.humanizedVersions) {
          contentToScore = formState.copyResult.humanizedVersions[humanizedIndex];
        } else {
          contentToScore = formState.copyResult.humanizedCopy;
        }
        originalContent = formState.copyResult.improvedCopy;
      } else if (contentType === 'restyledImproved') {
        contentToScore = formState.copyResult.restyledImprovedCopy;
        originalContent = formState.copyResult.improvedCopy;
      } else if (contentType === 'restyledAlternative') {
        if (alternativeIndex !== undefined && formState.copyResult.restyledAlternativeVersions) {
          contentToScore = formState.copyResult.restyledAlternativeVersions[alternativeIndex];
        } else {
          contentToScore = formState.copyResult.restyledAlternativeCopy;
        }
        originalContent = alternativeIndex !== undefined && formState.copyResult.alternativeVersions 
          ? formState.copyResult.alternativeVersions[alternativeIndex] 
          : formState.copyResult.alternativeCopy;
      } else if (contentType === 'restyledHumanized') {
        if (humanizedIndex !== undefined && formState.copyResult.restyledHumanizedVersions) {
          contentToScore = formState.copyResult.restyledHumanizedVersions[humanizedIndex];
        } else {
          contentToScore = formState.copyResult.restyledHumanizedCopy;
        }
        originalContent = humanizedIndex !== undefined && formState.copyResult.humanizedVersions
          ? formState.copyResult.humanizedVersions[humanizedIndex]
          : formState.copyResult.humanizedCopy;
      }
      
      if (!contentToScore) {
        console.error(`No ${contentType} content found to score`);
        return;
      }
      
      // Add progress message
      addProgressMessage(`Generating scores for ${contentType} copy...`);
      
      // Calculate target word count for accuracy scoring
      let targetWordCount;
      if (formState.wordCount === 'Custom' && formState.customWordCount) {
        targetWordCount = formState.customWordCount;
      } else if (formState.wordCount.includes('Short')) {
        targetWordCount = 75; // Mid-range of Short (50-100)
      } else if (formState.wordCount.includes('Medium')) {
        targetWordCount = 150; // Mid-range of Medium (100-200)
      } else if (formState.wordCount.includes('Long')) {
        targetWordCount = 300; // Mid-range of Long (200-400)
      }
      
      // Generate scores
      const scores = await generateContentScores(
        contentToScore,
        contentType,
        formState.model,
        originalContent,
        targetWordCount,
        addProgressMessage
      );
      
      // Update form state with the result
      const updatedCopyResult = { ...formState.copyResult };
      
      // Update the appropriate score property
      if (contentType === 'improved') {
        updatedCopyResult.improvedCopyScore = scores;
      } else if (contentType === 'alternative') {
        if (alternativeIndex !== undefined && formState.copyResult.alternativeVersions) {
          if (!updatedCopyResult.alternativeVersionScores) {
            updatedCopyResult.alternativeVersionScores = [];
          }
          
          // Ensure the array has enough elements
          while (updatedCopyResult.alternativeVersionScores.length <= alternativeIndex) {
            updatedCopyResult.alternativeVersionScores.push(null as any);
          }
          
          updatedCopyResult.alternativeVersionScores[alternativeIndex] = scores;
        } else {
          updatedCopyResult.alternativeCopyScore = scores;
        }
      } else if (contentType === 'humanized') {
        if (humanizedIndex !== undefined && formState.copyResult.humanizedVersions) {
          if (!updatedCopyResult.humanizedVersionScores) {
            updatedCopyResult.humanizedVersionScores = [];
          }
          
          // Ensure the array has enough elements
          while (updatedCopyResult.humanizedVersionScores.length <= humanizedIndex) {
            updatedCopyResult.humanizedVersionScores.push(null as any);
          }
          
          updatedCopyResult.humanizedVersionScores[humanizedIndex] = scores;
        } else {
          updatedCopyResult.humanizedCopyScore = scores;
        }
      } else if (contentType === 'restyledImproved') {
        updatedCopyResult.restyledImprovedCopyScore = scores;
      } else if (contentType === 'restyledAlternative') {
        if (alternativeIndex !== undefined && formState.copyResult.restyledAlternativeVersions) {
          if (!updatedCopyResult.restyledAlternativeVersionScores) {
            updatedCopyResult.restyledAlternativeVersionScores = [];
          }
          
          // Ensure the array has enough elements
          while (updatedCopyResult.restyledAlternativeVersionScores.length <= alternativeIndex) {
            updatedCopyResult.restyledAlternativeVersionScores.push(null as any);
          }
          
          updatedCopyResult.restyledAlternativeVersionScores[alternativeIndex] = scores;
        } else {
          updatedCopyResult.restyledAlternativeCopyScore = scores;
        }
      } else if (contentType === 'restyledHumanized') {
        if (humanizedIndex !== undefined && formState.copyResult.restyledHumanizedVersions) {
          if (!updatedCopyResult.restyledHumanizedVersionScores) {
            updatedCopyResult.restyledHumanizedVersionScores = [];
          }
          
          // Ensure the array has enough elements
          while (updatedCopyResult.restyledHumanizedVersionScores.length <= humanizedIndex) {
            updatedCopyResult.restyledHumanizedVersionScores.push(null as any);
          }
          
          updatedCopyResult.restyledHumanizedVersionScores[humanizedIndex] = scores;
        } else {
          updatedCopyResult.restyledHumanizedCopyScore = scores;
        }
      }
      
      setFormState({
        ...formState,
        isGeneratingScores: false,
        copyResult: updatedCopyResult,
      });
      
      // Add final progress message
      addProgressMessage(`Scores generated successfully for ${contentType} copy!`);
    } catch (error: any) {
      console.error('Error generating scores:', error);
      
      // Update form state to indicate error
      setFormState({
        ...formState,
        isGeneratingScores: false,
      });
      
      // Add error message
      addProgressMessage(`Error generating scores: ${error.message}`);
    }
  };

  // Handle restyling content with a persona's voice
  const handleGenerateRestyled = async (
    contentType: 'improved' | 'alternative' | 'humanized',
    alternativeIndex?: number,
    humanizedIndex?: number,
    selectedPersona?: string
  ) => {
    // Update the selectedPersona in the main formState
    if (selectedPersona) {
      setFormState(prevState => ({
        ...prevState,
        selectedPersona
      }));
    }
    
    try {
      if (!formState.copyResult || !selectedPersona) {
        console.error('No copy result or no selected persona');
        return;
      }
      
      // Determine which content to restyle
      let contentToRestyle;
      
      if (contentType === 'improved') {
        contentToRestyle = formState.copyResult.improvedCopy;
        // Update form state to indicate loading
        setFormState({
          ...formState,
          isGeneratingRestyledImproved: true,
        });
      } else if (contentType === 'alternative') {
        if (alternativeIndex !== undefined && formState.copyResult.alternativeVersions) {
          contentToRestyle = formState.copyResult.alternativeVersions[alternativeIndex];
        } else {
          contentToRestyle = formState.copyResult.alternativeCopy;
        }
        // Update form state to indicate loading
        setFormState({
          ...formState,
          isGeneratingRestyledAlternative: true,
        });
      } else if (contentType === 'humanized') {
        if (humanizedIndex !== undefined && formState.copyResult.humanizedVersions) {
          contentToRestyle = formState.copyResult.humanizedVersions[humanizedIndex];
        } else {
          contentToRestyle = formState.copyResult.humanizedCopy;
        }
        // Update form state to indicate loading
        setFormState({
          ...formState,
          isGeneratingRestyledHumanized: true,
        });
      }
      
      if (!contentToRestyle) {
        console.error(`No ${contentType} content found to restyle`);
        return;
      }
      
      // Add progress message
      addProgressMessage(`Applying ${selectedPersona}'s voice to ${contentType} copy...`);
      
      // Calculate target word count
      let targetWordCount;
      if (formState.wordCount === 'Custom' && formState.customWordCount) {
        targetWordCount = formState.customWordCount;
      } else if (formState.wordCount.includes('Short')) {
        targetWordCount = 75; // Mid-range of Short (50-100)
      } else if (formState.wordCount.includes('Medium')) {
        targetWordCount = 150; // Mid-range of Medium (100-200)
      } else if (formState.wordCount.includes('Long')) {
        targetWordCount = 300; // Mid-range of Long (200-400)
      }
      
      // Generate restyled content
      const { content: restyledContent, personaUsed } = await restyleCopyWithPersona(
        contentToRestyle,
        selectedPersona,
        formState.model,
        formState.language,
        formState,
        targetWordCount,
        addProgressMessage
      );
      
      // Successfully applied persona voice
      console.log('Successfully applied persona voice:', restyledContent);
      
      // Automatically generate scores for the restyled content if enabled
      let restyledCopyScore;
      if (formState.generateScores) {
        try {
          // Mark as generating scores
          setFormState(prevState => ({
            ...prevState,
            isGeneratingScores: true
          }));

          // Generate score for the appropriate restyled content
          if (contentType === 'improved') {
            restyledCopyScore = await generateContentScores(
              restyledContent,
              "restyledImproved",
              formState.model,
              undefined, 
              calculateTargetWordCount(formState),
              addProgressMessage
            );
          } else if (contentType === 'alternative') {
            restyledCopyScore = await generateContentScores(
              restyledContent,
              "restyledAlternative",
              formState.model,
              undefined,
              calculateTargetWordCount(formState),
              addProgressMessage
            );
          } else if (contentType === 'humanized') {
            restyledCopyScore = await generateContentScores(
              restyledContent,
              "restyledHumanized",
              formState.model,
              undefined,
              calculateTargetWordCount(formState),
              addProgressMessage
            );
          }
        } catch (scoreError) {
          console.error(`Error generating scores for ${selectedPersona}'s ${contentType} copy:`, scoreError);
          // Continue execution even if score generation fails
        }
      }

      // Update the state based on the content type
      setFormState((prevState) => {
        const updatedState = { ...prevState };
        
        switch (contentType) {
          case 'improved':
            // Initialize the array if it doesn't exist
            if (!updatedState.copyResult.restyledImprovedVersions) {
              updatedState.copyResult.restyledImprovedVersions = [];
            }
            
            // Add the new restyled version to the array
            updatedState.copyResult.restyledImprovedVersions.push({
              content: restyledContent,
              persona: personaUsed
            });
            
            // Also keep legacy property for backward compatibility
            updatedState.copyResult.restyledImprovedCopy = restyledContent;
            updatedState.copyResult.restyledImprovedCopyPersona = personaUsed;
            updatedState.copyResult.restyledImprovedCopyScore = restyledCopyScore; // Add score if generated
            break;
            
          case 'alternative':
            // Check if we're using the new alternativeVersions array
            if (prevState.copyResult?.alternativeVersions && alternativeIndex !== undefined) {
              // Initialize the collections array if it doesn't exist
              if (!updatedState.copyResult.restyledAlternativeVersionCollections) {
                updatedState.copyResult.restyledAlternativeVersionCollections = [];
              }
              
              // Check if there's already a collection for this alternative index
              let collection = updatedState.copyResult.restyledAlternativeVersionCollections.find(
                c => c.alternativeIndex === alternativeIndex
              );
              
              if (!collection) {
                // Create a new collection if one doesn't exist
                collection = {
                  alternativeIndex,
                  versions: []
                };
                updatedState.copyResult.restyledAlternativeVersionCollections.push(collection);
              }
              
              // Add the new restyled version to the collection
              collection.versions.push({
                content: restyledContent,
                persona: personaUsed
              });
              
              // Also maintain legacy arrays for backward compatibility
              if (!updatedState.copyResult.restyledAlternativeVersions) {
                updatedState.copyResult.restyledAlternativeVersions = Array(prevState.copyResult.alternativeVersions.length).fill(undefined);
                updatedState.copyResult.restyledAlternativeVersionsPersonas = Array(prevState.copyResult.alternativeVersions.length).fill(undefined);
              }
              
              updatedState.copyResult.restyledAlternativeVersions[alternativeIndex] = restyledContent;
              updatedState.copyResult.restyledAlternativeVersionsPersonas = updatedState.copyResult.restyledAlternativeVersionsPersonas || [];
              updatedState.copyResult.restyledAlternativeVersionsPersonas[alternativeIndex] = personaUsed;
              
              // Add score if generated
              if (restyledCopyScore) {
                const restyledAlternativeVersionScores = 
                  [...(prevState.copyResult.restyledAlternativeVersionScores || [])];
                // Ensure array has enough elements
                while (restyledAlternativeVersionScores.length <= alternativeIndex) {
                  restyledAlternativeVersionScores.push(null);
                }
                restyledAlternativeVersionScores[alternativeIndex] = restyledCopyScore;
                updatedState.copyResult.restyledAlternativeVersionScores = restyledAlternativeVersionScores;
              }
            } else {
              // Legacy single alternative copy
              // Initialize the collection if it doesn't exist
              if (!updatedState.copyResult.restyledAlternativeVersionCollection) {
                updatedState.copyResult.restyledAlternativeVersionCollection = [];
              }
              
              // Add the new restyled version to the collection
              updatedState.copyResult.restyledAlternativeVersionCollection.push({
                content: restyledContent,
                persona: personaUsed
              });
              
              // Also keep legacy property for backward compatibility
              updatedState.copyResult.restyledAlternativeCopy = restyledContent;
              updatedState.copyResult.restyledAlternativeCopyPersona = personaUsed;
              updatedState.copyResult.restyledAlternativeCopyScore = restyledCopyScore; // Add score if generated
            }
            break;
            
          case 'humanized':
            // Check if we're using the new humanizedVersions array
            if (prevState.copyResult?.humanizedVersions && humanizedIndex !== undefined) {
              // Initialize the collections array if it doesn't exist
              if (!updatedState.copyResult.restyledHumanizedVersionCollections) {
                updatedState.copyResult.restyledHumanizedVersionCollections = [];
              }
              
              // Check if there's already a collection for this humanized index
              let collection = updatedState.copyResult.restyledHumanizedVersionCollections.find(
                c => c.humanizedIndex === humanizedIndex
              );
              
              if (!collection) {
                // Create a new collection if one doesn't exist
                collection = {
                  humanizedIndex,
                  versions: []
                };
                updatedState.copyResult.restyledHumanizedVersionCollections.push(collection);
              }
              
              // Add the new restyled version to the collection
              collection.versions.push({
                content: restyledContent,
                persona: personaUsed
              });
              
              // Also maintain legacy arrays for backward compatibility
              if (!updatedState.copyResult.restyledHumanizedVersions) {
                updatedState.copyResult.restyledHumanizedVersions = Array(prevState.copyResult.humanizedVersions.length).fill(undefined);
                updatedState.copyResult.restyledHumanizedVersionsPersonas = Array(prevState.copyResult.humanizedVersions.length).fill(undefined);
              }
              
              updatedState.copyResult.restyledHumanizedVersions[humanizedIndex] = restyledContent;
              updatedState.copyResult.restyledHumanizedVersionsPersonas = updatedState.copyResult.restyledHumanizedVersionsPersonas || [];
              updatedState.copyResult.restyledHumanizedVersionsPersonas[humanizedIndex] = personaUsed;
              
              // Add score if generated
              if (restyledCopyScore) {
                const restyledHumanizedVersionScores = 
                  [...(prevState.copyResult.restyledHumanizedVersionScores || [])];
                // Ensure array has enough elements
                while (restyledHumanizedVersionScores.length <= humanizedIndex) {
                  restyledHumanizedVersionScores.push(null);
                }
                restyledHumanizedVersionScores[humanizedIndex] = restyledCopyScore;
                updatedState.copyResult.restyledHumanizedVersionScores = restyledHumanizedVersionScores;
              }
            } else {
              // Legacy single humanized copy
              // Initialize the collection if it doesn't exist
              if (!updatedState.copyResult.restyledHumanizedVersionCollection) {
                updatedState.copyResult.restyledHumanizedVersionCollection = [];
              }
              
              // Add the new restyled version to the collection
              updatedState.copyResult.restyledHumanizedVersionCollection.push({
                content: restyledContent,
                persona: personaUsed
              });
              
              // Also keep legacy property for backward compatibility
              updatedState.copyResult.restyledHumanizedCopy = restyledContent;
              updatedState.copyResult.restyledHumanizedCopyPersona = personaUsed;
            }
            break;
            
          // Default case
          default:
            updatedState.copyResult = {
              ...prevState.copyResult,
              restyledContent,
              // We don't have a standard field for this, but including for completeness
              restyledContentScore: restyledCopyScore
            };
        }
        
        // Reset loading states
        updatedState.isGeneratingRestyledImproved = false;
        updatedState.isGeneratingRestyledAlternative = false;
        updatedState.isGeneratingRestyledHumanized = false;
        updatedState.isGeneratingScores = false;
        
        return updatedState;
      });
      
      // Add final progress message
      addProgressMessage(`${selectedPersona}'s voice applied successfully!`);
      
      // If headlines exist, also restyle them
      if (formState.copyResult.headlines && formState.copyResult.headlines.length > 0) {
        addProgressMessage(`Applying ${selectedPersona}'s voice to headlines...`);
        
        const { content: restyledHeadlines, personaUsed } = await restyleCopyWithPersona(
          formState.copyResult.headlines,
          selectedPersona,
          formState.model,
          formState.language,
          formState,
          undefined,
          addProgressMessage,
          formState.copyResult.headlines.length
        );
        
        const updatedCopyResult = { ...formState.copyResult };
        updatedCopyResult.restyledHeadlines = restyledHeadlines;
        updatedCopyResult.restyledHeadlinesPersona = personaUsed;
        
        // Update state with restyled headlines
        setFormState({
          ...formState,
          copyResult: updatedCopyResult,
        });
        
        addProgressMessage(`Headlines restyled with ${selectedPersona}'s voice successfully!`);
      }
    } catch (error: any) {
      console.error('Error generating restyled content:', error);
      
      // Update form state to indicate error
      setFormState({
        ...formState,
        isGeneratingRestyledImproved: false,
        isGeneratingRestyledAlternative: false,
        isGeneratingRestyledHumanized: false,
      });
      
      // Add error message
      addProgressMessage(`Error applying ${selectedPersona}'s voice: ${error.message}`);
    }
  };

  // Handle template save
  const handleSaveTemplate = async (templateName: string, description: string, formStateToSave: FormState) => {
    try {
      if (!currentUser) {
        console.error('No user to save template for');
        return;
      }
      
      // Create template object from form state
      const template: Template = {
        id: loadedTemplateId || undefined, // Use existing ID if updating
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
        business_description: formStateToSave.businessDescription,
        original_copy: formStateToSave.originalCopy,
        template_type: formStateToSave.tab,
        competitor_urls: formStateToSave.competitorUrls,
        output_structure: formStateToSave.outputStructure,
        // Add new fields
        product_service_name: formStateToSave.productServiceName,
        industry_niche: formStateToSave.industryNiche,
        tone_level: formStateToSave.toneLevel,
        reader_funnel_stage: formStateToSave.readerFunnelStage,
        competitor_copy_text: formStateToSave.competitorCopyText,
        target_audience_pain_points: formStateToSave.targetAudiencePainPoints,
        preferred_writing_style: formStateToSave.preferredWritingStyle,
        language_style_constraints: formStateToSave.languageStyleConstraints,
        // Generation options
        generateAlternative: formStateToSave.generateAlternative,
        generateHumanized: formStateToSave.generateHumanized,
        generateHeadlines: formStateToSave.generateHeadlines,
        generateScores: formStateToSave.generateScores,
        selectedPersona: formStateToSave.selectedPersona,
        // Version counts
        numberOfAlternativeVersions: formStateToSave.numberOfAlternativeVersions,
        numberOfHumanizedVersionsPerAlternative: formStateToSave.numberOfHumanizedVersionsPerAlternative,
        numberOfHeadlines: formStateToSave.numberOfHeadlines,
        // Word count control features
        sectionBreakdown: formStateToSave.sectionBreakdown,
        forceElaborationsExamples: formStateToSave.forceElaborationsExamples,
        forceKeywordIntegration: formStateToSave.forceKeywordIntegration,
        prioritizeWordCount: formStateToSave.prioritizeWordCount
      };
      
      // TODO: Save template to database
      console.log('Saving template:', template);
      
      // TODO: Show success message
      console.log('Template saved successfully!');
      
      // Close the modal
      setIsSaveTemplateModalOpen(false);
      
      // Update loaded template state if this is a new template
      if (!loadedTemplateId || templateName !== loadedTemplateName) {
        // TODO: Get the ID of the new template
        setLoadedTemplateId('new-id'); // Placeholder
        setLoadedTemplateName(templateName);
        setLoadedTemplateDescription(description);
      }
    } catch (error: any) {
      console.error('Error saving template:', error);
      
      // TODO: Show error message
      console.error('Failed to save template:', error.message);
    }
  };

  // Handle copying all output as Markdown
  const handleCopyAllAsMarkdown = () => {
    try {
      if (!formState.copyResult) {
        toast.error('No content to copy');
        return;
      }
      
      const markdownContent = formatCopyResultAsMarkdown(
        formState,
        formState.copyResult,
        formState.promptEvaluation,
        formState.selectedPersona
      );
      
      navigator.clipboard.writeText(markdownContent);
      toast.success('Copied as Markdown');
    } catch (error) {
      console.error('Error copying as Markdown:', error);
      toast.error('Failed to copy as Markdown');
    }
  };

  // Handle exporting to text file
  const handleExportToTextFile = () => {
    try {
      if (!formState.copyResult) {
        toast.error('No content to export');
        return;
      }
      
      const markdownContent = formatCopyResultAsMarkdown(
        formState,
        formState.copyResult,
        formState.promptEvaluation,
        formState.selectedPersona,
        true // Include inputs
      );
      
      // Create a blob from the markdown content
      const blob = new Blob([markdownContent], { type: 'text/plain' });
      
      // Create an object URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Create a temporary anchor element to download the file
      const a = document.createElement('a');
      a.href = url;
      a.download = `copy-result-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      
      // Programmatically click the anchor to trigger the download
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Exported to text file');
    } catch (error) {
      console.error('Error exporting to text file:', error);
      toast.error('Failed to export to text file');
    }
  };

  // Handle view prompts
  const handleViewPrompts = () => {
    // Get prompts from the API service
    const { systemPrompt, userPrompt } = getLastPrompts();
    
    // Open the prompt display modal
    setIsPromptDisplayOpen(true);
  };
  
  // Handle save output
  const handleSaveOutput = () => {
    try {
      if (!formState.copyResult) {
        toast.error('No output to save');
        return;
      }
      
      toast.success('Output saved successfully');
    } catch (error) {
      console.error('Error saving output:', error);
      toast.error('Error saving output: ' + (error as Error).message);
    }
  };

  // Handle compare scores
  const handleCompareScores = () => {
    // Open the score comparison modal
    setIsScoreComparisonOpen(true);
  };

  // Get loading message based on state
  const getLoadingMessage = () => {
    if (formState.isLoading) {
      return 'Generating copy...';
    }
    if (formState.isEvaluating) {
      return 'Evaluating inputs...';
    }
    if (formState.isGeneratingScores) {
      return 'Generating scores...';
    }
    if (formState.isGeneratingAlternative) {
      return 'Generating alternative version...';
    }
    if (formState.isGeneratingHumanized) {
      return 'Generating humanized version...';
    }
    if (formState.isGeneratingHeadlines) {
      return 'Generating headlines...';
    }
    if (formState.isGeneratingRestyledImproved) {
      return `Applying ${formState.selectedPersona}'s voice...`;
    }
    return 'Loading...';
  };

  // Determine if app is in a loading state
  const isAppLoading = () => {
    return (
      formState.isLoading || 
      formState.isEvaluating ||
      formState.isGeneratingScores ||
      formState.isGeneratingAlternative ||
      formState.isGeneratingHumanized ||
      formState.isGeneratingHeadlines ||
      formState.isGeneratingRestyledImproved ||
      formState.isGeneratingRestyledAlternative ||
      formState.isGeneratingRestyledHumanized ||
      isLoading
    );
  };

  // Handle cancel loading
  const handleCancelLoading = () => {
    // Cancel any in-progress loads
    if (loadAbortController) {
      loadAbortController.abort();
      setLoadAbortController(null);
    }
    
    // Reset loading state
    setIsLoading(false);
    setFormState({
      ...formState,
      isLoading: false,
      isEvaluating: false,
      isGeneratingScores: false,
      isGeneratingAlternative: false,
      isGeneratingHumanized: false,
      isGeneratingHeadlines: false,
      isGeneratingRestyledImproved: false,
      isGeneratingRestyledAlternative: false,
      isGeneratingRestyledHumanized: false,
    });
    
    // Add cancellation message
    addProgressMessage('Operation cancelled by user.');
  };

  // Render loading spinner if auth is not initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center p-4">
        <AppSpinner 
          isLoading={true} 
          message="Initializing application..." 
        />
      </div>
    );
  }

  // Show the login page if the user is not logged in
  if (!currentUser && !initError) {
    return <Login onLogin={handleLogin} />;
  }
  
  // Show an error page if there's an initialization error
  if (initError) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-8 shadow-xl max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Connection Error</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">{initError}</p>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This could be due to network issues or problems with the Supabase configuration. You can continue in demo mode or try again later.
          </p>
          <div className="flex flex-col space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white px-4 py-2 rounded-md"
            >
              Reload Application
            </button>
            <button
              onClick={fallbackToDemoMode}
              className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-md"
            >
              Continue in Demo Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ThemeProvider>
        <UrlParamHandler 
          setSessionIdFromUrl={setSessionIdFromUrl}
          setTemplateIdFromUrl={setTemplateIdFromUrl}
          setSavedOutputIdFromUrl={setSavedOutputIdFromUrl}
          currentUser={currentUser}
          isInitialized={isInitialized}
        />
        <div className="min-h-screen bg-white dark:bg-black">
          {/* Toaster for notifications */}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#333',
                color: '#fff',
              }
            }}
          />
          
          {/* Left floating action buttons */}
          {formState.copyResult && (
            <div className="fixed left-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 z-50">
              <button 
                className="bg-white dark:bg-gray-800 text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-3 rounded-full shadow-lg"
                onClick={handleEvaluateInputs}
                title="Evaluate Inputs"
              >
                <Zap size={20} />
              </button>
              <button 
                className="bg-white dark:bg-gray-800 text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-3 rounded-full shadow-lg"
                onClick={() => setIsSaveTemplateModalOpen(true)}
                title="Save as Template"
              >
                <Folder size={20} />
              </button>
            </div>
          )}
          
          {/* Right floating action buttons */}
          {formState.copyResult && (
            <div className="fixed right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 z-50">
              <button 
                className="bg-white dark:bg-gray-800 text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-3 rounded-full shadow-lg"
                onClick={handleSaveOutput}
                title="Save Output"
              >
                <Save size={20} />
              </button>
              <button
                className="bg-white dark:bg-gray-800 text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-3 rounded-full shadow-lg"
                onClick={handleCopyAllAsMarkdown}
                title="Copy All as Markdown"
              >
                <FileText size={20} />
              </button>
              <button
                className="bg-white dark:bg-gray-800 text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-3 rounded-full shadow-lg"
                onClick={handleExportToTextFile}
                title="Export to Text File"
              >
                <Download size={20} />
              </button>
              <button 
                className="bg-white dark:bg-gray-800 text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-3 rounded-full shadow-lg"
                onClick={handleCompareScores}
                title="Compare Content Scores"
              >
                <BarChart2 size={20} />
              </button>
              <button 
                className="bg-white dark:bg-gray-800 text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-3 rounded-full shadow-lg"
                onClick={handleViewPrompts}
                title="View Prompts"
              >
                <Code size={20} />
              </button>
            </div>
          )}
          
          {/* Global loading spinner */}
          <AppSpinner 
            isLoading={isAppLoading()} 
            message={getLoadingMessage()} 
            progressMessages={progressMessages}
            onCancel={handleCancelLoading}
          />
          
          {/* Main menu component */}
          {currentUser && (
            <MainMenu 
              userName={currentUser.user_metadata?.name || currentUser.email} 
              onLogout={handleLogout}
            />
          )}

          {/* Prompt display modal */}
          {isPromptDisplayOpen && (
            <PromptDisplay
              systemPrompt={getLastPrompts().systemPrompt}
              userPrompt={getLastPrompts().userPrompt}
              onClose={() => setIsPromptDisplayOpen(false)}
            />
          )}

          {/* Score comparison modal */}
          {isScoreComparisonOpen && formState.copyResult && (
            <ScoreComparisonModal
              copyResult={formState.copyResult}
              onClose={() => setIsScoreComparisonOpen(false)}
              isOpen={isScoreComparisonOpen}
              selectedPersona={formState.selectedPersona}
            />
          )}

          {/* Save template modal */}
          {isSaveTemplateModalOpen && (
            <SaveTemplateModal
              isOpen={isSaveTemplateModalOpen}
              onClose={() => setIsSaveTemplateModalOpen(false)}
              onSave={handleSaveTemplate}
              initialTemplateName={loadedTemplateName}
              initialDescription={loadedTemplateDescription}
              formStateToSave={formState}
            />
          )}
          
          {/* Routes */}
          <Routes>
            <Route path="/" element={<Navigate replace to="/app" />} />
            <Route path="/app" element={
              <>
                {/* This is where the Header component should be added */}
                <Header
                  activeTab={formState.tab}
                  setActiveTab={handleSetActiveTab}
                />
                
                <div className="max-w-5xl mx-auto px-4 py-6">
                  <CopyForm
                    currentUser={currentUser}
                    formState={formState}
                    setFormState={setFormState}
                    onGenerate={handleGenerateCopy}
                    onClearAll={handleClearAll}
                    loadedTemplateId={loadedTemplateId}
                    setLoadedTemplateId={setLoadedTemplateId}
                    loadedTemplateName={loadedTemplateName}
                    setLoadedTemplateName={setLoadedTemplateName}
                    isSmartMode={false} // TODO: Implement smart mode
                    onEvaluateInputs={handleEvaluateInputs}
                    onSaveTemplate={() => setIsSaveTemplateModalOpen(true)}
                  />
                  
                  {(formState.copyResult || formState.promptEvaluation) && (
                    <div className="mt-10">
                      <ResultsSection
                        formState={formState}
                        setFormState={setFormState}
                        onGenerateAlternative={handleGenerateAlternative}
                        onGenerateHumanized={handleGenerateHumanized}
                        onGenerateRestyled={handleGenerateRestyled}
                        onGenerateHeadlines={handleGenerateHeadlines}
                        onGenerateScores={handleGenerateScores}
                        onViewPrompts={handleViewPrompts}
                        onCompareScores={handleCompareScores}
                        onSaveOutput={handleSaveOutput}
                        onCopyAllAsMarkdown={handleCopyAllAsMarkdown}
                        onExportToTextFile={handleExportToTextFile}
                      />
                    </div>
                  )}
                </div>
              </>
            } />
            <Route path="/dashboard" element={
              <Dashboard 
                userId={currentUser?.id || ''} 
                onLogout={handleLogout}
              />
            } />
            <Route path="/features" element={<Features />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="*" element={<Navigate replace to="/app" />} />
          </Routes>
        </div>
      </ThemeProvider>
    </Router>
  );
}

// URL parameter handler component that listens for location changes
interface UrlParamHandlerProps {
  setSessionIdFromUrl: (id: string | null) => void;
  setTemplateIdFromUrl: (id: string | null) => void;
  setSavedOutputIdFromUrl: (id: string | null) => void;
  currentUser: any;
  isInitialized: boolean;
}

const UrlParamHandler: React.FC<UrlParamHandlerProps> = ({
  setSessionIdFromUrl,
  setTemplateIdFromUrl,
  setSavedOutputIdFromUrl,
  currentUser,
  isInitialized
}) => {
  const location = useLocation();
  
  useEffect(() => {
    if (!isInitialized) return;
    
    console.log('URL changed, checking for parameters:', location.search);
    
    const queryParams = new URLSearchParams(location.search);
    const sessionId = queryParams.get('sessionId');
    const templateId = queryParams.get('templateId');
    const savedOutputId = queryParams.get('savedOutputId');
    
    if (sessionId) {
      console.log('Setting session ID from URL:', sessionId);
      setSessionIdFromUrl(sessionId);
    }
    
    if (templateId) {
      console.log('Setting template ID from URL:', templateId);
      setTemplateIdFromUrl(templateId);
    }
    
    if (savedOutputId) {
      console.log('Setting saved output ID from URL:', savedOutputId);
      setSavedOutputIdFromUrl(savedOutputId);
    }
  }, [location.search, isInitialized, setSessionIdFromUrl, setTemplateIdFromUrl, setSavedOutputIdFromUrl]);
  
  return null; // This component doesn't render anything visible
};

export default App;