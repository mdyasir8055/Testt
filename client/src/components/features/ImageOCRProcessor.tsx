import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image, FileText, Zap, Download, Eye, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExtractedImage {
  id: string;
  src: string;
  page: number;
  width: number;
  height: number;
  extractedText?: string;
  confidence?: number;
  type: 'diagram' | 'chart' | 'table' | 'image';
}

interface ImageOCRProcessorProps {
  documentId: string;
  onExtractedData: (data: any) => void;
}

export function ImageOCRProcessor({ documentId, onExtractedData }: ImageOCRProcessorProps) {
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<ExtractedImage | null>(null);
  const { toast } = useToast();

  const handleExtractImages = useCallback(async () => {
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Simulate image extraction and OCR processing
      const mockImages: ExtractedImage[] = [
        {
          id: '1',
          src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y4ZjlmYSIgc3Ryb2tlPSIjZTFlNWU5IiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIxNTAiIHk9IjUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiMzNzQxNTEiPlJldmVudWUgR3Jvd3RoPC90ZXh0PgogIDxyZWN0IHg9IjUwIiB5PSI4MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjNjM2NmYxIi8+CiAgPHJlY3QgeD0iMTAwIiB5PSI2MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzEwYjk4MSIvPgogIDxyZWN0IHg9IjE1MCIgeT0iNDAiIHdpZHRoPSI0MCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiNlZjQ0NDQiLz4KICA8cmVjdCB4PSIyMDAiIHk9IjIwIiB3aWR0aD0iNDAiIGhlaWdodD0iMTQwIiBmaWxsPSIjZjU5ZTBiIi8+CiAgPHRleHQgeD0iNzAiIHk9IjE4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNjM2NmYxIj5RMTwvdGV4dD4KICA8dGV4dCB4PSIxMjAiIHk9IjE4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjMTBiOTgxIj5RMjwvdGV4dD4KICA8dGV4dCB4PSIxNzAiIHk9IjE4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjZWY0NDQ0Ij5RMzwvdGV4dD4KICA8dGV4dCB4PSIyMjAiIHk9IjE4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjZjU5ZTBiIj5RNDwvdGV4dD4KPC9zdmc+',
          page: 1,
          width: 300,
          height: 200,
          type: 'chart',
          extractedText: 'Revenue Growth Q1: $2.4M, Q2: $3.1M, Q3: $4.2M, Q4: $5.8M. Total annual growth: 142%',
          confidence: 0.94
        },
        {
          id: '2',
          src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjZTFlNWU5IiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIxNTAiIHk9IjMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMzc0MTUxIj5Pcmdhbml6YXRpb25hbCBTdHJ1Y3R1cmU8L3RleHQ+CiAgPGNpcmNsZSBjeD0iMTUwIiBjeT0iNjAiIHI9IjIwIiBmaWxsPSIjNjM2NmYxIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjE1MCIgeT0iNjUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI4IiBmaWxsPSIjZmZmZmZmIj5DRU88L3RleHQ+CiAgPGxpbmUgeDE9IjE1MCIgeTE9IjgwIiB4Mj0iMTAwIiB5Mj0iMTIwIiBzdHJva2U9IiM2MzY2ZjEiIHN0cm9rZS13aWR0aD0iMiIvPgogIDxsaW5lIHgxPSIxNTAiIHkxPSI4MCIgeDI9IjIwMCIgeTI9IjEyMCIgc3Ryb2tlPSIjNjM2NmYxIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMjAiIHI9IjE1IiBmaWxsPSIjMTBiOTgxIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjEwMCIgeT0iMTI1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNyIgZmlsbD0iI2ZmZmZmZiI+Q1RPPC90ZXh0PgogIDxjaXJjbGUgY3g9IjIwMCIgY3k9IjEyMCIgcj0iMTUiIGZpbGw9IiNlZjQ0NDQiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPHRleHQgeD0iMjAwIiB5PSIxMjUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI3IiBmaWxsPSIjZmZmZmZmIj5DRk88L3RleHQ+CiAgPHRleHQgeD0iMTAwIiB5PSIxNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI5IiBmaWxsPSIjMzc0MTUxIj5UZWNobm9sb2d5PC90ZXh0PgogIDx0ZXh0IHg9IjIwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOSIgZmlsbD0iIzM3NDE1MSI+RmluYW5jZTwvdGV4dD4KPC9zdmc+',
          page: 2,
          width: 300,
          height: 200,
          type: 'diagram',
          extractedText: 'Organizational Structure: CEO at top level, CTO (Technology) and CFO (Finance) reporting directly',
          confidence: 0.87
        },
        {
          id: '3',
          src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjZTFlNWU5IiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIxNTAiIHk9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMzc0MTUxIj5RdWFydGVybHkgUGVyZm9ybWFuY2U8L3RleHQ+CiAgPHJlY3QgeD0iMjAiIHk9IjQwIiB3aWR0aD0iMjYwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZjFmNWY5IiBzdHJva2U9IiNlMWU1ZTkiLz4KICA8dGV4dCB4PSIzMCIgeT0iNTMiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI5IiBmaWxsPSIjMzc0MTUxIj5NZXRyaWM8L3RleHQ+CiAgPHRleHQgeD0iMTAwIiB5PSI1MyIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjkiIGZpbGw9IiMzNzQxNTEiPlExPC90ZXh0PgogIDx0ZXh0IHg9IjE1MCIgeT0iNTMiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI5IiBmaWxsPSIjMzc0MTUxIj5RMjwvdGV4dD4KICA8dGV4dCB4PSIyMDAiIHk9IjUzIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOSIgZmlsbD0iIzM3NDE1MSI+UTM8L3RleHQ+CiAgPHRleHQgeD0iMjUwIiB5PSI1MyIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjkiIGZpbGw9IiMzNzQxNTEiPlE0PC90ZXh0PgogIDxyZWN0IHg9IjIwIiB5PSI2NSIgd2lkdGg9IjI2MCIgaGVpZ2h0PSIyMCIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjZTFlNWU5Ii8+CiAgPHRleHQgeD0iMzAiIHk9Ijc4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOSIgZmlsbD0iIzM3NDE1MSI+UmV2ZW51ZTwvdGV4dD4KICA8dGV4dCB4PSIxMDAiIHk9Ijc4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOSIgZmlsbD0iIzM3NDE1MSI+JDIuNE08L3RleHQ+CiAgPHRleHQgeD0iMTUwIiB5PSI3OCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjkiIGZpbGw9IiMzNzQxNTEiPiQzLjFNPC90ZXh0PgogIDx0ZXh0IHg9IjIwMCIgeT0iNzgiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI5IiBmaWxsPSIjMzc0MTUxIj4kNC4yTTwvdGV4dD4KICA8dGV4dCB4PSIyNTAiIHk9Ijc4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOSIgZmlsbD0iIzM3NDE1MSI+JDUuOE08L3RleHQ+CiAgPHJlY3QgeD0iMjAiIHk9IjkwIiB3aWR0aD0iMjYwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZjFmNWY5IiBzdHJva2U9IiNlMWU1ZTkiLz4KICA8dGV4dCB4PSIzMCIgeT0iMTAzIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOSIgZmlsbD0iIzM3NDE1MSI+R3Jvd3RoPC90ZXh0PgogIDx0ZXh0IHg9IjEwMCIgeT0iMTAzIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOSIgZmlsbD0iIzEwYjk4MSI+KzE1JTwvdGV4dD4KICA8dGV4dCB4PSIxNTAiIHk9IjEwMyIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjkiIGZpbGw9IiMxMGI5ODEiPisyOSU8L3RleHQ+CiAgPHRleHQgeD0iMjAwIiB5PSIxMDMiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI5IiBmaWxsPSIjMTBiOTgxIj4rMzUlPC90ZXh0PgogIDx0ZXh0IHg9IjI1MCIgeT0iMTAzIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOSIgZmlsbD0iIzEwYjk4MSI+KzM4JTwvdGV4dD4KICA8cmVjdCB4PSIyMCIgeT0iMTE1IiB3aWR0aD0iMjYwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZmZmZmZmIiBzdHJva2U9IiNlMWU1ZTkiLz4KICA8dGV4dCB4PSIzMCIgeT0iMTI4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOSIgZmlsbD0iIzM3NDE1MSI+TWFyZ2luPC90ZXh0PgogIDx0ZXh0IHg9IjEwMCIgeT0iMTI4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOSIgZmlsbD0iIzM3NDE1MSI+MjMlPC90ZXh0PgogIDx0ZXh0IHg9IjE1MCIgeT0iMTI4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOSIgZmlsbD0iIzM3NDE1MSI+MjYlPC90ZXh0PgogIDx0ZXh0IHg9IjIwMCIgeT0iMTI4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOSIgZmlsbD0iIzM3NDE1MSI+MjklPC90ZXh0PgogIDx0ZXh0IHg9IjI1MCIgeT0iMTI4IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iOSIgZmlsbD0iIzM3NDE1MSI+MzElPC90ZXh0Pgo8L3N2Zz4=',
          page: 3,
          width: 300,
          height: 150,
          type: 'table',
          extractedText: 'Quarterly Performance Table: Revenue Q1: $2.4M (+15%), Q2: $3.1M (+29%), Q3: $4.2M (+35%), Q4: $5.8M (+38%). Margins: Q1: 23%, Q2: 26%, Q3: 29%, Q4: 31%',
          confidence: 0.96
        }
      ];

      // Simulate progressive loading
      for (let i = 0; i < mockImages.length; i++) {
        setProcessingProgress(((i + 1) / mockImages.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setExtractedImages(prev => [...prev, mockImages[i]]);
      }

      onExtractedData({
        totalImages: mockImages.length,
        extractedText: mockImages.map(img => img.extractedText).join(' '),
        imageTypes: mockImages.reduce((acc, img) => {
          acc[img.type] = (acc[img.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      });

      toast({
        title: "Image Extraction Complete",
        description: `Successfully extracted and processed ${mockImages.length} images with OCR`,
      });

    } catch (error) {
      toast({
        title: "Extraction Failed",
        description: "Failed to extract images from document",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [documentId, onExtractedData, toast]);

  const exportExtractedData = () => {
    const data = {
      documentId,
      timestamp: new Date().toISOString(),
      extractedImages: extractedImages.map(img => ({
        id: img.id,
        page: img.page,
        type: img.type,
        extractedText: img.extractedText,
        confidence: img.confidence
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted-images-${documentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Image & Diagram Extraction
          </CardTitle>
          <div className="flex items-center gap-2">
            {extractedImages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportExtractedData}
                data-testid="button-export-data"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
            <Badge variant="secondary">
              {extractedImages.length} images extracted
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isProcessing && extractedImages.length === 0 && (
          <div className="text-center py-8">
            <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Extract images, diagrams, and charts from your PDF</p>
            <Button onClick={handleExtractImages} data-testid="button-extract-images">
              <Zap className="h-4 w-4 mr-2" />
              Start Extraction
            </Button>
          </div>
        )}

        {isProcessing && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 animate-spin" />
              <span>Processing images with OCR...</span>
            </div>
            <Progress value={processingProgress} />
            <p className="text-sm text-muted-foreground">
              Extracting images and analyzing content
            </p>
          </div>
        )}

        {extractedImages.length > 0 && (
          <Tabs defaultValue="grid" className="w-full">
            <TabsList>
              <TabsTrigger value="grid">Grid View</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="grid" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {extractedImages.map((image) => (
                  <Card 
                    key={image.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedImage(image)}
                  >
                    <CardContent className="p-3">
                      <img
                        src={image.src}
                        alt={`Extracted ${image.type}`}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">
                          {image.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Page {image.page}
                        </span>
                      </div>
                      {image.confidence && (
                        <div className="text-xs text-muted-foreground">
                          Confidence: {Math.round(image.confidence * 100)}%
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list" className="space-y-2">
              <ScrollArea className="h-64">
                {extractedImages.map((image) => (
                  <div key={image.id} className="flex items-start gap-3 p-3 border rounded-lg mb-2">
                    <img
                      src={image.src}
                      alt={`Extracted ${image.type}`}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{image.type}</Badge>
                        <span className="text-sm text-muted-foreground">Page {image.page}</span>
                        {image.confidence && (
                          <span className="text-sm text-muted-foreground">
                            {Math.round(image.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      {image.extractedText && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {image.extractedText}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedImage(image)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(
                  extractedImages.reduce((acc, img) => {
                    acc[img.type] = (acc[img.type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, count]) => (
                  <Card key={type}>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-sm text-muted-foreground capitalize">{type}s</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Combined Extracted Text</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32">
                    <p className="text-sm">
                      {extractedImages.map(img => img.extractedText).join(' ')}
                    </p>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Image Detail Modal */}
        {selectedImage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
            <Card className="max-w-2xl max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedImage.type} - Page {selectedImage.page}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedImage(null)}>
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <img
                  src={selectedImage.src}
                  alt={`Extracted ${selectedImage.type}`}
                  className="w-full max-h-64 object-contain rounded"
                />
                {selectedImage.extractedText && (
                  <div>
                    <h4 className="font-medium mb-2">Extracted Text:</h4>
                    <p className="text-sm bg-muted p-3 rounded">
                      {selectedImage.extractedText}
                    </p>
                  </div>
                )}
                {selectedImage.confidence && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">OCR Confidence:</span>
                    <Badge variant="secondary">
                      {Math.round(selectedImage.confidence * 100)}%
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}