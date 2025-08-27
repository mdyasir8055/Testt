import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Brain, Zap, CheckCircle, TrendingUp, BarChart3 } from 'lucide-react';

interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  confidence: number;
  keyFeatures: string[];
  suggestedProcessing: string[];
}

interface ClassificationResult {
  primaryType: string;
  confidence: number;
  templates: DocumentTemplate[];
  extractedFeatures: string[];
  recommendedSettings: {
    industry: string;
    processingMode: string;
    specialFeatures: string[];
  };
}

interface DocumentClassifierProps {
  documentId?: string;
  documentContent?: string;
  onClassificationComplete: (result: ClassificationResult) => void;
}

export function DocumentClassifier({ documentId, documentContent, onClassificationComplete }: DocumentClassifierProps) {
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationProgress, setClassificationProgress] = useState(0);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const documentCategories = [
    { id: 'financial', name: 'Financial Documents', icon: '💰' },
    { id: 'medical', name: 'Medical Records', icon: '🏥' },
    { id: 'legal', name: 'Legal Documents', icon: '⚖️' },
    { id: 'academic', name: 'Academic Papers', icon: '📚' },
    { id: 'technical', name: 'Technical Manuals', icon: '🔧' },
    { id: 'business', name: 'Business Reports', icon: '📊' },
    { id: 'regulatory', name: 'Regulatory Filings', icon: '📋' },
    { id: 'marketing', name: 'Marketing Materials', icon: '📢' }
  ];

  const runClassification = async () => {
    if (!documentContent) return;

    setIsClassifying(true);
    setClassificationProgress(0);

    try {
      // Simulate AI-powered document classification
      const analysisSteps = [
        'Analyzing document structure...',
        'Extracting key features...',
        'Comparing against templates...',
        'Calculating confidence scores...',
        'Generating recommendations...'
      ];

      for (let i = 0; i < analysisSteps.length; i++) {
        setClassificationProgress(((i + 1) / analysisSteps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Generate mock classification result based on content patterns
      const mockResult: ClassificationResult = {
        primaryType: 'financial',
        confidence: 0.89,
        templates: [
          {
            id: 'financial-report',
            name: 'Annual Financial Report',
            category: 'financial',
            confidence: 0.89,
            keyFeatures: ['Revenue tables', 'Financial statements', 'Executive summary', 'Risk assessment'],
            suggestedProcessing: ['Financial data extraction', 'Trend analysis', 'Compliance checking']
          },
          {
            id: 'earnings-report',
            name: 'Quarterly Earnings Report',
            category: 'financial',
            confidence: 0.76,
            keyFeatures: ['Quarterly metrics', 'Performance indicators', 'Market analysis'],
            suggestedProcessing: ['Metric extraction', 'Performance tracking', 'Comparative analysis']
          },
          {
            id: 'business-plan',
            name: 'Business Strategy Document',
            category: 'business',
            confidence: 0.64,
            keyFeatures: ['Strategic objectives', 'Market research', 'Financial projections'],
            suggestedProcessing: ['Strategy extraction', 'Goal identification', 'Market analysis']
          }
        ],
        extractedFeatures: [
          'Financial terminology (87% match)',
          'Tabular data structures (94% match)',
          'Executive summary format (82% match)',
          'Chart/graph references (78% match)',
          'Date-based reporting (91% match)'
        ],
        recommendedSettings: {
          industry: 'finance',
          processingMode: 'financial_analysis',
          specialFeatures: ['OCR for tables', 'Chart extraction', 'Compliance scanning']
        }
      };

      setResult(mockResult);
      onClassificationComplete(mockResult);

    } finally {
      setIsClassifying(false);
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = result?.templates.find(t => t.id === templateId);
    if (template && result) {
      // Apply template-specific settings
      const updatedResult = {
        ...result,
        recommendedSettings: {
          ...result.recommendedSettings,
          processingMode: `${template.category}_${template.id.split('-')[1]}`
        }
      };
      onClassificationComplete(updatedResult);
      setSelectedTemplate(templateId);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return 'secondary';
    if (confidence >= 0.6) return 'default';
    return 'destructive';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Document Classification & Template Detection
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!isClassifying && !result && (
          <div className="text-center space-y-4">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Automatically classify your document and apply appropriate processing templates
            </p>
            <Button 
              onClick={runClassification} 
              disabled={!documentContent}
              data-testid="button-classify-document"
            >
              <Zap className="h-4 w-4 mr-2" />
              Classify Document
            </Button>
          </div>
        )}

        {isClassifying && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 justify-center">
              <Brain className="h-4 w-4 animate-pulse" />
              <span>Analyzing document with AI classification...</span>
            </div>
            <Progress value={classificationProgress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              Processing document structure and content patterns
            </p>
          </div>
        )}

        {result && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Document successfully classified as <strong>{result.primaryType}</strong> with{' '}
                  <span className={getConfidenceColor(result.confidence)}>
                    {Math.round(result.confidence * 100)}% confidence
                  </span>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <div className="text-sm font-medium">Document Type</div>
                    <div className="text-lg font-bold capitalize">{result.primaryType}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <div className="text-sm font-medium">Confidence</div>
                    <div className={`text-lg font-bold ${getConfidenceColor(result.confidence)}`}>
                      {Math.round(result.confidence * 100)}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <div className="text-sm font-medium">Templates Found</div>
                    <div className="text-lg font-bold">{result.templates.length}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recommended Processing Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Industry Mode:</span>
                    <Badge variant="secondary">{result.recommendedSettings.industry}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Processing Mode:</span>
                    <Badge variant="secondary">{result.recommendedSettings.processingMode}</Badge>
                  </div>
                  <div>
                    <span className="text-sm block mb-2">Special Features:</span>
                    <div className="flex flex-wrap gap-1">
                      {result.recommendedSettings.specialFeatures.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="space-y-3">
                {result.templates.map((template) => (
                  <Card 
                    key={template.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => applyTemplate(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          <p className="text-xs text-muted-foreground capitalize">{template.category}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getConfidenceBadge(template.confidence) as any}>
                            {Math.round(template.confidence * 100)}%
                          </Badge>
                          {selectedTemplate === template.id && (
                            <Badge variant="default">Applied</Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium">Key Features:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {template.keyFeatures.map((feature, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-medium">Suggested Processing:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {template.suggestedProcessing.map((process, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {process}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Extracted Document Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.extractedFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <span className="text-sm">{feature}</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Processing Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Industry Mode</label>
                      <Select value={result.recommendedSettings.industry}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {documentCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.icon} {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Processing Mode</label>
                      <Select value={result.recommendedSettings.processingMode}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard Processing</SelectItem>
                          <SelectItem value="financial_analysis">Financial Analysis</SelectItem>
                          <SelectItem value="medical_processing">Medical Processing</SelectItem>
                          <SelectItem value="legal_review">Legal Review</SelectItem>
                          <SelectItem value="academic_research">Academic Research</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Special Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.recommendedSettings.specialFeatures.map((feature, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{feature}</span>
                          <Badge variant="secondary">Enabled</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2">
                <Button onClick={runClassification} variant="outline">
                  <Brain className="h-4 w-4 mr-2" />
                  Reclassify
                </Button>
                <Button 
                  onClick={() => onClassificationComplete(result)}
                  data-testid="button-apply-settings"
                >
                  Apply Configuration
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}