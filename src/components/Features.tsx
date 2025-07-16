import React from 'react';
import { Book, Sparkles, Zap, Sliders, FileText, Copy, BarChart2, AlignJustify, Lightbulb, PenTool, Settings, RefreshCw, Send, Award, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Features: React.FC = () => {
  const { theme } = useTheme();

  const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => {
    return (
      <div className="mb-12 p-6 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg shadow-sm">
        <div className="flex items-center mb-4 pb-2 border-b border-gray-300 dark:border-gray-700">
          <Icon size={24} className="text-primary-500 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>
        <div className="text-gray-700 dark:text-gray-300 space-y-4">
          {children}
        </div>
      </div>
    );
  };

  const SubSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
    return (
      <div className="mt-6 mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
          <div className="w-1 h-5 bg-primary-500 mr-2 rounded-full"></div>
          {title}
        </h3>
        <div className="pl-3 space-y-3">
          {children}
        </div>
      </div>
    );
  };

  const Callout = ({ variant = 'info', title, children }: { variant?: 'info' | 'warning' | 'tip'; title: string; children: React.ReactNode }) => {
    const bgColorClass = {
      info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      tip: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    }[variant];
    
    return (
      <div className={`p-4 rounded-md my-4 border ${bgColorClass}`}>
        <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">{title}</h4>
        <div className="text-gray-700 dark:text-gray-300">
          {children}
        </div>
      </div>
    );
  };

  const FeatureGrid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
      {children}
    </div>
  );

  const FeatureCard = ({ title, icon: Icon, description }: { title: string; icon: React.ElementType; description: string }) => (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center mb-2">
        <Icon size={18} className="text-primary-500 mr-2" />
        <h4 className="font-medium text-gray-800 dark:text-gray-200">{title}</h4>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center mb-8">
          <Book size={28} className="text-primary-500 mr-2" />
          <h1 className="text-3xl font-bold text-black dark:text-white">Features</h1>
        </div>
        
        <Section title="AI-Powered Copywriting Platform" icon={Sparkles}>
          <p>
            PimpMyCopy is an advanced AI-powered copy generator that helps you create and improve marketing content.
            Our platform uses cutting-edge AI models to generate high-quality marketing copy tailored to your specific needs.
          </p>
          
          <Callout title="Advanced AI Models" variant="info">
            <p>PimpMyCopy leverages multiple AI models to deliver superior content:</p>
            <ul className="mt-2 space-y-1 list-disc ml-5">
              <li><strong>DeepSeek V3</strong> - The latest DeepSeek Chat model for natural, high-quality content</li>
              <li><strong>GPT-4o Omni</strong> - OpenAI's advanced multimodal model</li>
              <li><strong>GPT-4 Turbo</strong> - OpenAI's high-performance model with extended context</li>
              <li><strong>GPT-3.5 Turbo</strong> - For faster, more economical content generation</li>
            </ul>
            <p className="mt-2">You can select which AI model to use based on your specific needs and preferences.</p>
          </Callout>
          
          <SubSection title="Choose Your Interface Mode">
            <div className="space-y-4">
              <p>
                PimpMyCopy offers two interface modes to match your level of expertise and specific needs:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-blue-300 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/10">
                  <div className="flex items-center mb-2">
                    <Zap size={20} className="text-primary-500 mr-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Smart Mode</h4>
                  </div>
                  <p className="text-sm">
                    A streamlined experience that shows only essential fields. Perfect for:
                  </p>
                  <ul className="text-sm list-disc pl-5 mt-2 space-y-1">
                    <li>Quick copy generation</li>
                    <li>New users</li>
                    <li>Simple projects</li>
                    <li>When you need content fast</li>
                  </ul>
                </div>
                
                <div className="border border-purple-300 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/10">
                  <div className="flex items-center mb-2">
                    <Sliders size={20} className="text-primary-500 mr-2" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Pro Mode</h4>
                  </div>
                  <p className="text-sm">
                    Full access to all advanced settings and options. Ideal for:
                  </p>
                  <ul className="text-sm list-disc pl-5 mt-2 space-y-1">
                    <li>Experienced users</li>
                    <li>Complex projects</li>
                    <li>Fine-tuning every aspect</li>
                    <li>Maximum control over output</li>
                  </ul>
                </div>
              </div>
              
              <p className="text-sm">
                Toggle between modes using the Smart Mode/Pro Mode selector at the top of the page. Your preference is saved for future sessions.
              </p>
            </div>
          </SubSection>
        </Section>
        
        <Section title="Core Content Generation" icon={FileText}>
          <p>
            Our platform offers two primary content generation approaches, each designed for specific use cases:
          </p>
          
          <SubSection title="Create New Copy">
            <p>
              The "Create New Copy" feature helps you generate fresh marketing copy based on your business information and requirements.
              This is ideal when you're starting from scratch or need completely new content.
            </p>
            
            <div className="mt-4 space-y-2">
              <p className="font-medium text-gray-800 dark:text-gray-200">Key Fields:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Business Description:</strong> Detailed information about your business or product</li>
                <li><strong>Page Type:</strong> The type of page you're creating content for (Homepage, About, Services, etc.)</li>
                <li><strong>Section:</strong> The specific section of the page</li>
                <li><strong>Target Audience:</strong> Who will be reading the copy</li>
                <li><strong>Key Message:</strong> The main point you want to convey</li>
              </ul>
            </div>
            
            <Callout title="Pro Tip" variant="tip">
              The more detailed your business description, the better your results will be. Include your unique selling points, key benefits, and what sets you apart from competitors.
            </Callout>
          </SubSection>
          
          <SubSection title="Improve Existing Copy">
            <p>
              The "Improve Existing Copy" feature enhances content you already have, whether it's underperforming, outdated, or just needs refinement. Simply paste your current copy, and our AI will transform it into more effective content.
            </p>
            
            <div className="mt-4 space-y-2">
              <p className="font-medium text-gray-800 dark:text-gray-200">Key Fields:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Original Copy:</strong> Your existing content that needs improvement</li>
                <li><strong>Section:</strong> The type of section you're improving</li>
                <li><strong>Target Audience:</strong> Who should read this content</li>
                <li><strong>Key Message:</strong> What main point should be emphasized</li>
              </ul>
            </div>
            
            <Callout title="Content Evaluation" variant="info">
              Use the "Evaluate Inputs" button before generating to get feedback on your inputs. This helps improve your prompts for better results and highlights areas that need more detail.
            </Callout>
          </SubSection>
        </Section>
        
        <Section title="Strategic Messaging Controls" icon={Send}>
          <p>
            Fine-tune your content's strategic elements to align perfectly with your marketing objectives:
          </p>
          
          <FeatureGrid>
            <FeatureCard 
              title="Key Message" 
              icon={AlignJustify}
              description="Define the core message you want your copy to communicate to your audience."
            />
            <FeatureCard 
              title="Call to Action" 
              icon={Send}
              description="Specify what you want readers to do next (sign up, contact, learn more, etc.)."
            />
            <FeatureCard 
              title="Target Audience" 
              icon={PenTool}
              description="Define who should be reading your content for more targeted messaging."
            />
            <FeatureCard 
              title="Brand Values" 
              icon={Award}
              description="Highlight the core values your brand represents to ensure consistent messaging."
            />
            <FeatureCard 
              title="Keywords" 
              icon={FileText}
              description="Include specific keywords you want incorporated in your content."
            />
            <FeatureCard 
              title="Desired Emotion" 
              icon={Lightbulb}
              description="Specify the emotional response you want to evoke in your readers."
            />
          </FeatureGrid>
          
          <SubSection title="Pro Mode Exclusive Controls">
            <p>
              In Pro Mode, you gain access to additional strategic controls:
            </p>
            
            <ul className="list-disc pl-6 space-y-2 mt-3 text-gray-700 dark:text-gray-300">
              <li><strong>Industry/Niche Selection:</strong> Choose from categorized industry options or create custom niches</li>
              <li><strong>Reader's Funnel Stage:</strong> Tailor content to awareness, consideration, decision, or other funnel stages</li>
              <li><strong>Target Audience Pain Points:</strong> Detail specific problems your audience faces that your solution addresses</li>
              <li><strong>Competitor Analysis:</strong> Add competitor URLs and copy text for comparative improvement</li>
              <li><strong>Language Style Constraints:</strong> Set specific writing style rules (avoid passive voice, no jargon, etc.)</li>
              <li><strong>Output Structure:</strong> Define exactly how your content should be structured and in what order</li>
            </ul>
            
            <Callout title="AI Suggestions" variant="tip">
              Most fields feature suggestion buttons (<Zap size={16} className="inline-block text-primary-500 mx-1" />) that generate AI-powered suggestions based on your input. Click these to quickly get ideas for fields like key messages, brand values, or target audience descriptions.
            </Callout>
          </SubSection>
        </Section>
        
        <Section title="Content Enhancement Options" icon={Settings}>
          <p>
            PimpMyCopy offers several powerful enhancement options to create the perfect content for your needs:
          </p>
          
          <SubSection title="Optional Enhancements">
            <ul className="list-disc pl-5 space-y-3">
              <li className="pb-2 border-b border-gray-200 dark:border-gray-800">
                <div className="font-medium text-gray-800 dark:text-gray-200">Generate Alternative Version(s)</div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Creates additional approaches with different angles or tones. You can specify exactly how many alternative versions to generate (up to 3), with each offering a fresh perspective while maintaining your core message.
                </p>
              </li>
              <li className="pb-2 border-b border-gray-200 dark:border-gray-800">
                <div className="font-medium text-gray-800 dark:text-gray-200">Generate Headline Options</div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Creates multiple headline alternatives (up to 10) for your content. Each headline takes a different approach while maintaining your core message, giving you a variety of options to choose from.
                </p>
              </li>
              <li className="pb-2 border-b border-gray-200 dark:border-gray-800">
                <div className="font-medium text-gray-800 dark:text-gray-200">Generate Content Scores</div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Automatically evaluates the quality of each version and provides detailed scores for clarity, persuasiveness, tone match, and engagement. Each score includes specific improvement suggestions.
                </p>
              </li>
              <li>
                <div className="font-medium text-gray-800 dark:text-gray-200">Voice Style</div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Apply a distinctive communication style modeled after well-known personalities like Steve Jobs, Seth Godin, or others. This feature transforms your content to match the unique speaking and writing patterns of these influential communicators.
                </p>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-center">Steve Jobs</div>
                  <div className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-center">Seth Godin</div>
                  <div className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-center">Simon Sinek</div>
                  <div className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-center">Marie Forleo</div>
                  <div className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-center">Gary Halbert</div>
                  <div className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-center">David Ogilvy</div>
                </div>
              </li>
            </ul>
          </SubSection>
          
          <SubSection title="Content Customization">
            <p className="mb-3">
              Take control of your content's tone, language, and format with these customization options:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Language & Tone</h4>
                <ul className="list-disc pl-6 space-y-1 text-gray-600 dark:text-gray-400 text-sm">
                  <li>Multiple language options (English, Spanish, French, German, Italian, Portuguese)</li>
                  <li>Various tone presets (Professional, Friendly, Bold, Minimalist, Creative, Persuasive)</li>
                  <li>Tone level slider to fine-tune between formal and casual in Pro Mode</li>
                  <li>Preferred writing style selection (Persuasive, Conversational, Educational, etc.)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Length & Structure</h4>
                <ul className="list-disc pl-6 space-y-1 text-gray-600 dark:text-gray-400 text-sm">
                  <li>Preset word count options (Short: 50-100, Medium: 100-200, Long: 200-400)</li>
                  <li>Custom word count option for precise length control</li>
                  <li>Output structure selection in Pro Mode (headers, paragraphs, bullet points, etc.)</li>
                  <li>Dragable reordering of structure elements</li>
                </ul>
              </div>
            </div>
            
            <Callout title="Language Style Constraints" variant="info">
              In Pro Mode, you can set specific language constraints like "Avoid passive voice," "No idioms," "Keep sentences short," "Use gender-neutral language," and more. These constraints help ensure the generated content follows your organization's style guidelines.
            </Callout>
          </SubSection>
        </Section>
        
        <Section title="Workspace & Management Tools" icon={BarChart2}>
          <p>
            PimpMyCopy includes several tools to help you manage, organize, and improve your content workflow:
          </p>
          
          <SubSection title="Templates">
            <p>
              Save your settings as templates to quickly generate similar content in the future:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Click "Save Template" after setting up your form</li>
              <li>Give your template a name and description</li>
              <li>Load saved templates anytime using the "Load Template" button</li>
            </ul>
            <p className="mt-2">
              Templates save all your settings, including optional features, allowing you to maintain consistency across similar content pieces.
            </p>
          </SubSection>
          
          <SubSection title="Customer Management">
            <p>
              Organize your content by customer or client:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Create and manage customer profiles</li>
              <li>Associate generated content with specific customers</li>
              <li>Filter content in the dashboard by customer</li>
            </ul>
            <p className="mt-2">
              This helps you keep track of which content was created for which client or project.
            </p>
          </SubSection>
          
          <SubSection title="Dashboard">
            <p>
              The dashboard provides access to your saved content and usage statistics with four main tabs:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-2">
                  <FileText size={18} className="text-primary-500 mr-2" />
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">Copy Sessions</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View and access previous copy generation sessions, including all inputs and outputs.
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-2">
                  <Settings size={18} className="text-primary-500 mr-2" />
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">Templates</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage your saved templates for quick reuse of specific configurations.
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-2">
                  <Save size={18} className="text-primary-500 mr-2" />
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">Saved Outputs</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Access your specifically saved outputs, including all versions and variations.
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-2">
                  <BarChart2 size={18} className="text-primary-500 mr-2" />
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">Token Consumption</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track your API usage, token consumption by model, and associated costs.
                </p>
              </div>
            </div>
          </SubSection>
        </Section>
        
        <Section title="Results & Output Features" icon={Copy}>
          <p>
            Once your content is generated, you have several tools to review, compare, and export your results:
          </p>
          
          <SubSection title="Content Comparison">
            <p>
              The results section displays your generated content with multiple options for reviewing and comparing different versions:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Side-by-side comparison of original vs. improved content</li>
              <li>Alternative versions with different approaches</li>
              <li>Humanized versions for more natural language</li>
              <li>Voice-styled variations (e.g., Steve Jobs, Seth Godin style)</li>
              <li>Clear section organization with improved headings</li>
              <li>Visual indicators showing relationships between content variations</li>
            </ul>
            
            <Callout title="Quality Indicators" variant="info">
              <p>Content quality scores appear with the content they evaluate, using color-coded indicators:</p>
              <ul className="mt-2 space-y-1 list-disc ml-5">
                <li><span className="text-green-600 dark:text-green-400 font-medium">Green (90+)</span>: Excellent quality</li>
                <li><span className="text-blue-600 dark:text-blue-400 font-medium">Blue (75-89)</span>: Good quality</li>
                <li><span className="text-yellow-600 dark:text-yellow-400 font-medium">Yellow (60-74)</span>: Needs improvement</li>
                <li><span className="text-red-600 dark:text-red-400 font-medium">Red (below 60)</span>: Poor quality</li>
              </ul>
            </Callout>
          </SubSection>
          
          <SubSection title="Score Comparison">
            <p>
              Each piece of content can be evaluated with detailed scoring across multiple dimensions:
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 mb-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">Overall Score</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">A comprehensive 0-100 rating of content quality</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">Clarity</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">How clear and understandable the content is</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">Persuasiveness</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">How effectively it convinces the reader</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">Tone Match</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">How well it matches the requested tone</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">Engagement</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">How engaging and interesting it is to read</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">Improvement Explanation</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Summary of why and how the content was improved</p>
              </div>
            </div>
            
            <p>
              Click the Score Comparison button in the floating sidebar to view a side-by-side comparison of all generated versions.
            </p>
          </SubSection>
          
          <SubSection title="Content Export Options">
            <p>
              Several export options are available in the floating action sidebar:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li><strong>Save Output:</strong> Save the current output for later reference in your account</li>
              <li><strong>Copy as Markdown:</strong> Copy all content as formatted markdown text for easy pasting into other applications</li>
              <li><strong>Export to Text File:</strong> Download the content as a formatted text file</li>
              <li><strong>View Prompts:</strong> See the exact prompts used to generate the content</li>
            </ul>
          </SubSection>
          
          <SubSection title="Headline Generation">
            <p>
              The headline generation feature creates multiple headline options for your content:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Generate up to 10 different headline options</li>
              <li>Each headline takes a different approach to your key message</li>
              <li>Numbered formatting for easy reference</li>
              <li>One-click copy function for each headline</li>
              <li>Voice style can be applied to match your selected persona</li>
            </ul>
            <p className="mt-2">
              This helps you quickly test different headline approaches and find the most effective option for your content.
            </p>
          </SubSection>
        </Section>
        
        <div className="mt-12 p-6 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg shadow-sm">
          <div className="flex items-center mb-4">
            <Lightbulb size={24} className="text-primary-500 mr-2" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Tips for Best Results</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Smart Mode Tips</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                <li>Start with a <strong>detailed business description</strong> for better results</li>
                <li>Provide a clear <strong>key message</strong> to focus your copy</li>
                <li>Use the <strong>Evaluate Inputs</strong> button for instant feedback</li>
                <li>Switch to Pro Mode for more granular control as needed</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Pro Mode Tips</h3>
              <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                <li>Use <strong>suggestion buttons</strong> (<Zap size={16} className="inline-block text-primary-500 mx-1" />) to quickly populate fields</li>
                <li>Try different <strong>voice styles</strong> to match your brand personality</li>
                <li>Adjust the <strong>tone level slider</strong> to fine-tune formality</li>
                <li>Add <strong>competitor copy</strong> for comparative improvements</li>
                <li>Customize how many <strong>headlines</strong> you want to generate</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Link
              to="/app"
              className="inline-block bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 px-6 rounded-lg"
            >
              <RefreshCw size={18} className="inline-block mr-2" />
              Start Creating
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;