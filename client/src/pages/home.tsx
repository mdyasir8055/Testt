import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DocumentUpload } from '@/components/sidebar/DocumentUpload';
import { ModelSelection } from '@/components/sidebar/ModelSelection';
import { ModeSelection } from '@/components/sidebar/ModeSelection';
import { IndustryTemplates } from '@/components/sidebar/IndustryTemplates';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { SourcesModal } from '@/components/modals/SourcesModal';
import { ComparisonMode } from '@/components/modes/ComparisonMode';
import { useVoice } from '@/hooks/use-voice';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Settings, Volume2, Mic } from 'lucide-react';
import type { Document, ChatMessage as ChatMessageType, QueryResponse } from '@shared/schema';

export default function Home() {
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('groq');
  const [chatMode, setChatMode] = useState<string>('standard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState<QueryResponse['sources']>([]);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isListening, startListening, stopListening, playAudio } = useVoice();

  // Create initial chat session
  const createSessionMutation = useMutation({
    mutationFn: api.chat.createSession,
    onSuccess: (session) => {
      setCurrentSessionId(session.id);
      queryClient.invalidateQueries({ queryKey: ['/api/chat/sessions'] });
    },
  });

  // Get documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: () => api.documents.list(),
  });

  // Get chat messages
  const { data: messages = [] } = useQuery({
    queryKey: ['/api/chat/sessions', currentSessionId, 'messages'],
    queryFn: () => currentSessionId ? api.chat.getMessages(currentSessionId) : [],
    enabled: !!currentSessionId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: api.chat.query,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/chat/sessions', currentSessionId, 'messages'] 
      });
      toast({
        title: "Message sent",
        description: "Your query has been processed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize session on mount
  useEffect(() => {
    if (!currentSessionId) {
      createSessionMutation.mutate({
        title: "New Chat",
        mode: chatMode,
        settings: { model: selectedModel },
      });
    }
  }, []);

  const handleSendMessage = (message: string) => {
    if (!currentSessionId || !message.trim()) return;

    sendMessageMutation.mutate({
      sessionId: currentSessionId,
      message: message.trim(),
      mode: chatMode,
    });
  };

  const handleVoiceInput = async () => {
    if (isListening) {
      const audioData = await stopListening();
      setIsVoiceInputActive(false);
      // Process voice query here
    } else {
      setIsVoiceInputActive(true);
      await startListening();
    }
  };

  const handlePlayAudio = async (text: string) => {
    try {
      await playAudio(text);
    } catch (error) {
      toast({
        title: "Audio Error",
        description: "Failed to play audio. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShowSources = (sources: QueryResponse['sources']) => {
    setSelectedSources(sources);
    setIsSourcesOpen(true);
  };

  const handleModeChange = (mode: string) => {
    setChatMode(mode);
    if (mode === 'comparison') {
      setIsComparisonMode(true);
    }
  };

  if (isComparisonMode) {
    return <ComparisonMode onExit={() => setIsComparisonMode(false)} />;
  }

  return (
    <>
      <div className="flex h-screen bg-background" data-testid="main-container">
        {/* Sidebar */}
        <div className="w-80 bg-card border-r border-border flex flex-col" data-testid="sidebar">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <h1 className="text-xl font-semibold text-foreground">PDF Knowledge Bot</h1>
            <p className="text-sm text-muted-foreground mt-1">RAG-powered document assistant</p>
          </div>

          {/* Document Upload */}
          <DocumentUpload documents={documents} isLoading={documentsLoading} />

          {/* Model Selection */}
          <ModelSelection 
            selectedModel={selectedModel} 
            onModelChange={setSelectedModel} 
          />

          {/* Mode Selection */}
          <ModeSelection 
            selectedMode={chatMode} 
            onModeChange={handleModeChange} 
          />

          {/* Industry Templates */}
          <IndustryTemplates />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-border bg-card px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Chat with your documents</h2>
                <p className="text-sm text-muted-foreground">Ask questions about your uploaded PDFs</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleVoiceInput}
                  className={isListening ? "text-red-500" : ""}
                  data-testid="button-voice-input"
                >
                  <Mic className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSettingsOpen(true)}
                  data-testid="button-settings"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6" data-testid="chat-messages">
            {messages.length === 0 ? (
              <div className="max-w-3xl mx-auto">
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-6 border border-border">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Welcome to PDF Knowledge Bot</h3>
                      <p className="text-sm text-muted-foreground">Your intelligent document assistant powered by RAG technology</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">Features:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Multi-modal PDF processing</li>
                        <li>• Voice input and output</li>
                        <li>• Industry-specific analysis</li>
                        <li>• Document comparison</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground">Try asking:</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• "Summarize this document"</li>
                        <li>• "Find information about..."</li>
                        <li>• "Compare these two sections"</li>
                        <li>• "Explain this diagram"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onPlayAudio={handlePlayAudio}
                  onShowSources={handleShowSources}
                />
              ))
            )}
          </div>

          {/* Voice Input Indicator */}
          {isVoiceInputActive && (
            <div className="mx-6 mb-3 p-3 bg-primary/10 rounded-lg border border-primary/20" data-testid="voice-indicator">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-foreground">Listening... Speak now</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleVoiceInput}
                  className="ml-auto text-primary"
                  data-testid="button-stop-listening"
                >
                  Stop
                </Button>
              </div>
            </div>
          )}

          {/* Chat Input */}
          <ChatInput
            onSendMessage={handleSendMessage}
            onVoiceInput={handleVoiceInput}
            isLoading={sendMessageMutation.isPending}
            isListening={isListening}
          />
        </div>
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      
      <SourcesModal
        isOpen={isSourcesOpen}
        onClose={() => setIsSourcesOpen(false)}
        sources={selectedSources}
      />
    </>
  );
}
