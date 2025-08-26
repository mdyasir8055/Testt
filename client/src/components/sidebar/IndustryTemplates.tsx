import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, DollarSign, ShoppingCart, GraduationCap, Building, FileText } from 'lucide-react';

interface IndustryTemplatesProps {
  selectedIndustry?: string;
  onIndustryChange: (industry: string) => void;
}

export function IndustryTemplates({ selectedIndustry, onIndustryChange }: IndustryTemplatesProps) {
  const templates = [
    { 
      id: 'medical', 
      icon: Stethoscope, 
      label: 'Medical', 
      description: 'Healthcare documents, research papers, clinical reports',
      features: ['Medical terminology', 'Clinical analysis', 'Research extraction']
    },
    { 
      id: 'finance', 
      icon: DollarSign, 
      label: 'Finance', 
      description: 'Financial reports, statements, market analysis',
      features: ['Financial metrics', 'Risk analysis', 'Compliance checks']
    },
    { 
      id: 'retail', 
      icon: ShoppingCart, 
      label: 'Retail', 
      description: 'Product catalogs, market research, customer data',
      features: ['Product analysis', 'Market trends', 'Customer insights']
    },
    { 
      id: 'education', 
      icon: GraduationCap, 
      label: 'Education', 
      description: 'Academic papers, textbooks, course materials',
      features: ['Academic content', 'Study guides', 'Research summaries']
    },
    { 
      id: 'legal', 
      icon: Building, 
      label: 'Legal', 
      description: 'Contracts, legal documents, case studies',
      features: ['Legal analysis', 'Contract review', 'Case research']
    },
    { 
      id: 'general', 
      icon: FileText, 
      label: 'General', 
      description: 'General documents and content analysis',
      features: ['Standard Q&A', 'Content extraction', 'Basic analysis']
    },
  ];

  const handleTemplateClick = (templateId: string) => {
    onIndustryChange(templateId);
  };

  return (
    <div className="p-6 flex-1" data-testid="industry-templates">
      <h2 className="text-sm font-medium text-foreground mb-3">Processing Mode</h2>
      <div className="space-y-3">
        {templates.map((template) => {
          const IconComponent = template.icon;
          const isSelected = selectedIndustry === template.id;
          
          return (
            <Card 
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
              onClick={() => handleTemplateClick(template.id)}
              data-testid={`button-template-${template.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">{template.label}</CardTitle>
                  </div>
                  {isSelected && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </div>
                <CardDescription className="text-xs">{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1">
                  {template.features.map((feature, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs px-1.5 py-0.5"
                    >
                      {feature}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
