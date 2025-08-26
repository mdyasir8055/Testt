import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ModelSelectionProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export function ModelSelection({ selectedModel, onModelChange }: ModelSelectionProps) {
  const models = [
    { value: 'groq', label: 'Groq (Free Tier)' },
    { value: 'gemini', label: 'Google Gemini Free' },
    { value: 'huggingface', label: 'Hugging Face Free' },
  ];

  return (
    <div className="p-6 border-b border-border" data-testid="model-selection">
      <h2 className="text-sm font-medium text-foreground mb-3">AI Model</h2>
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger className="w-full" data-testid="select-model">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.value} value={model.value}>
              {model.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
