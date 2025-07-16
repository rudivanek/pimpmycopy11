import { CopyResult, PromptEvaluation, StructuredCopyOutput, FormState } from '../types';

/**
 * Converts structured content to plain text
 */
export const structuredToPlainText = (content: string | StructuredCopyOutput): string => {
  if (typeof content === 'string') return content;
  
  if (!content) {
    return "No content available";
  }
  
  // Handle proper structured content
  if (content.headline && Array.isArray(content.sections)) {
    let result = content.headline + '\n\n';
    
    content.sections.forEach(section => {
      if (section && section.title) {
        result += section.title + '\n';
        
        if (section.content) {
          result += section.content + '\n\n';
        } else if (section.listItems && section.listItems.length > 0) {
          section.listItems.forEach(item => {
            result += '• ' + item + '\n';
          });
          result += '\n';
        }
      }
    });
    
    return result.trim();
  }
  
  // Handle other object formats by checking common text-containing properties
  if (typeof content === 'object') {
    if (content.text && typeof content.text === 'string') {
      return content.text;
    } else if (content.content && typeof content.content === 'string') {
      return content.content;
    } else if (content.output && typeof content.output === 'string') {
      return content.output;
    } else if (content.message && typeof content.message === 'string') {
      return content.message;
    } else {
      // Fall back to JSON stringification for unknown object formats
      try {
        return JSON.stringify(content, null, 2);
      } catch (e) {
        return "Unable to display content";
      }
    }
  }
  
  // If all else fails, convert to string
  return String(content);
};

/**
 * Formats copy result as Markdown
 */
export const formatCopyResultAsMarkdown = (
  formState: FormState,
  copyResult: CopyResult,
  promptEvaluation?: PromptEvaluation,
  selectedPersona?: string,
  includeInputs: boolean = true
): string => {
  let markdown = `# Generated Copy\n\n`;
  
  // Add input content section if includeInputs is true
  if (includeInputs) {
    markdown += `## Input Content\n\n`;
    
    if (formState.tab === 'create') {
      markdown += `### Business Description\n\n`;
      markdown += `${formState.businessDescription || 'No business description provided'}\n\n`;
    } else {
      markdown += `### Original Copy\n\n`;
      markdown += `${formState.originalCopy || 'No original copy provided'}\n\n`;
    }
    
    // Add key information from form state
    markdown += `### Key Information\n\n`;
    markdown += `- **Language:** ${formState.language}\n`;
    markdown += `- **Tone:** ${formState.tone}\n`;
    markdown += `- **Word Count:** ${formState.wordCount}${formState.wordCount === 'Custom' ? ` (${formState.customWordCount})` : ''}\n`;
    
    if (formState.targetAudience) {
      markdown += `- **Target Audience:** ${formState.targetAudience}\n`;
    }
    
    if (formState.keyMessage) {
      markdown += `- **Key Message:** ${formState.keyMessage}\n`;
    }
    
    if (formState.callToAction) {
      markdown += `- **Call to Action:** ${formState.callToAction}\n`;
    }
    
    if (formState.desiredEmotion) {
      markdown += `- **Desired Emotion:** ${formState.desiredEmotion}\n`;
    }
    
    if (formState.brandValues) {
      markdown += `- **Brand Values:** ${formState.brandValues}\n`;
    }
    
    if (formState.keywords) {
      markdown += `- **Keywords:** ${formState.keywords}\n`;
    }
    
    markdown += `\n`;
  }
  
  // Add prompt evaluation if available
  if (promptEvaluation) {
    markdown += `## Prompt Evaluation\n\n`;
    markdown += `**Score:** ${promptEvaluation.score}/100\n\n`;
    
    if (promptEvaluation.tips && promptEvaluation.tips.length > 0) {
      markdown += `**Improvement Tips:**\n\n`;
      promptEvaluation.tips.forEach(tip => {
        markdown += `- ${tip}\n`;
      });
      markdown += `\n`;
    }
  }
  
  // Add improved copy
  if (copyResult.improvedCopy) {
    markdown += `## Improved Copy\n\n`;
    markdown += `${structuredToPlainText(copyResult.improvedCopy)}\n\n`;
  }
  
  // Add restyled improved copy if available
  if (copyResult.restyledImprovedVersions && copyResult.restyledImprovedVersions.length > 0) {
    // Display all restyled improved versions
    copyResult.restyledImprovedVersions.forEach((version, index) => {
      markdown += `## Improved Copy (${version.persona}'s Voice)\n\n`;
      markdown += `${structuredToPlainText(version.content)}\n\n`;
    });
  } else if (copyResult.restyledImprovedCopy && (copyResult.restyledImprovedCopyPersona || selectedPersona)) {
    // Legacy single restyled improved copy
    markdown += `## Improved Copy (${selectedPersona}'s Voice)\n\n`;
    markdown += `${structuredToPlainText(copyResult.restyledImprovedCopy)}\n\n`;
  }
  
  // Handle multiple alternative versions if available
  if (copyResult.restyledAlternativeVersionCollections && copyResult.restyledAlternativeVersionCollections.length > 0) {
    // Display all collections of restyled alternative versions
    copyResult.restyledAlternativeVersionCollections.forEach(collection => {
      const alternativeIndex = collection.alternativeIndex;
      
      // Display all restyled versions for this alternative
      collection.versions.forEach((version, versionIndex) => {
        markdown += `## ${alternativeIndex + 1}.) Alternative Version (${version.persona}'s Voice)\n\n`;
        markdown += `${structuredToPlainText(version.content)}\n\n`;
      });
    });
  } else if (copyResult.alternativeVersions && copyResult.alternativeVersions.length > 0) {
    copyResult.alternativeVersions.forEach((version, index) => {
      markdown += `## ${index + 1}.) Alternative Version\n\n`;
      markdown += `${structuredToPlainText(version)}\n\n`;
      
      // Add restyled version if available
      if (copyResult.restyledAlternativeVersions && copyResult.restyledAlternativeVersions[index] && selectedPersona) {
        markdown += `### ${index + 1}.) Alternative Version (${selectedPersona}'s Voice)\n\n`;
        markdown += `${structuredToPlainText(copyResult.restyledAlternativeVersions[index])}\n\n`;
      }
    });
  } else if (copyResult.alternativeCopy) {
    // Legacy single alternative copy
    markdown += `## Alternative Copy\n\n`;
    markdown += `${structuredToPlainText(copyResult.alternativeCopy)}\n\n`;
    
    // Legacy restyled alternative copy
    if (copyResult.restyledAlternativeCopy && selectedPersona) {
      markdown += `## Alternative Copy (${selectedPersona}'s Voice)\n\n`;
      markdown += `${structuredToPlainText(copyResult.restyledAlternativeCopy)}\n\n`;
    }
  }
  
  // Add headlines if available
  if (copyResult.restyledHeadlinesVersions && copyResult.restyledHeadlinesVersions.length > 0) {
    // Display all restyled headline versions
    copyResult.restyledHeadlinesVersions.forEach(version => {
      markdown += `## Headline Ideas (${version.persona}'s Voice)\n\n`;
      version.headlines.forEach((headline, index) => {
        markdown += `${index + 1}. ${headline}\n`;
      });
      markdown += `\n`;
    });
  } else if (copyResult.headlines && copyResult.headlines.length > 0) {
    markdown += `## Headline Ideas\n\n`;
    copyResult.headlines.forEach((headline, index) => {
      markdown += `${index + 1}. ${headline}\n`;
    });
    markdown += `\n`;
  }
  
  // Add restyled headlines if available
  if (copyResult.restyledHeadlines && copyResult.restyledHeadlines.length > 0 && 
     (copyResult.restyledHeadlinesPersona || selectedPersona)) {
    markdown += `## Headline Ideas (${selectedPersona}'s Voice)\n\n`;
    copyResult.restyledHeadlines.forEach((headline, index) => {
      markdown += `${index + 1}. ${headline}\n`;
    });
  }
  
  return markdown;
};

/**
 * Formats copy result as HTML for rich text copying
 */
export const formatCopyResultAsHTML = ( // Removed ContentQualityScore from here
  formState: FormState,
  copyResult: CopyResult,
  promptEvaluation?: PromptEvaluation,
  selectedPersona?: string
): string => {
  let html = `<h1>Generated Copy</h1>`;
  
  // Add input content section
  html += `<h2>Input Content</h2>`;
  
  if (formState.tab === 'create') {
    html += `<h3>Business Description</h3>`;
    html += `<div style="white-space: pre-wrap;">${formState.businessDescription || 'No business description provided'}</div>`;
  } else {
    html += `<h3>Original Copy</h3>`;
    html += `<div style="white-space: pre-wrap;">${formState.originalCopy || 'No original copy provided'}</div>`;
  }
  
  // Add key information from form state
  html += `<h3>Key Information</h3>`;
  html += `<ul>`;
  html += `<li><strong>Language:</strong> ${formState.language}</li>`;
  html += `<li><strong>Tone:</strong> ${formState.tone}</li>`;
  html += `<li><strong>Word Count:</strong> ${formState.wordCount}${formState.wordCount === 'Custom' ? ` (${formState.customWordCount})` : ''}</li>`;
  
  if (formState.targetAudience) {
    html += `<li><strong>Target Audience:</strong> ${formState.targetAudience}</li>`;
  }
  
  if (formState.keyMessage) {
    html += `<li><strong>Key Message:</strong> ${formState.keyMessage}</li>`;
  }
  
  if (formState.callToAction) {
    html += `<li><strong>Call to Action:</strong> ${formState.callToAction}</li>`;
  }
  
  if (formState.desiredEmotion) {
    html += `<li><strong>Desired Emotion:</strong> ${formState.desiredEmotion}</li>`;
  }
  
  if (formState.brandValues) {
    html += `<li><strong>Brand Values:</strong> ${formState.brandValues}</li>`;
  }
  
  if (formState.keywords) {
    html += `<li><strong>Keywords:</strong> ${formState.keywords}</li>`;
  }
  html += `</ul>`;
  
  // Add prompt evaluation if available
  if (promptEvaluation) {
    html += `<h2>Prompt Evaluation</h2>`;
    html += `<p><strong>Score:</strong> ${promptEvaluation.score}/100</p>`;
    
    if (promptEvaluation.tips && promptEvaluation.tips.length > 0) {
      html += `<p><strong>Improvement Tips:</strong></p>`;
      html += `<ul>`;
      promptEvaluation.tips.forEach(tip => {
        html += `<li>${tip}</li>`;
      });
      html += `</ul>`;
    }
  }
  
  // Add improved copy
  if (copyResult.improvedCopy) {
    html += `<h2>Improved Copy</h2>`;
    const improvedCopyText = structuredToPlainText(copyResult.improvedCopy);
    html += `<div style="white-space: pre-wrap;">${improvedCopyText}</div>`;
  }
  
  // Add restyled improved copy if available
  if (copyResult.restyledImprovedVersions && copyResult.restyledImprovedVersions.length > 0) {
    // Display all restyled improved versions
    copyResult.restyledImprovedVersions.forEach((version, index) => {
      html += `<h2>Improved Copy (${version.persona}'s Voice)</h2>`;
      const restyledImprovedCopyText = structuredToPlainText(version.content);
      html += `<div style="white-space: pre-wrap;">${restyledImprovedCopyText}</div>`;
    });
  } else if (copyResult.restyledImprovedCopy && (copyResult.restyledImprovedCopyPersona || selectedPersona)) {
    // Legacy single restyled improved copy
    html += `<h2>Improved Copy (${selectedPersona}'s Voice)</h2>`;
    const restyledImprovedCopyText = structuredToPlainText(copyResult.restyledImprovedCopy);
    html += `<div style="white-space: pre-wrap;">${restyledImprovedCopyText}</div>`;
  }
  
  // Handle multiple alternative versions if available
  if (copyResult.alternativeVersions && copyResult.alternativeVersions.length > 0) {
    copyResult.alternativeVersions.forEach((version, index) => {
      html += `<h2>${index + 1}.) Alternative Version</h2>`;
      const versionText = structuredToPlainText(version);
      html += `<div style="white-space: pre-wrap;">${versionText}</div>`;
      
      // Add restyled version if available
      if (copyResult.restyledAlternativeVersions && 
          copyResult.restyledAlternativeVersions[index] && 
          selectedPersona) {
        html += `<h3>${index + 1}.) Alternative Version (${selectedPersona}'s Voice)</h3>`;
        const restyledVersionText = structuredToPlainText(copyResult.restyledAlternativeVersions[index]);
        html += `<div style="white-space: pre-wrap;">${restyledVersionText}</div>`;
      }
    });
  } else if (copyResult.alternativeCopy) {
    // Legacy single alternative copy
    html += `<h2>Alternative Copy</h2>`;
    const alternativeCopyText = structuredToPlainText(copyResult.alternativeCopy);
    html += `<div style="white-space: pre-wrap;">${alternativeCopyText}</div>`;
    
    // Legacy restyled alternative copy
    if (copyResult.restyledAlternativeCopy && selectedPersona) {
      html += `<h2>Alternative Copy (${selectedPersona}'s Voice)</h2>`;
      const restyledAlternativeCopyText = structuredToPlainText(copyResult.restyledAlternativeCopy);
      html += `<div style="white-space: pre-wrap;">${restyledAlternativeCopyText}</div>`;
    }
  }
  
  // Add headlines if available
  if (copyResult.headlines && copyResult.headlines.length > 0) {
    html += `<h2>Headline Ideas</h2>`;
    html += `<ol>`;
    copyResult.headlines.forEach((headline) => {
      html += `<li>${headline}</li>`;
    });
    html += `</ol>`;
  }
  
  // Add restyled headlines if available
  if (copyResult.restyledHeadlinesVersions && copyResult.restyledHeadlinesVersions.length > 0) {
    // Display all restyled headline versions
    copyResult.restyledHeadlinesVersions.forEach(version => {
      html += `<h2>Headline Ideas (${version.persona}'s Voice)</h2>`;
      html += `<ol>`;
      version.headlines.forEach((headline) => {
        html += `<li>${headline}</li>`;
      });
      html += `</ol>`;
    });
  } else if (copyResult.restyledHeadlines && copyResult.restyledHeadlines.length > 0 && 
           (copyResult.restyledHeadlinesPersona || selectedPersona)) {
    // Legacy single restyled headlines
    html += `<h2>Headline Ideas (${selectedPersona}'s Voice)</h2>`;
    html += `<ol>`;
    copyResult.restyledHeadlines.forEach((headline) => {
      html += `<li>${headline}</li>`;
    });
    html += `</ol>`;
  }
  
  return html;
};