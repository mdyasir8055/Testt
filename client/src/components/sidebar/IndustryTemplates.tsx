import { Button } from '@/components/ui/button';

export function IndustryTemplates() {
  const templates = [
    { id: 'medical', emoji: '🏥', label: 'Medical' },
    { id: 'finance', emoji: '💰', label: 'Finance' },
    { id: 'retail', emoji: '🛍️', label: 'Retail' },
    { id: 'education', emoji: '📚', label: 'Education' },
  ];

  const handleTemplateClick = (templateId: string) => {
    // Handle industry template selection
    console.log('Selected template:', templateId);
  };

  return (
    <div className="p-6 flex-1" data-testid="industry-templates">
      <h2 className="text-sm font-medium text-foreground mb-3">Industry Templates</h2>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {templates.map((template) => (
          <Button
            key={template.id}
            variant="secondary"
            className="h-auto p-2 flex flex-col items-center hover:bg-accent transition-colors"
            onClick={() => handleTemplateClick(template.id)}
            data-testid={`button-template-${template.id}`}
          >
            <div className="text-lg mb-1">{template.emoji}</div>
            <div className="text-xs">{template.label}</div>
          </Button>
        ))}
      </div>
    </div>
  );
}
