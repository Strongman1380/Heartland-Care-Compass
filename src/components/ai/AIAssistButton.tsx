/**
 * AI Assist Button Component
 * Reusable button for AI-powered features in forms and components
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sparkles, Loader2, FileText, TrendingUp, AlertCircle, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import aiService from '@/services/aiService';

interface AIAssistButtonProps {
  youthId?: string;
  youth?: any;
  context?: any;
  noteContent?: string;
  onSuggestion?: (suggestion: any) => void;
  onSummary?: (summary: string) => void;
  onAnalysis?: (analysis: any) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function AIAssistButton({
  youthId,
  youth,
  context,
  noteContent,
  onSuggestion,
  onSummary,
  onAnalysis,
  variant = 'outline',
  size = 'sm',
  className = '',
}: AIAssistButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');

  const handleSummarize = async () => {
    if (!noteContent) {
      toast.error('No content to summarize');
      return;
    }

    setCurrentAction('summarize');
    setIsLoading(true);

    try {
      const response = await aiService.summarizeCaseNote(noteContent);

      if (response.success && response.data) {
        if (onSummary) {
          onSummary(response.data.summary);
        }
        toast.success('Summary generated!');
      } else {
        throw new Error(response.error || 'Failed to generate summary');
      }
    } catch (error: any) {
      toast.error(`Failed to summarize: ${error.message}`);
    } finally {
      setIsLoading(false);
      setCurrentAction('');
    }
  };

  const handleAnalyze = async () => {
    if (!noteContent || !youth) {
      toast.error('Missing required data for analysis');
      return;
    }

    setCurrentAction('analyze');
    setIsLoading(true);

    try {
      const response = await aiService.analyzeNoteContent(noteContent, youth);

      if (response.success && response.data) {
        if (onAnalysis) {
          onAnalysis(response.data);
        }

        // Show risk indicators if any
        if (response.data.riskIndicators?.length > 0) {
          const highRisk = response.data.riskIndicators.filter((r: any) => r.severity === 'high');
          if (highRisk.length > 0) {
            toast.warning(`${highRisk.length} high-risk indicator(s) detected`);
          } else {
            toast.success('Analysis complete');
          }
        } else {
          toast.success('Analysis complete - no concerns identified');
        }
      } else {
        throw new Error(response.error || 'Failed to analyze content');
      }
    } catch (error: any) {
      toast.error(`Failed to analyze: ${error.message}`);
    } finally {
      setIsLoading(false);
      setCurrentAction('');
    }
  };

  const handleSuggest = async () => {
    if (!youthId) {
      toast.error('Youth ID required for suggestions');
      return;
    }

    setCurrentAction('suggest');
    setIsLoading(true);

    try {
      const response = await aiService.suggestCaseNoteContent(youthId, 'case-note', context);

      if (response.success && response.data) {
        if (onSuggestion) {
          onSuggestion(response.data);
        }
        toast.success('Suggestions generated!');
      } else {
        throw new Error(response.error || 'Failed to generate suggestions');
      }
    } catch (error: any) {
      toast.error(`Failed to get suggestions: ${error.message}`);
    } finally {
      setIsLoading(false);
      setCurrentAction('');
    }
  };

  const handleBehavioralInsights = async () => {
    if (!context?.behaviorData || !youth) {
      toast.error('Behavior data required');
      return;
    }

    setCurrentAction('insights');
    setIsLoading(true);

    try {
      const response = await aiService.generateBehavioralInsights(
        context.behaviorData,
        youth,
        context.period
      );

      if (response.success && response.data) {
        if (onSuggestion) {
          onSuggestion({ behavioralInsights: response.data });
        }
        toast.success('Behavioral insights generated!');
      } else {
        throw new Error(response.error || 'Failed to generate insights');
      }
    } catch (error: any) {
      toast.error(`Failed to generate insights: ${error.message}`);
    } finally {
      setIsLoading(false);
      setCurrentAction('');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span className="ml-2">
            {isLoading ? `${currentAction}...` : 'AI Assist'}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>AI Assistance</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {noteContent && (
          <>
            <DropdownMenuItem onClick={handleSummarize} disabled={isLoading}>
              <FileText className="w-4 h-4 mr-2" />
              Condense to Key Points
            </DropdownMenuItem>

            {youth && (
              <DropdownMenuItem onClick={handleAnalyze} disabled={isLoading}>
                <AlertCircle className="w-4 h-4 mr-2" />
                Analyze Sentiment & Risks
              </DropdownMenuItem>
            )}
          </>
        )}

        {youthId && (
          <DropdownMenuItem onClick={handleSuggest} disabled={isLoading}>
            <Lightbulb className="w-4 h-4 mr-2" />
            Suggest Content Ideas
          </DropdownMenuItem>
        )}

        {context?.behaviorData && youth && (
          <DropdownMenuItem onClick={handleBehavioralInsights} disabled={isLoading}>
            <TrendingUp className="w-4 h-4 mr-2" />
            Calculate Behavior Trends
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AIAssistButton;
