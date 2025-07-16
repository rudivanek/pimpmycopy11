import React from 'react';
import { Copy, Check } from 'lucide-react';
import { StructuredCopyOutput, FormState } from '../../types';
import { stripMarkdown } from '../../utils/markdownUtils';

interface AlternativeCopyProps {
  content: string | StructuredCopyOutput;
  isLoading: boolean;
  title?: string; // Add optional title prop
  targetWordCount?: number; // Added targetWordCount prop
  formData?: FormState; 
}

const AlternativeCopy: React.FC<AlternativeCopyProps> = ({ 
  content, 
  isLoading,
  title = "Alternative Version", // Default title
  targetWordCount, // Added targetWordCount prop
  formData
}) => {
  const [copied, setCopied] = React.useState(false);

  // Process content based on type
  const contentDetails = React.useMemo(() => {
    // Handle empty content
    if (content === null || content === undefined || content === '') {
      return { text: '', wordCount: 0, isStructured: false };
    }

    // Check if content is structured
    if (typeof content === 'object') {
      // Properly check for structured content format
      if (content.headline && Array.isArray(content.sections)) {
        // Calculate word count from structured content
        let text = stripMarkdown(content.headline) + '\n\n';
        content.sections.forEach(section => {
          if (section && section.title) {
            text += stripMarkdown(section.title) + '\n';
            if (section.content) {
              text += stripMarkdown(section.content) + '\n\n';
            } else if (section.listItems && section.listItems.length > 0) {
              section.listItems.forEach(item => {
                text += '• ' + stripMarkdown(item) + '\n';
              });
              text += '\n';
            }
          }
        });
        
        const wordCount = text ? text.trim().split(/\s+/).length : 0;
        
        return { 
          text, 
          wordCount, 
          isStructured: true, 
          structuredContent: content,
          // Get the wordCountAccuracy if available
          wordCountAccuracy: content.wordCountAccuracy
        };
      } else if (content.text) {
        // Extract text from content.text property
        const text = typeof content.text === 'string' ? stripMarkdown(content.text) : JSON.stringify(content.text);
        const wordCount = text ? text.trim().split(/\s+/).length : 0;
        return {
          text,
          wordCount,
          isStructured: false,
          structuredContent: null
        };
      } else if (content.content) {
        // Extract text from content.content property
        const text = typeof content.content === 'string' ? stripMarkdown(content.content) : JSON.stringify(content.content);
        const wordCount = text ? text.trim().split(/\s+/).length : 0;
        return {
          text,
          wordCount,
          isStructured: false,
          structuredContent: null
        };
      } else if (content.output) {
        // Extract text from content.output property
        const text = typeof content.output === 'string' ? stripMarkdown(content.output) : JSON.stringify(content.output);
        const wordCount = text ? text.trim().split(/\s+/).length : 0;
        return {
          text,
          wordCount,
          isStructured: false,
          structuredContent: null
        };
      } else if (content.message) {
        // Extract text from content.message property
        const text = typeof content.message === 'string' ? stripMarkdown(content.message) : JSON.stringify(content.message);
        const wordCount = text ? text.trim().split(/\s+/).length : 0;
        return {
          text,
          wordCount,
          isStructured: false,
          structuredContent: null
        };
      } else {
        // Fallback: Handle objects that don't match any known format
        try {
          const formattedText = JSON.stringify(content, null, 2);
          const wordCount = formattedText ? formattedText.trim().split(/\s+/).length : 0;
          return { 
            text: formattedText, 
            wordCount, 
            isStructured: false,
            structuredContent: null
          };
        } catch (e) {
          return { 
            text: 'Invalid content format', 
            wordCount: 0, 
            isStructured: false,
            structuredContent: null
          };
        }
      }
    } 
    
    // Handle string content
    const stringContent = String(content);
    const strippedContent = stripMarkdown(stringContent);
    const wordCount = strippedContent ? strippedContent.trim().split(/\s+/).length : 0;
    
    return { text: strippedContent, wordCount, isStructured: false };
  }, [content]);

  // Get word count accuracy text and color
  const getWordCountInfo = React.useMemo(() => {
    if (!targetWordCount) return null;
    
    const difference = contentDetails.wordCount - targetWordCount;
    const percentDifference = Math.abs(difference) / targetWordCount * 100;
    
    // Use the provided tolerance or default to 2%
    const tolerance = formData?.wordCountTolerance || 2;
    
    let textColor = '';
    let message = '';
    
    // Determine the color and message based on the difference
    if (percentDifference <= tolerance) {
      textColor = 'text-green-600 dark:text-green-400'; // Perfect
      message = 'Perfect';
    } else if (Math.abs(difference) <= 50) {
      textColor = 'text-blue-600 dark:text-blue-400'; // Good
      message = `${Math.abs(difference)} words ${difference > 0 ? 'over' : 'under'}`;
    } else if (percentDifference <= 20) {
      textColor = 'text-yellow-600 dark:text-yellow-400'; // Acceptable
      message = `${Math.abs(difference)} words ${difference > 0 ? 'over' : 'under'}`;
    } else {
      textColor = 'text-red-600 dark:text-red-400'; // Needs improvement
      message = `${Math.abs(difference)} words ${difference > 0 ? 'over' : 'under'} (${percentDifference.toFixed(0)}%)`;
    }
    
    return { textColor, message };
  }, [contentDetails.wordCount, targetWordCount, formData?.wordCountTolerance]);

  const handleCopy = () => {
    navigator.clipboard.writeText(contentDetails.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 p-6 animate-pulse">
        <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <div className="w-1 h-5 bg-primary-500 mr-2"></div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-2">
              <span>{contentDetails.wordCount} words</span>
              
              {/* Show target word count if provided */}
              {targetWordCount && (
                <>
                  <span className="text-gray-400 dark:text-gray-600">|</span>
                  <span>Target: {targetWordCount}</span>
                </>
              )}
              
              {/* Show word count difference if available */}
              {getWordCountInfo && (
                <>
                  <span className="text-gray-400 dark:text-gray-600">|</span>
                  <span className={getWordCountInfo.textColor}>{getWordCountInfo.message}</span>
                </>
              )}
              
              {/* Display word count accuracy score if available */}
              {contentDetails.wordCountAccuracy !== undefined && (
                <>
                  <span className="text-gray-400 dark:text-gray-600">|</span>
                  <span 
                    className={`${
                      contentDetails.wordCountAccuracy >= 90 
                        ? 'text-green-600 dark:text-green-400' 
                        : contentDetails.wordCountAccuracy >= 75 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : contentDetails.wordCountAccuracy >= 60 
                            ? 'text-yellow-600 dark:text-yellow-400' 
                            : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    Accuracy: {contentDetails.wordCountAccuracy}/100
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors flex items-center text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-md"
          onClick={handleCopy}
          disabled={!contentDetails.text}
        >
          {copied ? (
            <>
              <Check size={16} className="mr-1.5 text-green-500 dark:text-green-400" />
              <span className="text-green-500 dark:text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={16} className="mr-1.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {contentDetails.isStructured && contentDetails.structuredContent ? (
        // Render structured content
        <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-4 custom-scrollbar">
          {/* Headline */}
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-700 pb-2">
            {stripMarkdown(contentDetails.structuredContent.headline)}
          </h1>
          
          {/* Sections */}
          {Array.isArray(contentDetails.structuredContent.sections) && contentDetails.structuredContent.sections.map((section, sectionIndex) => (
            section && section.title ? (
              <div key={sectionIndex} className="mb-6">
                <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
                  {stripMarkdown(section.title)}
                </h2>
                
                {section.content && (
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {stripMarkdown(section.content)}
                  </div>
                )}
                
                {section.listItems && section.listItems.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1.5 text-gray-700 dark:text-gray-300 mt-2">
                    {section.listItems.map((item, itemIndex) => (
                      <li key={itemIndex}>{stripMarkdown(item)}</li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null
          ))}
        </div>
      ) : (
        // Render plain text content
        <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-4 text-gray-700 dark:text-gray-300 whitespace-pre-wrap custom-scrollbar">
          {contentDetails.text}
        </div>
      )}
    </div>
  );
};

export default React.memo(AlternativeCopy);