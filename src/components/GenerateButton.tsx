import React from 'react';
import { Pen } from 'lucide-react';

interface GenerateButtonProps {
  onClick: () => void;
  isLoading: boolean;
  isDisabled: boolean;
}

const GenerateButton: React.FC<GenerateButtonProps> = ({ onClick, isLoading, isDisabled }) => {
  return (
    <button
      type="button"
      className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-medium rounded-lg text-base px-5 py-3.5 transition-all duration-200 ease-in-out transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
      onClick={onClick}
      disabled={isLoading || isDisabled}
    >
      {isLoading ? (
        <>
          Generating...
        </>
      ) : (
        <>
          <Pen size={20} className="mr-2" />
          Generate Copy
        </>
      )}
    </button>
  );
};

export default GenerateButton;