import React, { useState, useEffect, useCallback } from 'react';
import { FormState, User, Template, ContentQualityScore } from '../types';
import SharedInputs from './SharedInputs';
import CreateCopyForm from './CreateCopyForm';
import ImproveCopyForm from './ImproveCopyForm';
import GenerateButton from './GenerateButton';
import ClearButton from './ClearButton';
import FeatureToggles from './FeatureToggles';
import { DEFAULT_FORM_STATE } from '../constants';
import { useInputField } from '../hooks/useInputField';
import { getCustomers, createCustomer, getMockCustomers } from '../services/supabaseClient';
import { getSuggestions } from '../services/apiService';
import { toast } from 'react-hot-toast';
import { X, Check, RefreshCw, Users, Zap, Save } from 'lucide-react';
import SuggestionModal from './SuggestionModal';
import { INDUSTRY_NICHE_CATEGORIES } from '../constants';
import LoadingOverlay from './ui/LoadingOverlay';
import { useAuth } from '../hooks/useAuth';
import { Tooltip } from './ui/Tooltip';
import { useFormState } from '../hooks/useFormState';

// Import Supabase enabled flag from environment variables
const SUPABASE_ENABLED = import.meta.env.VITE_SUPABASE_ENABLED === 'true';

interface CopyFormProps {
  currentUser?: User;
  formState: FormState;
  setFormState: (state: FormState) => void;
  onGenerate: () => void;
  onClearAll: () => void;
  loadedTemplateId: string | null;
  setLoadedTemplateId: (id: string | null) => void;
  loadedTemplateName: string;
  setLoadedTemplateName: (name: string) => void;
  isSmartMode: boolean; // Add prop for Smart Mode
  onEvaluateInputs?: () => void;
  onSaveTemplate?: () => void;
}

const CopyForm: React.FC<CopyFormProps> = ({ 
  currentUser, 
  formState, 
  setFormState, 
  onGenerate,
  onClearAll,
  loadedTemplateId,
  setLoadedTemplateId,
  loadedTemplateName,
  setLoadedTemplateName,
  isSmartMode, // Add isSmartMode prop
  onEvaluateInputs,
  onSaveTemplate
}) => {
  // State for suggestions modal - moved from child components
  const [activeSuggestionField, setActiveSuggestionField] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // State for customer management
  const [customers, setCustomers] = useState([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const { user } = useAuth();
  const { loadFormStateFromTemplate, handleScoreChange } = useFormState(); // Get handleScoreChange

  // Use the input field hook for the brief description field
  const briefDescriptionField = useInputField({
    value: formState.briefDescription || '',
    onChange: (value) => handleChange({ 
      target: { name: 'briefDescription', value } 
    } as any)
  });
  
  // Use the input field hook for the customer name field
  const newCustomerNameField = useInputField({
    value: '',
    onChange: (value) => {}  // We'll handle this separately
  });

  // Use the input field hook for the product service name field
  const productServiceNameField = useInputField({
    value: formState.productServiceName || '',
    onChange: (value) => handleChange({ 
      target: { name: 'productServiceName', value } 
    } as any)
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState({ ...formState, [name]: value });
  };

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormState({ ...formState, [name]: checked });
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState({ ...formState, [name]: value });
  };
  
  // Function to clean up suggestions from formatting
  const cleanSuggestion = (suggestion: string): string => {
    // Remove numbering (e.g., "1. ", "2. ")
    let cleaned = suggestion.replace(/^\d+\.\s*/g, '');
    
    // Remove markdown formatting (**, *, etc.)
    cleaned = cleaned.replace(/\*\*/g, '').replace(/\*/g, '');
    
    // Remove extra quotes
    cleaned = cleaned.replace(/^["'](.*)["']$/g, '$1');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  };

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setIsLoadingCustomers(true);
    
    try {
      if (!SUPABASE_ENABLED) {
        // Use mock data if Supabase is not enabled
        const mockCustomers = getMockCustomers();
        setCustomers(mockCustomers);
        return;
      }
      
      const { data, error } = await getCustomers();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
      
      // Use mock data as fallback
      const mockCustomers = getMockCustomers();
      setCustomers(mockCustomers);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomerNameField.inputValue.trim()) {
      toast.error('Please enter a customer name');
      return;
    }
    
    try {
      if (!SUPABASE_ENABLED) {
        // Handle mock data case
        const newId = `mock-${Date.now()}`;
        const newCustomer = { 
          id: newId, 
          name: newCustomerNameField.inputValue,
          created_at: new Date().toISOString()
        };
        
        setCustomers([...customers, newCustomer]);
        newCustomerNameField.setInputValue('');
        setShowAddCustomer(false);
        
        // Set the new customer as selected
        setFormState({
          ...formState,
          customerId: newId,
          customerName: newCustomerNameField.inputValue
        });
        
        toast.success('Customer added successfully');
        return;
      }
      
      // Check if user is authenticated
      if (!user || !user.id) {
        toast.error('You must be logged in to add a customer');
        return;
      }
      
      // Pass the user ID when creating a customer to satisfy RLS policy
      const { data, error } = await createCustomer(newCustomerNameField.inputValue, user.id);
      
      if (error) {
        throw error;
      }
      
      if (data) {
        // Add the new customer to the list
        setCustomers([...customers, data]);
        
        // Reset the form
        newCustomerNameField.setInputValue('');
        setShowAddCustomer(false);
        
        // Set the new customer as selected
        setFormState({
          ...formState,
          customerId: data.id,
          customerName: data.name
        });
        
        toast.success('Customer added successfully');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      toast.error('Failed to add customer');
    }
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = e.target.value;
    
    // Find the selected customer name
    let customerName = '';
    if (customerId && customerId !== 'none') {
      const selectedCustomer = customers.find(customer => customer.id === customerId);
      if (selectedCustomer) {
        customerName = selectedCustomer.name;
      }
    }
    
    // Update both values in a single state update
    setFormState({
      ...formState,
      customerId,
      customerName
    });
  };

  // Handle suggestion request - moved from child components
  const handleGetSuggestion = async (fieldType: string) => {
    // Special handling for industryNiche field - use hardcoded values instead of AI
    if (fieldType === 'industryNiche') {
      setIsLoadingSuggestions(true);
      setActiveSuggestionField(fieldType);
      
      try {
        // Get all the industry niche options and extract their labels
        const industryNicheSuggestions = INDUSTRY_NICHE_CATEGORIES.flatMap(category => 
          category.options.map(option => option.label)
        );
        setSuggestions(industryNicheSuggestions);
      } catch (error) {
        console.error('Error processing industry niche options:', error);
        toast.error('Failed to load industry niche options');
      } finally {
        setIsLoadingSuggestions(false);
      }
      return;
    }
    
    // Regular handling for other fields
    let contextText = "";
    
    // Determine which field to use for context based on the active tab
    if (formState.tab === 'create') {
      contextText = formState.businessDescription || '';
      if (!contextText.trim()) {
        toast.error('Please provide a business description first');
        return;
      }
    } else {
      contextText = formState.originalCopy || '';
      if (!contextText.trim()) {
        toast.error('Please provide the original copy first');
        return;
      }
    }

    setIsLoadingSuggestions(true);
    setActiveSuggestionField(fieldType);
    setSuggestions([]);

    try {
      // Check if API keys are available
      const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
      const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
      
      if (!openaiKey && !deepseekKey) {
        throw new Error('API keys are not properly configured in environment variables');
      }
      
      const results = await getSuggestions(
        contextText,
        fieldType,
        formState.model,
        formState.language
      );
      
      // Clean up suggestions before setting them
      const cleanedResults = results.map(cleanSuggestion);
      setSuggestions(cleanedResults);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast.error('Failed to get suggestions. Please check your API keys and internet connection.');
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Handle inserting multiple suggestions - moved from child components
  const handleInsertSuggestions = (selectedSuggestions: string[]) => {
    if (!activeSuggestionField || selectedSuggestions.length === 0) return;

    // Handle insertion based on field type
    switch (activeSuggestionField) {
      case 'keyMessage':
        setFormState({
          ...formState,
          keyMessage: selectedSuggestions.join(' ')
        });
        break;
      case 'brandValues':
      case 'desiredEmotion':
      case 'keywords':
        // For tag-based fields, merge with existing values
        const existingValues = (formState[activeSuggestionField] || '').split(',')
          .map(v => v.trim())
          .filter(Boolean);
        
        const newValues = [...new Set([...existingValues, ...selectedSuggestions])].join(', ');
        
        setFormState({
          ...formState,
          [activeSuggestionField]: newValues
        });
        break;
      case 'callToAction':
        setFormState({
          ...formState,
          callToAction: selectedSuggestions.join(' ')
        });
        break;
      case 'context':
        setFormState({
          ...formState,
          context: selectedSuggestions.join(' ')
        });
        break;
      case 'industryNiche':
        setFormState({
          ...formState,
          industryNiche: selectedSuggestions.join(', ')
        });
        break;
      case 'readerFunnelStage':
        setFormState({
          ...formState,
          readerFunnelStage: selectedSuggestions.join(', ')
        });
        break;
      case 'preferredWritingStyle':
        setFormState({
          ...formState,
          preferredWritingStyle: selectedSuggestions.join(', ')
        });
        break;
      case 'targetAudiencePainPoints':
        setFormState({
          ...formState,
          targetAudiencePainPoints: selectedSuggestions.join('\n\n')
        });
        break;
    }
    
    // Close the modal after inserting selections
    setActiveSuggestionField(null);
  };

  return (
    <div className="bg-white dark:bg-black border border-gray-300 dark:border-gray-800 rounded-lg p-6">
      {/* Loading overlay for suggestions */}
      <LoadingOverlay 
        isVisible={isLoadingSuggestions}
        message="Generating suggestions..."
      />

      <div className="mb-6">
        {/* Template Management Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Evaluate Inputs button */}
          {onEvaluateInputs && (
            <button
              type="button"
              onClick={onEvaluateInputs}
              className={`flex items-center ${
                ((formState.tab === 'create' && formState.businessDescription?.trim()) ||
                 (formState.tab === 'improve' && formState.originalCopy?.trim()))
                  ? "bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-800 cursor-not-allowed"
              } px-3 py-2 rounded-md text-sm transition-colors`}
              disabled={formState.isEvaluating || !((formState.tab === 'create' && formState.businessDescription?.trim()) ||
                                                     (formState.tab === 'improve' && formState.originalCopy?.trim()))}
              title="Evaluate the quality of your input content"
            >
              <Zap size={16} className="mr-1.5" />
              {formState.isEvaluating ? "Evaluating..." : "Evaluate Inputs"}
            </button>
          )}
          
          {/* Save Template button */}
          {onSaveTemplate && (
            <button
              type="button"
              onClick={onSaveTemplate}
              className={`flex items-center ${
                formState.briefDescription?.trim()
                  ? "bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-800 cursor-not-allowed"
              } px-3 py-2 rounded-md text-sm transition-colors`}
              disabled={formState.isLoading || !formState.briefDescription?.trim()}
              title="Save current settings as a template"
            >
              <Save size={16} className="mr-1.5" />
              Save Template
            </button>
          )}
          
          {/* New Copy button */}
          <button
            type="button"
            onClick={onClearAll}
            className="flex items-center bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-800 text-primary-500 border border-primary-500 px-3 py-2 rounded-md text-sm transition-colors"
            disabled={formState.isLoading}
          >
            <RefreshCw size={16} className="mr-1.5" />
            New Copy
          </button>
        </div>

        {/* Model Selection Dropdown */}
        <div className="mb-6">
          <Tooltip content="Choose which AI model to use for generating your copy. Different models may produce different styles and quality levels." delayDuration={300}>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Model
            </label>
          </Tooltip>
          <select
            id="model"
            name="model"
            className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
            value={formState.model}
            onChange={handleInputChange}
          >
            {/* Options will be populated from MODELS constant */}
            <option value="deepseek-chat">DeepSeek V3 (deepseek-chat)</option>
            <option value="gpt-4o">GPT-4 Omni (gpt-4o)</option>
            <option value="gpt-4-turbo">GPT-4 Turbo (gpt-4-turbo)</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (gpt-3.5-turbo)</option>
          </select>
        </div>

        {/* Project Setup Section - Moved from SharedInputs */}
        <div className="mb-6">
          <Tooltip content="Set up the project and client context. This helps you organize your work and improves copy relevance." delayDuration={300}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-300 dark:border-gray-700 flex items-center">
              <div className="w-1 h-5 bg-primary-500 mr-2"></div>
              Project Setup
            </h3>
          </Tooltip>

          {/* Customer Dropdown */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Customer
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={fetchCustomers}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center"
                  disabled={isLoadingCustomers}
                >
                  <RefreshCw size={12} className={`mr-1 ${isLoadingCustomers ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(!showAddCustomer)}
                  className="text-xs text-primary-500 hover:text-primary-400 flex items-center"
                >
                  <X size={12} className="mr-1" />
                  Add New
                </button>
              </div>
            </div>
            
            {showAddCustomer ? (
              <div className="flex mt-2 mb-3">
                <input
                  type="text"
                  value={newCustomerNameField.inputValue}
                  onChange={newCustomerNameField.handleChange}
                  className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-l-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
                  placeholder="Enter customer name"
                />
                <button
                  type="button"
                  onClick={handleAddCustomer}
                  className="bg-primary-600 hover:bg-primary-500 text-white px-3 py-2 rounded-r-lg text-sm font-medium"
                >
                  Add
                </button>
              </div>
            ) : null}
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Users size={16} className="text-gray-500" />
              </div>
              <select
                id="customerId"
                name="customerId"
                className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2.5"
                value={formState.customerId}
                onChange={handleCustomerChange}
              >
                <option value="none">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product/Service Name */}
          <div>
            <label htmlFor="productServiceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Product/Service Name
            </label>
            <input
              type="text"
              id="productServiceName"
              name="productServiceName"
              className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
              placeholder="e.g., Premium Website Hosting"
              value={productServiceNameField.inputValue}
              onChange={productServiceNameField.handleChange}
              onBlur={productServiceNameField.handleBlur}
            />
          </div>
        </div>

        {/* Core Content Section */}
        <div className="mb-6">
          <Tooltip content="Define the type of copy you want to generate and provide key business details. This is the core information the AI will use." delayDuration={300}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-300 dark:border-gray-700 flex items-center">
              <div className="w-1 h-5 bg-primary-500 mr-2"></div>
              Core Content
            </h3>
          </Tooltip>
          
          {/* Brief Description Field - Moved from SharedInputs */}
          <div className="mb-6">
            <label htmlFor="briefDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Brief Description
            </label>
            <input
              type="text"
              id="briefDescription"
              name="briefDescription"
              className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
              placeholder="Briefly describe this project..."
              value={briefDescriptionField.inputValue}
              onChange={briefDescriptionField.handleChange}
              onBlur={briefDescriptionField.handleBlur}
            />
          </div>
          
          {/* Conditional Form based on Tab */}
          {formState.tab === 'create' ? (
            <CreateCopyForm 
              formData={formState} 
              handleChange={handleInputChange} 
              onGetSuggestion={handleGetSuggestion}
              isLoadingSuggestions={isLoadingSuggestions}
              activeSuggestionField={activeSuggestionField}
              handleScoreChange={handleScoreChange} // Pass the new function
            />
          ) : (
            <ImproveCopyForm 
              formData={formState} 
              handleChange={handleInputChange}
              onGetSuggestion={handleGetSuggestion}
              isLoadingSuggestions={isLoadingSuggestions}
              activeSuggestionField={activeSuggestionField}
              handleScoreChange={handleScoreChange} // Pass the new function
            />
          )}
        </div>

        {/* Shared Inputs - Now with setFormState prop */}
        <SharedInputs 
          formData={formState} 
          handleChange={handleInputChange}
          handleToggle={handleToggleChange}
          onGetSuggestion={handleGetSuggestion}
          isLoadingSuggestions={isLoadingSuggestions}
          activeSuggestionField={activeSuggestionField}
          isSmartMode={isSmartMode}
          setFormState={setFormState}
        />
        
        {/* Feature Toggles - Added here */}
        <FeatureToggles 
          formData={formState} 
          handleToggle={handleToggleChange} 
          handleChange={handleInputChange}
          isSmartMode={isSmartMode}
        />
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="md:col-span-1">
          <GenerateButton 
            onClick={onGenerate}
            isLoading={formState.isLoading}
            isDisabled={
              (formState.tab === 'create' && !formState.businessDescription?.trim()) ||
              (formState.tab === 'improve' && !formState.originalCopy?.trim())
            }
          />
        </div>
        <div className="md:col-span-1">
          <ClearButton 
            onClick={onClearAll}
            isDisabled={formState.isLoading}
          />
        </div>
      </div>
      
      {/* Suggestions Modal - Moved from child components */}
      {activeSuggestionField && (
        <SuggestionModal
          fieldType={activeSuggestionField}
          suggestions={suggestions}
          onClose={() => setActiveSuggestionField(null)}
          onInsert={handleInsertSuggestions}
          isLoading={isLoadingSuggestions}
        />
      )}
    </div>
  );
};

export default CopyForm;