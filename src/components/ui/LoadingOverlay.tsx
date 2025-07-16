import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isVisible, 
  message = 'Generating content...' 
}) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-8 shadow-xl flex flex-col items-center">
        {/* Loading spinner - blue circle animation */}
        <div className="w-16 h-16 mb-4">
          <svg className="w-full h-full animate-spin text-primary-500" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        
        {/* Loading message */}
        <div className="text-gray-800 dark:text-gray-200 text-lg font-medium text-center">
          {message}
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;