import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Upload } from 'lucide-react';
import { DocumentUpload } from '@/components/sidebar/DocumentUpload';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface ComparisonModeProps {
  onExit: () => void;
}

export function ComparisonMode({ onExit }: ComparisonModeProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  
  const { data: documents = [] } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: () => api.documents.list(),
  });

  const availableDocuments = documents.filter(doc => doc.status === 'ready');

  const handleDocumentSelect = (documentId: string) => {
    if (selectedDocuments.includes(documentId)) {
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
    } else if (selectedDocuments.length < 2) {
      setSelectedDocuments(prev => [...prev, documentId]);
    }
  };

  const handleStartComparison = async () => {
    if (selectedDocuments.length === 2) {
      try {
        const defaultQuestion = "What are the key differences and similarities between these documents?";
        const result = await api.chat.compare(selectedDocuments, defaultQuestion);
        console.log('Comparison result:', result);
        // You could show the result in a modal or navigate to show the comparison
        alert(`Comparison completed! Key findings: ${result.message.substring(0, 200)}...`);
      } catch (error) {
        console.error('Comparison failed:', error);
        alert('Failed to compare documents. Please try again.');
      }
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
              disabled={selectedDocuments.length !== 2}
              data-testid="button-start-comparison"
            >
              Compare Documents
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex">
          {/* Document A */}
          <div className="flex-1 border-r border-border">
            <div className="p-4 border-b border-border bg-muted/50">
              <h3 className="font-medium text-foreground mb-3">Document A</h3>
              {selectedDocuments[0] ? (
                <DocumentCard
                  document={documents.find(d => d.id === selectedDocuments[0])!}
                  onDeselect={() => handleDocumentSelect(selectedDocuments[0])}
                />
              ) : (
                <SelectDocumentArea
                  documents={availableDocuments}
                  selectedDocuments={selectedDocuments}
                  onSelect={handleDocumentSelect}
                  position="A"
                />
              )}
            </div>
            <div className="p-4 h-full overflow-y-auto">
              {selectedDocuments[0] ? (
                <DocumentContent documentId={selectedDocuments[0]} />
              ) : (
                <EmptyDocumentView />
              )}
            </div>
          </div>

          {/* Document B */}
          <div className="flex-1">
            <div className="p-4 border-b border-border bg-muted/50">
              <h3 className="font-medium text-foreground mb-3">Document B</h3>
              {selectedDocuments[1] ? (
                <DocumentCard
                  document={documents.find(d => d.id === selectedDocuments[1])!}
                  onDeselect={() => handleDocumentSelect(selectedDocuments[1])}
                />
              ) : (
                <SelectDocumentArea
                  documents={availableDocuments}
                  selectedDocuments={selectedDocuments}
                  onSelect={handleDocumentSelect}
                  position="B"
                />
              )}
            </div>
            <div className="p-4 h-full overflow-y-auto">
              {selectedDocuments[1] ? (
                <DocumentContent documentId={selectedDocuments[1]} />
              ) : (
                <EmptyDocumentView />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentCard({ document, onDeselect }: { document: any; onDeselect: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
      <div className="flex items-center space-x-3">
        <FileText className="h-8 w-8 text-red-500" />
        <div>
          <p className="text-sm font-medium text-foreground">{document.originalName}</p>
          <p className="text-xs text-muted-foreground">
            {Math.round(document.size / 1024)} KB • Ready
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDeselect}
        className="text-xs"
        data-testid={`button-deselect-${document.id}`}
      >
        Remove
      </Button>
    </div>
  );
}

function SelectDocumentArea({
  documents,
  selectedDocuments,
  onSelect,
  position,
}: {
  documents: any[];
  selectedDocuments: string[];
  onSelect: (id: string) => void;
  position: string;
}) {
  const availableOptions = documents.filter(doc => !selectedDocuments.includes(doc.id));

  return (
    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-card">
      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground mb-4">
        Select document for position {position}
      </p>
      <div className="space-y-2">
        {availableOptions.map((doc) => (
          <Button
            key={doc.id}
            variant="outline"
            size="sm"
            onClick={() => onSelect(doc.id)}
            className="w-full text-left justify-start"
            data-testid={`button-select-document-${doc.id}`}
          >
            <FileText className="w-4 h-4 mr-2" />
            {doc.originalName}
          </Button>
        ))}
      </div>
    </div>
  );
}

function DocumentContent({ documentId }: { documentId: string }) {
  return (
    <div className="prose prose-sm max-w-none text-foreground">
      <h4>Document Content Preview</h4>
      <p>Content from document {documentId} would be displayed here...</p>
    </div>
  );
}

function EmptyDocumentView() {
  return (
    <div className="text-center text-muted-foreground h-full flex items-center justify-center">
      <p className="text-sm">Select a document to begin comparison</p>
    </div>
  );
}
