import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MessageSquare, BarChart3, FileText, Split } from 'lucide-react';

interface ModeSelectionProps {
  selectedMode: string;
  onModeChange: (mode: string) => void;
}

export function ModeSelection({ selectedMode, onModeChange }: ModeSelectionProps) {
  const modes = [
    {
      id: 'standard',
      name: 'Standard Mode',
      description: 'Ask questions about your documents',
      icon: <MessageSquare className="h-4 w-4" />
    },
    {
      id: 'processing',
      name: 'Processing Mode',
      description: 'Extract and analyze specific information',
      icon: <BarChart3 className="h-4 w-4" />
    },
    {
      id: 'comparison',
      name: 'Document Comparison',
      description: 'Compare two documents side by side',
      icon: <Split className="h-4 w-4" />
    },
    {
      id: 'pdfComparison',
      name: 'PDF Comparison Analysis',
      description: 'Detailed PDF comparison with insights',
      icon: <FileText className="h-4 w-4" />
    }
  ];

  return (
    <div className="p-6 border-b border-border" data-testid="mode-selection">
      <h2 className="text-sm font-medium text-foreground mb-3">Chat Mode</h2>
      
      <RadioGroup 
        value={selectedMode} 
        onValueChange={onModeChange}
        className="space-y-2"
      >
        {modes.map((mode) => (
          <div key={mode.id} className="flex items-center space-x-2">
            <RadioGroupItem 
              value={mode.id} 
              id={`mode-${mode.id}`}
              data-testid={`radio-mode-${mode.id}`}
            />
            <Label 
              htmlFor={`mode-${mode.id}`} 
              className="flex items-center cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <div className="bg-secondary p-1.5 rounded-md">
                  {mode.icon}
                </div>
                <div>
                  <div className="text-sm font-medium">{mode.name}</div>
                  <div className="text-xs text-muted-foreground">{mode.description}</div>
                </div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}