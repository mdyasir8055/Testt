import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FileText, Zap, BarChart3, Eye } from 'lucide-react';
import type { Document } from '@shared/schema';

interface PDFComparisonModeProps {
  onExit: () => void;
}

export function PDFComparisonMode({ onExit }: PDFComparisonModeProps) {
  const [selectedDoc1, setSelectedDoc1] = useState<string>('');
  const [selectedDoc2, setSelectedDoc2] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [analysisQuery, setAnalysisQuery] = useState('');

  const { data: documents = [] } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: () => api.documents.list(),
  });

  const handleCompare = async () => {
    if (!selectedDoc1 || !selectedDoc2) return;
    
    setIsComparing(true);
    try {
      // Simulate comparison analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setComparisonResult({
        similarities: [
          { section: 'Executive Summary', score: 0.85, details: 'Both documents discuss similar market trends and strategic goals.' },
          { section: 'Financial Data', score: 0.72, details: 'Revenue figures show consistent growth patterns across both reports.' },
          { section: 'Risk Assessment', score: 0.91, details: 'Risk mitigation strategies are nearly identical with minor variations.' }
        ],
        differences: [
          { section: 'Methodology', impact: 'High', details: 'Document 1 uses quantitative analysis while Document 2 focuses on qualitative assessment.' },
          { section: 'Data Sources', impact: 'Medium', details: 'Different primary data sources were used, affecting some conclusions.' },
          { section: 'Timeline', impact: 'Low', details: 'Document 2 covers a 6-month longer period than Document 1.' }
        ],
        keyInsights: [
          'Both documents conclude that market expansion is viable',
          'Risk tolerance differs significantly between the two analyses',
          'Document 2 provides more comprehensive regulatory considerations'
        ]
      });
    } finally {
      setIsComparing(false);
    }
  };

  const handleCustomAnalysis = async () => {
    if (!analysisQuery.trim() || !selectedDoc1 || !selectedDoc2) return;
    
    // This would send a custom query for comparison analysis
    console.log('Custom analysis:', analysisQuery);
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

        <div className="flex-1 p-6 space-y-6">
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
                      {documents.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.filename}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Document 2</label>
                  <Select value={selectedDoc2} onValueChange={setSelectedDoc2}>
                    <SelectTrigger data-testid="select-document-2">
                      <SelectValue placeholder="Select second document" />
                    </SelectTrigger>
                    <SelectContent>
                      {documents.filter(doc => doc.id !== selectedDoc1).map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.filename}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button
                onClick={handleCompare}
                disabled={!selectedDoc1 || !selectedDoc2 || isComparing}
                className="w-full"
                data-testid="button-compare-documents"
              >
                {isComparing ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-spin" />
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
                  {comparisonResult.similarities.map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{item.section}</span>
                        <Badge variant="secondary">{Math.round(item.score * 100)}% match</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.details}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Differences */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-orange-600">Key Differences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {comparisonResult.differences.map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{item.section}</span>
                        <Badge variant={item.impact === 'High' ? 'destructive' : item.impact === 'Medium' ? 'default' : 'secondary'}>
                          {item.impact} Impact
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.details}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Key Insights */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base text-blue-600">Key Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {comparisonResult.keyInsights.map((insight: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Eye className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        {insight}
                      </li>
                    ))}
                  </ul>
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
                  disabled={!analysisQuery.trim()}
                  data-testid="button-custom-analysis"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Analyze
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}