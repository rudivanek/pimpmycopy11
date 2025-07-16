import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useInputField } from '../hooks/useInputField';
import { FormState } from '../types';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateName: string, description: string, formStateToSave: FormState) => Promise<void>;
  initialTemplateName?: string;
  initialDescription?: string;
  formStateToSave: FormState;
}

const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTemplateName = '',
  initialDescription = '',
  formStateToSave
}) => {
  const templateNameField = useInputField({
    value: initialTemplateName,
    onChange: (value) => {}
  });

  const descriptionField = useInputField({
    value: initialDescription,
    onChange: (value) => {}
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isNewTemplate, setIsNewTemplate] = useState(true);
  
  // Update the template name field when initialTemplateName changes
  useEffect(() => {
    console.log('SaveTemplateModal: initialTemplateName changed:', initialTemplateName);
    templateNameField.setInputValue(initialTemplateName);
    // Initially, if we have a template name, it's not a new template
    setIsNewTemplate(!initialTemplateName);
  }, [initialTemplateName]);
  
  // Update description field when initialDescription changes
  useEffect(() => {
    console.log('SaveTemplateModal: initialDescription changed:', initialDescription);
    descriptionField.setInputValue(initialDescription);
  }, [initialDescription]);
  
  // Track if the name has changed from the original
  useEffect(() => {
    // If we had an initial name and the current name is different, it's a new template
    if (initialTemplateName && templateNameField.inputValue !== initialTemplateName) {
      setIsNewTemplate(true);
    } 
    // If we had an initial name and current name is the same, it's an existing template
    else if (initialTemplateName && templateNameField.inputValue === initialTemplateName) {
      setIsNewTemplate(false);
    }
    // If no initial name, it's a new template
    else {
      setIsNewTemplate(true);
    }
    
    console.log('SaveTemplateModal: Template name status updated:', {
      inputValue: templateNameField.inputValue,
      initialTemplateName,
      isNewTemplate: initialTemplateName && templateNameField.inputValue !== initialTemplateName
        ? true
        : initialTemplateName && templateNameField.inputValue === initialTemplateName
          ? false
          : true
    });
  }, [templateNameField.inputValue, initialTemplateName]);

  const handleSave = async () => {
    if (!templateNameField.inputValue.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        templateNameField.inputValue, 
        descriptionField.inputValue, 
        formStateToSave
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 dark:bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-black rounded-lg border border-gray-300 dark:border-gray-700 max-w-md w-full">
        <div className="p-4 border-b border-gray-300 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-lg font-medium text-black dark:text-white">Save as Template</h3>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template Name
            </label>
            <input
              type="text"
              id="templateName"
              className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
              placeholder="Enter a name for this template"
              value={templateNameField.inputValue}
              onChange={(e) => {
                templateNameField.handleChange(e);
                console.log('Template name changed:', e.target.value, 'from:', initialTemplateName);
              }}
              onBlur={templateNameField.handleBlur}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              rows={3}
              className="bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
              placeholder="Briefly describe this template"
              value={descriptionField.inputValue}
              onChange={descriptionField.handleChange}
              onBlur={descriptionField.handleBlur}
            />
          </div>
          {initialTemplateName && (
            <div className={`mb-4 p-3 rounded-md ${isNewTemplate ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' : 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300'}`}>
              {isNewTemplate ? (
                <p className="text-sm">Creating a new template with a different name.</p>
              ) : (
                <p className="text-sm">Updating the existing template <strong>"{initialTemplateName}"</strong>.</p>
              )}
            </div>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            This will save your current settings as a template that you can reuse later.
          </p>
        </div>
        <div className="p-4 border-t border-gray-300 dark:border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white px-4 py-2 rounded-md text-sm mr-2"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-md text-sm flex items-center"
            disabled={!templateNameField.inputValue.trim() || isSaving}
          >
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Check size={16} className="mr-1.5" />
                {isNewTemplate ? 'Save as New Template' : 'Update Template'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SaveTemplateModal);