import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState({
    extractImages: true,
    enableOCR: true,
    autoDetectIndustry: false,
    chunkSize: 750,
    responseLength: 'medium',
    voiceSpeed: 1.0,
    voiceLanguage: 'en-US',
  });

  const handleSave = () => {
    // Save settings to local storage or API
    localStorage.setItem('ragChatSettings', JSON.stringify(settings));
    onClose();
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="settings-modal">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <Label className="text-sm font-medium mb-3 block">Processing Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={settings.extractImages}
                  onCheckedChange={(checked) => handleSettingChange('extractImages', checked)}
                  data-testid="checkbox-extract-images"
                />
                <Label className="text-sm">Extract images from PDFs</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={settings.enableOCR}
                  onCheckedChange={(checked) => handleSettingChange('enableOCR', checked)}
                  data-testid="checkbox-enable-ocr"
                />
                <Label className="text-sm">OCR for scanned documents</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={settings.autoDetectIndustry}
                  onCheckedChange={(checked) => handleSettingChange('autoDetectIndustry', checked)}
                  data-testid="checkbox-auto-detect-industry"
                />
                <Label className="text-sm">Auto-detect document industry</Label>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Chunk Size</Label>
            <Select
              value={settings.chunkSize.toString()}
              onValueChange={(value) => handleSettingChange('chunkSize', parseInt(value))}
            >
              <SelectTrigger data-testid="select-chunk-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="500">500 tokens</SelectItem>
                <SelectItem value="750">750 tokens</SelectItem>
                <SelectItem value="1000">1000 tokens</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Response Length</Label>
            <Select
              value={settings.responseLength}
              onValueChange={(value) => handleSettingChange('responseLength', value)}
            >
              <SelectTrigger data-testid="select-response-length">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="long">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">Voice Settings</Label>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Voice Speed</Label>
                <Slider
                  value={[settings.voiceSpeed]}
                  onValueChange={([value]) => handleSettingChange('voiceSpeed', value)}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="w-full"
                  data-testid="slider-voice-speed"
                />
                <div className="text-xs text-muted-foreground mt-1">{settings.voiceSpeed}x</div>
              </div>
              <Select
                value={settings.voiceLanguage}
                onValueChange={(value) => handleSettingChange('voiceLanguage', value)}
              >
                <SelectTrigger data-testid="select-voice-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                  <SelectItem value="es-ES">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-cancel-settings"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            data-testid="button-save-settings"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
