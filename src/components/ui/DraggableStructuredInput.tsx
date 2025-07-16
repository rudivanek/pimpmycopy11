import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Tag, GripVertical, Plus, Check } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { StructuredOutputElement } from '../../types';
import { OUTPUT_STRUCTURE_OPTIONS } from '../../constants';

interface DraggableStructuredInputProps {
  value: StructuredOutputElement[];
  onChange: (value: StructuredOutputElement[]) => void;
  options?: { value: string, label: string }[];
  placeholder?: string;
  className?: string;
}

// Wrap component with React.memo to prevent unnecessary re-renders
const DraggableStructuredInput = React.memo(({
  value = [],
  onChange,
  options = OUTPUT_STRUCTURE_OPTIONS,
  placeholder = "Select structure elements and assign word counts...",
  className = ""
}: DraggableStructuredInputProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customWordCount, setCustomWordCount] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  // Local state to track input values and maintain focus
  const [localWordCounts, setLocalWordCounts] = useState<Record<string, string>>({});
  
  // Initialize local state from props
  useEffect(() => {
    const initialCounts: Record<string, string> = {};
    value.forEach((element, index) => {
      const key = `${element.value}-${index}`;
      initialCounts[key] = element.wordCount?.toString() || '';
    });
    setLocalWordCounts(initialCounts);
  }, [value]);
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setShowCustomInput(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle removing an element - memoized with useCallback
  const handleRemoveElement = useCallback((index: number) => {
    const newElements = [...value];
    newElements.splice(index, 1);
    onChange(newElements);
  }, [value, onChange]);
  
  // Handle adding an element - memoized with useCallback
  const handleAddElement = useCallback((option: { value: string, label: string }) => {
    // Don't add if already selected
    if (value.some(el => el.value === option.value)) {
      return;
    }
    
    const newElement: StructuredOutputElement = {
      value: option.value,
      label: option.label,
      wordCount: null
    };
    
    onChange([...value, newElement]);
    setIsDropdownOpen(false);
  }, [value, onChange]);
  
  // Handle adding a custom element - memoized with useCallback
  const handleAddCustomElement = useCallback(() => {
    if (!customTagInput.trim()) return;
    
    const customValue = customTagInput.trim();
    const wordCount = customWordCount ? parseInt(customWordCount, 10) : null;
    
    // Don't add if already selected
    if (value.some(el => el.value === customValue)) {
      setCustomTagInput('');
      setCustomWordCount('');
      return;
    }
    
    const newElement: StructuredOutputElement = {
      value: customValue,
      label: customValue,
      wordCount: isNaN(wordCount as number) ? null : wordCount
    };
    
    onChange([...value, newElement]);
    setCustomTagInput('');
    setCustomWordCount('');
    setShowCustomInput(false);
  }, [customTagInput, customWordCount, value, onChange]);
  
  // Handle local input changes to maintain focus - memoized with useCallback
  const handleLocalWordCountChange = useCallback((elementKey: string, newValue: string) => {
    setLocalWordCounts(prev => ({
      ...prev,
      [elementKey]: newValue
    }));
  }, []);
  
  // Handle updating word count when input loses focus or Enter is pressed - memoized with useCallback
  const handleWordCountCommit = useCallback((index: number, elementKey: string) => {
    const wordCount = localWordCounts[elementKey] || '';
    const parsedCount = parseInt(wordCount, 10);
    
    const newElements = [...value];
    newElements[index] = {
      ...newElements[index],
      wordCount: isNaN(parsedCount) ? null : parsedCount
    };
    
    onChange(newElements);
  }, [localWordCounts, value, onChange]);
  
  // Handle key press for word count input - memoized with useCallback
  const handleWordCountKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, index: number, elementKey: string) => {
    if (e.key === 'Enter') {
      handleWordCountCommit(index, elementKey);
      e.currentTarget.blur(); // Blur the input to prevent multiple Enter presses
    }
  }, [handleWordCountCommit]);
  
  // Handle drag end - memoized with useCallback
  const onDragEnd = useCallback((result: any) => {
    // Dropped outside the list
    if (!result.destination) {
      return;
    }
    
    const items = Array.from(value);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    onChange(items);
  }, [value, onChange]);
  
  // Filter options that haven't been selected yet
  const availableOptions = options.filter(
    option => !value.some(el => el.value === option.value)
  );

  // Calculate total word count from elements with word counts
  const totalWordCount = value.reduce((sum, element) => {
    return sum + (element.wordCount || 0);
  }, 0);

  return (
    <div ref={containerRef} className="relative">
      <div 
        className={`flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-3 py-2 focus-within:ring-1 focus-within:ring-primary-500 cursor-pointer ${className}`}
        onClick={() => {
          if (!showCustomInput) {
            setIsDropdownOpen(!isDropdownOpen);
          }
        }}
      >
        {value.length > 0 ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sections" direction="vertical">
              {(provided) => (
                <div 
                  className="w-full space-y-2"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {value.map((element, index) => {
                    const elementKey = `${element.value}-${index}`;
                    return (
                      <Draggable key={elementKey} draggableId={elementKey} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center gap-2 rounded-md bg-gray-100 dark:bg-gray-800 p-2 text-sm text-gray-700 dark:text-gray-300"
                          >
                            <div 
                              {...provided.dragHandleProps}
                              className="cursor-grab text-gray-400"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical size={16} />
                            </div>
                            
                            <Tag size={14} className="text-primary-500" />
                            <span className="flex-grow">{element.label || element.value}</span>
                            
                            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                min="0"
                                placeholder="Words"
                                value={localWordCounts[elementKey] || ''}
                                onChange={(e) => handleLocalWordCountChange(elementKey, e.target.value)}
                                onBlur={() => handleWordCountCommit(index, elementKey)}
                                onKeyDown={(e) => handleWordCountKeyDown(e, index, elementKey)}
                                className="w-20 h-7 px-2 py-1 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md"
                                aria-label={`Word count for ${element.label || element.value}`}
                              />
                              <button 
                                type="button" 
                                onClick={() => handleRemoveElement(index)}
                                className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  
                  {/* Show total word count if any sections have word counts */}
                  {totalWordCount > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-700 mt-2">
                      Total allocated: <span className="font-medium">{totalWordCount}</span> words
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="text-gray-500 text-sm w-full">{placeholder}</div>
        )}
      </div>
      
      {isDropdownOpen && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg custom-scrollbar">
          <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
            Select structure elements
          </div>
          
          {/* Add custom element option */}
          <div
            className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-primary-500 flex items-center text-sm font-medium border-b border-gray-200 dark:border-gray-800"
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(false);
              setShowCustomInput(true);
            }}
          >
            <Plus size={16} className="mr-2" />
            Add custom structure element
          </div>
          
          {availableOptions.length > 0 ? (
            availableOptions.map((option) => (
              <div
                key={option.value}
                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-gray-700 dark:text-gray-300 flex items-center text-sm"
                onClick={() => handleAddElement(option)}
              >
                <Tag size={14} className="text-primary-500 mr-2" />
                {option.label}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500 text-sm italic">
              All options have been selected
            </div>
          )}
        </div>
      )}
      
      {showCustomInput && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg p-3">
          <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Add Custom Structure Element
          </div>
          
          <div className="space-y-3">
            <div>
              <label htmlFor="customElement" className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                Element Name
              </label>
              <input
                id="customElement"
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="e.g., Problem Statement"
                className="w-full text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5"
              />
            </div>
            
            <div>
              <label htmlFor="customWordCount" className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                Word Count (optional)
              </label>
              <input
                id="customWordCount"
                type="number"
                min="0"
                value={customWordCount}
                onChange={(e) => setCustomWordCount(e.target.value)}
                placeholder="e.g., 200"
                className="w-full text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5"
              />
            </div>
            
            <div className="flex justify-end space-x-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomTagInput('');
                  setCustomWordCount('');
                  setIsDropdownOpen(true);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomElement}
                disabled={!customTagInput.trim()}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  customTagInput.trim() 
                    ? 'bg-primary-600 hover:bg-primary-500 text-white' 
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <Check size={14} className="inline mr-1.5" />
                Add Element
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Add display name for better debugging
DraggableStructuredInput.displayName = "DraggableStructuredInput";

export default DraggableStructuredInput;