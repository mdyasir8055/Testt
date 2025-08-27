import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Globe, Link2 } from 'lucide-react';
import type { Document } from '@shared/schema';

interface DocumentUploadProps {
  documents: Document[];
  isLoading: boolean;
}

export function DocumentUpload({ documents, isLoading }: DocumentUploadProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [url, setUrl] = useState('');

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.documents.upload(file),
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Upload started",
        description: `${document.originalName} is being processed.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: "Please try again with a valid PDF file.",
        variant: "destructive",
      });
    },
  });

  const urlMutation = useMutation({
    mutationFn: (url: string) => api.documents.uploadFromUrl(url),
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setUrl('');
      toast({
        title: "URL processing started",
        description: `Content from ${document.originalName} is being extracted.`,
      });
    },
    onError: (error) => {
      toast({
        title: "URL processing failed",
        description: "Please check the URL and try again.",
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      if (file.type === 'application/pdf') {
        uploadMutation.mutate(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload only PDF files.",
          variant: "destructive",
        });
      }
    });
  }, [uploadMutation, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'processing':
        return 'Processing...';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const handleUrlSubmit = () => {
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a valid URL.",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(url);
      urlMutation.mutate(url);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL format.",
        variant: "destructive",
      });
    }
  };

  const getSourceIcon = (document: Document) => {
    if (document.sourceType === 'url') {
      return <Globe className="h-4 w-4 text-blue-500" />;
    }
    return getStatusIcon(document.status);
  };

  return (
    <div className="p-6 border-b border-border" data-testid="document-upload">
      <h2 className="text-sm font-medium text-foreground mb-3">Documents</h2>
      
      <Tabs defaultValue="pdf" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pdf" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            PDF Upload
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            URL Fetch
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pdf" className="mt-4">
          {/* PDF Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            data-testid="upload-area"
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {isDragActive ? 'Drop PDF files here...' : 'Drop PDF files here or'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary hover:underline p-0 h-auto"
              data-testid="button-browse-files"
            >
              browse files
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="url" className="mt-4">
          {/* URL Input Area */}
          <div className="space-y-3">
            <div className="border-2 border-dashed rounded-lg p-4 text-center border-border">
              <Globe className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Enter a product URL to fetch and analyze content
              </p>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com/product-page"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                  disabled={urlMutation.isPending}
                  data-testid="input-url"
                />
                <Button
                  onClick={handleUrlSubmit}
                  disabled={urlMutation.isPending || !url.trim()}
                  data-testid="button-fetch-url"
                >
                  {urlMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Fetch'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Document List */}
      {documents.length > 0 && (
        <div className="mt-4 space-y-2" data-testid="document-list">
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex items-center justify-between p-2 bg-secondary rounded-md"
              data-testid={`document-item-${document.id}`}
            >
              <div className="flex items-center space-x-2">
                {getSourceIcon(document)}
                <div className="flex flex-col">
                  <span className="text-sm text-foreground truncate max-w-32">
                    {document.originalName}
                  </span>
                  {document.sourceType === 'url' && (
                    <span className="text-xs text-muted-foreground truncate max-w-32">
                      {document.sourceUrl}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {getStatusText(document.status)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      {uploadMutation.isPending && (
        <div className="mt-4" data-testid="upload-progress">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-foreground">Uploading PDF...</span>
            <span className="text-xs text-muted-foreground">Processing</span>
          </div>
          <Progress value={50} className="w-full" />
        </div>
      )}
      
      {/* URL Processing Progress */}
      {urlMutation.isPending && (
        <div className="mt-4" data-testid="url-progress">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-foreground">Fetching URL content...</span>
            <span className="text-xs text-muted-foreground">Extracting</span>
          </div>
          <Progress value={50} className="w-full" />
        </div>
      )}
    </div>
  );
}
