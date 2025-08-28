import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Default settings
const defaultSettings = {
  extractImages: true,
  enableOCR: true,
  autoDetectIndustry: false,
  chunkSize: 750,
  responseLength: 'medium',
  voiceSpeed: 1.0,
  voiceLanguage: 'en-US',
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [settings, setSettings] = useState(defaultSettings);
  const { toast } = useToast();

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('ragChatSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      } catch (error) {
        console.error('Error parsing saved settings:', error);
      }
    }
  }, [isOpen]); // Reload when modal opens

  const handleSave = () => {
    // Save settings to local storage
    localStorage.setItem('ragChatSettings', JSON.stringify(settings));
    
    // Apply settings to the application
    document.documentElement.style.setProperty('--voice-speed', settings.voiceSpeed.toString());
    
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    });
    
    onClose();
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    toast({
      title: "Settings reset",
      description: "All settings have been reset to defaults.",
    });
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
                  id="extractImages"
                  checked={settings.extractImages}
                  onCheckedChange={(checked) => handleSettingChange('extractImages', checked)}
                  data-testid="checkbox-extract-images"
                />
                <Label htmlFor="extractImages" className="text-sm">Extract images from PDFs</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableOCR"
                  checked={settings.enableOCR}
                  onCheckedChange={(checked) => handleSettingChange('enableOCR', checked)}
                  data-testid="checkbox-enable-ocr"
                />
                <Label htmlFor="enableOCR" className="text-sm">OCR for scanned documents</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoDetectIndustry"
                  checked={settings.autoDetectIndustry}
                  onCheckedChange={(checked) => handleSettingChange('autoDetectIndustry', checked)}
                  data-testid="checkbox-auto-detect-industry"
                />
                <Label htmlFor="autoDetectIndustry" className="text-sm">Auto-detect document industry</Label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="chunkSize" className="text-sm font-medium mb-2 block">Chunk Size</Label>
            <Select
              value={settings.chunkSize.toString()}
              onValueChange={(value) => handleSettingChange('chunkSize', parseInt(value))}
            >
              <SelectTrigger id="chunkSize" data-testid="select-chunk-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="500">500 tokens</SelectItem>
                <SelectItem value="750">750 tokens</SelectItem>
                <SelectItem value="1000">1000 tokens</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Smaller chunks improve precision, larger chunks provide more context
            </p>
          </div>

          <div>
            <Label htmlFor="responseLength" className="text-sm font-medium mb-2 block">Response Length</Label>
            <Select
              value={settings.responseLength}
              onValueChange={(value) => handleSettingChange('responseLength', value)}
            >
              <SelectTrigger id="responseLength" data-testid="select-response-length">
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
                <Label htmlFor="voiceSpeed" className="text-xs text-muted-foreground mb-2 block">Voice Speed</Label>
                <Slider
                  id="voiceSpeed"
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
              <div>
                <Label htmlFor="voiceLanguage" className="text-xs text-muted-foreground mb-2 block">Voice Language</Label>
                <Select
                  value={settings.voiceLanguage}
                  onValueChange={(value) => handleSettingChange('voiceLanguage', value)}
                >
                  <SelectTrigger id="voiceLanguage" data-testid="select-voice-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="es-ES">Spanish</SelectItem>
                    <SelectItem value="fr-FR">French</SelectItem>
                    <SelectItem value="de-DE">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={handleReset}
            data-testid="button-reset-settings"
          >
            Reset to Defaults
          </Button>
          <div className="flex space-x-3">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}