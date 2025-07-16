/**
 * Utility functions for handling Markdown formatting
 */

/**
 * Removes Markdown formatting from a string
 * Currently handles:
 * - Bold (**text**)
 * - Italics (*text*)
 * - Headers (#, ##, ###, etc.)
 * - List markers (-, *, +)
 * - Code blocks (```)
 */
export const stripMarkdown = (text: string): string => {
  if (!text) return '';
  
  // Remove code blocks
  let cleanedText = text.replace(/```[\s\S]*?```/g, '');
  
  // Remove inline code
  cleanedText = cleanedText.replace(/`([^`]+)`/g, '$1');
  
  // Remove bold (**text**)
  cleanedText = cleanedText.replace(/\*\*(.*?)\*\*/g, '$1');
  
  // Remove italics (*text*)
  cleanedText = cleanedText.replace(/\*(.*?)\*/g, '$1');
  
  // Remove headers (# text, ## text, etc.)
  cleanedText = cleanedText.replace(/^#{1,6}\s+/gm, '');
  
  // Remove list markers
  cleanedText = cleanedText.replace(/^[-*+]\s+/gm, '');
  
  // Remove link syntax [text](url) - keep the text only
  cleanedText = cleanedText.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  
  // Remove HTML tags
  cleanedText = cleanedText.replace(/<[^>]*>/g, '');
  
  return cleanedText;
};

/**
 * Count words in a string
 */
export const countWords = (text: string): number => {
  if (!text) return 0;
  // Normalize whitespace and split by spaces to count words
  return text.trim().split(/\s+/).length;
};
