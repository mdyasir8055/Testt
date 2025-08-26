import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Volume2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ChatMessage as ChatMessageType, QueryResponse } from '@shared/schema';

interface ChatMessageProps {
  message: ChatMessageType;
  onPlayAudio?: (text: string) => void;
  onShowSources?: (sources: QueryResponse['sources']) => void;
}

export function ChatMessage({ message, onPlayAudio, onShowSources }: ChatMessageProps) {
  const { toast } = useToast();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy message to clipboard",
        variant: "destructive",
      });
    }
  };

  const handlePlayAudio = async () => {
    if (onPlayAudio) {
      setIsPlayingAudio(true);
      try {
        await onPlayAudio(message.content);
      } finally {
        setIsPlayingAudio(false);
      }
    }
  };

  const handleShowSources = () => {
    if (onShowSources && message.sources) {
      onShowSources(message.sources as QueryResponse['sources']);
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (message.role === 'user') {
    return (
      <div className="max-w-3xl mx-auto" data-testid={`message-user-${message.id}`}>
        <div className="flex justify-end mb-4">
          <div className="bg-primary text-primary-foreground rounded-xl px-4 py-3 max-w-md">
            <p className="text-sm">{message.content}</p>
            <div className="flex items-center justify-end space-x-2 mt-2 opacity-70">
              <span className="text-xs">{formatTimestamp(message.createdAt)}</span>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto" data-testid={`message-assistant-${message.id}`}>
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-foreground" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/>
          </svg>
        </div>
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex-1">
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground whitespace-pre-wrap">{message.content}</p>
            {message.sources && (message.sources as QueryResponse['sources']).length > 0 && (
              <p className="text-muted-foreground mt-3 text-xs">
                Sources: {(message.sources as QueryResponse['sources']).map(s => s.documentName).join(', ')}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-xs text-muted-foreground hover:text-foreground h-auto p-1"
                data-testid={`button-copy-${message.id}`}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              {onPlayAudio && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePlayAudio}
                  disabled={isPlayingAudio}
                  className="text-xs text-muted-foreground hover:text-foreground h-auto p-1"
                  data-testid={`button-listen-${message.id}`}
                >
                  <Volume2 className="w-3 h-3 mr-1" />
                  {isPlayingAudio ? 'Playing...' : 'Listen'}
                </Button>
              )}
              {message.sources && (message.sources as QueryResponse['sources']).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShowSources}
                  className="text-xs text-muted-foreground hover:text-foreground h-auto p-1"
                  data-testid={`button-sources-${message.id}`}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Sources
                </Button>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(message.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
