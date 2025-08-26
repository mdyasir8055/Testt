import { Button } from '@/components/ui/button';

interface ModeSelectionProps {
  selectedMode: string;
  onModeChange: (mode: string) => void;
}

export function ModeSelection({ selectedMode, onModeChange }: ModeSelectionProps) {
  const modes = [
    { value: 'standard', label: 'Standard Q&A' },
    { value: 'industry', label: 'Industry-Specific' },
    { value: 'comparison', label: 'Document Comparison' },
  ];

  return (
    <div className="p-6 border-b border-border" data-testid="mode-selection">
      <h2 className="text-sm font-medium text-foreground mb-3">Chat Mode</h2>
      <div className="space-y-2">
        {modes.map((mode) => (
          <Button
            key={mode.value}
            variant={selectedMode === mode.value ? "default" : "ghost"}
            className="w-full justify-start text-sm font-medium"
            onClick={() => onModeChange(mode.value)}
            data-testid={`button-mode-${mode.value}`}
          >
            {mode.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
