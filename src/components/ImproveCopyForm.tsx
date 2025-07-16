import React, { useState } from 'react';
import { FormData, SectionType } from '../types';
import { useInputField } from '../hooks/useInputField';
import { SECTION_TYPES } from '../constants';
import { Zap } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';

interface ImproveCopyFormProps {
  formData: FormData;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>) => void;
  onGetSuggestion: (fieldType: string) => Promise<void>;
  isLoadingSuggestions: boolean;
  activeSuggestionField: string | null;
}

const ImproveCopyForm: React.FC<ImproveCopyFormProps> = ({
  formData,
  handleChange,
  onGetSuggestion,
  isLoadingSuggestions,
  activeSuggestionField,
}) => {

  // Use the input field hook for the original copy text input
  const originalCopyField = useInputField({
    value: formData.originalCopy || '',
    onChange: (value) => handleChange({ target: { name: 'originalCopy', value } } as any)
  });
  
  // Function to count words in a string
  const countWords = (text: string): number => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };
  
  // Get original copy word count
  const originalCopyWordCount = countWords(originalCopyField.inputValue);

  return (
    <div className="space-y-6">
      {/* Section Dropdown */}
      <div>
        <label htmlFor="section" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Section
        </label>
        <select
          id="section"
          name="section"
          className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
          value={formData.section}
          onChange={handleChange}
        >
          {SECTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Original Copy */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="originalCopy" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Original Copy
          </label>
          <Tooltip content="Evaluate the quality of your original copy">
            <button
              type="button"
              onClick={() => {}} // No-op for now, button will be removed
              disabled={true} // Disable the button
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
                <Zap size={20} />
            </button>
          </Tooltip>
        </div>
        <textarea
          id="originalCopy"
          name="originalCopy"
          rows={8}
          className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
          placeholder="Paste your client's original copy here..."
          value={originalCopyField.inputValue}
          onChange={originalCopyField.handleChange}
          onBlur={originalCopyField.handleBlur}
        ></textarea>
        
        <div className="flex items-center justify-between mt-1">
          {/* Word count display */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {originalCopyWordCount} {originalCopyWordCount === 1 ? 'word' : 'words'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImproveCopyForm;