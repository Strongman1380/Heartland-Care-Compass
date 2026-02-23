/**
 * AI Query Interface Component
 * Natural language interface for navigating and querying system data
 */

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Sparkles, TrendingUp, Users, FileText, AlertCircle, Brain } from 'lucide-react';
import { toast } from 'sonner';
import aiService from '@/services/aiService';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  data?: any;
}

interface AIQueryInterfaceProps {
  context?: any;
  placeholder?: string;
  suggestions?: string[];
}

export function AIQueryInterface({
  context,
  placeholder = "Ask me to analyze data, calculate statistics, or expand your notes...",
  suggestions = [
    "Calculate the average behavior points for this month",
    "What percentage of youth improved their ratings this week?",
    "Show me the distribution of incidents by type",
    "Calculate the trend in daily ratings over the last 30 days",
  ]
}: AIQueryInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: "Hi! I'm your AI assistant. I can help you with data calculations, statistical analysis, and expanding brief notes into professional paragraphs. Ask me anything!",
      timestamp: new Date(),
    }
  ]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check AI service status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const checkStatus = async () => {
    const status = await aiService.checkAIStatus();
    setAiStatus(status);

    if (!status.available) {
      toast.error('AI service is currently unavailable');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;
    const userQuery = query.trim();

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: userQuery,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const assistantId = (Date.now() + 1).toString();
      setMessages(prev => [
        ...prev,
        {
          id: assistantId,
          type: 'assistant',
          content: '',
          timestamp: new Date(),
        }
      ]);

      const streamResponse = await aiService.queryDataStream(userQuery, context, {
        onChunk: (delta) => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantId
                ? { ...msg, content: `${msg.content}${delta}` }
                : msg
            )
          );
        },
        onDone: (result) => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantId
                ? { ...msg, content: result.answer || msg.content, data: result }
                : msg
            )
          );
        },
      });

      if (!streamResponse.success) {
        // Fallback to non-stream request
        const fallback = await aiService.queryData(userQuery, context);
        if (fallback.success && fallback.data?.answer) {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantId
                ? { ...msg, content: fallback.data.answer, data: fallback.data }
                : msg
            )
          );
        } else {
          throw new Error(streamResponse.error || fallback.error || 'Failed to get response');
        }
      }
    } catch (error: any) {
      setMessages(prev => prev.filter(msg => !(msg.type === 'assistant' && !msg.content.trim())));
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: `Sorry, I encountered an error: ${error.message}. Please try rephrasing your question.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Failed to process query');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-[80%] rounded-lg p-3 ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : isSystem
              ? 'bg-muted'
              : 'bg-secondary'
          }`}
        >
          <div className="flex items-start gap-2">
            {!isUser && (
              <Brain className="w-4 h-4 mt-1 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Assistant
            </CardTitle>
            <CardDescription>
              Ask questions and navigate your data using natural language
            </CardDescription>
          </div>
          <Badge variant={aiStatus?.available ? 'default' : 'destructive'}>
            {aiStatus?.available ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <ScrollArea className="flex-1 pr-4 mb-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map(renderMessage)}

            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-secondary rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Generating response...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading || !aiStatus?.available}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!query.trim() || isLoading || !aiStatus?.available}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default AIQueryInterface;
