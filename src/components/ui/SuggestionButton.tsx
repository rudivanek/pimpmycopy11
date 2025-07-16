import React, { useState, useRef, useCallback } from 'react';
import { Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Tooltip } from './Tooltip';

interface SuggestionButtonProps {
  fieldType: string; // Made more generic to allow additional field types
  businessDescription: string;
  onGetSuggestion: (fieldType: string) => Promise<void>;
  isLoading?: boolean;
}

const SuggestionButton: React.FC<SuggestionButtonProps> = ({
  fieldType,
  businessDescription,
  onGetSuggestion,
  isLoading = false
}) => {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(async () => {
    if (!businessDescription.trim()) {
      setTooltipVisible(true);
      setTimeout(() => setTooltipVisible(false), 3000);
      return;
    }

    try {
      await onGetSuggestion(fieldType);
    } catch (error) {
      console.error('Error in SuggestionButton:', error);
      toast.error('Failed to get suggestions. Please check your API keys and internet connection.');
    }
  }, [businessDescription, fieldType, onGetSuggestion]);

  // Map field types to display labels
  const getFieldLabel = () => {
    const fieldLabels: Record<string, string> = {
      keyMessage: 'Key Message', 
      brandValues: 'Brand Values',
      callToAction: 'Call to Action',
      desiredEmotion: 'Desired Emotion',
      keywords: 'Keywords',
      context: 'Context',
      industryNiche: 'Industry/Niche',
      readerFunnelStage: "Reader's Stage in Funnel",
      preferredWritingStyle: 'Preferred Writing Style',
      targetAudiencePainPoints: 'Target Audience Pain Points',
      competitorCopyText: 'Competitor Copy'
    };
    
    return fieldLabels[fieldType] || fieldType;
  };

  // Error tooltip for when business description is empty
  const errorTooltip = (
    <div className="absolute z-10 w-64 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs rounded-md p-3 mt-2 -left-32 top-full shadow-lg border border-gray-300 dark:border-gray-700 animate-fadeIn">
      <div className="absolute w-3 h-3 bg-white dark:bg-gray-900 transform rotate-45 -mt-1.5 left-1/2 -ml-1.5 border-t border-l border-gray-300 dark:border-gray-700"></div>
      Please enter the {fieldType === 'industryNiche' ? 'Business Description' : 'text'} first.
    </div>
  );

  return (
    <div className="relative">
      <Tooltip content={`Get AI suggestions for ${getFieldLabel()}`}>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleClick}
          className="p-1 text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-colors"
          disabled={isLoading}
          aria-label={`Get suggestions for ${getFieldLabel()}`}
        >
          {isLoading ? (
            "Loading..."
          ) : (
            <Zap size={20} />
          )}
        </button>
      </Tooltip>

      {tooltipVisible && errorTooltip}
    </div>
  );
};

export default SuggestionButton;