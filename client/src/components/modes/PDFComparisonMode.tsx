import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FileText, Zap, BarChart3, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Document } from '@shared/schema';

interface PDFComparisonModeProps {
  onExit: () => void;
}

// Define types for the comparison result
interface SimilarityItem {
  details: string;
  score?: number | null;
}

interface DifferenceItem {
  details: string;
  impact?: string | null;
}

interface ComparisonResult {
  similarities: SimilarityItem[];
  differences: DifferenceItem[];
  keyInsights: string[];
}

export function PDFComparisonMode({ onExit }: PDFComparisonModeProps) {
  const [selectedDoc1, setSelectedDoc1] = useState<string>('');
  const [selectedDoc2, setSelectedDoc2] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [analysisQuery, setAnalysisQuery] = useState('');
  const { toast } = useToast();

  const { data: documents = [] } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: () => api.documents.list(),
  });

  const readyDocuments = documents.filter(doc => doc.status === 'ready');

  const compareMutation = useMutation({
    mutationFn: ({ documentIds, question }: { documentIds: string[], question: string }) => 
      api.chat.compare(documentIds, question),
    onSuccess: (response) => {
      // Process the response to extract similarities, differences, and key insights
      const result = processComparisonResponse(response.message);
      setComparisonResult(result);
      toast({
        title: "Comparison complete",
        description: "Documents have been compared successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Comparison failed",
        description: "Failed to compare documents. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCompare = async () => {
    if (!selectedDoc1 || !selectedDoc2) {
      toast({
        title: "Select documents",
        description: "Please select two documents to compare.",
        variant: "destructive",
      });
      return;
    }
    
    setIsComparing(true);
    try {
      compareMutation.mutate({
        documentIds: [selectedDoc1, selectedDoc2],
        question: "Provide a detailed comparison of these documents, including similarities, differences, and key insights. Format the response with clear sections."
      });
    } finally {
      setIsComparing(false);
    }
  };

  const handleCustomAnalysis = async () => {
    if (!analysisQuery.trim() || !selectedDoc1 || !selectedDoc2) {
      toast({
        title: "Input required",
        description: "Please enter an analysis question and select two documents.",
        variant: "destructive",
      });
      return;
    }
    
    setIsComparing(true);
    try {
      compareMutation.mutate({
        documentIds: [selectedDoc1, selectedDoc2],
        question: analysisQuery.trim()
      });
    } finally {
      setIsComparing(false);
    }
  };

  // Helper function to process the comparison response
  const processComparisonResponse = (text: string): ComparisonResult => {
    // Default structure
    const result: ComparisonResult = {
      similarities: [],
      differences: [],
      keyInsights: []
    };

    try {
      // Extract similarities (simple approach - can be enhanced with regex or NLP)
      if (text.includes('Similarities') || text.includes('similarities')) {
        const similaritiesSection = extractSection(text, ['Similarities', 'similarities'], ['Differences', 'differences', 'Key Insights', 'key insights']);
        result.similarities = extractPoints(similaritiesSection) as SimilarityItem[];
      }

      // Extract differences
      if (text.includes('Differences') || text.includes('differences')) {
        const differencesSection = extractSection(text, ['Differences', 'differences'], ['Key Insights', 'key insights', 'Conclusion', 'conclusion']);
        result.differences = extractPoints(differencesSection) as DifferenceItem[];
      }

      // Extract key insights
      if (text.includes('Key Insights') || text.includes('key insights') || text.includes('Insights') || text.includes('insights')) {
        const insightsSection = extractSection(text, ['Key Insights', 'key insights', 'Insights', 'insights'], ['Conclusion', 'conclusion']);
        result.keyInsights = extractPoints(insightsSection).map(item => item.details);
      }

      // If we couldn't extract structured data, use the full text as a fallback
      if (result.similarities.length === 0 && result.differences.length === 0 && result.keyInsights.length === 0) {
        // Split by paragraphs and distribute
        const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
        
        // Distribute paragraphs across the three categories
        const third = Math.ceil(paragraphs.length / 3);
        result.similarities = paragraphs.slice(0, third).map(p => ({ details: p }));
        result.differences = paragraphs.slice(third, third * 2).map(p => ({ details: p }));
        result.keyInsights = paragraphs.slice(third * 2);
      }

      return result;
    } catch (error) {
      console.error('Error processing comparison response:', error);
      // Return the raw text as a fallback
      return {
        similarities: [{ details: 'Analysis could not be structured properly.' }],
        differences: [{ details: 'Please see the full analysis below.' }],
        keyInsights: [text]
      };
    }
  };

  // Helper function to extract a section from text
  const extractSection = (text: string, startMarkers: string[], endMarkers: string[]): string => {
    let startIndex = -1;
    let endIndex = text.length;

    // Find the start marker
    for (const marker of startMarkers) {
      const index = text.indexOf(marker);
      if (index !== -1 && (startIndex === -1 || index < startIndex)) {
        startIndex = index;
      }
    }

    // Find the end marker
    for (const marker of endMarkers) {
      const index = text.indexOf(marker, startIndex + 1);
      if (index !== -1 && index < endIndex) {
        endIndex = index;
      }
    }

    if (startIndex === -1) return '';
    return text.substring(startIndex, endIndex).trim();
  };

  // Helper function to extract bullet points or paragraphs
  const extractPoints = (text: string): Array<{details: string; score?: number | null; impact?: string | null}> => {
    if (!text) return [];

    // Remove the section header
    const lines = text.split('\n');
    if (lines.length > 0) {
      lines.shift(); // Remove the first line (header)
    }
    text = lines.join('\n');

    // Try to extract bullet points
    const bulletPoints = text.split(/\n\s*[-•*]\s*/).filter(p => p.trim().length > 0);
    
    if (bulletPoints.length > 1) {
      // We found bullet points
      return bulletPoints.map(point => {
        // Try to extract a score or impact if available
        const scoreMatch = point.match(/(\d+%|high|medium|low)/i);
        const score = scoreMatch ? scoreMatch[0] : null;
        
        return {
          details: point.trim(),
          score: score ? (score.includes('%') ? parseFloat(score) / 100 : 0.5) : null,
          impact: score && !score.includes('%') ? score.charAt(0).toUpperCase() + score.slice(1).toLowerCase() : null
        };
      });
    } else {
      // No bullet points, split by paragraphs
      const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
      return paragraphs.map(p => ({ details: p.trim() }));
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onExit}
                data-testid="button-exit-comparison"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Chat
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-foreground">PDF Comparison Analysis</h2>
                <p className="text-sm text-muted-foreground">Side-by-side document analysis and insights</p>
              </div>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Advanced Analysis
            </Badge>
          </div>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Document Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Select Documents to Compare
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Document 1</label>
                  <Select value={selectedDoc1} onValueChange={setSelectedDoc1}>
                    <SelectTrigger data-testid="select-document-1">
                      <SelectValue placeholder="Select first document" />
                    </SelectTrigger>
                    <SelectContent>
                      {readyDocuments.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.originalName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Document 2</label>
                  <Select 
                    value={selectedDoc2} 
                    onValueChange={setSelectedDoc2}
                    disabled={!selectedDoc1}
                  >
                    <SelectTrigger data-testid="select-document-2">
                      <SelectValue placeholder="Select second document" />
                    </SelectTrigger>
                    <SelectContent>
                      {readyDocuments
                        .filter(doc => doc.id !== selectedDoc1)
                        .map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.originalName}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button
                onClick={handleCompare}
                disabled={!selectedDoc1 || !selectedDoc2 || isComparing || compareMutation.isPending}
                className="w-full"
                data-testid="button-compare-documents"
              >
                {isComparing || compareMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Documents...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Compare Documents
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Comparison Results */}
          {comparisonResult && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Similarities */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-green-600">Similarities Found</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {comparisonResult.similarities.length > 0 ? (
                    comparisonResult.similarities.map((item: SimilarityItem, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">Similarity {index + 1}</span>
                          {item.score && (
                            <Badge variant="secondary">{Math.round(item.score * 100)}% match</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.details}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No significant similarities found.</p>
                  )}
                </CardContent>
              </Card>

              {/* Differences */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-orange-600">Key Differences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {comparisonResult.differences.length > 0 ? (
                    comparisonResult.differences.map((item: DifferenceItem, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">Difference {index + 1}</span>
                          {item.impact && (
                            <Badge variant={
                              item.impact.toLowerCase() === 'high' ? 'destructive' : 
                              item.impact.toLowerCase() === 'medium' ? 'default' : 
                              'secondary'
                            }>
                              {item.impact} Impact
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.details}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No significant differences found.</p>
                  )}
                </CardContent>
              </Card>

              {/* Key Insights */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base text-blue-600">Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  {comparisonResult.keyInsights.length > 0 ? (
                    <ul className="space-y-2">
                      {comparisonResult.keyInsights.map((insight: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Eye className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No key insights available.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Custom Analysis Query */}
          {comparisonResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custom Analysis Query</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Ask a specific question about the comparison (e.g., 'Which document has stronger financial projections?')"
                  value={analysisQuery}
                  onChange={(e) => setAnalysisQuery(e.target.value)}
                  className="min-h-20"
                  data-testid="textarea-custom-analysis"
                />
                <Button
                  onClick={handleCustomAnalysis}
                  disabled={!analysisQuery.trim() || isComparing || compareMutation.isPending}
                  data-testid="button-custom-analysis"
                >
                  {isComparing || compareMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Analyze
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}