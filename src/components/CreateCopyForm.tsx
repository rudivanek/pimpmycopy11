import React from 'react';
import { FormData, PageType, SectionType } from '../types';
import { PAGE_TYPES, SECTION_TYPES } from '../constants';
import { useInputField } from '../hooks/useInputField';
import { Zap } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';

interface CreateCopyFormProps {
  formData: FormData;
  handleChange: (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => void;
  onGetSuggestion: (fieldType: string) => Promise<void>;
  isLoadingSuggestions: boolean;
  activeSuggestionField: string | null;
}

const CreateCopyForm: React.FC<CreateCopyFormProps> = ({ 
  formData, 
  handleChange,
  onGetSuggestion,
  isLoadingSuggestions,
  activeSuggestionField,
}) => {

  // Use the input field hook for the business description text input
  const businessDescriptionField = useInputField({
    value: formData.businessDescription || '',
    onChange: (value) => handleChange({ target: { name: 'businessDescription', value } } as any)
  });
  
  // Function to count words in a string
  const countWords = (text: string): number => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };
  
  // Get business description word count
  const businessDescriptionWordCount = countWords(businessDescriptionField.inputValue);
  
  return (
    <div className="space-y-6">
      {/* Page Type & Section Type Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Page Type Dropdown */}
        <div>
          <label htmlFor="pageType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Page Type
          </label>
          <select
            id="pageType"
            name="pageType"
            className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
            value={formData.pageType}
            onChange={handleChange}
          >
            {PAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Section Type Dropdown */}
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
      </div>

      {/* Business Description */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="businessDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Business Description
          </label>
          <Tooltip content="Evaluate the quality of your business description">
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
          id="businessDescription"
          name="businessDescription"
          rows={6}
          className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
          placeholder="Briefly describe the business or product..."
          value={businessDescriptionField.inputValue}
          onChange={businessDescriptionField.handleChange}
          onBlur={businessDescriptionField.handleBlur}
        ></textarea>
        
        <div className="flex items-center justify-between mt-1">
          {/* Word count display */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {businessDescriptionWordCount} {businessDescriptionWordCount === 1 ? 'word' : 'words'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCopyForm;