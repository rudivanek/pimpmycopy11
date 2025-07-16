import React, { useState, useEffect, useRef } from 'react';
import { FormState } from '../types';
import { LANGUAGES, TONES, WORD_COUNTS, OUTPUT_STRUCTURE_OPTIONS, INDUSTRY_NICHE_CATEGORIES, READER_FUNNEL_STAGES, PREFERRED_WRITING_STYLES, LANGUAGE_STYLE_CONSTRAINTS } from '../constants';
import { toast } from 'react-hot-toast';
import { useInputField } from '../hooks/useInputField';
import DraggableStructuredInput from './ui/DraggableStructuredInput';
import TagInput from './ui/TagInput';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import SuggestionButton from './ui/SuggestionButton';
import { Tooltip } from './ui/Tooltip';
import CategoryTagsInput from './ui/CategoryTagsInput';
import { calculateTargetWordCount } from '../services/api/utils';

interface SharedInputsProps {
  formData: FormState;
  handleChange: (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => void;
  handleToggle: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGetSuggestion: (fieldType: string) => Promise<void>;
  isLoadingSuggestions: boolean;
  activeSuggestionField: string | null;
  // Removed InfoIcon import as it's no longer used in this file
  isSmartMode: boolean; // Add prop for Smart Mode
  setFormState: (formState: FormState) => void;
}

const SharedInputs: React.FC<SharedInputsProps> = ({ 
  formData, 
  handleChange,
  handleToggle,
  onGetSuggestion,
  isLoadingSuggestions,
  activeSuggestionField,
  isSmartMode, // Add isSmartMode prop
  setFormState
}) => {
  // Use input field hooks for competitor URLs
  const competitorUrl1Field = useInputField({
    value: formData.competitorUrls[0] || '',
    onChange: (value) => {
      const newUrls = [...formData.competitorUrls];
      newUrls[0] = value;
      handleChange({
        target: { name: 'competitorUrls', value: newUrls }
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  });
  
  const competitorUrl2Field = useInputField({
    value: formData.competitorUrls[1] || '',
    onChange: (value) => {
      const newUrls = [...formData.competitorUrls];
      newUrls[1] = value;
      handleChange({
        target: { name: 'competitorUrls', value: newUrls }
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  });
  
  const competitorUrl3Field = useInputField({
    value: formData.competitorUrls[2] || '',
    onChange: (value) => {
      const newUrls = [...formData.competitorUrls];
      newUrls[2] = value;
      handleChange({
        target: { name: 'competitorUrls', value: newUrls }
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    }
  });

  // Use input field hooks for new fields
  const competitorCopyTextField = useInputField({
    value: formData.competitorCopyText || '',
    onChange: (value) => handleChange({ 
      target: { name: 'competitorCopyText', value } 
    } as any)
  });

  const targetAudiencePainPointsField = useInputField({
    value: formData.targetAudiencePainPoints || '',
    onChange: (value) => handleChange({ 
      target: { name: 'targetAudiencePainPoints', value } 
    } as any)
  });

  // Moved fields from CreateCopyForm and ImproveCopyForm
  const targetAudienceField = useInputField({
    value: formData.targetAudience || '',
    onChange: (value) => handleChange({ target: { name: 'targetAudience', value } } as any)
  });
  
  const keyMessageField = useInputField({
    value: formData.keyMessage || '',
    onChange: (value) => handleChange({ target: { name: 'keyMessage', value } } as any)
  });
  
  const desiredEmotionField = useInputField({
    value: formData.desiredEmotion || '',
    onChange: (value) => handleChange({ target: { name: 'desiredEmotion', value } } as any)
  });
  
  const callToActionField = useInputField({
    value: formData.callToAction || '',
    onChange: (value) => handleChange({ target: { name: 'callToAction', value } } as any)
  });
  
  const brandValuesField = useInputField({
    value: formData.brandValues || '',
    onChange: (value) => handleChange({ target: { name: 'brandValues', value } } as any)
  });
  
  const keywordsField = useInputField({
    value: formData.keywords || '',
    onChange: (value) => handleChange({ target: { name: 'keywords', value } } as any)
  });
  
  const contextField = useInputField({
    value: formData.context || '',
    onChange: (value) => handleChange({ target: { name: 'context', value } } as any)
  });

  // Use the input field hook for the custom word count field
  const customWordCountField = useInputField({
    value: formData.customWordCount?.toString() || '',
    onChange: (value) => handleChange({ 
      target: { 
        name: 'customWordCount', 
        value: value ? parseInt(value) : 150 
      } 
    } as any)
  });

  // Handler for output structure change
  const handleStructureChange = (values: string[]) => {
    handleChange({
      target: { name: 'outputStructure', value: values }
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  // Handle industry niche change
  const handleIndustryNicheChange = (value: string) => {
    handleChange({
      target: { name: 'industryNiche', value }
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  // Handle reader funnel stage change
  const handleReaderFunnelStageChange = (value: string) => {
    handleChange({
      target: { name: 'readerFunnelStage', value }
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  // Handle preferred writing style change
  const handlePreferredWritingStyleChange = (value: string) => {
    handleChange({
      target: { name: 'preferredWritingStyle', value }
    } as React.ChangeEvent<HTMLSelectElement>);
  };

  // Handle tone level change
  const handleToneLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange({
      target: { name: 'toneLevel', value: parseInt(e.target.value) }
    } as React.ChangeEvent<HTMLInputElement>);
  };

  // Handle language style constraints change
  const handleLanguageStyleConstraintChange = (constraint: string) => {
    const constraints = formData.languageStyleConstraints || [];
    const updatedConstraints = constraints.includes(constraint)
      ? constraints.filter(c => c !== constraint)
      : [...constraints, constraint];
    
    handleChange({
      target: { name: 'languageStyleConstraints', value: updatedConstraints }
    } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  // Calculate the total word count from structure elements
  const totalStructureWordCount = React.useMemo(() => {
    if (!formData.outputStructure || formData.outputStructure.length === 0) {
      return 0;
    }
    
    return formData.outputStructure.reduce((sum, element) => {
      return sum + (element.wordCount || 0);
    }, 0);
  }, [formData.outputStructure]);
  
  // Calculate the effective target word count using the shared utility function
  const effectiveTargetWordCount = calculateTargetWordCount(formData);

  return (
    <div className="space-y-6">
      {/* COPY TARGETING SECTION */}
      <div className={isSmartMode ? 'hidden' : ''}>
        <Tooltip content="Describe your target audience and competitive landscape. The more precise this is, the better your copy will resonate with readers." delayDuration={300}>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-300 dark:border-gray-700 flex items-center">
            <div className="w-1 h-5 bg-primary-500 mr-2"></div>
            Copy Targeting
          </h3>
        </Tooltip>
        
        {/* Industry/Niche - Enhanced field with categories */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="industryNiche" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Industry/Niche
            </label>
            <SuggestionButton
              fieldType="industryNiche"
              businessDescription={formData.tab === 'create' ? formData.businessDescription || '' : formData.originalCopy || ''}
              onGetSuggestion={onGetSuggestion}
              isLoading={isLoadingSuggestions && activeSuggestionField === 'industryNiche'}
            />
          </div>
          <CategoryTagsInput
            id="industryNiche"
            name="industryNiche"
            placeholder="Select industry/niche..."
            value={formData.industryNiche || ''}
            onChange={handleIndustryNicheChange}
            categories={INDUSTRY_NICHE_CATEGORIES}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Select your industry or add a custom one to get more targeted copy
          </p>
        </div>

        {/* Target Audience - Moved from CreateCopyForm/ImproveCopyForm */}
        <div className="mb-6">
          <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Target Audience
          </label>
          <textarea
            id="targetAudience"
            name="targetAudience"
            rows={3}
            className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
            placeholder="Describe who this copy is targeting (age, interests, pain points, etc.)..."
            value={targetAudienceField.inputValue}
            onChange={targetAudienceField.handleChange}
            onBlur={targetAudienceField.handleBlur}
          ></textarea>
        </div>

        {/* Reader's Stage in Funnel */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="readerFunnelStage" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Reader's Stage in Funnel
            </label>
            <SuggestionButton
              fieldType="readerFunnelStage"
              businessDescription={formData.tab === 'create' ? formData.businessDescription || '' : formData.originalCopy || ''}
              onGetSuggestion={onGetSuggestion}
              isLoading={isLoadingSuggestions && activeSuggestionField === 'readerFunnelStage'}
            />
          </div>
          <TagInput
            id="readerFunnelStage"
            name="readerFunnelStage"
            placeholder="e.g., Awareness, Consideration, Decision..."
            value={formData.readerFunnelStage || ''}
            onChange={handleReaderFunnelStageChange}
          />
        </div>
        
        {/* Competitor URLs */}
        <div className="space-y-3 mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Competitor URLs (Optional)
          </label>
          <input
            type="url"
            className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
            placeholder="https://competitor1.com"
            value={competitorUrl1Field.inputValue}
            onChange={competitorUrl1Field.handleChange}
            onBlur={competitorUrl1Field.handleBlur}
          />
          <input
            type="url"
            className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
            placeholder="https://competitor2.com"
            value={competitorUrl2Field.inputValue}
            onChange={competitorUrl2Field.handleChange}
            onBlur={competitorUrl2Field.handleBlur}
          />
          <input
            type="url"
            className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
            placeholder="https://competitor3.com"
            value={competitorUrl3Field.inputValue}
            onChange={competitorUrl3Field.handleChange}
            onBlur={competitorUrl3Field.handleBlur}
          />
        </div>

        {/* Target Audience Pain Points - With suggestion button */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="targetAudiencePainPoints" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Target Audience Pain Points
            </label>
            <SuggestionButton
              fieldType="targetAudiencePainPoints"
              businessDescription={formData.tab === 'create' ? formData.businessDescription || '' : formData.originalCopy || ''}
              onGetSuggestion={onGetSuggestion}
              isLoading={isLoadingSuggestions && activeSuggestionField === 'targetAudiencePainPoints'}
            />
          </div>
          <textarea
            id="targetAudiencePainPoints"
            name="targetAudiencePainPoints"
            rows={4}
            className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
            placeholder="List any specific pain points or challenges that the target audience likely faces..."
            value={targetAudiencePainPointsField.inputValue}
            onChange={targetAudiencePainPointsField.handleChange}
            onBlur={targetAudiencePainPointsField.handleBlur}
          ></textarea>
        </div>
      </div>

      {/* TONE & STYLE SECTION */}
      <div>
        <Tooltip content="Control the voice, tone, and formatting of your copy to match your brand or campaign goals." delayDuration={300}>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-300 dark:border-gray-700 flex items-center">
            <div className="w-1 h-5 bg-primary-500 mr-2"></div>
            Tone & Style
          </h3>
        </Tooltip>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Language Dropdown */}
          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Language
            </label>
            <select
              id="language"
              name="language"
              className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
              value={formData.language}
              onChange={handleChange}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* Tone Dropdown */}
          <div>
            <label htmlFor="tone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tone
            </label>
            <select
              id="tone"
              name="tone"
              className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
              value={formData.tone}
              onChange={handleChange}
            >
              {TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
          </div>

          {/* Word Count Dropdown */}
          <div>
            <label htmlFor="wordCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Word Count
            </label>
            <select
              id="wordCount"
              name="wordCount"
              className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
              value={formData.wordCount}
              onChange={handleChange}
            >
              {WORD_COUNTS.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Word Count */}
        {formData.wordCount === 'Custom' && (
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <label htmlFor="customWordCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Custom Word Count
              </label>
              
              {/* Word count info display */}
              {/* Removed word count info display */}
            </div>
            <input
              type="number"
              id="customWordCount"
              name="customWordCount"
              className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
              placeholder="Enter word count"
              min="50"
              max="2000"
              value={customWordCountField.inputValue}
              onChange={customWordCountField.handleChange}
              onBlur={customWordCountField.handleBlur}
            />
            {/* Removed word count adherence info */}
            {/* Show effective target word count if different from custom */}
            {!isSmartMode && 
             formData.prioritizeWordCount && 
             totalStructureWordCount > 0 && 
             totalStructureWordCount !== parseInt(customWordCountField.inputValue) && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> The effective target word count will be {effectiveTargetWordCount} words because you have both section word counts and a custom total with strict adherence enabled.
              </div>
            )}
          </div>
        )}

        {/* Word Count Priority Notice */}
        {!formData.wordCount.includes('Custom') && 
         !isSmartMode && 
         formData.prioritizeWordCount && 
         totalStructureWordCount > 0 && (
          <div className="mb-6 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-xs">
            <div className="font-medium text-blue-800 dark:text-blue-300">Target Word Count</div>
            <p className="text-blue-800 dark:text-blue-200 mt-1">
              With strict word count adherence enabled, the target will be {effectiveTargetWordCount} words based on your section structure.
            </p>
          </div>
        )}

        {/* Tone Level Slider - HIDE in Smart Mode */}
        {!isSmartMode && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="toneLevel" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tone Level
              </label>
              <span className="text-sm text-gray-600 dark:text-gray-400">{formData.toneLevel || 50}</span>
            </div>
            <input
              type="range"
              id="toneLevel"
              name="toneLevel"
              min="0"
              max="100"
              step="1"
              value={formData.toneLevel || 50}
              onChange={handleToneLevelChange}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Formal</span>
              <span>Casual</span>
            </div>
          </div>
        )}

        {/* Preferred Writing Style - HIDE in Smart Mode */}
        {!isSmartMode && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="preferredWritingStyle" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Preferred Writing Style
              </label>
              <SuggestionButton
                fieldType="preferredWritingStyle"
                businessDescription={formData.tab === 'create' ? formData.businessDescription || '' : formData.originalCopy || ''}
                onGetSuggestion={onGetSuggestion}
                isLoading={isLoadingSuggestions && activeSuggestionField === 'preferredWritingStyle'}
              />
            </div>
            <TagInput
              id="preferredWritingStyle"
              name="preferredWritingStyle"
              placeholder="e.g., Persuasive, Conversational, Informative, Storytelling..."
              value={formData.preferredWritingStyle || ''}
              onChange={handlePreferredWritingStyleChange}
            />
          </div>
        )}

        {/* Language Style Constraints - HIDE in Smart Mode */}
        {!isSmartMode && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Language Style Constraints
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LANGUAGE_STYLE_CONSTRAINTS.map((constraint) => (
                <div key={constraint} className="flex items-center space-x-2">
                  <Checkbox
                    id={`constraint-${constraint}`}
                    checked={(formData.languageStyleConstraints || []).includes(constraint)}
                    onCheckedChange={() => handleLanguageStyleConstraintChange(constraint)}
                  />
                  <Label 
                    htmlFor={`constraint-${constraint}`}
                    className="cursor-pointer"
                  >
                    {constraint}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output Structure - HIDE in Smart Mode */}
        {!isSmartMode && (
          <div>
            <label htmlFor="outputStructure" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Output Structure
            </label>
            <DraggableStructuredInput
              value={formData.outputStructure || []}
              onChange={handleStructureChange}
              options={OUTPUT_STRUCTURE_OPTIONS}
              placeholder="Select one or more format options..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Select how you want the generated content to be formatted. Drag to reorder.
            </p>
            
            {/* Show word count summary */}
            {totalStructureWordCount > 0 && (
              <div className="mt-2 flex justify-between items-center">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total allocated: <span className="font-bold">{totalStructureWordCount}</span> words
                </div>
                
                {/* Add warning if it differs significantly from custom count */}
                {formData.wordCount === 'Custom' && 
                 formData.customWordCount && 
                 Math.abs(totalStructureWordCount - formData.customWordCount) > formData.customWordCount * 0.1 && (
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">
                    {formData.prioritizeWordCount 
                      ? "Structure word counts will take priority with strict adherence enabled."
                      : "Differs from custom word count"}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* STRATEGIC MESSAGING SECTION */}
      <div>
        <Tooltip content="Define the key message, emotions, and SEO keywords to guide your copy's core message and impact." delayDuration={300}>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b border-gray-300 dark:border-gray-700 flex items-center">
            <div className="w-1 h-5 bg-primary-500 mr-2"></div>
            Strategic Messaging
          </h3>
        </Tooltip>
        
        {/* Key Message - Moved from CreateCopyForm/ImproveCopyForm */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="keyMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Key Message
            </label>
            <SuggestionButton
              fieldType="keyMessage"
              businessDescription={formData.tab === 'create' ? formData.businessDescription || '' : formData.originalCopy || ''}
              onGetSuggestion={onGetSuggestion}
              isLoading={isLoadingSuggestions && activeSuggestionField === 'keyMessage'}
            />
          </div>
          <textarea
            id="keyMessage"
            name="keyMessage"
            rows={2}
            className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
            placeholder="What's the main message you want to convey?"
            value={keyMessageField.inputValue}
            onChange={keyMessageField.handleChange}
            onBlur={keyMessageField.handleBlur}
          ></textarea>
        </div>

        {/* Grid for smaller inputs - Moved from CreateCopyForm/ImproveCopyForm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          {/* Desired Emotion - HIDE in Smart Mode */}
          {!isSmartMode && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="desiredEmotion" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Desired Emotion
                </label>
                <SuggestionButton
                  fieldType="desiredEmotion"
                  businessDescription={formData.tab === 'create' ? formData.businessDescription || '' : formData.originalCopy || ''}
                  onGetSuggestion={onGetSuggestion}
                  isLoading={isLoadingSuggestions && activeSuggestionField === 'desiredEmotion'}
                />
              </div>
              <TagInput
                id="desiredEmotion"
                name="desiredEmotion"
                placeholder="e.g., Trust, Excitement, Relief..."
                value={desiredEmotionField.inputValue}
                onChange={desiredEmotionField.setInputValue}
              />
            </div>
          )}

          {/* Call to Action */}
          <div className={`${isSmartMode ? 'col-span-full' : ''}`}>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="callToAction" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Call to Action
              </label>
              <SuggestionButton
                fieldType="callToAction"
                businessDescription={formData.tab === 'create' ? formData.businessDescription || '' : formData.originalCopy || ''}
                onGetSuggestion={onGetSuggestion}
                isLoading={isLoadingSuggestions && activeSuggestionField === 'callToAction'}
              />
            </div>
            <input
              type="text"
              id="callToAction"
              name="callToAction"
              className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
              placeholder="e.g., Sign up, Contact us, Learn more..."
              value={callToActionField.inputValue}
              onChange={callToActionField.handleChange}
              onBlur={callToActionField.handleBlur}
            />
          </div>
        </div>

        {/* Brand Values - HIDE in Smart Mode */}
        {!isSmartMode && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="brandValues" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Brand Values
              </label>
              <SuggestionButton
                fieldType="brandValues"
                businessDescription={formData.tab === 'create' ? formData.businessDescription || '' : formData.originalCopy || ''}
                onGetSuggestion={onGetSuggestion}
                isLoading={isLoadingSuggestions && activeSuggestionField === 'brandValues'}
              />
            </div>
            <TagInput
              id="brandValues"
              name="brandValues"
              placeholder="e.g., Innovation, Reliability, Sustainability..."
              value={brandValuesField.inputValue}
              onChange={brandValuesField.setInputValue}
            />
          </div>
        )}

        {/* Keywords - HIDE in Smart Mode */}
        {!isSmartMode && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Keywords
              </label>
              <SuggestionButton
                fieldType="keywords"
                businessDescription={formData.tab === 'create' ? formData.businessDescription || '' : formData.originalCopy || ''}
                onGetSuggestion={onGetSuggestion}
                isLoading={isLoadingSuggestions && activeSuggestionField === 'keywords'}
              />
            </div>
            <TagInput
              id="keywords"
              name="keywords"
              placeholder="e.g., professional, effective, custom, affordable..."
              value={keywordsField.inputValue}
              onChange={keywordsField.setInputValue}
            />
          </div>
        )}

        {/* Context - HIDE in Smart Mode */}
        {!isSmartMode && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="context" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Context
              </label>
              <SuggestionButton
                fieldType="context"
                businessDescription={formData.tab === 'create' ? formData.businessDescription || '' : formData.originalCopy || ''}
                onGetSuggestion={onGetSuggestion}
                isLoading={isLoadingSuggestions && activeSuggestionField === 'context'}
              />
            </div>
            <textarea
              id="context"
              name="context"
              rows={3}
              className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
              placeholder="Any additional context for this copy (e.g., campaign details, market conditions)..."
              value={contextField.inputValue}
              onChange={contextField.handleChange}
              onBlur={contextField.handleBlur}
            ></textarea>
          </div>
        )}

        {/* Competitor Copy (Text) - HIDE in Smart Mode */}
        {!isSmartMode && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="competitorCopyText" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Competitor Copy (Text)
              </label>
              <SuggestionButton
                fieldType="competitorCopyText"
                businessDescription={formData.tab === 'create' ? formData.businessDescription || '' : formData.originalCopy || ''}
                onGetSuggestion={onGetSuggestion}
                isLoading={isLoadingSuggestions && activeSuggestionField === 'competitorCopyText'}
              />
            </div>
            <textarea
              id="competitorCopyText"
              name="competitorCopyText"
              rows={4}
              className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
              placeholder="Paste the copy you want to outperform..."
              value={competitorCopyTextField.inputValue}
              onChange={competitorCopyTextField.handleChange}
              onBlur={competitorCopyTextField.handleBlur}
            ></textarea>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedInputs;