import React from 'react';
import { FormData } from '../types';
import { Tooltip } from './ui/Tooltip';
import { InfoIcon } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

interface FeatureTogglesProps {
  formData: FormData;
  handleToggle: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleChange: (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => void;
  isSmartMode: boolean; // Add prop for Smart Mode
}

const FeatureToggles: React.FC<FeatureTogglesProps> = ({ 
  formData, 
  handleToggle, 
  handleChange,
  isSmartMode // Add isSmartMode prop
}) => {
  // We're removing this conditional return so the component is always displayed
  // regardless of Smart Mode or Pro Mode
  
  return (
    <div className="space-y-3 py-4 border-t border-gray-300 dark:border-gray-800">
      <Tooltip content="Enhance your output with alternative versions, humanized styles, scoring, and voice emulation options." delayDuration={300}>
        <div className="flex items-center">
          <div className="w-1 h-5 bg-primary-500 mr-2"></div>
          <div className="font-medium text-base text-gray-700 dark:text-gray-300">Generation Options</div>
        </div>
      </Tooltip>
      
      {/* Headline generation checkbox + options */}
      <div className="flex items-center">
        <Checkbox
          id="generateHeadlines"
          checked={formData.generateHeadlines || false}
          onCheckedChange={(checked) => {
            handleToggle({ 
              target: { 
                name: 'generateHeadlines', 
                checked: checked === true 
              } 
            } as React.ChangeEvent<HTMLInputElement>);
          }}
        />
        <Label 
          htmlFor="generateHeadlines"
          className="ml-2 cursor-pointer"
        >
          <span className="text-sm">Generate headline options</span>
        </Label>
      </div>
      
      {/* Number of headlines input - only enabled when generateHeadlines is true */}
      {formData.generateHeadlines && (
        <div className="ml-6 mt-1">
          <div className="flex items-center space-x-2">
            <label htmlFor="numberOfHeadlines" className="text-sm text-gray-700 dark:text-gray-300">
              Number of options:
            </label>
            <input
              id="numberOfHeadlines"
              name="numberOfHeadlines"
              type="number"
              min="1"
              max="10"
              className="w-16 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 p-1.5"
              value={formData.numberOfHeadlines || 3}
              onChange={handleChange}
            />
          </div>
        </div>
      )}
      
      {/* Strictly adhere to target word count checkbox */}
      <div className="flex items-center">
        <Checkbox
          id="prioritizeWordCount"
          checked={formData.prioritizeWordCount || false}
          onCheckedChange={(checked) => {
            handleToggle({ 
              target: { 
                name: 'prioritizeWordCount', 
                checked: checked === true 
              } 
            } as React.ChangeEvent<HTMLInputElement>);
          }}
        />
        <Label 
          htmlFor="prioritizeWordCount"
          className="ml-2 cursor-pointer flex items-center"
        >
          <span className="text-sm">
          Strictly adhere to target word count
          </span>
          <Tooltip content="Controls whether the AI should strictly adhere to the target word count">
            <span className="ml-1 text-gray-500 cursor-help">
              <InfoIcon size={14} />
            </span>
          </Tooltip>
        </Label>
      </div>
      
      {/* Word count tolerance - only shown when prioritizeWordCount is true */}
      {formData.prioritizeWordCount && (
        <div className="ml-6 mt-1">
          <div className="flex items-center space-x-2">
            <label htmlFor="wordCountTolerance" className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
              Word Count Tolerance (%):
              <Tooltip content="The percentage by which the word count can deviate from the target. A lower value means stricter adherence but may require more revision attempts.">
                <span className="ml-1 text-gray-500 cursor-help">
                  <InfoIcon size={14} />
                </span>
              </Tooltip>
            </label>
            <input
              id="wordCountTolerance"
              name="wordCountTolerance"
              type="number"
              min="1"
              max="20"
              className="w-16 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 p-1.5"
              value={formData.wordCountTolerance || 2}
              onChange={handleChange}
            />
          </div>
        </div>
      )}
      {/* Option for forcing elaborations and examples */}
      <div className="flex items-center">
        <Checkbox
          id="forceElaborationsExamples"
          checked={formData.forceElaborationsExamples || false}
          onCheckedChange={(checked) => {
            handleToggle({ 
              target: { 
                name: 'forceElaborationsExamples', 
                checked: checked === true 
              } 
            } as React.ChangeEvent<HTMLInputElement>);
          }}
        />
        <Label 
          htmlFor="forceElaborationsExamples"
          className="ml-2 cursor-pointer flex items-center"
        >
          <span className="text-sm">
          Force detailed elaborations and examples
          </span>
          <Tooltip content="Forces AI to provide detailed explanations, examples, and case studies to expand content">
            <span className="ml-1 text-gray-500 cursor-help">
              <InfoIcon size={14} />
            </span>
          </Tooltip>
        </Label>
      </div>
      
      {/* New option for SEO keyword integration */}
      <div className="flex items-center">
        <Checkbox
          id="forceKeywordIntegration"
          checked={formData.forceKeywordIntegration || false}
          onCheckedChange={(checked) => {
            handleToggle({ 
              target: { 
                name: 'forceKeywordIntegration', 
                checked: checked === true 
              } 
            } as React.ChangeEvent<HTMLInputElement>);
          }}
        />
        <Label 
          htmlFor="forceKeywordIntegration"
          className="ml-2 cursor-pointer flex items-center"
        >
          <span className="text-sm">
          Force SEO keyword integration
          </span>
          <Tooltip content="Ensures all keywords appear naturally throughout the copy for better SEO">
            <span className="ml-1 text-gray-500 cursor-help">
              <InfoIcon size={14} />
            </span>
          </Tooltip>
        </Label>
      </div>
    </div>
  );
};

export default FeatureToggles;