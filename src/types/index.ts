export type TabType = 'create' | 'improve';

export type Language = 'English' | 'Spanish' | 'French' | 'German' | 'Italian' | 'Portuguese';

export type Tone = 'Professional' | 'Friendly' | 'Bold' | 'Minimalist' | 'Creative' | 'Persuasive';

export type PageType = 'Homepage' | 'About' | 'Services' | 'Contact' | 'Other';

export type SectionType = 'Hero Section' | 'Benefits' | 'Features' | 'Services' | 'About' | 'Testimonials' | 'FAQ' | 'Full Copy' | 'Other';

export type WordCount = 'Short: 50-100' | 'Medium: 100-200' | 'Long: 200-400' | 'Custom';

export type Model = 'deepseek-chat' | 'gpt-4o' | 'gpt-4-turbo' | 'gpt-3.5-turbo';

export type IndustryNiche = 'SaaS' | 'Health' | 'Real Estate' | 'E-commerce' | 'Education' | 'Hospitality' | 'Finance' | 'Nonprofit' | 'Other';

export type ReaderStage = 'Awareness' | 'Consideration' | 'Decision';

export type WritingStyle = 'Persuasive' | 'Conversational' | 'Informative' | 'Storytelling';

export type LanguageConstraint = 'Avoid passive voice' | 'No idioms' | 'Avoid jargon' | 'Short sentences';

export type CopyType = 'improved' | 'alternative' | 'humanized' | 'alternativeHumanized' | 'headlines';

// New enum for different types of generated content items
export enum GeneratedContentItemType {
  Improved = 'improved',
  Alternative = 'alternative',
  RestyledImproved = 'restyled_improved',
  RestyledAlternative = 'restyled_alternative',
  Headlines = 'headlines',
  RestyledHeadlines = 'restyled_headlines',
}

// New interface for structured output elements with word counts
export interface StructuredOutputElement {
  value: string; // e.g., 'problem', 'solution', 'header1'
  label?: string; // For display purposes
  wordCount?: number | null; // e.g., 200, 500, or null if no specific count
}

export interface FormData {
  tab: TabType;
  language: Language;
  tone: Tone;
  wordCount: WordCount;
  customWordCount?: number;
  competitorUrls: string[];
  businessDescription?: string;
  originalCopy?: string;
  pageType?: PageType;
  section?: SectionType; // Added section field
  targetAudience?: string;
  keyMessage?: string;
  desiredEmotion?: string;
  callToAction?: string;
  brandValues?: string;
  keywords?: string;
  context?: string;
  model: Model;
  customerId?: string; // Added customerId field
  customerName?: string; // For display purposes
  briefDescription?: string; // Added brief description field
  generateHeadlines?: boolean; // Control headline generation
  controlExecuted?: string; // Added to track which UI control triggered the OpenAI token usage
  outputStructure?: StructuredOutputElement[]; // Changed from string[] to StructuredOutputElement[]
  // New fields
  productServiceName?: string;
  industryNiche?: string;
  toneLevel?: number;
  readerFunnelStage?: string;
  competitorCopyText?: string;
  targetAudiencePainPoints?: string;
  preferredWritingStyle?: string;
  languageStyleConstraints?: string[];
  selectedPersona?: string; // Add selected persona to FormData
  sessionId?: string; // Session ID for tracking
  // Generation options
  generateHeadlines?: boolean; // New field for generating headlines
  forceKeywordIntegration?: boolean; // New field for forcing SEO keyword integration
  // Multiple version controls
  numberOfHeadlines?: number; // Number of headlines to generate
  // New fields for word count control
  sectionBreakdown?: string; // New field for section-by-section word count allocation
  forceElaborationsExamples?: boolean; // New field to force detailed explanations and examples
  // Strict word count control
  prioritizeWordCount?: boolean; // New field to prioritize exact word count adherence
  wordCountTolerance?: number; // Configurable percentage tolerance for word count adherence
}

export interface PromptEvaluation {
  score: number;
  tips: string[];
}

// New interfaces for structured copy output
export interface StructuredCopySection {
  title: string;
  content?: string;
  listItems?: string[];
}

export interface StructuredCopyOutput {
  headline: string;
  sections: StructuredCopySection[];
}

// New interface for a single generated content item
export interface GeneratedContentItem {
  id: string; // Unique ID for this specific generated item
  type: GeneratedContentItemType; // Type of content (e.g., 'improved', 'alternative', 'humanized', 'restyled_improved')
  content: string | StructuredCopyOutput | string[]; // The actual generated content (string, structured object, or string[] for headlines)
  persona?: string; // The persona applied, if any
  
  // Fields to link to the source content item (for alternative, humanized, restyled versions)
  sourceId?: string; // ID of the content item this was generated from
  sourceType?: GeneratedContentItemType; // Type of the source content item
  sourceIndex?: number; // Index of the source content item if it was part of a collection (e.g., alternativeVersions[index])
  sourceDisplayName?: string; // A user-friendly name for the source (e.g., "Standard Version", "Alternative Version 2")
  
  generatedAt: string; // Timestamp of when this item was generated
}

export interface CopyResult {
  // Retained for initial generation and backward compatibility
  improvedCopy: string | StructuredCopyOutput;
  alternativeCopy?: string | StructuredCopyOutput;
  headlines?: string[];

  // New unified array for all generated content items
  generatedVersions: GeneratedContentItem[];

  // Old properties (to be phased out or used for specific initial states)
  restyledImprovedCopy?: string | StructuredCopyOutput;
  restyledImprovedCopyPersona?: string;
  restyledImprovedVersions?: { content: string | StructuredCopyOutput; persona: string }[];
  
  restyledAlternativeCopy?: string | StructuredCopyOutput;
  restyledAlternativeCopyPersona?: string;
  restyledAlternativeVersionCollection?: { content: string | StructuredCopyOutput; persona: string }[];
  
  restyledHeadlines?: string[]; // Added property for restyled headlines
  restyledHeadlinesPersona?: string;
  restyledHeadlinesVersions?: { headlines: string[]; persona: string }[];
  promptUsed?: string; // Added to store the prompt used for token calculation
  // Support for multiple alternative versions
  alternativeVersions?: (string | StructuredCopyOutput)[]; // Array of alternative versions
  alternativeVersionsPersonas?: string[]; // Array of personas used for each alternative version
  // Collection of restyled alternative versions, organized by alternative index
  restyledAlternativeVersionCollections?: { 
    alternativeIndex: number; 
    versions: { content: string | StructuredCopyOutput; persona: string }[] 
  }[];
  alternativeVersionScores?: ScoreData[]; // Array of scores for alternative versions
  restyledAlternativeVersions?: (string | StructuredCopyOutput)[]; // Array of restyled alternative versions
  restyledAlternativeVersionsPersonas?: string[]; // Array of personas used for each restyled alternative version
  restyledAlternativeVersionScores?: ScoreData[]; // Array of scores for restyled alternative versions
  // Track the session ID if created
  sessionId?: string;
}

export interface FormState extends FormData {
  isLoading: boolean;
  isEvaluating?: boolean; // Make this optional to avoid type errors
  isGeneratingAlternative?: boolean; // New state for generating alternative copy
  isGeneratingHeadlines?: boolean; // New state for generating headlines
  
  // New granular loading states for on-demand generation
  isGeneratingRestyledImproved?: boolean; // New state for generating restyled improved copy
  isGeneratingRestyledAlternative?: boolean; // New state for generating restyled alternative copy
  
  // States for generating individual alternatives in sequence
  alternativeGenerationIndex?: number; // Track which alternative is being generated (0-based index)
  
  generationProgress: string[]; // Array to track generation progress messages
  promptEvaluation?: PromptEvaluation;
  copyResult?: CopyResult;
}

// Define Supabase-related types
export interface User {
  id: string;
  email: string;
  name?: string;
  created_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  description?: string;
  user_id?: string;
  created_at?: string;
}

export interface CopySession {
  id: string;
  user_id: string;
  customer_id?: string;
  customer?: Customer;
  input_data: FormData;
  improved_copy: string | StructuredCopyOutput;
  alternative_copy?: string | StructuredCopyOutput;
  created_at: string;
  output_type?: string; // Added output_type field
  brief_description?: string; // Added brief description field
}

export interface TokenUsage {
  id?: string;
  user_email: string;
  token_usage: number;
  token_cost: number;
  usage_date?: string; // This will default to current date in the database
  created_at?: string; // This will be set by the database
  control_executed: string;
  brief_description: string; // Changed from optional to required
  model?: string; // Added model field
  copy_source?: string; // New field to track the source of the token usage
}

// Template interface
export interface Template {
  id?: string;
  user_id: string;
  template_name: string;
  description?: string; // New field for template description
  language: string;
  tone: string;
  word_count: string;
  custom_word_count?: number | null;
  target_audience?: string;
  key_message?: string;
  desired_emotion?: string;
  call_to_action?: string;
  brand_values?: string;
  keywords?: string;
  context?: string;
  brief_description?: string;
  page_type?: string | null;
  section?: string | null; // Added section to templates
  business_description?: string | null;
  original_copy?: string | null;
  template_type: 'create' | 'improve';
  created_at?: string;
  competitor_urls?: string[]; // Added competitor_urls field
  output_structure?: string[]; // Array of structure elements
  // New fields
  product_service_name?: string;
  industry_niche?: string;
  tone_level?: number;
  reader_funnel_stage?: string;
  competitor_copy_text?: string;
  target_audience_pain_points?: string;
  preferred_writing_style?: string;
  language_style_constraints?: string[];
  // Generation options
  generateHumanized?: boolean;
  generateHeadlines?: boolean;
  generateScores?: boolean; // New field for generating scores
  selectedPersona?: string;
  forceKeywordIntegration?: boolean; // camelCase for frontend
  // Legacy fields for compatibility
  generatehumanized?: boolean;
  generateheadlines?: boolean;
  selectedpersona?: string;
  // Strict word count control
  prioritizeWordCount?: boolean;
}

// New SavedOutput interface for saved outputs
export interface SavedOutput {
  id?: string;
  user_id: string;
  customer_id?: string | null;
  brief_description: string;
  language: string;
  tone: string;
  model: string;
  selected_persona?: string | null;
  input_snapshot: FormData;
  output_content: CopyResult;
  saved_at?: string;
  customer?: Customer;
}