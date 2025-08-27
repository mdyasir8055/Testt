import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Eye, EyeOff, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { ModelInfo, ProviderModelsResponse } from '@shared/schema';

interface ModelSelectionProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export function ModelSelection({ selectedModel, onModelChange }: ModelSelectionProps) {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [availableModels, setAvailableModels] = useState<Record<string, ModelInfo[]>>({});
  const [providerStatus, setProviderStatus] = useState<Record<string, 'idle' | 'testing' | 'valid' | 'invalid'>>({});
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const providers = [
    { id: 'groq', name: 'Groq', description: 'Fast inference models' },
    { id: 'gemini', name: 'Google Gemini', description: 'Google\'s AI models' },
    { id: 'huggingface', name: 'Hugging Face', description: 'Open source models' },
  ];

  const handleApiKeyChange = (provider: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  const toggleShowApiKey = (provider: string) => {
    setShowApiKey(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const testAndSaveApiKey = async (provider: string) => {
    const apiKey = apiKeys[provider];
    if (!apiKey) return;

    setProviderStatus(prev => ({ ...prev, [provider]: 'testing' }));

    try {
      // Test the API key
      const testResult = await api.models.testApiKey(provider, apiKey);
      
      if (testResult.isValid) {
        // Save the API key
        await api.models.setApiKey(provider, apiKey);
        
        // Fetch available models
        setLoadingModels(prev => ({ ...prev, [provider]: true }));
        const modelsResponse = await api.models.getProviderModels(provider);
        
        if (modelsResponse.isValid) {
          setAvailableModels(prev => ({ ...prev, [provider]: modelsResponse.models }));
          setProviderStatus(prev => ({ ...prev, [provider]: 'valid' }));
          toast({
            title: "API Key Saved",
            description: `${provider} API key saved successfully. Found ${modelsResponse.models.length} models.`,
          });
        } else {
          setProviderStatus(prev => ({ ...prev, [provider]: 'invalid' }));
          toast({
            title: "Error",
            description: modelsResponse.error || "Failed to fetch models",
            variant: "destructive",
          });
        }
      } else {
        setProviderStatus(prev => ({ ...prev, [provider]: 'invalid' }));
        toast({
          title: "Invalid API Key",
          description: `The ${provider} API key is invalid`,
          variant: "destructive",
        });
      }
    } catch (error) {
      setProviderStatus(prev => ({ ...prev, [provider]: 'invalid' }));
      toast({
        title: "Error",
        description: `Failed to test ${provider} API key`,
        variant: "destructive",
      });
    } finally {
      setLoadingModels(prev => ({ ...prev, [provider]: false }));
    }
  };

  const getAllAvailableModels = () => {
    const allModels: ModelInfo[] = [];
    Object.values(availableModels).forEach(models => {
      allModels.push(...models);
    });
    return allModels;
  };

  const getModelDisplay = (modelId: string) => {
    const allModels = getAllAvailableModels();
    const model = allModels.find(m => m.id === modelId);
    return model ? `${model.name} (${model.provider})` : modelId;
  };

  return (
    <div className="p-6 border-b border-border" data-testid="model-selection">
      <h2 className="text-sm font-medium text-foreground mb-3">AI Model Configuration</h2>
      
      <Tabs defaultValue="setup" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup">API Setup</TabsTrigger>
          <TabsTrigger value="models">Select Model</TabsTrigger>
        </TabsList>
        
        <TabsContent value="setup" className="space-y-4">
          {providers.map((provider) => (
            <Card key={provider.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{provider.name}</CardTitle>
                    <CardDescription className="text-xs">{provider.description}</CardDescription>
                  </div>
                  {providerStatus[provider.id] === 'valid' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </Badge>
                  )}
                  {providerStatus[provider.id] === 'invalid' && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Invalid
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`${provider.id}-key`} className="text-xs">API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={`${provider.id}-key`}
                        type={showApiKey[provider.id] ? "text" : "password"}
                        placeholder={`Enter ${provider.name} API key`}
                        value={apiKeys[provider.id] || ''}
                        onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                        className="pr-8"
                        data-testid={`input-${provider.id}-api-key`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-2"
                        onClick={() => toggleShowApiKey(provider.id)}
                      >
                        {showApiKey[provider.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                    <Button
                      onClick={() => testAndSaveApiKey(provider.id)}
                      disabled={!apiKeys[provider.id] || providerStatus[provider.id] === 'testing'}
                      size="sm"
                      data-testid={`button-save-${provider.id}-key`}
                    >
                      {providerStatus[provider.id] === 'testing' ? 'Testing...' : 'Save'}
                    </Button>
                  </div>
                </div>
                
                {availableModels[provider.id] && (
                  <div className="text-xs text-muted-foreground">
                    {availableModels[provider.id].length} models available
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="models" className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Select Model</Label>
              <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger className="w-full" data-testid="select-model">
                  <SelectValue placeholder="Select a model">
                    {selectedModel && getModelDisplay(selectedModel)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {getAllAvailableModels().map((model) => (
                    <SelectItem key={`${model.provider}-${model.id}`} value={model.id}>
                      <div className="flex flex-col items-start">
                        <span>{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {model.provider} • {model.contextLength ? `${model.contextLength} tokens` : 'Unknown context'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                  {getAllAvailableModels().length === 0 && (
                    <SelectItem value="none" disabled>
                      No models available - configure API keys first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Current Active Model Display */}
            {selectedModel && (
              <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          Active Model
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          {getModelDisplay(selectedModel)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      Ready
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Model Selection Instructions */}
            {selectedModel && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <p className="font-medium mb-1">✅ Model Configuration Complete</p>
                <p>Your selected model is ready for use. All chat queries will now use <strong>{getModelDisplay(selectedModel)}</strong> to analyze your documents and provide responses.</p>
              </div>
            )}
          </div>
          
          {getAllAvailableModels().length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Configure your API keys to see available models</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
