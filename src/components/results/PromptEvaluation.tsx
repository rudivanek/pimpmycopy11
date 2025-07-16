import React from 'react';
import { PromptEvaluation as PromptEvaluationType } from '../../types';
import { ArrowDown } from 'lucide-react';

interface PromptEvaluationProps {
  evaluation: PromptEvaluationType;
  isLoading: boolean;
}

const PromptEvaluation: React.FC<PromptEvaluationProps> = ({ evaluation, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 p-6 animate-pulse">
        <div className="h-7 bg-gray-300 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-6">
      <div className="flex items-center mb-6">
        <span className="mr-2 text-2xl">🧠</span>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Input Evaluation</h3>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-600 dark:text-gray-400">Quality Score</span>
          <span className={`font-medium px-3 py-1 rounded-full text-sm ${getScoreColor(evaluation.score)}`}>
            {evaluation.score}/100
          </span>
        </div>
        <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-3">
          <div 
            className={`h-3 rounded-full ${getScoreBarColor(evaluation.score)}`} 
            style={{ width: `${evaluation.score}%` }}
          ></div>
        </div>
      </div>
      
      {evaluation.tips && evaluation.tips.length > 0 && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-center mb-3 text-yellow-600 dark:text-yellow-400">
            <ArrowDown size={16} className="mr-2" />
            <span className="font-medium">Improvement Tips</span>
          </div>
          <ul className="space-y-3">
            {evaluation.tips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <span className="font-medium text-primary-500 mr-2">•</span>
                <span className="text-gray-700 dark:text-gray-300">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default React.memo(PromptEvaluation);