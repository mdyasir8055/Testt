import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onVoiceInput: () => void;
  isLoading?: boolean;
  isListening?: boolean;
}

export function ChatInput({ onSendMessage, onVoiceInput, isLoading, isListening }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Update token count (rough estimation)
  useEffect(() => {
    const estimatedTokens = Math.ceil(message.split(/\s+/).length * 1.3);
    setTokenCount(estimatedTokens);
  }, [message]);

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: string) => {
    const quickActions = {
      summarize: "Please summarize the key points from the uploaded documents.",
      keypoints: "Extract the main key points and findings from the documents.",
      questions: "Generate relevant questions I could ask about these documents.",
    };
    
    const actionText = quickActions[action as keyof typeof quickActions];
    if (actionText) {
      setMessage(actionText);
    }
  };

  return (
    <div className="border-t border-border bg-card p-4" data-testid="chat-input">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              className="resize-none min-h-[3rem] max-h-32"
              disabled={isLoading}
              data-testid="input-message"
            />
          </div>
          <div className="flex flex-col space-y-2">
            <Button
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              className="p-3"
              data-testid="button-send"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={onVoiceInput}
              className={`p-3 ${isListening ? 'text-red-500' : ''}`}
              data-testid="button-voice"
            >
              <Mic className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Quick actions:</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickAction('summarize')}
              className="text-xs h-6 px-3 py-1 rounded-full"
              data-testid="button-quick-summarize"
            >
              Summarize
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickAction('keypoints')}
              className="text-xs h-6 px-3 py-1 rounded-full"
              data-testid="button-quick-keypoints"
            >
              Key Points
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickAction('questions')}
              className="text-xs h-6 px-3 py-1 rounded-full"
              data-testid="button-quick-questions"
            >
              Generate Questions
            </Button>
          </div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span data-testid="text-token-count">{tokenCount}</span>
            <span>/</span>
            <span>4000 tokens</span>
          </div>
        </div>
      </div>
    </div>
  );
}
