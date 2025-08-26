import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import type { QueryResponse } from '@shared/schema';

interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: QueryResponse['sources'];
}

export function SourcesModal({ isOpen, onClose, sources }: SourcesModalProps) {
  const handleJumpToSource = (source: QueryResponse['sources'][0]) => {
    // In a real implementation, this would open the document viewer
    // or highlight the specific section
    console.log('Jump to source:', source);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-96 overflow-y-auto" data-testid="sources-modal">
        <DialogHeader>
          <DialogTitle>Source References</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {sources.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No sources available for this message.
            </p>
          ) : (
            sources.map((source, index) => (
              <div
                key={index}
                className="border border-border rounded-lg p-4"
                data-testid={`source-item-${index}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {source.documentName}
                  </span>
                  <div className="flex items-center space-x-2">
                    {source.page && (
                      <span className="text-xs text-muted-foreground">
                        Page {source.page}
                      </span>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(source.relevance * 100)}% relevance
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                  "{source.chunkContent}"
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleJumpToSource(source)}
                  className="text-xs text-primary hover:underline h-auto p-0"
                  data-testid={`button-jump-source-${index}`}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View in document
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
