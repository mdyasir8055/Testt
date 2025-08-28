import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface ComparisonModeProps {
  onExit: () => void;
}

export function ComparisonMode({ onExit }: ComparisonModeProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const { toast } = useToast();
  
  const { data: documents = [] } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: () => api.documents.list(),
  });

  const availableDocuments = documents.filter(doc => doc.status === 'ready');

  const compareMutation = useMutation({
    mutationFn: ({ documentIds, question }: { documentIds: string[], question: string }) => 
      api.chat.compare(documentIds, question),
    onSuccess: (response) => {
      setComparisonResult(response.message);
      toast({
        title: "Comparison complete",
        description: "Documents have been compared successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Comparison failed",
        description: "Failed to compare documents. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDocumentSelect = (documentId: string) => {
    if (selectedDocuments.includes(documentId)) {
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
    } else if (selectedDocuments.length < 2) {
      setSelectedDocuments(prev => [...prev, documentId]);
    }
  };

  const handleStartComparison = async () => {
    if (selectedDocuments.length === 2) {
      const question = customQuestion.trim() || "What are the key differences and similarities between these documents?";
      compareMutation.mutate({ 
        documentIds: selectedDocuments, 
        question 
      });
    } else {
      toast({
        title: "Select two documents",
        description: "Please select exactly two documents to compare.",
        variant: "destructive",
      });
    }
  };

  // Helper function to safely get page count from metadata
  const getPageCount = (doc: any): string => {
    if (!doc.metadata) return '?';
    
    try {
      const metadata = typeof doc.metadata === 'string' 
        ? JSON.parse(doc.metadata) 
        : doc.metadata;
        
      return metadata && typeof metadata === 'object' && 'pageCount' in metadata 
        ? String(metadata.pageCount) 
        : '?';
    } catch {
      return '?';
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-40" data-testid="comparison-mode">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onExit}
                data-testid="button-exit-comparison"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Chat
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Document Comparison</h2>
                <p className="text-sm text-muted-foreground">Compare multiple documents side by side</p>
              </div>
            </div>
            <Button
              onClick={handleStartComparison}
              disabled={selectedDocuments.length !== 2 || compareMutation.isPending}
              data-testid="button-start-comparison"
            >
              {compareMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Comparing...
                </>
              ) : (
                'Compare Documents'
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Document Selection */}
          <div className="p-6 border-b md:border-b-0 md:border-r border-border md:w-1/3 overflow-y-auto">
            <h3 className="font-medium text-foreground mb-4">Select Documents to Compare</h3>
            
            {availableDocuments.length === 0 ? (
              <div className="text-center p-6 bg-muted rounded-lg">
                <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No documents available for comparison. Please upload and process documents first.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableDocuments.map((doc) => (
                  <div 
                    key={doc.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDocuments.includes(doc.id) 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleDocumentSelect(doc.id)}
                    data-testid={`document-option-${doc.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className={`h-8 w-8 ${
                        selectedDocuments.includes(doc.id) ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{doc.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(doc.size / 1024)} KB • {getPageCount(doc)} pages
                        </p>
                      </div>
                    </div>
                    {selectedDocuments.includes(doc.id) && (
                      <Badge className="mt-2" variant="outline">
                        {selectedDocuments.indexOf(doc.id) === 0 ? 'Document A' : 'Document B'}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Custom Question Input */}
            <div className="mt-6">
              <h3 className="font-medium text-foreground mb-3">Comparison Question (Optional)</h3>
              <Textarea
                placeholder="What would you like to know about these documents? (e.g., 'What are the main differences in the financial data?')"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                className="min-h-20"
                data-testid="textarea-custom-question"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Leave blank for a general comparison of similarities and differences.
              </p>
            </div>
          </div>

          {/* Comparison Results */}
          <div className="flex-1 p-6 overflow-y-auto">
            {!comparisonResult ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Document Comparison</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Select two documents and click "Compare Documents" to see a detailed analysis of their similarities and differences.
                  </p>
                  {selectedDocuments.length === 0 && (
                    <Badge variant="outline" className="mx-auto">
                      No documents selected
                    </Badge>
                  )}
                  {selectedDocuments.length === 1 && (
                    <Badge variant="outline" className="mx-auto">
                      1 of 2 documents selected
                    </Badge>
                  )}
                  {selectedDocuments.length === 2 && (
                    <Badge variant="outline" className="mx-auto text-primary">
                      Ready to compare
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Comparison Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{comparisonResult}</p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setComparisonResult(null)}
                      data-testid="button-new-comparison"
                    >
                      New Comparison
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}